/**
 * @tileguard/cli — Configuration merging
 *
 * Merges CLI flag values on top of a config-file-loaded `TileGuardConfig`.
 * CLI flags always win when both sources specify the same setting (D4).
 *
 * Only flags that have a direct config-file equivalent are merged:
 *
 *   `--reporter`         → `config.reporter`
 *   `--max-diagnostics`  → `config.options.maxDiagnostics`
 *
 * `plugins` and `overrides` are config-file-only in this release — there is
 * no CLI flag equivalent for either.
 *
 * See Decision D4 in the CLI implementation plan.
 */

import type { TileGuardConfig } from '@tileguard/core';
import type { CheckFlags } from './types.js';

/**
 * Merges CLI flag overrides into a loaded `TileGuardConfig`.
 *
 * Returns a new config object — the input is never mutated. Only fields
 * explicitly provided in `cliFlags` (i.e. not `undefined`) are overwritten.
 *
 * @param fileConfig - The config object loaded from disk (or `{}` when no
 *   config file was found and the loader returned defaults).
 * @param cliFlags - CLI flag values. Only `reporter` and `maxDiagnostics`
 *   are consulted; other fields on `CheckFlags` are ignored.
 * @returns A new `TileGuardConfig` with CLI values applied on top.
 */
export function mergeConfig(
  fileConfig: TileGuardConfig,
  cliFlags: Pick<CheckFlags, 'reporter' | 'maxDiagnostics'>,
): TileGuardConfig {
  const merged: TileGuardConfig = { ...fileConfig };

  // CLI --reporter overrides config.reporter
  if (cliFlags.reporter !== undefined) {
    merged.reporter = cliFlags.reporter;
  }

  // CLI --max-diagnostics overrides config.options.maxDiagnostics.
  // Spread existing options first so other option fields are preserved.
  if (cliFlags.maxDiagnostics !== undefined) {
    merged.options = {
      ...merged.options,
      maxDiagnostics: cliFlags.maxDiagnostics,
    };
  }

  return merged;
}
