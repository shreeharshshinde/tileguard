/**
 * @tileguard/inspector — OverlayStrategy: tile/no-empty
 *
 * Converts `tile/no-empty` diagnostics into OverlayDescriptors.
 * Renders a `bbox-highlight` around the entire tile extent to indicate
 * that the tile contained zero features.
 *
 * Implemented in Milestone 4.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../../renderer/canvas-renderer.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const noEmptyStrategy: OverlayStrategy = {
  ruleId: 'tile/no-empty',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // Implemented in Milestone 4.
    return [];
  },
};
