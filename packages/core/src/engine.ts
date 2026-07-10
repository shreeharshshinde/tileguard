/**
 * @tileguard/core — Engine
 *
 * The Engine is the core orchestrator of TileGuard. It connects configuration,
 * artifact providers, rules, and reporters into a coherent execution pipeline.
 *
 * The engine itself has no knowledge of geospatial formats, specific rules, or
 * output formats. It is a generic quality analysis runner that:
 *
 *   1. Resolves configuration from plugins and user overrides
 *   2. Builds a rule index (artifact type → enabled rules)
 *   3. For each source: finds a provider, loads the artifact
 *   4. For each artifact: runs matching enabled rules
 *   5. Collects and sorts all diagnostics
 *   6. Invokes the reporter
 *   7. Returns a RunResult
 *
 * Error philosophy: the engine never throws to its caller during normal
 * operation. Load failures and rule crashes are captured as diagnostics
 * (artifact/load-failed, engine/rule-error) and the run continues.
 *
 * See docs/architecture/07-engine.md for the full specification.
 */

import type { Artifact } from './artifact.js';
import type {
  GlobalOptions,
  ResolvedConfig,
  ResolvedOverride,
  ResolvedRuleConfig,
  ResolvedRuleOverride,
  TileGuardConfig,
} from './config.js';
import type { Diagnostic, DiagnosticDescriptor, Severity } from './diagnostic.js';
import type { Reporter, ReporterContext } from './reporter.js';
import type { Rule } from './rule.js';

// ---------------------------------------------------------------------------
// RunSummary
// ---------------------------------------------------------------------------

/**
 * Summary statistics for a completed engine run.
 */
export interface RunSummary {
  /** Number of error-severity diagnostics. */
  readonly errors: number;

  /** Number of warning-severity diagnostics. */
  readonly warnings: number;

  /** Number of info-severity diagnostics. */
  readonly infos: number;

  /** Number of source strings passed to run(). */
  readonly sourceCount: number;

  /**
   * Number of artifacts successfully loaded.
   * Sources that failed to load are not counted here.
   */
  readonly artifactCount: number;

  /**
   * Total rule invocations across all artifacts.
   * One rule applied to N artifacts = N executions.
   */
  readonly ruleExecutions: number;

  /** Wall-clock duration of the entire run in milliseconds. */
  readonly duration: number;

  /**
   * Whether the run "passed".
   * True when errors === 0. Warnings and infos do not affect pass status.
   */
  readonly pass: boolean;
}

// ---------------------------------------------------------------------------
// RunResult
// ---------------------------------------------------------------------------

/**
 * The complete result of an engine.run() call.
 */
export interface RunResult {
  /**
   * All diagnostics produced during the run, in deterministic order:
   *   1. By artifact source (alphabetical)
   *   2. By severity (error → warning → info)
   *   3. By rule ID (alphabetical)
   *   4. By location fields
   */
  readonly diagnostics: readonly Diagnostic[];

