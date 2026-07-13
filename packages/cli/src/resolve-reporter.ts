/**
 * @tileguard/cli — Reporter registry and resolution
 *
 * Maps reporter ID strings to concrete `Reporter` objects. The CLI owns this
 * mapping exclusively — `@tileguard/config` validates the shape of reporter
 * config values but never resolves them to objects.
 *
 * The registry is a `Map` rather than a plain object literal so that:
 *   - Future reporters (`sarif`, `github`, `junit`, `html`) are registered
 *     with `.set()` calls that read naturally as "add to registry".
 *   - `[...BUILTIN_REPORTERS.keys()]` produces the canonical list of valid
 *     reporter IDs for dynamic `--reporter <id>` help text and error messages,
 *     without hardcoding a second string array.
 *
 * See Decision D5 in the CLI implementation plan.
 */

import type { Reporter } from '@tileguard/core';
import { jsonReporter, textReporter } from '@tileguard/reporters';
import { CliUsageError } from './errors.js';

/**
 * Registry of built-in reporters, keyed by their CLI identifier.
 *
 * All keys are lowercase. IDs must match what reporters expose as
 * `reporter.id` to avoid silent mismatches.
 */
const BUILTIN_REPORTERS = new Map<string, Reporter>([
  ['text', textReporter],
  ['json', jsonReporter],
]);

/**
 * The reporter ID used when neither the config file nor `--reporter` specifies one.
 */
export const DEFAULT_REPORTER_ID = 'text';

/**
 * Resolves a reporter ID string to a `Reporter` object.
 *
 * Falls back to `DEFAULT_REPORTER_ID` when `id` is `undefined`, which
 * covers the case where the user omits `--reporter` and no config file
 * specifies a reporter.
 *
 * @param id - Reporter identifier, e.g. `'text'` or `'json'`. Pass `undefined`
 *   to use the default.
 * @returns The matching `Reporter` object.
 * @throws {CliUsageError} When `id` does not match any registered reporter.
 *   The error message includes the full list of available IDs so the user
 *   can immediately correct the invocation.
 */
export function resolveReporterById(id: string | undefined): Reporter {
  const reporterId = id ?? DEFAULT_REPORTER_ID;
  const reporter = BUILTIN_REPORTERS.get(reporterId);

  if (reporter === undefined) {
    const available = [...BUILTIN_REPORTERS.keys()].join(', ');
    throw new CliUsageError(
      `Unknown reporter "${reporterId}". Available reporters: ${available}`,
    );
  }

  return reporter;
}
