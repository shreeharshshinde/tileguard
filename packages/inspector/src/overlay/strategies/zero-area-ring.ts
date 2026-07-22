/**
 * @tileguard/inspector — OverlayStrategy: tile/zero-area-ring
 *
 * Converts `tile/zero-area-ring` diagnostics into OverlayDescriptors.
 * Renders a `ring-highlight` around the degenerate (zero-area) ring.
 *
 * Implemented in Milestone 4.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../../renderer/canvas-renderer.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const zeroAreaRingStrategy: OverlayStrategy = {
  ruleId: 'tile/zero-area-ring',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // Implemented in Milestone 4.
    return [];
  },
};
