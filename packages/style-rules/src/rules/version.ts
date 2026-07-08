import type { Rule } from '@tileguard/core';
import { STYLE_ARTIFACT_TYPE, getStyleObject } from '../types.js';

export const versionRule: Rule = {
  id: 'style/version',
  meta: {
    description: 'Style specifications must declare MapLibre style version 8.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/version',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    if (style.version === 8) return;

    context.report({
      message: `Style version must be 8, but found "${String(style.version)}".`,
      location: { jsonPath: 'version' },
      suggestion: 'Set "version": 8 at the top level of your style JSON.',
      data: { expected: 8, actual: style.version },
    });
  },
};

