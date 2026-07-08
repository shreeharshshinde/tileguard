import type { Rule } from '@tileguard/core';
import {
  STYLE_ARTIFACT_TYPE,
  getLayerId,
  getStyleLayers,
  getStyleObject,
  isRecord,
} from '../types.js';

export const knownSourceRule: Rule = {
  id: 'style/known-source',
  meta: {
    description: 'Style layer source references must point to declared sources.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/known-source',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    if (!isRecord(style.sources)) return;

    const sourceIds = new Set(Object.keys(style.sources));
    const layers = getStyleLayers(style);

    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index]!;
      if (typeof layer.source !== 'string' || sourceIds.has(layer.source)) continue;

      const layerId = getLayerId(layer) ?? `<layer ${index}>`;
      context.report({
        message: `Layer "${layerId}" references unknown source "${layer.source}".`,
        location: { jsonPath: `layers[${index}].source` },
        suggestion: `Add "${layer.source}" to the top-level "sources" object, or fix the source reference.`,
        data: {
          layerId,
          source: layer.source,
          availableSources: [...sourceIds],
        },
      });
    }
  },
};

