/**
 * @tileguard/core — Reporter Contract
 *
 * Reporters are responsible for presenting diagnostics to users. A reporter
 * consumes a list of Diagnostic values and transforms them into a specific
 * output format: human-readable terminal text, structured JSON, SARIF for
 * GitHub Code Scanning, or any future format.
 *
 * No other component in the framework should produce formatted output.
 * Rules emit diagnostics. The engine collects diagnostics. Reporters present
 * diagnostics. This separation means adding a new output format never
 * requires changes to validation logic.
 *
 * Reporters are invoked once per engine run, after all rules have completed
 * and diagnostics are sorted. They receive the complete, ordered list of
 * diagnostics and a context object containing run metadata.
 *
 * See docs/architecture/05-reporter-system.md for the full specification.
 */

import type { Diagnostic } from './diagnostic.js';

// ---------------------------------------------------------------------------
// ReporterContext
// ---------------------------------------------------------------------------

/**
 * Metadata about the completed run, provided to the reporter alongside
 * the diagnostic list.
 *
 * Reporters use this to enrich their output: printing timing information,
 * embedding tool metadata in SARIF, or annotating JSON output with
 * summary statistics.
 *
 * The ResolvedConfig type is referenced here as an opaque object to avoid
 * a circular dependency. Reporters that need config details should import
 * config types separately.
 */
export interface ReporterContext {
  /**
   * Wall-clock duration of the entire run in milliseconds.
   * Measured from the first call to engine.run() until all rules complete.
   */
  readonly duration: number;

  /**
   * The source strings passed to engine.run().
   * These are the file paths, URLs, or other identifiers that were
   * processed in this run.
   */
  readonly sources: readonly string[];

  /**
   * The total number of distinct rules that were executed across the run.
   * One rule executed against three artifacts counts as 3.
   */
  readonly ruleCount: number;

  /**
   * The number of artifacts that were successfully loaded.
   * Does not include artifacts that failed to load.
   */
  readonly artifactCount: number;

  /**
   * Summary statistics. Provided as a convenience so reporters do not
   * need to re-compute counts from the diagnostics array.
   */
  readonly summary: {
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
    /** Whether the run passed (no errors). */
    readonly pass: boolean;
  };

  /**
   * The resolved configuration used for this run.
   * Type is Record<string, unknown> to avoid circular imports.
   * Reporters that need specific config fields should cast as needed.
   */
  readonly config: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

/**
 * A Reporter transforms a list of diagnostics into formatted output.
 *
 * Reporters are plain objects conforming to this interface — not classes,
 * not functions. This makes them trivially testable and composable.
 *
 * The report() method is called exactly once per engine run, after all
 * diagnostics have been collected and sorted. Reporters receive the complete
 * ordered list; there is no streaming API.
 *
 * Reporters control their own output destination. Text and JSON reporters
 * typically write to stdout. SARIF reporters write to a file. GitHub
 * annotation reporters write workflow command strings to stdout. The engine
 * does not constrain where output goes.
 *
 * Example (minimal custom reporter):
 *
 *   const countReporter: Reporter = {
 *     id: 'count',
 *     report(diagnostics, context) {
 *       process.stdout.write(
 *         `${context.summary.errors} errors, ${context.summary.warnings} warnings\n`
 *       );
 *     },
 *   };
 */
export interface Reporter {
  /**
   * Unique identifier for this reporter.
   *
   * Used in configuration (reporter: 'json') and error messages.
   * Convention: lowercase, no spaces.
   * Examples: "text", "json", "sarif", "github"
   */
  readonly id: string;

  /**
   * Transforms diagnostics into formatted output.
   *
   * @param diagnostics - All diagnostics from the completed run, in order.
   *   Sorted deterministically by the engine: source → severity → rule ID → location.
   *   The reporter may re-sort for its own purposes but must not modify diagnostics.
   *
   * @param context - Metadata about the run (timing, sources, summary stats).
   *
   * The method may be async. The engine awaits completion before returning
   * the RunResult to the caller. Async reporters are useful for reporters
   * that write to files or make API calls.
   *
   * The method must not throw for expected failure modes (file write errors,
   * stdout closing unexpectedly). These should be handled gracefully within
   * the reporter.
   */
  report(diagnostics: readonly Diagnostic[], context: ReporterContext): void | Promise<void>;
}
