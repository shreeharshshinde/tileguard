/**
 * @tileguard/reporters — Text Reporter
 *
 * The default reporter. Produces colored, human-readable terminal output
 * grouped by source file and sorted by severity.
 *
 * Output format (from docs/architecture/05-reporter-system.md):
 *
 *   ✗ tile/required-layers
 *     Required layer "buildings" is not present in the tile.
 *     at ./fixtures/test-tile.pbf → layer: buildings
 *     ℹ Add a "buildings" layer to your tile generation pipeline.
 *
 *   ⚠ tile/no-empty
 *     Tile contains 0 features.
 *     at ./fixtures/empty-tile.pbf
 *
 *   ──────────────────────────────────
 *     2 errors, 1 warning in 2 files (47ms)
 */

import type { Diagnostic, Location, Reporter, ReporterContext, Severity } from '@tileguard/core';

// ---------------------------------------------------------------------------
// ANSI color codes
// ---------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const GRAY = '\x1b[90m';

// ---------------------------------------------------------------------------
// Severity rendering
// ---------------------------------------------------------------------------

const SEVERITY_ICON: Record<Severity, string> = {
  error: `${RED}✗${RESET}`,
  warning: `${YELLOW}⚠${RESET}`,
  info: `${CYAN}ℹ${RESET}`,
};

const SEVERITY_COLOR: Record<Severity, string> = {
  error: RED,
  warning: YELLOW,
  info: CYAN,
};

// ---------------------------------------------------------------------------
// Location formatting
// ---------------------------------------------------------------------------

/**
 * Formats a Location into a human-readable breadcrumb string.
 *
 * Examples:
 *   "layer: water, feature: 7, part: 0"
 *   "layers[3].paint.fill-color"
 *   "line: 12, column: 5"
 *   "region: 100,200 32×32"
 */
