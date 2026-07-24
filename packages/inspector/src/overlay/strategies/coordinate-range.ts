/**
 * @tileguard/inspector — OverlayStrategy: tile/coordinate-range
 *
 * Converts `tile/coordinate-range` diagnostics into OverlayDescriptors.
 * Produces a `point-marker` at the out-of-range vertex.
 *
 * Diagnostic schema (from tile-rules/src/rules/coordinate-range.ts):
 *   location: { layer, featureIndex, partIndex? }
 *   data:     { layer, featureIndex, partIndex, pointIndex, point, extent, buffer }
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor, OverlayStrategy } from '../overlay-adapter.ts';

export const coordinateRangeStrategy: OverlayStrategy = {
  ruleId: 'tile/coordinate-range',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);
    const pointIndex = diagnostic.data?.pointIndex as number | undefined;

    // Do not silently invent indices if required location metadata is missing
    if (layerName === undefined || featureIndex === undefined || typeof pointIndex !== 'number') {
      return [];
    }

    return [
      {
        type: 'point-marker',
        layerName,
        featureIndex,
        target: pointIndex,
        severity: diagnostic.severity,
      },
    ];
  },
};
