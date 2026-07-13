/**
 * @tileguard/cli — `check` command
 *
 * Validates geospatial artifacts against configured rules and returns a
 * `CommandResult`. This is the primary command — every other command is
 * either setup (`init`) or inspection (`rules list`).
 *
 * Execution pipeline:
 *   1. Load config from disk (auto-discover or use `--config` path).
 *   2. Expand source arguments — globs, directories, `.` → absolute paths.
 *   3. Merge CLI flag overrides on top of file config (D4).
 *   4. Resolve the reporter from the merged config (D5).
 *   5. Print startup banner to stderr (D9).
 *   6. Run the engine and return a `CommandResult`.
 *
 * Any config load error or unknown reporter is caught and returned as a
 * code-2 result — this function never throws to its caller.
 *
 * This function is pure with respect to the process lifecycle — it never
 * calls `process.exit()`. It is safe to call from tests, editors, or any
 * embedding context. See Decision D3.
 */

import { loadConfig } from '@tileguard/config';
import { createEngine } from '@tileguard/core';
import { CliUsageError } from '../errors.js';
import { toRunResult, toUsageResult } from '../exit.js';
import { expandSources } from '../expand-sources.js';
import { mergeConfig } from '../merge-config.js';
import { resolveReporterById } from '../resolve-reporter.js';
import type { CheckFlags, CommandResult } from '../types.js';

/**
 * Executes `tileguard check`.
 *
 * @param sources - Raw CLI source arguments (files, directories, globs, `"."`).
 * @param flags - Parsed CLI flags from commander.
 * @returns A `CommandResult` with exit code 0 (pass), 1 (fail), or 2 (error).
 */
export async function runCheck(
  sources: string[],
  flags: CheckFlags,
): Promise<CommandResult> {
  // ── 1. Load configuration ──────────────────────────────────────────────
  // ConfigNotFoundError, ConfigLoadError, and ConfigValidationError from
  // @tileguard/config are caught here and surfaced as code-2 results.
  let fileConfig;
  try {
    const loadOptions = flags.config !== undefined ? { configPath: flags.config } : {};
    ({ config: fileConfig } = await loadConfig(loadOptions));
  } catch (err) {
    return toUsageResult(err);
  }

  // ── 2. Expand sources ──────────────────────────────────────────────────
  // Globs and directories are resolved to absolute paths. Plain paths and
  // nonexistent paths are passed through — the engine handles them gracefully.
  const expandedSources = await expandSources(sources);
  if (expandedSources.length === 0) {
    return toUsageResult(
      new CliUsageError(
        'No sources provided or matched. Usage: tileguard check <sources...>',
      ),
    );
  }

  // ── 3. Merge CLI flags on top of file config (CLI wins — D4) ──────────
  const mergeFlags: Pick<CheckFlags, 'reporter' | 'maxDiagnostics'> = {};
  if (flags.reporter !== undefined) mergeFlags.reporter = flags.reporter;
  if (flags.maxDiagnostics !== undefined) mergeFlags.maxDiagnostics = flags.maxDiagnostics;
  const mergedConfig = mergeConfig(fileConfig, mergeFlags);

  // ── 4. Resolve the reporter ────────────────────────────────────────────
  // Throws CliUsageError for unknown IDs, caught and returned as code-2.
  let reporter;
  try {
    reporter = resolveReporterById(
      typeof mergedConfig.reporter === 'string' ? mergedConfig.reporter : undefined,
    );
  } catch (err) {
    return toUsageResult(err);
  }

  // ── 5. Startup banner — stderr only, never stdout (D9) ─────────────────
  // Written unconditionally so `--reporter json | jq .` is never at risk
  // of interleaved non-JSON output on stdout.
  process.stderr.write(`TileGuard — checking ${expandedSources.length} source(s)...\n`);

  // ── 6. Run the engine ──────────────────────────────────────────────────
  const engine = createEngine({ ...mergedConfig, reporter });
  const result = await engine.run(expandedSources);

  return toRunResult(result.summary.pass, result.diagnostics, result.summary);
}
