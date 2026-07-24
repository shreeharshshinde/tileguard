/**
 * @tileguard/inspector — OverlayStrategy: tile/degenerate-geometry
 *
 * Converts `tile/degenerate-geometry` diagnostics into OverlayDescriptors.
 * Renders `segment-highlight` markers at the spike or duplicate-vertex location.
 *
 * Implemented in Milestone 4.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../overlay-adapter.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const degenerateGeometryStrategy: OverlayStrategy = {
  ruleId: 'tile/degenerate-geometry',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // Implemented in Milestone 4.
    return [];
  },
};
