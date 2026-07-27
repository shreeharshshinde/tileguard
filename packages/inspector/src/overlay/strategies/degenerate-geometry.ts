/**
 * @tileguard/inspector — OverlayStrategy: tile/degenerate-geometry
 *
 * Converts `tile/degenerate-geometry` diagnostics into OverlayDescriptors.
 * Produces a `bbox-fill` marker around the degenerate feature's bounding box.
 *
 * Diagnostic schema (from tile-rules/src/rules/degenerate-geometry.ts):
 *   location: { layer, featureIndex, partIndex? }
 *   data:     { code, layer, featureIndex, partIndex }
 *
 * Rationale: Bounding boxes remain meaningful even when the geometry itself
 * lacks sufficient vertices for point, segment, or ring highlighting.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor, OverlayStrategy } from '../overlay-adapter.ts';

export const degenerateGeometryStrategy: OverlayStrategy = {
  ruleId: 'tile/degenerate-geometry',

  toDescriptors(
    diagnostic: Diagnostic,
    _artifact: VectorTileArtifact,
  ): OverlayDescriptor[] {
    const layerName =
      diagnostic.location?.layer ??
      (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ??
      (diagnostic.data?.featureIndex as number | undefined);

    if (layerName === undefined || featureIndex === undefined) {
      return [];
    }

    return [
      {
        type: 'bbox-fill',
        layerName,
        featureIndex,
        target: 0,
        severity: diagnostic.severity,
      },
    ];
  },
};
