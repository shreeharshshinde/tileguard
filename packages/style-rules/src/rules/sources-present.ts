import type { Rule } from '@tileguard/core';
import { getStyleObject, isRecord, STYLE_ARTIFACT_TYPE } from '../types.js';

export const sourcesPresentRule: Rule = {
  id: 'style/sources-present',
  meta: {
    description: 'Style specifications must include a top-level sources object.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/sources-present',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    if (isRecord(style.sources)) return;

    context.report({
      message: `Style must include a "sources" object, but found "${String(style.sources)}".`,
      location: { jsonPath: 'sources' },
      suggestion: 'Add a top-level "sources" object to your style JSON.',
      data: { actual: style.sources },
    });
  },
};
