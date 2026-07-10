import type { Rule } from '@tileguard/core';
import { getLayerId, getStyleLayers, getStyleObject, STYLE_ARTIFACT_TYPE } from '../types.js';

export const noDeprecatedRefRule: Rule = {
  id: 'style/no-deprecated-ref',
  meta: {
    description: 'Style layers must not use the deprecated ref property.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/style/no-deprecated-ref',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    const layers = getStyleLayers(style);

    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index]!;
      if (!Object.hasOwn(layer, 'ref')) continue;

      const layerId = getLayerId(layer) ?? `<layer ${index}>`;
      context.report({
        message: `Layer "${layerId}" uses deprecated property "ref".`,
        location: { jsonPath: `layers[${index}].ref` },
        suggestion: 'Replace this ref layer with a full layer definition.',
        data: { layerId },
      });
    }
  },
};
