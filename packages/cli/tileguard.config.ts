/**
 * TileGuard self-hosting configuration — packages/cli
 *
 * This config is used by the CI self-hosting step:
 *   tileguard check . --config packages/cli/tileguard.config.ts
 *
 * It validates the CLI package's own test fixtures and any geospatial
 * artifacts that may be added under packages/cli/tests/fixtures/.
 */

import type { TileGuardConfig } from '@tileguard/core';
import { stylePlugin } from '@tileguard/style-rules';
import { tilePlugin } from '@tileguard/tile-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/coordinate-range': ['error', { buffer: 64 }],
    'tile/self-intersection': 'warning',
    'tile/no-empty': 'warning',
  },
  reporter: 'text',
};

export default config;