function formatLocation(location: Location): string {
  const parts: string[] = [];

  if (location.layer !== undefined) {
    parts.push(`layer: ${location.layer}`);
  }
  if (location.featureIndex !== undefined) {
    parts.push(`feature: ${location.featureIndex}`);
  }
  if (location.partIndex !== undefined) {
    parts.push(`part: ${location.partIndex}`);
  }
  if (location.jsonPath !== undefined) {
    parts.push(location.jsonPath);
  }
  if (location.line !== undefined) {
    let lineStr = `line: ${location.line}`;
    if (location.column !== undefined) {
      lineStr += `, column: ${location.column}`;
    }
    parts.push(lineStr);
  }
  if (location.region !== undefined) {
    const { x, y, width, height } = location.region;
    parts.push(`region: ${x},${y} ${width}×${height}`);
  }

  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// WriteFn — injectable output destination for testability
// ---------------------------------------------------------------------------

/**
 * The write function signature accepted by the text reporter.
 * Defaults to process.stdout.write but can be overridden in tests.
 */
export type WriteFn = (text: string) => void;

// ---------------------------------------------------------------------------
// Text Reporter options
// ---------------------------------------------------------------------------

export interface TextReporterOptions {
  /**
   * Override the output destination. Defaults to process.stdout.write.
   * Useful for testing or capturing output programmatically.
   */
  write?: WriteFn;

  /**
   * Whether to use ANSI color codes. Defaults to true when stdout is a TTY.
   * Set to false for environments that don't support color.
   */
  color?: boolean;
}

// ---------------------------------------------------------------------------
// createTextReporter
// ---------------------------------------------------------------------------

/**
 * Creates a text reporter with the given options.
 *
 * @param options - Optional configuration for output destination and color.
 * @returns A Reporter that produces human-readable terminal output.
 */
export function createTextReporter(options: TextReporterOptions = {}): Reporter {
  const write =
    options.write ??
    ((text: string) => {
      if (typeof process !== 'undefined' && process.stdout?.write !== undefined) {
        process.stdout.write(text);
      } else {
        console.log(text.endsWith('\n') ? text.slice(0, -1) : text);
      }
    });
  const useColor = options.color ?? (typeof process !== 'undefined' && process.stdout?.isTTY === true);

  // Strip ANSI codes when color is disabled
  const c = (code: string, text: string): string => (useColor ? `${code}${text}${RESET}` : text);
  const icon = (severity: Severity): string =>
    useColor ? SEVERITY_ICON[severity] : severity === 'error' ? '✗' : severity === 'warning' ? '⚠' : 'ℹ';

  return {
    id: 'text',

    // NOTE: This reporter assumes diagnostics are already sorted
    // deterministically by the engine (source → severity → ruleId → location).
    // It does not re-sort them.
    report(diagnostics: readonly Diagnostic[], context: ReporterContext): void {
      if (diagnostics.length === 0) {
        write(`${c(GREEN, '✔ PASS')} No problems found`);
        write(
          ` ${c(DIM, `(${context.sources.length} source${context.sources.length === 1 ? '' : 's'}, ${context.duration}ms)`)}\n`,
        );
        return;
      }

      // Group diagnostics by source
      const grouped = new Map<string, Diagnostic[]>();
      for (const diagnostic of diagnostics) {
        const source = diagnostic.artifact.source;
        const group = grouped.get(source);
        if (group !== undefined) {
          group.push(diagnostic);
        } else {
          grouped.set(source, [diagnostic]);
        }
      }

      // Render each source group
      for (const [source, diags] of grouped) {
        write(`\n${c(BOLD, source)}\n`);

        for (const diagnostic of diags) {
          const sevIcon = icon(diagnostic.severity);
          const sevColor = SEVERITY_COLOR[diagnostic.severity];

          // Rule ID line with severity icon
          write(`  ${sevIcon} ${c(sevColor, diagnostic.ruleId)}\n`);

          // Message
          write(`    ${diagnostic.message}\n`);

          // Location breadcrumb
          if (diagnostic.location !== undefined) {
            const locationStr = formatLocation(diagnostic.location);
            if (locationStr.length > 0) {
              write(`    ${c(GRAY, `at ${source} → ${locationStr}`)}\n`);
            }
          }

          // Suggestion
          if (diagnostic.suggestion !== undefined) {
            write(`    ${c(CYAN, `ℹ ${diagnostic.suggestion}`)}\n`);
          }

          // Docs URL
          if (diagnostic.docsUrl !== undefined) {
            write(`    ${c(DIM, diagnostic.docsUrl)}\n`);
          }

          write('\n');
        }
      }

      // Summary separator, verdict, and counts
      const separator = '─'.repeat(40);
      write(`${c(DIM, separator)}\n`);

      // Verdict line (like cargo test / eslint / jest)
      const { errors, warnings, infos, pass } = context.summary;
      if (pass) {
        write(`  ${c(GREEN, '✓ PASS')}\n`);
      } else {
        write(`  ${c(RED, '✗ FAILED')}\n`);
      }

      const parts: string[] = [];

      if (errors > 0) {
        parts.push(c(RED, `${errors} error${errors === 1 ? '' : 's'}`));
      }
      if (warnings > 0) {
        parts.push(c(YELLOW, `${warnings} warning${warnings === 1 ? '' : 's'}`));
      }
      if (infos > 0) {
        parts.push(c(CYAN, `${infos} info${infos === 1 ? '' : 's'}`));
      }

      const sourceCount = context.sources.length;
      const sourceLabel = `${sourceCount} source${sourceCount === 1 ? '' : 's'}`;
      write(`  ${parts.join(', ')} in ${sourceLabel} ${c(DIM, `(${context.duration}ms)`)}\n`);
    },
  };
}

/**
 * Default text reporter instance with standard options.
 * Uses process.stdout.write and auto-detects TTY for color.
 */
export const textReporter: Reporter = createTextReporter();
