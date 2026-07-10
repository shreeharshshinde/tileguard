import type { Rule } from '@tileguard/core';
import {
  EMPTY_STYLE_ARTIFACT_TYPE,
  INVALID_STYLE_ARTIFACT_TYPE,
  type InvalidStyleSpecificationContent,
  STYLE_ARTIFACT_TYPE,
} from '../types.js';

export const validJsonRule: Rule = {
  id: 'style/valid-json',
  meta: {
    description: 'Style files must contain valid JSON.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/valid-json',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE, INVALID_STYLE_ARTIFACT_TYPE, EMPTY_STYLE_ARTIFACT_TYPE],

  create(context) {
    if (context.artifact.type === EMPTY_STYLE_ARTIFACT_TYPE) {
      return;
    }
    if (context.artifact.type !== INVALID_STYLE_ARTIFACT_TYPE) {
      return;
    }

    const content = context.artifact.content as InvalidStyleSpecificationContent;
    context.report({
      message: `Style JSON is invalid: "${content.error}".`,
      suggestion: 'Fix the JSON syntax before running style validation rules.',
      data: { error: content.error },
    });
  },
};
