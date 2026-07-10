/**
 * @tileguard/core — Configuration Contract
 *
 * The configuration system allows users to customize TileGuard's behavior
 * per-project: which rules are enabled, at what severity, with what options,
 * and which reporter to use.
 *
 * Design principles:
 * - One config file, one location, no cascading (see ADR-005).
 * - Flat rule configuration: rules are a plain key→value map.
 * - CLI flags always override config file values.
 * - Invalid rule options produce configuration errors before the run starts,
 *   not runtime crashes during rule execution.
 *
 * See docs/architecture/06-configuration.md for the full specification.
 */

import type { ArtifactProvider } from './artifact.js';
import type { Severity } from './diagnostic.js';
import type { Plugin } from './plugin.js';
import type { Reporter } from './reporter.js';
import type { Rule } from './rule.js';

// ---------------------------------------------------------------------------
// RuleConfig
// ---------------------------------------------------------------------------

/**
 * A single rule's configuration entry.
 *
 * Three forms are accepted:
 *
 *   'off'                  — Disable this rule entirely (no diagnostics).
 *   Severity               — Enable at the given severity, no custom options.
 *   [Severity, Options]    — Enable at the given severity with custom options.
 *
 * The options value is rule-specific. If the rule declares a schema, the
 * engine validates the options against it before the run begins.
 *
 * Examples:
 *   'tile/unclosed-ring': 'error'
 *   'tile/self-intersection': 'warning'
 *   'tile/no-empty': 'off'
 *   'tile/required-layers': ['error', { layers: ['water', 'roads'] }]
 */
export type RuleConfig = Severity | 'off' | readonly [Severity, unknown];

// ---------------------------------------------------------------------------
// GlobalOptions
// ---------------------------------------------------------------------------

/**
 * Global options that apply to all providers and the engine runtime.
 * These can be set in the config file and overridden via CLI flags.
 */
export interface GlobalOptions {
  /**
   * HTTP request timeout for remote artifact loading, in milliseconds.
   * Default: 30000 (30 seconds).
   */
  timeout?: number;

  /**
   * Maximum number of diagnostics to collect per rule per artifact.
   * Rules that find more than this number of problems will have their
   * output silently truncated. Prevents runaway output on pathological inputs.
   * Default: 100.
   */
  maxDetails?: number;

  /**
   * Maximum total diagnostics across the entire run.
   * This includes rule, infrastructure, engine, and truncation diagnostics.
   * The final available slot is used for the truncation diagnostic, and no
   * more sources or rules are dispatched after the limit is reached.
   * Default: 1000.
   */
  maxDiagnostics?: number;
}

// ---------------------------------------------------------------------------
// Override
// ---------------------------------------------------------------------------

/**
 * A path-specific configuration override.
 *
 * Overrides allow different rule configurations for different file patterns
 * within a single config file. This is the supported alternative to
 * directory-level cascading configuration, which TileGuard intentionally
 * does not support.
 *
 * Example:
 *   overrides: [
 *     {
 *       files: ['fixtures/experimental/**'],
 *       rules: { 'tile/self-intersection': 'off' },
 *     },
 *   ],
 */
export interface Override {
  /**
   * Glob patterns to match against artifact source paths.
   * Multiple patterns are ORed: an artifact matching any pattern
   * will have these overrides applied.
   */
  readonly files: readonly string[];

  /**
   * Rule configurations to apply for matching artifacts.
   * These are merged on top of the base rules configuration.
   */
  readonly rules?: Record<string, RuleConfig>;
}

// ---------------------------------------------------------------------------
// TileGuardConfig
// ---------------------------------------------------------------------------

/**
 * The user-facing configuration type. This is what tileguard.config.ts
 * exports as its default export.
 *
 * All fields are optional. Without any configuration, the engine runs all
 * recommended rules at their default severities using the text reporter.
 */
