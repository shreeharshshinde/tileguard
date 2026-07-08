import type { Rule } from '@tileguard/core';
import { STYLE_ARTIFACT_TYPE, getStyleObject, isRecord } from '../types.js';

export const layerIdRequiredRule: Rule = {
  id: 'style/layer-id-required',
  meta: {
    description: 'Every style layer must declare a non-empty id.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/layer-id-required',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    if (!Array.isArray(style.layers)) return;

    for (let index = 0; index < style.layers.length; index += 1) {
      const layer = style.layers[index];
      if (isRecord(layer) && typeof layer.id === 'string' && layer.id.length > 0) {
        continue;
      }

      context.report({
        message: `Layer at index "${index}" is missing a non-empty id.`,
        location: { jsonPath: `layers[${index}].id` },
        suggestion: 'Add a unique non-empty "id" to this style layer.',
        data: { index },
      });
    }
  },
};

