/**
 * @tileguard/core — Smoke Test (v0.2.0)
 *
 * External validation script that runs the core engine against real files on
 * disk. Uses actual MapLibre style rules written directly here — no mocks.
 *
 * This is NOT a unit test. It proves the full pipeline works end-to-end:
 *   CLI args → input validation → file I/O → provider → artifact →
 *   rules → diagnostics → reporter → exit code
 *
 * Usage:
 *   npx tsx smoke.ts                                   # runs all three default fixtures
 *   npx tsx smoke.ts smoke-fixtures/valid-style.json
 *   npx tsx smoke.ts smoke-fixtures/broken-style.json
 *   npx tsx smoke.ts smoke-fixtures/not-json.txt
 *   npx tsx smoke.ts smoke-fixtures/valid-style.json smoke-fixtures/broken-style.json
 *
 * Exit codes:
 *   0  — all files passed (no errors)
 *   1  — one or more validation errors found
 *   2  — usage error (bad arguments) or unexpected engine crash
 */

import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type {
  ArtifactProvider,
  Diagnostic,
  Plugin,
  Reporter,
  ReporterContext,
  Rule,
  RunResult,
} from './src/index.js';
import { createEngine } from './src/index.js';

// ---------------------------------------------------------------------------
// Global unhandled rejection guard
// Must be registered before any async work begins so nothing slips through.
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  process.stderr.write(
    `\n[smoke] Fatal: unhandled promise rejection\n${message}\n` +
      (stack !== undefined ? `${stack}\n` : ''),
  );
  process.exit(2);
});

// ---------------------------------------------------------------------------
// ANSI colour helpers
// Colour is disabled automatically when:
//   - stdout is not a TTY (e.g. piped to a file or CI with no colour support)
//   - the NO_COLOR env variable is set (https://no-color.org)
// ---------------------------------------------------------------------------

const USE_COLOR = process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

const c = {
  red: (s: string) => (USE_COLOR ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (USE_COLOR ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s: string) => (USE_COLOR ? `\x1b[36m${s}\x1b[0m` : s),
  green: (s: string) => (USE_COLOR ? `\x1b[32m${s}\x1b[0m` : s),
  bold: (s: string) => (USE_COLOR ? `\x1b[1m${s}\x1b[0m` : s),
  grey: (s: string) => (USE_COLOR ? `\x1b[90m${s}\x1b[0m` : s),
};

function severityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return c.red('✗');
    case 'warning':
      return c.yellow('⚠');
    default:
      return c.cyan('ℹ');
  }
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'error':
      return c.red('error');
    case 'warning':
      return c.yellow('warning');
    default:
      return c.cyan('info');
  }
}

// ---------------------------------------------------------------------------
// Input validation — run before the engine so bad args get a clear message
// ---------------------------------------------------------------------------

/**
 * Validates CLI source arguments.
 * Returns { valid: string[], errors: string[] } where valid contains the
 * resolved absolute paths of sources that are safe to pass to the engine,
 * and errors contains human-readable messages for each bad argument.
 */
async function validateSources(
  rawArgs: readonly string[],
): Promise<{ valid: string[]; errors: string[] }> {
  const valid: string[] = [];
  const errors: string[] = [];

  for (const arg of rawArgs) {
    // Reject empty strings
    if (arg.trim() === '') {
      errors.push(`Empty string passed as a source argument.`);
      continue;
    }

    // Resolve to absolute path for consistent error messages
    const absPath = resolve(arg);

    // Check the file actually exists and is a regular file (not a directory)
    try {
      const info = await stat(absPath);
      if (!info.isFile()) {
        errors.push(`"${arg}" is a directory, not a file.`);
        continue;
      }
    } catch (err) {
      // stat() throws if path doesn't exist or permissions are denied
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        errors.push(`"${arg}" does not exist.`);
      } else if (code === 'EACCES') {
        errors.push(`"${arg}" cannot be read — permission denied.`);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`"${arg}" could not be accessed: ${msg}`);
      }
      continue;
    }

    valid.push(absPath);
  }

  return { valid, errors };
}

// ---------------------------------------------------------------------------
// MapLibre style content shape (minimal — only what the rules need)
// ---------------------------------------------------------------------------

