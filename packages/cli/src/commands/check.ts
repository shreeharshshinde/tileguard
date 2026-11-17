/**
 * @tileguard/cli — `check` command
 *
 * Validates geospatial artifacts against configured rules and returns a
 * `CommandResult`. This is the primary command — every other command is
 * either setup (`init`) or inspection (`rules list`).
 *
 * Execution pipeline:
 *   1.  Load config from disk (auto-discover or use `--config` path).
 *   2. If no config file was found and `--config` was not passed, write a
 *       default `tileguard.config.ts` to the cwd and reload it, so first-time
 *       users get sensible defaults without needing a separate `init` step.
 *   3.  Read additional source paths from stdin when `--stdin` is set.
 *   4.  Expand source arguments — globs, directories, `.` → absolute paths.
 *   5.  Merge CLI flag overrides on top of file config (D4).
 *   6.  Resolve the reporter from the merged config (D5).
 *   7.  Print startup banner to stderr (D9).
 *   8.  Run the engine and return a `CommandResult`.
 *
 * Any config load error or unknown reporter is caught and returned as a
 * code-2 result — this function never throws to its caller.
 *
 * This function is pure with respect to the process lifecycle — it never
 * calls `process.exit()`. It is safe to call from tests, editors, or any
 * embedding context. See Decision D3.
 */

import { loadConfig } from '@tileguard/config';
import type { TileGuardConfig } from '@tileguard/core';
import { createEngine } from '@tileguard/core';
import { stylePlugin } from '@tileguard/style-rules';
import { tilePlugin } from '@tileguard/tile-rules';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { CONFIG_FILENAME, CONFIG_TEMPLATE } from '../config-template.js';
import { CliUsageError } from '../errors.js';
import { toRunResult, toUsageResult } from '../exit.js';
import { expandSources } from '../expand-sources.js';
import { mergeConfig } from '../merge-config.js';
import { readStdinPaths } from '../read-stdin.js';
import { resolveReporterById } from '../resolve-reporter.js';
import type { CheckFlags, CommandResult } from '../types.js';

/**
 * Executes `tileguard check`.
 *
 * @param sources - Raw CLI source arguments (files, directories, globs, `"."`).
 * @param flags - Parsed CLI flags from commander.
 * @param stdinStream - Readable stream to use as stdin (defaults to
 *   `process.stdin`). Injectable for tests — avoids the need to mock the
 *   global `process` object.
 * @param fsOps - File-system operations used during auto-init. Injectable for
 *   tests so that no real files are created on disk during unit tests.
 * @returns A `CommandResult` with exit code 0 (pass), 1 (fail), or 2 (error).
 */