export interface TileGuardConfig {
  /**
   * Plugins to load.
   *
   * Each plugin contributes artifact providers and validation rules.
   * Plugins are processed in array order; provider registration follows
   * this order, so earlier plugins have priority in source matching.
   */
  plugins?: readonly Plugin[];

  /**
   * Rule configurations.
   *
   * Keys are rule IDs (e.g., "tile/required-layers"). Values are RuleConfig
   * entries (severity string, 'off', or [severity, options] tuple).
   *
   * Rules not listed here use their meta.defaultSeverity. Non-recommended
   * rules (meta.recommended !== true) not listed here default to 'off'.
   */
  rules?: Record<string, RuleConfig>;

  /**
   * Reporter to use for output.
   *
   * Accepts a reporter ID string or a [id, options] tuple.
   * Default: 'text'.
   *
   * Examples:
   *   reporter: 'json'
   *   reporter: ['sarif', { output: './results.sarif' }]
   */
  reporter?: string | readonly [string, Record<string, unknown>];

  /**
   * Path-specific rule overrides.
   *
   * Applied in array order. Later overrides take precedence over earlier ones.
   */
  overrides?: readonly Override[];

  /**
   * Global engine options.
   */
  options?: GlobalOptions;
}

// ---------------------------------------------------------------------------
// ResolvedRuleConfig
// ---------------------------------------------------------------------------

/**
 * A single rule's fully resolved configuration, after merging defaults
 * and user overrides. This is what the engine uses internally during a run.
 */
export interface ResolvedRuleConfig {
  /**
   * The rule object itself.
   */
  readonly rule: Rule;

  /**
   * The resolved severity for this rule.
   * Never 'off' — disabled rules are excluded from the resolved config.
   */
  readonly severity: Severity;

  /**
   * The resolved options for this rule, as provided by the user config.
   * undefined if the user did not provide options.
   */
  readonly options: unknown;

  /**
   * Whether this rule is currently enabled.
   * Always true in the resolved config (disabled rules are not included).
   */
  readonly enabled: true;
}

// ---------------------------------------------------------------------------
// ResolvedOverride
// ---------------------------------------------------------------------------

/** A rule delta from a path-specific override after configuration resolution. */
export interface ResolvedRuleOverride {
  /** The registered rule this delta configures. */
  readonly rule: Rule;

  /** The severity to apply, or 'off' to disable the rule for matching sources. */
  readonly severity: Severity | 'off';

  /** Rule-specific options supplied by the override, if any. */
  readonly options: unknown;
}

/**
 * A compiled path-specific override.
 *
 * Matchers are prepared once during configuration resolution. Rule deltas are
 * then applied per source, in declaration order, immediately before dispatch.
 */
export interface ResolvedOverride {
  /** Returns true when this override applies to a source path. */
  readonly matches: (source: string) => boolean;

  /** Resolved rule deltas, keyed by rule ID. */
  readonly rules: ReadonlyMap<string, ResolvedRuleOverride>;
}

// ---------------------------------------------------------------------------
// ResolvedConfig
// ---------------------------------------------------------------------------

/**
 * The fully resolved configuration after loading the config file, merging
 * CLI flags, and validating all rule options.
 *
 * This is the internal representation used throughout an engine run. It is
 * constructed once at the start of engine.run() and is immutable for the
 * duration of the run.
 */
export interface ResolvedConfig {
  /**
   * All enabled rules, keyed by rule ID.
   * Rules configured as 'off' are absent from this map.
   */
  readonly rules: ReadonlyMap<string, ResolvedRuleConfig>;

  /**
   * All registered artifact providers, in registration order.
   * Providers from earlier plugins appear first.
   */
  readonly providers: readonly ArtifactProvider[];

  /**
   * The reporter to use for this run.
   */
  readonly reporter: Reporter;

  /**
   * Resolved global options with all defaults applied.
   */
  readonly options: Required<GlobalOptions>;

  /**
   * Compiled path-specific overrides, in declaration order.
   * Later matching entries take precedence over earlier entries.
   */
  readonly overrides: readonly ResolvedOverride[];
}
