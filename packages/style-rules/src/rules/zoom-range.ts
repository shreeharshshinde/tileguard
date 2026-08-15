/**
 * Rule: `style/zoom-range`
 *
 * Validates that layer `minzoom` values do not exceed `maxzoom` values.
 *
 * @remarks
 * When `minzoom > maxzoom`, the layer is invisible at all zoom levels —
 * a condition that is almost always a configuration error rather than
 * intentional behavior.
 *
 * Common causes:
 * - Swapped values during manual editing
 * - Copy-paste errors from layers with different zoom ranges
 * - Incorrect unit conversion from tile-matrix zoom to display zoom
 *
 * The rule checks both `minzoom` and `maxzoom` simultaneously. Layers
 * that define only one of the two values are not flagged (they have an
 * implicit unbounded range on the other end).
 *
 * @see {@link https://maplibre.org/maplibre-style-spec/layers/#minzoom | MapLibre minzoom spec}
 */
import type { Rule } from '@tileguard/core';
import {
  getLayerId,
  getStyleLayers,
  getStyleObject,
  STYLE_ARTIFACT_TYPE,
} from '../types.js';

export const zoomRangeRule: Rule = {
  id: 'style/zoom-range',
  meta: {
    description: 'Style layer minzoom values must not exceed maxzoom values.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/zoom-range',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    const layers = getStyleLayers(style);

    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index]!;
      if (
        typeof layer.minzoom !== 'number' ||
        typeof layer.maxzoom !== 'number'
      ) {
        continue;
      }
      if (layer.minzoom <= layer.maxzoom) continue;

      const layerId = getLayerId(layer) ?? `<layer ${index}>`;
      context.report({
        message: `Layer "${layerId}" has minzoom "${layer.minzoom}" greater than maxzoom "${layer.maxzoom}".`,
        location: { jsonPath: `layers[${index}].minzoom` },
        suggestion:
          'Swap the minzoom and maxzoom values, or remove one of them.',
        data: {
          layerId,
          minzoom: layer.minzoom,
          maxzoom: layer.maxzoom,
        },
      });
    }
  },
};
