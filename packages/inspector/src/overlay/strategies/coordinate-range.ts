/**
 * @tileguard/inspector — OverlayStrategy: tile/coordinate-range
 *
 * Converts `tile/coordinate-range` diagnostics into OverlayDescriptors.
 * Renders a `point-marker` at the out-of-range vertex and a `bbox-highlight`
 * around the feature's bounding box.
 *
 * Implemented in Milestone 4.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../../renderer/canvas-renderer.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const coordinateRangeStrategy: OverlayStrategy = {
  ruleId: 'tile/coordinate-range',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // Implemented in Milestone 4.
    return [];
  },
};
