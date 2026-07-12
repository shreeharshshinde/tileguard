/**
 * @tileguard/config — Config File Discovery
 *
 * Searches upward from a starting directory to find a TileGuard
 * configuration file. Checks filenames in priority order:
 *
 *   1. tileguard.config.ts   (preferred, type-safe)
 *   2. tileguard.config.js   (ESM)
 *   3. tileguard.config.mjs  (explicit ESM)
 *   4. tileguard.config.json (data-only, no plugins)
 *
 * Returns the absolute path to the first match, or undefined if no
 * config file exists anywhere in the directory ancestry.
 *
 * Synchronous by design — `fs.existsSync` calls are fast enough for a
 * one-time startup lookup, and wrapping them in async/await would add
 * overhead with no practical benefit.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Config filenames in priority order. */
export const CONFIG_FILENAMES = [
  'tileguard.config.ts',
  'tileguard.config.js',
  'tileguard.config.mjs',
  'tileguard.config.json',
] as const;

/**
 * Searches upward from `cwd` for a TileGuard configuration file.
 *
 * @param cwd - Starting directory. Defaults to `process.cwd()`.
 * @param stopAt - Optional directory path at which the upward traversal should stop.
 * @returns Absolute path to the first config file found, or `undefined`
 *          if no config file exists in any ancestor directory (up to stopAt).
 */
export function findConfigFile(cwd: string = process.cwd(), stopAt?: string): string | undefined {
  let dir = resolve(cwd);
  const boundary = stopAt !== undefined ? resolve(stopAt) : undefined;

  for (;;) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = join(dir, filename);
      if (existsSync(candidate)) return candidate;
    }

    if (dir === boundary) return undefined; // hit the injected boundary
    const parent = dirname(dir);
    if (parent === dir) return undefined; // hit filesystem root
    dir = parent;
  }
}
