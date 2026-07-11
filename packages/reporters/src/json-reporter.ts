/**
 * @tileguard/reporters — JSON Reporter
 *
 * Produces structured JSON output for CI integration, programmatic
 * consumption, and piping to other tools.
 *
 * Output shape (from docs/architecture/05-reporter-system.md):
 *
 *   {
 *     "diagnostics": [ ... ],
 *     "summary": {
 *       "errors": 2,
 *       "warnings": 1,
 *       "infos": 0,
 *       "pass": false,
 *       "sources": 2,
 *       "rules": 12,
 *       "duration": 47
 *     }
 *   }
 *
 * The output is always valid JSON. Diagnostics are included exactly
 * as they appear in the engine output (sorted deterministically).
 */

import type { Diagnostic, Location, Reporter, ReporterContext, Severity } from '@tileguard/core';

// ---------------------------------------------------------------------------
// WriteFn — injectable output destination for testability
// ---------------------------------------------------------------------------

/**
 * The write function signature accepted by the JSON reporter.
 * Defaults to process.stdout.write but can be overridden in tests.
 */
export type WriteFn = (text: string) => void;

// ---------------------------------------------------------------------------
// JSON Reporter options
// ---------------------------------------------------------------------------

export interface JsonReporterOptions {
  /**
   * Override the output destination. Defaults to process.stdout.write.
   */
  write?: WriteFn;

  /**
   * Number of spaces for indentation. Defaults to 2.
   * Set to 0 for compact (single-line) JSON output.
   */
  indent?: number;
}

// ---------------------------------------------------------------------------
// JSON output shape
// ---------------------------------------------------------------------------

/**
 * The top-level shape of the JSON reporter output.
 * Exported for downstream consumers that want to parse TileGuard JSON output.
 */
export interface JsonReporterOutput {
  readonly diagnostics: readonly SerializedDiagnostic[];
  readonly summary: {
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
    readonly pass: boolean;
    readonly sources: number;
    readonly rules: number;
    readonly duration: number;
  };
}

/**
 * A diagnostic as it appears in JSON output.
 * Identical to the core Diagnostic interface but typed explicitly
 * for documentation and downstream parsing.
 */
export interface SerializedDiagnostic {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly message: string;
  readonly artifact: {
    readonly type: string;
    readonly source: string;
    readonly label?: string;
  };
  readonly location?: Location;
  readonly suggestion?: string;
  readonly docsUrl?: string;
  readonly data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// createJsonReporter
// ---------------------------------------------------------------------------

/**
 * Creates a JSON reporter with the given options.
 *
 * @param options - Optional configuration for output destination and formatting.
 * @returns A Reporter that produces structured JSON output.
 */
export function createJsonReporter(options: JsonReporterOptions = {}): Reporter {
  const write =
    options.write ??
    ((text: string) => {
      if (typeof process !== 'undefined' && process.stdout?.write !== undefined) {
        process.stdout.write(text);
      } else {
        console.info(text.endsWith('\n') ? text.slice(0, -1) : text);
      }
    });
  const indent = options.indent ?? 2;

  return {
    id: 'json',

    // NOTE: This reporter assumes diagnostics are already sorted
    // deterministically by the engine (source → severity → ruleId → location).
    // It does not re-sort them.
    report(diagnostics: readonly Diagnostic[], context: ReporterContext): void {
      const output: JsonReporterOutput = {
        diagnostics: diagnostics.map((d): SerializedDiagnostic => ({
          ruleId: d.ruleId,
          severity: d.severity,
          message: d.message,
          artifact: d.artifact,
          ...(d.location !== undefined && { location: d.location }),
          ...(d.suggestion !== undefined && { suggestion: d.suggestion }),
          ...(d.docsUrl !== undefined && { docsUrl: d.docsUrl }),
          ...(d.data !== undefined && { data: d.data }),
        })),
        summary: {
          errors: context.summary.errors,
          warnings: context.summary.warnings,
          infos: context.summary.infos,
          pass: context.summary.pass,
          sources: context.sources.length,
          rules: context.ruleCount,
          duration: context.duration,
        },
      };

      write(JSON.stringify(output, null, indent > 0 ? indent : undefined));
      write('\n');
    },
  };
}

/**
 * Default JSON reporter instance with standard options (2-space indent, stdout).
 */
export const jsonReporter: Reporter = createJsonReporter();