interface StyleLayer {
  id?: unknown;
  type?: unknown;
  source?: unknown;
  minzoom?: unknown;
  maxzoom?: unknown;
}

interface MapLibreStyle {
  version?: unknown;
  sources?: Record<string, unknown>;
  layers?: StyleLayer[];
}

// ---------------------------------------------------------------------------
// Artifact provider — reads .json files from disk
// ---------------------------------------------------------------------------

const fileProvider: ArtifactProvider = {
  id: 'file-provider',
  artifactTypes: ['MapLibreStyle'],

  canHandle(source: string): boolean {
    // Only handle local file paths (not http/https URLs).
    // Accept any extension — the engine will have already validated the path
    // exists via validateSources(). canHandle() must be fast and synchronous.
    return !source.startsWith('http://') && !source.startsWith('https://');
  },

  async load(source: string) {
    // source is already an absolute path (resolved by validateSources).
    let raw: string;
    try {
      raw = await readFile(source, 'utf8');
    } catch (err) {
      // Re-throw so the engine catches it and emits artifact/load-failed.
      // This path covers race conditions (file deleted between stat and read)
      // or platform-level I/O errors that stat() didn't catch.
      const code = (err as NodeJS.ErrnoException).code ?? 'UNKNOWN';
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Could not read "${basename(source)}" [${code}]: ${detail}`);
    }

    // Empty file — parseable but not a valid style
    if (raw.trim() === '') {
      throw new Error(`"${basename(source)}" is empty. A MapLibre style must be a JSON object.`);
    }

    // Parse JSON — re-throw on syntax errors
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // Extract the SyntaxError position for better diagnostics
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`"${basename(source)}" contains invalid JSON: ${detail}`);
    }

    // Ensure it parsed to an object, not an array, number, string, etc.
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `"${basename(source)}" parsed successfully but is not a JSON object ` +
          `(got ${Array.isArray(parsed) ? 'array' : typeof parsed}).`,
      );
    }

    return {
      type: 'MapLibreStyle' as const,
      ref: { type: 'MapLibreStyle', source },
      content: parsed as MapLibreStyle,
      metadata: {
        fileSizeBytes: Buffer.byteLength(raw, 'utf8'),
        fileName: basename(source),
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Style rules — real MapLibre style validation logic
// ---------------------------------------------------------------------------

/** style/version — version field must be exactly 8 */
const versionRule: Rule = {
  id: 'style/version',
  meta: {
    description: 'MapLibre style version must be 8.',
    defaultSeverity: 'error',
    recommended: true,
    docsUrl: 'https://tileguard.dev/rules/style/version',
  },
  artifactTypes: ['MapLibreStyle'],
  create(context) {
    const style = context.artifact.content as MapLibreStyle;

    if (style.version === undefined) {
      context.report({
        message: 'Style is missing the required "version" field.',
        location: { jsonPath: 'version' },
        suggestion: 'Add "version": 8 at the top level of your style JSON.',
      });
      return;
    }

    if (style.version !== 8) {
      context.report({
        message: `Style version must be 8, but found ${JSON.stringify(style.version)}.`,
        location: { jsonPath: 'version' },
        suggestion: 'Set "version": 8 at the top level of your style JSON.',
      });
    }
  },
};

/** style/known-source — every layer's "source" must reference a declared source */
const knownSourceRule: Rule = {
  id: 'style/known-source',
  meta: {
    description: 'Layer source references must point to declared sources.',
    defaultSeverity: 'error',
    recommended: true,
    docsUrl: 'https://tileguard.dev/rules/style/known-source',
  },
  artifactTypes: ['MapLibreStyle'],
  create(context) {
    const style = context.artifact.content as MapLibreStyle;
    const declaredSources = new Set(Object.keys(style.sources ?? {}));
    const layers = style.layers ?? [];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]!;

      // Background and sky layers have no source — skip them
      if (layer.type === 'background' || layer.type === 'sky') continue;

      // Layer is missing the source field entirely
      if (layer.source === undefined) {
        // Only report if it's a type that *needs* a source
        if (layer.type !== undefined) {
          context.report({
            message: `Layer "${layer.id}" (type: ${JSON.stringify(layer.type)}) is missing the required "source" field.`,
            location: { jsonPath: `layers[${i}].source` },
            suggestion: `Add a "source" field that references one of: ${[...declaredSources].join(', ') || '(no sources declared)'}`,
          });
        }
        continue;
      }

      // Source is present but not a string
      if (typeof layer.source !== 'string') {
        context.report({
          message: `Layer "${layer.id}" has a "source" field that is not a string (got ${typeof layer.source}).`,
          location: { jsonPath: `layers[${i}].source` },
          suggestion: `The "source" field must be a string matching a key in the top-level "sources" object.`,
        });
        continue;
      }

      // Source is a string but not in the declared sources
      if (!declaredSources.has(layer.source)) {
        context.report({
          message: `Layer "${layer.id}" references unknown source "${layer.source}".`,
          location: { jsonPath: `layers[${i}].source` },
          suggestion: `Add "${layer.source}" to the top-level "sources" object, or fix the source reference.`,
          data: {
            layerId: layer.id,
            unknownSource: layer.source,
            availableSources: [...declaredSources],
          },
        });
      }
    }
  },
};

/** style/zoom-range — minzoom must not exceed maxzoom */
const zoomRangeRule: Rule = {
  id: 'style/zoom-range',
  meta: {
    description: 'Layer minzoom must not exceed maxzoom.',
    defaultSeverity: 'error',
    recommended: true,
    docsUrl: 'https://tileguard.dev/rules/style/zoom-range',
  },
  artifactTypes: ['MapLibreStyle'],
  create(context) {
    const style = context.artifact.content as MapLibreStyle;
    const layers = style.layers ?? [];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]!;
      const min = layer.minzoom;
      const max = layer.maxzoom;

      // Validate minzoom type
      if (min !== undefined && typeof min !== 'number') {
        context.report({
          message: `Layer "${layer.id}" has a non-numeric minzoom: ${JSON.stringify(min)}.`,
          location: { jsonPath: `layers[${i}].minzoom` },
          suggestion: `minzoom must be a number between 0 and 24.`,
        });
        continue;
      }

      // Validate maxzoom type
      if (max !== undefined && typeof max !== 'number') {
        context.report({
          message: `Layer "${layer.id}" has a non-numeric maxzoom: ${JSON.stringify(max)}.`,
          location: { jsonPath: `layers[${i}].maxzoom` },
          suggestion: `maxzoom must be a number between 0 and 24.`,
        });
        continue;
      }

      // Validate zoom values are within spec range [0, 24]
      if (typeof min === 'number' && (min < 0 || min > 24)) {
        context.report({
          message: `Layer "${layer.id}" has minzoom ${min} outside the valid range [0, 24].`,
          location: { jsonPath: `layers[${i}].minzoom` },
          suggestion: `Set minzoom to a value between 0 and 24.`,
        });
      }

      if (typeof max === 'number' && (max < 0 || max > 24)) {
        context.report({
          message: `Layer "${layer.id}" has maxzoom ${max} outside the valid range [0, 24].`,
          location: { jsonPath: `layers[${i}].maxzoom` },
          suggestion: `Set maxzoom to a value between 0 and 24.`,
        });
      }

      // Validate minzoom <= maxzoom
      if (typeof min === 'number' && typeof max === 'number' && min > max) {
        context.report({
          message: `Layer "${layer.id}" has minzoom (${min}) greater than maxzoom (${max}).`,
          location: { jsonPath: `layers[${i}].minzoom` },
          suggestion: `Swap the minzoom and maxzoom values, or remove one of them.`,
          data: { layerId: layer.id, minzoom: min, maxzoom: max },
        });
      }
    }
  },
};

/** style/unique-layer-id — layer IDs must be unique */
const uniqueLayerIdRule: Rule = {
  id: 'style/unique-layer-id',
  meta: {
    description: 'Layer IDs must be unique within a style.',
    defaultSeverity: 'error',
    recommended: true,
    docsUrl: 'https://tileguard.dev/rules/style/unique-layer-id',
  },
  artifactTypes: ['MapLibreStyle'],
  create(context) {
    const style = context.artifact.content as MapLibreStyle;
    const layers = style.layers ?? [];
    const seen = new Map<string, number>(); // id → first-seen index

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]!;
      const id = layer.id;

      // Missing ID
      if (id === undefined) {
        context.report({
          message: `Layer at index ${i} is missing the required "id" field.`,
          location: { jsonPath: `layers[${i}].id` },
          suggestion: `Add a unique string "id" to every layer.`,
        });
        continue;
      }

      // Non-string ID
      if (typeof id !== 'string') {
        context.report({
          message: `Layer at index ${i} has a non-string "id": ${JSON.stringify(id)}.`,
          location: { jsonPath: `layers[${i}].id` },
          suggestion: `Layer IDs must be strings.`,
        });
        continue;
      }

      // Duplicate ID
      const firstIndex = seen.get(id);
      if (firstIndex !== undefined) {
        context.report({
          message: `Duplicate layer ID "${id}" at index ${i} (first seen at index ${firstIndex}).`,
          location: { jsonPath: `layers[${i}].id` },
          suggestion: `Rename one of the layers to use a unique ID.`,
          data: { layerId: id, duplicateIndex: i, firstIndex },
        });
      } else {
        seen.set(id, i);
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Terminal reporter — coloured, grouped, human-readable output
// ---------------------------------------------------------------------------

const terminalReporter: Reporter = {
  id: 'terminal',

  report(diagnostics: readonly Diagnostic[], ctx: ReporterContext): void {
    const DIVIDER = c.grey('─'.repeat(60));
    const out = (s: string) => process.stdout.write(s);

    // Build a set of all sources that had *any* diagnostic
    const sourcesWithDiags = new Set(diagnostics.map((d) => d.artifact.source));

    // Also collect the sources that were processed cleanly (no diagnostics).
    // ctx.sources contains the original args; we need to match them against
    // what ended up in the artifact refs (absolute paths after resolution).
    const cleanSources = ctx.sources.filter((s) => !sourcesWithDiags.has(s));

    // ── Print files with issues ───────────────────────────────────────────
    // Group diagnostics by source
    const bySource = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
      const src = d.artifact.source;
      const arr = bySource.get(src);
      if (arr !== undefined) {
        arr.push(d);
      } else {
        bySource.set(src, [d]);
      }
    }

    for (const [source, fileDiags] of bySource) {
      const fileErrors = fileDiags.filter((d) => d.severity === 'error').length;
      const fileWarnings = fileDiags.filter((d) => d.severity === 'warning').length;

      // File header
      out(`\n${c.bold(basename(source))}\n`);
      out(`${c.grey(source)}\n`);

      // Per-file counts
      const parts: string[] = [];
      if (fileErrors > 0) parts.push(c.red(`${fileErrors} error${fileErrors > 1 ? 's' : ''}`));
      if (fileWarnings > 0)
        parts.push(c.yellow(`${fileWarnings} warning${fileWarnings > 1 ? 's' : ''}`));
      out(`${parts.join(', ')}\n`);

      // Individual diagnostics
      for (const d of fileDiags) {
        out('\n');
        out(
          `  ${severityIcon(d.severity)}  ${c.bold(d.ruleId)}  ${c.grey(`[${severityLabel(d.severity)}]`)}\n`,
        );
        out(`     ${d.message}\n`);

        if (d.location !== undefined) {
          const loc = d.location;
          if (loc.jsonPath !== undefined) {
            out(`     ${c.grey(`at: ${loc.jsonPath}`)}\n`);
          } else if (loc.layer !== undefined) {
            const parts: string[] = [`layer: ${loc.layer}`];
            if (loc.featureIndex !== undefined) parts.push(`feature: ${loc.featureIndex}`);
            if (loc.partIndex !== undefined) parts.push(`part: ${loc.partIndex}`);
            out(`     ${c.grey(`at: ${parts.join(', ')}`)}\n`);
          }
        }

        if (d.suggestion !== undefined) {
          out(`     ${c.cyan('→')} ${d.suggestion}\n`);
        }

        if (d.docsUrl !== undefined) {
          out(`     ${c.grey(d.docsUrl)}\n`);
        }
      }
    }

    // ── Print clean files ─────────────────────────────────────────────────
    for (const source of cleanSources) {
      out(`\n${c.bold(basename(source))}\n`);
      out(`${c.grey(source)}\n`);
      out(`${c.green('✓ no issues')}\n`);
    }

    // ── Summary footer ────────────────────────────────────────────────────
    out(`\n${DIVIDER}\n`);

    const { errors: totalErrors, warnings: totalWarnings } = ctx.summary;
    const statusLine = ctx.summary.pass ? c.green(c.bold('PASS')) : c.red(c.bold('FAIL'));

    const countParts: string[] = [];
    if (totalErrors > 0)
      countParts.push(c.red(`${totalErrors} error${totalErrors > 1 ? 's' : ''}`));
    if (totalWarnings > 0)
      countParts.push(c.yellow(`${totalWarnings} warning${totalWarnings > 1 ? 's' : ''}`));
    const countsLine = countParts.length > 0 ? countParts.join(', ') : c.green('0 issues');

    out(
      `${statusLine}  ${countsLine}  ${c.grey(`in ${ctx.sources.length} file${ctx.sources.length > 1 ? 's' : ''} (${ctx.duration}ms)`)}\n\n`,
    );
  },
};

// ---------------------------------------------------------------------------
// Plugin — wires the provider and rules together
// ---------------------------------------------------------------------------

const stylePlugin: Plugin = {
  id: 'style-smoke',
  name: 'Style Smoke Plugin',
  version: '0.2.0',
  providers: [fileProvider],
  rules: [versionRule, knownSourceRule, zoomRangeRule, uniqueLayerIdRule],
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const HEADER = c.bold('\n@tileguard/core — Smoke Test (v0.2.0)\n');

  // ── Determine sources ────────────────────────────────────────────────────
  const rawArgs = process.argv.slice(2);

  let filePaths: string[];

  if (rawArgs.length === 0) {
    // No args: run the three built-in smoke fixtures
    process.stdout.write(HEADER + c.grey('No files specified — running default smoke fixtures.\n'));
    filePaths = [
      'smoke-fixtures/valid-style.json',
      'smoke-fixtures/broken-style.json',
      'smoke-fixtures/not-json.txt',
    ];
  } else {
    process.stdout.write(HEADER);
    filePaths = rawArgs;
  }

  // ── Validate inputs before touching the engine ───────────────────────────
  const { valid, errors: argErrors } = await validateSources(filePaths);

  if (argErrors.length > 0) {
    process.stderr.write(c.red('\n[smoke] Input error(s):\n'));
    for (const err of argErrors) {
      process.stderr.write(`  ${c.red('✗')}  ${err}\n`);
    }
    // If ALL args were invalid there's nothing for the engine to do
    if (valid.length === 0) {
      process.stderr.write('\nNo valid files to process. Exiting.\n');
      process.exit(2);
    }
    process.stderr.write(
      c.yellow(`\n  Continuing with ${valid.length} valid file${valid.length > 1 ? 's' : ''}.\n\n`),
    );
  }

  // ── Create engine and run ────────────────────────────────────────────────
  const engine = createEngine({
    plugins: [stylePlugin],
    reporter: terminalReporter,
  });

  process.stdout.write(
    c.grey(`Engine ready — validating ${valid.length} file${valid.length > 1 ? 's' : ''}...\n`),
  );

  let result: RunResult;
  try {
    result = await engine.run(valid);
  } catch (err) {
    // engine.run() should never throw in normal operation — this path is a
    // genuine bug in the engine itself or a catastrophic environment failure.
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    process.stderr.write(c.red(`\n[smoke] Fatal: engine.run() threw unexpectedly.\n`));
    process.stderr.write(`${message}\n`);
    if (stack !== undefined) {
      process.stderr.write(c.grey(`${stack}\n`));
    }
    process.stderr.write(
      c.grey(
        '\nThis is a bug in @tileguard/core. Please open an issue at\n' +
          'https://github.com/your-org/tileguard/issues with the output above.\n',
      ),
    );
    process.exit(2);
  }

  // Reporter has already printed. Set exit code from summary.
  process.exit(result.summary.pass ? 0 : 1);
}

main();
