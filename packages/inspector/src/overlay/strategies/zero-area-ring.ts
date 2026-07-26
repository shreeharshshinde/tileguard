/**
 * @tileguard/inspector — OverlayStrategy: tile/zero-area-ring
 *
 * Converts `tile/zero-area-ring` diagnostics into OverlayDescriptors.
 * Produces a `ring-highlight` marker for the zero-area polygon ring.
 *
 * Diagnostic schema (from tile-rules/src/rules/zero-area-ring.ts):
 *   location: { layer, featureIndex, partIndex? }
 *   data:     { layer, featureIndex, partIndex }
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor, OverlayStrategy } from '../overlay-adapter.ts';

export const zeroAreaRingStrategy: OverlayStrategy = {
  ruleId: 'tile/zero-area-ring',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);

    if (layerName === undefined || featureIndex === undefined) {
      return [];
    }

    const ringIndex =
      diagnostic.location?.partIndex ?? (diagnostic.data?.partIndex as number | undefined) ?? 0;

    return [
      {
        type: 'ring-highlight',
        layerName,
        featureIndex,
        target: ringIndex,
        severity: diagnostic.severity,
      },
    ];
  },
};
