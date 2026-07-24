/**
 * @tileguard/inspector — OverlayStrategy: tile/self-intersection
 *
 * Converts `tile/self-intersection` diagnostics into OverlayDescriptors.
 * Renders `segment-highlight` markers at the two crossing segments and a
 * `region-fill` around the intersection point.
 *
 * Implemented in Milestone 4.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../overlay-adapter.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const selfIntersectionStrategy: OverlayStrategy = {
  ruleId: 'tile/self-intersection',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // Implemented in Milestone 4.
    return [];
  },
};
