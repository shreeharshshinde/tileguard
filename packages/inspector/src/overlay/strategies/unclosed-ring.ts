/**
 * @tileguard/inspector — OverlayStrategy: tile/unclosed-ring
 *
 * Converts `tile/unclosed-ring` diagnostics into OverlayDescriptors.
 * Renders a `ring-highlight` around the unclosed ring and a `point-marker`
 * at the mismatched start/end vertex pair.
 *
 * Implemented in Milestone 4.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../overlay-adapter.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const unclosedRingStrategy: OverlayStrategy = {
  ruleId: 'tile/unclosed-ring',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // Implemented in Milestone 4.
    return [];
  },
};
