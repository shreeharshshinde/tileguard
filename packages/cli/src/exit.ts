/**
 * @tileguard/cli — Exit-code decision functions
 *
 * Completely side-effect-free functions that translate run outcomes and error
 * conditions into serializable `CommandResult` objects. This module performs
 * no I/O whatsoever — no writes to stdout, stderr, or any other stream.
 *
 * Responsibilities of this module:
 *   - Translate errors into code-2 results, with the message text as a field.
 *   - Translate engine run outcomes into code-0 or code-1 results.
 *
 * Responsibilities delegated to `bin.ts`:
 *   - Reading `result.message` and writing it to stderr.
 *   - Reading `result.output` and writing it to stdout.
 *   - Calling `process.exit(result.exitCode)`.
 *
 * This strict separation means these functions are safe to call from any host
 * context — test harnesses, IDE extensions, REST services, programmatic APIs —
 * without redirecting or capturing console streams.
 *
 * The `process.exit` spy in `tests/exit.test.ts` mechanically verifies the
 * no-I/O invariant on every CI run.
 *
 * See Decisions D3 and D8 in the CLI implementation plan.
 */

import type { Diagnostic, RunSummary } from '@tileguard/core';
import type { CommandResult } from './types.js';

/**
 * Converts an error into a code-2 `CommandResult`.
 *
 * This function is completely side-effect-free — it does not write to any
 * stream or touch the process lifecycle. The caller (`bin.ts`) is responsible
 * for presenting `result.message` to the user via stderr.
 *
 * This separation makes `toUsageResult` safe to call from any host context:
 * test harnesses, IDE extensions, REST services, or programmatic APIs can
 * all inspect the returned `message` without capturing console streams.
 *
 * @param err - The caught value. Accepts `Error` instances or raw strings.
 * @returns `{ exitCode: 2, message }` where `message` is the formatted error text.
 */
export function toUsageResult(err: unknown): CommandResult {
  const message = err instanceof Error ? err.message : String(err);
  return { exitCode: 2, message: `[tileguard] ${message}` };
}

/**
 * Converts an engine run outcome into a code-0 or code-1 `CommandResult`.
 *
 * @param pass - `true` when the run produced zero error-severity diagnostics.
 * @param diagnostics - All diagnostics produced during the run.
 * @param summary - Summary statistics from `engine.run()`.
 * @returns `{ exitCode: 0 }` when `pass` is true, `{ exitCode: 1 }` otherwise.
 */
export function toRunResult(
  pass: boolean,
  diagnostics: readonly Diagnostic[],
  summary: RunSummary,
): CommandResult {
  return {
    exitCode: pass ? 0 : 1,
    diagnostics,
    summary,
  };
}
