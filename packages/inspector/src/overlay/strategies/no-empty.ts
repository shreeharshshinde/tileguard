/**
 * @tileguard/inspector — OverlayStrategy: tile/no-empty
 *
 * Converts `tile/no-empty` diagnostics into OverlayDescriptors.
 * Returns an empty array unconditionally — an empty layer has no geometry
 * to point a canvas overlay at.
 *
 * The "this tile is empty" information surfaces through the diagnostic list
 * panel (Milestone 5/6), bypassing the overlay pipeline entirely. This is
 * a legitimate, intentional exception — not every diagnostic needs a canvas
 * visual.
 *
 * Diagnostic schema (from tile-rules/src/rules/no-empty.ts):
 *   location: (none)
 *   data:     { totalFeatures, layers }
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor } from '../overlay-adapter.ts';
import type { OverlayStrategy } from '../overlay-adapter.ts';

export const noEmptyStrategy: OverlayStrategy = {
  ruleId: 'tile/no-empty',

  toDescriptors(_diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    // No canvas overlay for empty tiles — there is no geometry to highlight.
    return [];
  },
};
