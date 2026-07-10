import type { Rule } from '@tileguard/core';
import { getStyleObject, STYLE_ARTIFACT_TYPE } from '../types.js';

export const layersPresentRule: Rule = {
  id: 'style/layers-present',
  meta: {
    description: 'Style specifications must include a top-level layers array.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/layers-present',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    if (Array.isArray(style.layers)) return;

    context.report({
      message: `Style must include a "layers" array, but found "${String(style.layers)}".`,
      location: { jsonPath: 'layers' },
      suggestion: 'Add a top-level "layers" array to your style JSON.',
      data: { actual: style.layers },
    });
  },
};