export async function runCheck(
  sources: string[],
  flags: CheckFlags,
  stdinStream: Readable = process.stdin,
  fsOps: {
    existsSync: (p: string) => boolean;
    writeFileSync: (p: string, data: string, enc: BufferEncoding) => void;
  } = { existsSync, writeFileSync },
): Promise<CommandResult> {
  // ── 1. Load configuration ──────────────────────────────────────────────
  // ConfigNotFoundError, ConfigLoadError, and ConfigValidationError from
  // @tileguard/config are caught here and surfaced as code-2 results.
  let fileConfig: TileGuardConfig;
  let configPath: string | undefined;
  try {
    const loadOptions =
      flags.config !== undefined ? { configPath: flags.config } : {};
    ({ config: fileConfig, configPath } = await loadConfig(loadOptions));
  } catch (err) {
    return toUsageResult(err);
  }

  // ── 2. Auto-init when no config file was found ────────────────────────
  // When loadConfig() returns configPath === undefined, no tileguard.config.ts
  // exists in the project. We write one with defaults so first-time users get
  // working plugins without a separate `tileguard init` step.
  //
  // Guard: only auto-init when the user did NOT pass an explicit --config path.
  // If --config was passed but the file is missing that is a user error, not a
  // first-run situation; the error message from loadConfig() covers it.
  //
  // The hint is written to stderr so JSON reporter piping is never corrupted.
  if (configPath === undefined && flags.config === undefined) {
    const autoInitPath = join(process.cwd(), CONFIG_FILENAME);
    // Only create the file when it truly does not exist (race-safe guard).
    if (!fsOps.existsSync(autoInitPath)) {
      try {
        fsOps.writeFileSync(autoInitPath, CONFIG_TEMPLATE, 'utf8');
      } catch {
        // If we cannot write (e.g. read-only fs), continue with the empty
        // config — the engine will simply report no-provider diagnostics and
        // the user can investigate manually.
      }
    }
    const isColor =
      typeof process !== 'undefined' &&
      process.stderr?.isTTY === true &&
      !process.env.NO_COLOR;
    const icon = isColor ? '\x1b[36mℹ\x1b[0m' : 'ℹ';
    const subtext = isColor
      ? `   \x1b[2mEdit ${CONFIG_FILENAME} to customize rules and plugins.\x1b[0m`
      : `   Edit ${CONFIG_FILENAME} to customize rules and plugins.`;

    process.stderr.write(
      `${icon}  No ${CONFIG_FILENAME} found, created starter configuration.\n${subtext}\n\n`,
    );
    // Reload so the engine uses the freshly written config.
    try {
      ({ config: fileConfig, configPath } = await loadConfig({}));
    } catch {
      // If loading the generated config file failed (e.g. jiti cannot resolve
      // packages in a standalone directory outside node_modules), fallback
      // to the built-in plugins so the check can still succeed.
      fileConfig = { plugins: [tilePlugin, stylePlugin] };
    }
    if (!fileConfig.plugins || fileConfig.plugins.length === 0) {
      fileConfig = { ...fileConfig, plugins: [tilePlugin, stylePlugin] };
    }
  }

  // ── 3. Read additional sources from stdin (--stdin) ────────────────────
  // Paths from stdin are appended to any positional arguments and all go
  // through expandSources together, so deduplication happens in one place.
  let allSources = sources;
  if (flags.stdin === true) {
    const stdinPaths = await readStdinPaths(stdinStream);
    allSources = [...sources, ...stdinPaths];
  }

  // ── 4. Expand sources ──────────────────────────────────────────────────
  // Globs and directories are resolved to absolute paths. Plain paths and
  // nonexistent paths are passed through — the engine handles them gracefully.
  const expandedSources = await expandSources(allSources);
  if (expandedSources.length === 0) {
    return toUsageResult(
      new CliUsageError(
        flags.stdin === true
          ? 'No sources provided or matched. Pass paths as arguments or pipe them via stdin with --stdin.'
          : 'No sources provided or matched. Usage: tileguard check <sources...>',
      ),
    );
  }

  // ── 5. Merge CLI flags on top of file config (CLI wins — D4) ──────────
  const mergeFlags: Pick<CheckFlags, 'reporter' | 'maxDiagnostics'> = {};
  if (flags.reporter !== undefined) mergeFlags.reporter = flags.reporter;
  if (flags.maxDiagnostics !== undefined)
    mergeFlags.maxDiagnostics = flags.maxDiagnostics;
  const mergedConfig = mergeConfig(fileConfig, mergeFlags);

  // ── 6. Resolve the reporter ────────────────────────────────────────────
  // Throws CliUsageError for unknown IDs, caught and returned as code-2.
  let reporter: ReturnType<typeof resolveReporterById>;
  try {
    reporter = resolveReporterById(
      typeof mergedConfig.reporter === 'string'
        ? mergedConfig.reporter
        : undefined,
    );
  } catch (err) {
    return toUsageResult(err);
  }

  // ── 7. Startup banner — stderr only, never stdout (D9) ─────────────────
  // Written unconditionally so `--reporter json | jq .` is never at risk
  // of interleaved non-JSON output on stdout.
  const isColor =
    typeof process !== 'undefined' &&
    process.stderr?.isTTY === true &&
    !process.env.NO_COLOR;
  const brand = isColor ? '\x1b[1mTileGuard\x1b[0m' : 'TileGuard';
  const detail = isColor
    ? `\x1b[2mchecking ${expandedSources.length} source(s)...\x1b[0m`
    : `checking ${expandedSources.length} source(s)...`;

  process.stderr.write(`${brand} — ${detail}\n\n`);

  // ── 8. Run the engine ──────────────────────────────────────────────────
  const engine = createEngine({ ...mergedConfig, reporter });
  const result = await engine.run(expandedSources);

  return toRunResult(result.summary.pass, result.diagnostics, result.summary);
}
