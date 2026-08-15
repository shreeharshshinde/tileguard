/**
 * Rule: `style/version`
 *
 * Validates that the style declares MapLibre/Mapbox GL style version 8.
 *
 * @remarks
 * The `version` field at the top level of a style specification indicates
 * which version of the style grammar the document conforms to. The only
 * valid value for MapLibre GL JS and Mapbox GL JS v1+ is `8`.
 *
 * A missing or incorrect version causes:
 * - MapLibre GL JS to reject the style entirely
 * - Subtle rendering differences if an older spec is assumed
 * - Tooling (Maputnik, style validators) to misinterpret expressions
 *
 * The rule reports the actual version value found and suggests setting
 * `"version": 8`.
 */
import type { Rule } from '@tileguard/core';
import { getStyleObject, STYLE_ARTIFACT_TYPE } from '../types.js';

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