  /** Summary statistics for the run. */
  readonly summary: RunSummary;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * The Engine orchestrates a complete validation run.
 *
 * Created by createEngine(). Immutable after construction: the same engine
 * instance can run multiple times (e.g., in watch mode) without state leaking
 * between runs.
 */
export interface Engine {
  /**
   * Executes validation on the given sources.
   *
   * Sources are file paths, URLs, or other provider-specific identifiers.
   * The engine processes all sources even if some fail to load — a single
   * bad file never aborts the validation of other files.
   *
   * @param sources - One or more source identifiers.
   * @returns A RunResult with all diagnostics and summary statistics.
   */
  run(sources: readonly string[]): Promise<RunResult>;
}

// ---------------------------------------------------------------------------
// Default reporter (no-op, used when user provides no reporter)
// ---------------------------------------------------------------------------

/** A do-nothing reporter used as the default when no reporter is configured. */
const noopReporter: Reporter = {
  id: 'noop',
  report(_diagnostics, _context) {
    // no output
  },
};

// ---------------------------------------------------------------------------
// Default global options
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<GlobalOptions> = {
  timeout: 30_000,
  maxDetails: 100,
  maxDiagnostics: 1_000,
};

// ---------------------------------------------------------------------------
// Severity ordering (lower index = higher severity)
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

// ---------------------------------------------------------------------------
// Override glob matching
// ---------------------------------------------------------------------------

/** Compile the supported glob syntax (*, **, and ?) to a path matcher. */
function compileGlob(pattern: string): (source: string) => boolean {
  const normalizedPattern = pattern.replaceAll('\\', '/').replace(/^\.\//, '');
  let expression = '^';

  for (let i = 0; i < normalizedPattern.length; i += 1) {
    const char = normalizedPattern[i]!;

    if (char === '*') {
      if (normalizedPattern[i + 1] === '*') {
        i += 1;
        if (normalizedPattern[i + 1] === '/') {
          i += 1;
          expression += '(?:.*/)?';
        } else {
          expression += '.*';
        }
      } else {
        expression += '[^/]*';
      }
    } else if (char === '?') {
      expression += '[^/]';
    } else {
      expression += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }

  const regex = new RegExp(`${expression}$`);
  return (source: string): boolean => {
    const normalizedSource = source.replaceAll('\\', '/').replace(/^\.\//, '');
    return regex.test(normalizedSource);
  };
}

function resolveOverrides(
  overrides: TileGuardConfig['overrides'],
  allRules: ReadonlyMap<string, Rule>,
): readonly ResolvedOverride[] {
  return (overrides ?? []).map((override) => {
    const matchers = override.files.map(compileGlob);
    const rules = new Map<string, ResolvedRuleOverride>();

    for (const [id, entry] of Object.entries(override.rules ?? {})) {
      const rule = allRules.get(id);
      if (rule === undefined) continue;

      if (entry === 'off') {
        rules.set(id, { rule, severity: 'off', options: undefined });
      } else if (Array.isArray(entry)) {
        const [severity, options] = entry as readonly [Severity, unknown];
        rules.set(id, { rule, severity, options });
      } else {
        rules.set(id, { rule, severity: entry as Severity, options: undefined });
      }
    }

    return {
      matches: (source: string): boolean => matchers.some((matcher) => matcher(source)),
      rules,
    };
  });
}

// ---------------------------------------------------------------------------
// Configuration resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a user-provided TileGuardConfig into the internal ResolvedConfig
 * structure. This is done once at the start of each run.
 *
 * Resolution steps:
 *   1. Collect all rules from all plugins
 *   2. Set severity defaults (recommended → defaultSeverity, else 'off')
 *   3. Apply user rule overrides
 *   4. Build the provider list in plugin registration order
 *   5. Resolve the reporter
 */
function resolveConfig(userConfig: TileGuardConfig): ResolvedConfig {
  // Step 1: Collect all rules from plugins
  const allRules = new Map<string, Rule>();
  const allProviders = userConfig.plugins?.flatMap((p) => p.providers ?? []) ?? [];

  for (const plugin of userConfig.plugins ?? []) {
    for (const rule of plugin.rules ?? []) {
      if (allRules.has(rule.id)) {
        throw new Error(
          `[TileGuard] Duplicate rule ID "${rule.id}" registered by plugin "${plugin.id}". ` +
            'Each rule must have a unique ID across all loaded plugins.',
        );
      }
      allRules.set(rule.id, rule);
    }
  }

  // Step 2 + 3: Build resolved rule map
  const resolvedRules = new Map<string, ResolvedRuleConfig>();

  for (const [id, rule] of allRules) {
    // Default severity: recommended rules use meta.defaultSeverity, others are 'off'
    const recommended = rule.meta.recommended ?? false;
    let severity: Severity | 'off' = recommended ? rule.meta.defaultSeverity : 'off';
    let options: unknown;

    // Apply user overrides
    const userEntry = userConfig.rules?.[id];
    if (userEntry !== undefined) {
      if (userEntry === 'off') {
        severity = 'off';
      } else if (Array.isArray(userEntry)) {
        const [userSeverity, userOptions] = userEntry as [Severity, unknown];
        severity = userSeverity;
        options = userOptions;
      } else {
        severity = userEntry as Severity;
      }
    }

    if (severity === 'off') continue;

    resolvedRules.set(id, {
      rule,
      severity,
      options,
      enabled: true,
    });
  }

  // Step 4: Resolve reporter
  const reporter = resolveReporter(userConfig.reporter);

  // Step 5: Merge global options with defaults
  const resolvedOptions: Required<GlobalOptions> = {
    ...DEFAULT_OPTIONS,
    ...userConfig.options,
  };

  return {
    rules: resolvedRules,
    providers: allProviders,
    reporter,
    options: resolvedOptions,
    overrides: resolveOverrides(userConfig.overrides, allRules),
  };
}

/**
 * Resolves the reporter from the user config value.
 * Currently returns the noop reporter for all string IDs (the actual
 * reporter implementations live in @tileguard/reporters). A pre-constructed
 * Reporter object may also be passed through the programmatic API by placing
 * it in a wrapper that accepts `Reporter` directly.
 */
function resolveReporter(reporterConfig: TileGuardConfig['reporter']): Reporter {
  if (reporterConfig === undefined || typeof reporterConfig === 'string') {
    // Phase 2 note: actual reporter resolution (text, json, sarif) is
    // implemented in @tileguard/reporters and wired up in the CLI package.
    // The core engine accepts a pre-resolved Reporter object via createEngine()
    // overload. When no reporter is provided, use the noop.
    return noopReporter;
  }
  if (Array.isArray(reporterConfig)) {
    // [id, options] tuple — options reserved for future use in core
    return noopReporter;
  }
  // If a Reporter object was passed directly (not standard config, but
  // allowed for testing), we can't detect it here via the type since the
  // config type is string | [string, ...]. Reporter injection is handled
  // via the EngineOptions API instead.
  return noopReporter;
}

// ---------------------------------------------------------------------------
// Rule index
// ---------------------------------------------------------------------------

/**
 * Builds an index mapping artifact type discriminants to the list of
 * resolved rules that match that type. This avoids scanning all rules for
 * every artifact.
 */
function buildRuleIndex(
  resolvedRules: ReadonlyMap<string, ResolvedRuleConfig>,
): Map<string, ResolvedRuleConfig[]> {
  const index = new Map<string, ResolvedRuleConfig[]>();

  for (const ruleConfig of resolvedRules.values()) {
    for (const artifactType of ruleConfig.rule.artifactTypes) {
      const existing = index.get(artifactType);
      if (existing !== undefined) {
        existing.push(ruleConfig);
      } else {
        index.set(artifactType, [ruleConfig]);
      }
    }
  }

  return index;
}

/** Apply every matching path override to the base rule map, in order. */
function resolveRulesForSource(
  baseRules: ReadonlyMap<string, ResolvedRuleConfig>,
  overrides: readonly ResolvedOverride[],
  source: string,
): ReadonlyMap<string, ResolvedRuleConfig> {
  const matchingOverrides = overrides.filter((override) => override.matches(source));
  if (matchingOverrides.length === 0) return baseRules;

  const rules = new Map(baseRules);
  for (const override of matchingOverrides) {
    for (const [id, delta] of override.rules) {
      if (delta.severity === 'off') {
        rules.delete(id);
      } else {
        rules.set(id, {
          rule: delta.rule,
          severity: delta.severity,
          options: delta.options,
          enabled: true,
        });
      }
    }
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Diagnostic sorting
// ---------------------------------------------------------------------------

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  // 1. By source (alphabetical)
  const sourceA = a.artifact.source;
  const sourceB = b.artifact.source;
  if (sourceA < sourceB) return -1;
  if (sourceA > sourceB) return 1;

  // 2. By severity (error → warning → info)
  const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (sevDiff !== 0) return sevDiff;

  // 3. By rule ID (alphabetical)
  if (a.ruleId < b.ruleId) return -1;
  if (a.ruleId > b.ruleId) return 1;

  // 4. By location fields (best-effort)
  const locA = a.location;
  const locB = b.location;
  if (locA !== undefined && locB !== undefined) {
    const layerA = locA.layer ?? '';
    const layerB = locB.layer ?? '';
    if (layerA < layerB) return -1;
    if (layerA > layerB) return 1;

    const featureA = locA.featureIndex ?? 0;
    const featureB = locB.featureIndex ?? 0;
    if (featureA !== featureB) return featureA - featureB;

    const partA = locA.partIndex ?? 0;
    const partB = locB.partIndex ?? 0;
    if (partA !== partB) return partA - partB;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Summary counting
// ---------------------------------------------------------------------------

function countSeverity(diagnostics: readonly Diagnostic[], severity: Severity): number {
  return diagnostics.filter((d) => d.severity === severity).length;
}

// ---------------------------------------------------------------------------
// EngineOptions
// ---------------------------------------------------------------------------

/**
 * Options accepted by createEngine(). A superset of TileGuardConfig that
 * additionally allows a pre-resolved Reporter object to be injected directly.
 *
 * When `reporter` is a Reporter object (has `id` and `report` properties),
 * it takes precedence over the string-based reporter config. Used by the CLI
 * (which constructs reporters from CLI flags) and tests (which inject mock
 * reporters for assertion).
 */
export interface EngineOptions {
  /** Plugins to load. Forwarded to TileGuardConfig. */
  plugins?: TileGuardConfig['plugins'];

  /** Rule configurations. Forwarded to TileGuardConfig. */
  rules?: TileGuardConfig['rules'];

  /**
   * Reporter to use.
   *
   * Accepts:
   *   - A reporter ID string (e.g., 'json')
   *   - A [id, options] tuple
   *   - A pre-constructed Reporter object (for tests / CLI)
   */
  reporter?: string | readonly [string, Record<string, unknown>] | Reporter;

  /** Path-specific overrides. Forwarded to TileGuardConfig. */
  overrides?: TileGuardConfig['overrides'];

  /** Global engine options. */
  options?: TileGuardConfig['options'];
}

// ---------------------------------------------------------------------------
// createEngine
// ---------------------------------------------------------------------------

/**
 * Creates a configured engine instance ready for execution.
 *
 * Performs upfront configuration resolution and validation. Throws
 * synchronously if configuration is invalid (duplicate rule IDs, etc.)
 * before any I/O is attempted.
 *
 * The returned engine is immutable and reusable across multiple run() calls.
 *
 * @param config - User configuration (plugins, rules, reporter, options).
 * @returns A configured Engine instance.
 *
 * @throws {Error} If duplicate rule IDs are detected across plugins.
 *
 * @example
 *   const engine = createEngine({
 *     plugins: [tilePlugin],
 *     rules: {
 *       'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
 *     },
 *   });
 *   const result = await engine.run(['./tile.pbf']);
 *   console.log(result.summary.pass); // true or false
 */
export function createEngine(config: EngineOptions = {}): Engine {
  // Build the TileGuardConfig from EngineOptions.
  // We construct it incrementally to satisfy exactOptionalPropertyTypes — we must
  // never assign `undefined` to an optional field when using object literals.
  const userConfig: TileGuardConfig = {};
  if (config.plugins !== undefined) userConfig.plugins = config.plugins;
  if (config.rules !== undefined) userConfig.rules = config.rules;
  if (config.overrides !== undefined) userConfig.overrides = config.overrides;
  if (config.options !== undefined) userConfig.options = config.options;
  // Only forward string / tuple reporter values — Reporter objects are injected below
  if (typeof config.reporter === 'string') {
    userConfig.reporter = config.reporter;
  } else if (Array.isArray(config.reporter)) {
    userConfig.reporter = config.reporter as readonly [string, Record<string, unknown>];
  }

  // Resolve the configuration (throws on invalid config)
  const resolvedConfig = resolveConfig(userConfig);

  // Allow a pre-constructed Reporter to be injected directly (for CLI / tests)
  let reporter = resolvedConfig.reporter;
  if (
    config.reporter !== undefined &&
    typeof config.reporter === 'object' &&
    !Array.isArray(config.reporter) &&
    'id' in config.reporter &&
    'report' in config.reporter
  ) {
    reporter = config.reporter as Reporter;
  }

  return {
    async run(sources: readonly string[]): Promise<RunResult> {
      const startTime = Date.now();
      const allDiagnostics: Diagnostic[] = [];
      let artifactCount = 0;
      let ruleExecutions = 0;
      let diagnosticsTruncated = false;

      /**
       * The truncation notice is part of the global budget. When the next
       * diagnostic would consume the final slot, that slot is used for the
       * notice and all remaining work is stopped.
       */
      const emitDiagnostic = (diagnostic: Diagnostic): boolean => {
        if (diagnosticsTruncated) return false;

        const limit = Math.max(0, Math.floor(resolvedConfig.options.maxDiagnostics));
        if (limit === 0) {
          diagnosticsTruncated = true;
          return false;
        }

        if (allDiagnostics.length >= limit - 1) {
          allDiagnostics.push({
            ruleId: 'engine/max-diagnostics',
            severity: 'warning',
            message:
              `Diagnostic limit of ${limit} reached; output was truncated. ` +
              'Increase options.maxDiagnostics to see more results.',
            artifact: diagnostic.artifact,
            data: { maxDiagnostics: limit },
          });
          diagnosticsTruncated = true;
          return false;
        }

        allDiagnostics.push(diagnostic);
        return true;
      };

      // ── For each source ─────────────────────────────────────────────────
      for (const source of sources) {
        // Find the first provider that can handle this source
        const provider = resolvedConfig.providers.find((p) => p.canHandle(source));

        if (provider === undefined) {
          emitDiagnostic({
            ruleId: 'artifact/no-provider',
            severity: 'error',
            message:
              `No registered provider can handle source "${source}". ` +
              'Ensure the appropriate plugin is loaded in your configuration.',
            artifact: { type: 'unknown', source },
          });
          if (diagnosticsTruncated) break;
          continue;
        }

        // Load the artifact
        let artifact: Artifact;
        try {
          artifact = await provider.load(source, {
            timeout: resolvedConfig.options.timeout,
          });
          artifactCount += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          emitDiagnostic({
            ruleId: 'artifact/load-failed',
            severity: 'error',
            message: `Failed to load artifact from "${source}": ${message}`,
            artifact: { type: provider.artifactTypes[0] ?? 'unknown', source },
          });
          if (diagnosticsTruncated) break;
          continue;
        }

        // Apply path-specific overrides before selecting rules for this artifact.
        const sourceRules = resolveRulesForSource(
          resolvedConfig.rules,
          resolvedConfig.overrides,
          source,
        );
        const matchingRules = buildRuleIndex(sourceRules).get(artifact.type) ?? [];

        // ── For each matching rule ────────────────────────────────────────
        for (const ruleConfig of matchingRules) {
          ruleExecutions += 1;
          let detailCount = 0;

          // Build the context for this rule invocation
          const context = {
            artifact,
            options: ruleConfig.options as Readonly<unknown> | undefined,
            report(descriptor: DiagnosticDescriptor): void {
              if (diagnosticsTruncated) return;
              if (detailCount >= resolvedConfig.options.maxDetails) {
                return; // per-rule cap reached
              }
              detailCount += 1;

              const diagnostic: Diagnostic = {
                ruleId: ruleConfig.rule.id,
                severity: ruleConfig.severity,
                message: descriptor.message,
                artifact: artifact.ref,
                ...(descriptor.location !== undefined && { location: descriptor.location }),
                ...(descriptor.suggestion !== undefined && { suggestion: descriptor.suggestion }),
                ...(descriptor.data !== undefined && { data: descriptor.data }),
                ...(ruleConfig.rule.meta.docsUrl !== undefined && {
                  docsUrl: ruleConfig.rule.meta.docsUrl,
                }),
              };
              emitDiagnostic(diagnostic);
            },
          };

          // Execute the rule, catching unexpected errors
          try {
            const result = ruleConfig.rule.create(context);
            if (result instanceof Promise) {
              await result;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : undefined;
            emitDiagnostic({
              ruleId: 'engine/rule-error',
              severity: 'error',
              message:
                `Rule "${ruleConfig.rule.id}" threw an unexpected error while validating ` +
                `"${source}": ${message}`,
              artifact: artifact.ref,
              data: {
                originalRuleId: ruleConfig.rule.id,
                errorMessage: message,
                ...(stack !== undefined && { stack }),
              },
            });
            if (diagnosticsTruncated) break;
            continue; // skip to next rule
          }

          if (diagnosticsTruncated) break;
        }

        if (diagnosticsTruncated) break;
      }

      // ── Sort diagnostics deterministically ──────────────────────────────
      allDiagnostics.sort(compareDiagnostics);

      const duration = Date.now() - startTime;
      const errors = countSeverity(allDiagnostics, 'error');
      const warnings = countSeverity(allDiagnostics, 'warning');
      const infos = countSeverity(allDiagnostics, 'info');

      const summary: RunSummary = {
        errors,
        warnings,
        infos,
        sourceCount: sources.length,
        artifactCount,
        ruleExecutions,
        duration,
        pass: errors === 0,
      };

      // ── Invoke the reporter ──────────────────────────────────────────────
      const reporterContext: ReporterContext = {
        duration,
        sources,
        ruleCount: ruleExecutions,
        artifactCount,
        summary: { errors, warnings, infos, pass: errors === 0 },
        config: resolvedConfig as unknown as Record<string, unknown>,
      };

      try {
        const reportResult = reporter.report(allDiagnostics, reporterContext);
        if (reportResult instanceof Promise) {
          await reportResult;
        }
      } catch {
        // Reporter errors must not affect the run result
        // The run completed; only the output step failed.
      }

      return {
        diagnostics: allDiagnostics,
        summary,
      };
    },
  };
}
