/**
 * @tileguard/cli — shared config template
 *
 * Exports the canonical config filename and starter template used by both
 * `tileguard init` (explicit scaffolding) and `tileguard check` (auto-init
 * when no config file is found). Keeping these in one place guarantees that
 * both code paths produce identical files.
 */

/** Filename written by `tileguard init` and auto-init in `tileguard check`. */
export const CONFIG_FILENAME = 'tileguard.config.ts';

/**
 * Starter config template.
 *
 * Uses single quotes for string literals to match the project's Biome
 * formatter settings and the style established in other package configs.
 */
export const CONFIG_TEMPLATE = `import type { TileGuardConfig } from '@tileguard/core';
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
