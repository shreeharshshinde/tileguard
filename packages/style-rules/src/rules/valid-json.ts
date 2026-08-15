/**
 * Rule: `style/valid-json`
 *
 * Validates that style files contain syntactically valid JSON.
 *
 * @remarks
 * This is the foundational style rule — all other style rules depend on
 * having a parsed JSON object to inspect. When JSON parsing fails, this
 * rule produces a single diagnostic with the parse error message.
 *
 * The rule operates on `InvalidStyleSpecification` artifacts (files that
 * failed JSON.parse during provider loading). Valid styles pass through
 * without any diagnostic.
 *
 * Common causes of invalid JSON:
 * - Trailing commas (not allowed in JSON)
 * - Single quotes instead of double quotes
 * - Unquoted keys
 * - Comments (// or /* not allowed in JSON)
 * - Truncated files from interrupted downloads
 *
 * This rule cannot be disabled for invalid files — the remaining style rules
 * simply do not execute because the artifact type does not match.
 */
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
  artifactTypes: [
    STYLE_ARTIFACT_TYPE,
    INVALID_STYLE_ARTIFACT_TYPE,
    EMPTY_STYLE_ARTIFACT_TYPE,
  ],

  create(context) {
    if (context.artifact.type === EMPTY_STYLE_ARTIFACT_TYPE) {
      return;
    }
    if (context.artifact.type !== INVALID_STYLE_ARTIFACT_TYPE) {
      return;
    }

    const content = context.artifact
      .content as InvalidStyleSpecificationContent;
    context.report({
      message: `Style JSON is invalid: "${content.error}".`,
      suggestion: 'Fix the JSON syntax before running style validation rules.',
      data: { error: content.error },
    });
  },
};
