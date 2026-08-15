/**
 * Rule: `style/layers-present`
 *
 * Validates that the style includes a top-level `layers` array.
 *
 * @remarks
 * The `layers` array is a required structural element of the MapLibre
 * style specification. It defines the visual rendering stack — which data
 * to show, how to style it, and in what order.
 *
 * A missing `layers` array means the map renders an empty canvas. This
 * typically indicates:
 * - An incomplete style template
 * - A file that is valid JSON but not a valid style specification
 * - A sources-only configuration file mistakenly used as a full style
 *
 * @see {@link sourcesPresentRule} — validates the `sources` object exists
 * @see {@link layerIdRequiredRule} — validates layers have IDs
 */
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
