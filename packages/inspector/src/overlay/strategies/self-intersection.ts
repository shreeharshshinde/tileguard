/**
 * @tileguard/inspector — OverlayStrategy: tile/self-intersection
 *
 * Converts `tile/self-intersection` diagnostics into OverlayDescriptors.
 * Produces a `segment-highlight` marker for the self-intersecting segment.
 *
 * Diagnostic schema (from tile-rules/src/rules/self-intersection.ts):
 *   location: { layer, featureIndex, partIndex? }
 *   data:     { layer, featureIndex, partIndex, segments: [number, number] }
 *
 * `segments` is a [segA, segB] tuple of segment indices that intersect.
 * For segment `segA`, the endpoints on the ring are vertex `segA` and vertex `segA + 1`.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { OverlayDescriptor, OverlayStrategy } from '../overlay-adapter.ts';

export const selfIntersectionStrategy: OverlayStrategy = {
  ruleId: 'tile/self-intersection',

  toDescriptors(diagnostic: Diagnostic, _artifact: VectorTileArtifact): OverlayDescriptor[] {
    const layerName = diagnostic.location?.layer ?? (diagnostic.data?.layer as string | undefined);
    const featureIndex =
      diagnostic.location?.featureIndex ?? (diagnostic.data?.featureIndex as number | undefined);
    const segments = diagnostic.data?.segments as [number, number] | undefined;

    // Strict validation — do not invent indices if metadata is missing
    if (
      layerName === undefined ||
      featureIndex === undefined ||
      !Array.isArray(segments) ||
      segments.length < 2 ||
      typeof segments[0] !== 'number'
    ) {
      return [];
    }

    const segStart = Number(segments[0]);

    return [
      {
        type: 'segment-highlight',
        layerName,
        featureIndex,
        target: [segStart, segStart + 1],
        severity: diagnostic.severity,
      },
    ];
  },
};
