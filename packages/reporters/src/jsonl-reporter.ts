/**
 * @tileguard/reporters — JSONL Reporter
 *
 * Produces Newline-Delimited JSON (NDJSON / JSONL) output for streaming
 * pipelines, CI systems with large corpora, and tools that consume output
 * incrementally.
 *
 * Unlike the `json` reporter — which buffers the entire diagnostic list in
 * RAM and writes a single JSON object at the end — this reporter emits one
 * JSON line per diagnostic as the reporter receives them, keeping memory usage
 * flat regardless of corpus size.
 *
 * Output format:
 *
 *   {"ruleId":"tile/self-intersection","severity":"error","message":"...","artifact":{...}}\n
 *   {"ruleId":"tile/winding-order","severity":"warning","message":"...","artifact":{...}}\n
 *   ...
 *   {"_type":"summary","errors":2,"warnings":1,"infos":0,"pass":false,"sources":3,...}\n
 *
 * The last line is always the summary record (distinguished by `_type:
 * "summary"`), making it easy to `tail -1` the output for a pass/fail check,
 * or `grep -v '"_type"'` to strip it for pure diagnostic streams.
 *
 * ## Streaming semantics
 *
 * The `Reporter` interface is batch-oriented: `report(diagnostics, context)`
 * receives the complete sorted list after all rules have completed. The JSONL
 * reporter simply iterates the list and writes each entry synchronously —
 * producing line-by-line output that is compatible with any JSONL consumer.
 *
 * True per-diagnostic streaming (emitting each diagnostic the moment a rule
 * calls `context.report()`) would require an extension to the core Reporter
 * interface and is tracked as a future enhancement (Layer Q in FUTURE_SCOPES.md).
 * In the meantime, this reporter gives all the consumption ergonomics of JSONL
 * at the cost of buffering diagnostics inside the engine until the run ends —
 * which the engine already does for deterministic ordering.
 *
 * ## Consumption examples
 *
 * ```bash
 * # Stream to a file, watch with tail
 * tileguard check ./tiles/ --reporter jsonl > results.jsonl
 * tail -f results.jsonl
 *
 * # Pass/fail check without jq (last line is summary)
 * tileguard check ./tiles/ --reporter jsonl | tail -1 | grep '"pass":true'
 *
 * # Filter only errors
 * tileguard check ./tiles/ --reporter jsonl | grep '"severity":"error"'
 *
 * # Count errors with jq
 * tileguard check ./tiles/ --reporter jsonl | jq -r 'select(._type == "summary") | .errors'
 *
 * # Pipe into GNU parallel for external orchestration
 * find tiles/ -name "*.pbf" | tileguard check --stdin --reporter jsonl | ...
 * ```
 */

import type {
  Diagnostic,
  Location,
  Reporter,
  ReporterContext,
  Severity,
} from '@tileguard/core';
import { createDefaultWrite, type WriteFn } from './defaultWrite.js';

export type { WriteFn };

// ---------------------------------------------------------------------------
// JsonlReporterOptions
// ---------------------------------------------------------------------------

export interface JsonlReporterOptions {
  /**
   * Override the output destination. Defaults to process.stdout.write.
   * Useful for testing or capturing output programmatically.
   */
  write?: WriteFn;
}

// ---------------------------------------------------------------------------
// Line shapes
// ---------------------------------------------------------------------------

/**
 * A single diagnostic line in JSONL output.
 * Identical to the JSON reporter's SerializedDiagnostic but without `_type`.
 */
export interface JsonlDiagnosticLine {
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

/**
 * The final summary line in JSONL output.
 * Distinguished from diagnostic lines by the `_type: "summary"` discriminant.
 */
export interface JsonlSummaryLine {
  readonly _type: 'summary';
  readonly errors: number;
  readonly warnings: number;
  readonly infos: number;
  readonly pass: boolean;
  readonly sources: number;
  readonly rules: number;
  readonly duration: number;
}

// ---------------------------------------------------------------------------
// createJsonlReporter
// ---------------------------------------------------------------------------

/**
 * Creates a JSONL reporter with the given options.
 *
 * @param options - Optional configuration for the output destination.
 * @returns A Reporter that produces one JSON line per diagnostic plus a
 *   trailing summary line.
 */
export function createJsonlReporter(
  options: JsonlReporterOptions = {},
): Reporter {
  const write = options.write ?? createDefaultWrite('info');

  return {
    id: 'jsonl',

    // NOTE: Diagnostics are already sorted deterministically by the engine
    // (source → severity → ruleId → location). They are written in that order.
    report(diagnostics: readonly Diagnostic[], context: ReporterContext): void {
      // Emit one compact JSON line per diagnostic
      for (const d of diagnostics) {
        const line: JsonlDiagnosticLine = {
          ruleId: d.ruleId,
          severity: d.severity,
          message: d.message,
          artifact: d.artifact,
          ...(d.location !== undefined && { location: d.location }),
          ...(d.suggestion !== undefined && { suggestion: d.suggestion }),
          ...(d.docsUrl !== undefined && { docsUrl: d.docsUrl }),
          ...(d.data !== undefined && { data: d.data }),
        };
        write(JSON.stringify(line));
        write('\n');
      }

      // Always emit a trailing summary line so consumers can detect
      // run completion and extract pass/fail without counting lines.
      const summary: JsonlSummaryLine = {
        _type: 'summary',
        errors: context.summary.errors,
        warnings: context.summary.warnings,
        infos: context.summary.infos,
        pass: context.summary.pass,
        sources: context.sources.length,
        rules: context.ruleCount,
        duration: context.duration,
      };
      write(JSON.stringify(summary));
      write('\n');
    },
  };
}

/**
 * Default JSONL reporter instance with standard options (stdout).
 */
export const jsonlReporter: Reporter = createJsonlReporter();
