import type { Rule } from '@tileguard/core';
import { getLayerId, getStyleLayers, getStyleObject, STYLE_ARTIFACT_TYPE } from '../types.js';

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
      if (typeof layer.minzoom !== 'number' || typeof layer.maxzoom !== 'number') {
        continue;
      }
      if (layer.minzoom <= layer.maxzoom) continue;

      const layerId = getLayerId(layer) ?? `<layer ${index}>`;
      context.report({
        message: `Layer "${layerId}" has minzoom "${layer.minzoom}" greater than maxzoom "${layer.maxzoom}".`,
        location: { jsonPath: `layers[${index}].minzoom` },
        suggestion: 'Swap the minzoom and maxzoom values, or remove one of them.',
        data: {
          layerId,
          minzoom: layer.minzoom,
          maxzoom: layer.maxzoom,
        },
      });
    }
  },
};
