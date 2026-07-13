/**
 * @tileguard/cli — `init` command
 *
 * Scaffolds a starter `tileguard.config.ts` in the current working directory.
 * The generated file imports both built-in plugins and provides commented
 * examples for common rule customizations.
 *
 * Behavior:
 *   - If no config file exists → write the template and return exit code 0.
 *   - If a config file exists and `--force` is not set → return exit code 2.
 *   - If a config file exists and `--force` is set → overwrite and return 0.
 *
 * This function is pure with respect to all I/O — it never calls
 * `process.exit()`, and it never writes to stdout or stderr. Success and
 * error messages are returned in `result.message`; `bin.ts` presents them
 * to the terminal. See Decision D3 and Proposal 2.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CliUsageError } from '../errors.js';
import { toUsageResult } from '../exit.js';
import type { CommandResult, InitFlags } from '../types.js';

/** Filename written by `tileguard init`. */
const CONFIG_FILENAME = 'tileguard.config.ts';

/**
 * Starter config template.
 *
 * Uses single quotes for string literals to match the project's Biome
 * formatter settings and the style established in other package configs.
 */
const CONFIG_TEMPLATE = `import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    // Customize rule severities and options here.
    // 'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    // 'tile/self-intersection': 'warning',
    // 'tile/no-empty': 'off',
  },
  reporter: 'text',
};

export default config;
`;

/**
 * Executes `tileguard init`.
 *
 * Creates `tileguard.config.ts` in `process.cwd()`. Refuses to overwrite
 * an existing file unless `flags.force` is `true`.
 *
 * @param flags - Parsed CLI flags.
 * @returns A `CommandResult` with exit code 0 (success) or 2 (refused to overwrite).
 */
export async function runInit(flags: InitFlags): Promise<CommandResult> {
  const targetPath = join(process.cwd(), CONFIG_FILENAME);

  if (existsSync(targetPath) && !flags.force) {
    return toUsageResult(
      new CliUsageError(
        `Configuration file already exists: ${targetPath}\nUse --force to overwrite.`,
      ),
    );
  }

  try {
    writeFileSync(targetPath, CONFIG_TEMPLATE, 'utf8');
  } catch (err) {
    // Covers permission errors, read-only filesystems, etc.
    return toUsageResult(err);
  }

  return { exitCode: 0, message: `Created ${CONFIG_FILENAME}` };
}
