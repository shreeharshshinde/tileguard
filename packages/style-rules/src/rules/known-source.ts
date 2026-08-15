/**
 * Rule: `style/known-source`
 *
 * Validates that layer source references point to declared sources.
 *
 * @remarks
 * Every layer in a MapLibre style that renders data must reference a source
 * declared in the top-level `sources` object. A dangling source reference
 * causes the layer to silently render nothing — a common and hard-to-debug
 * issue in style development.
 *
 * Common causes:
 * - Typos in the source name (e.g., "openmaptile" vs "openmaptiles")
 * - Renaming a source without updating all layer references
 * - Copy-pasting layers from another style with different source names
 *
 * The rule reports the affected layer ID, the unknown source name, and
 * the list of available source IDs for easy correction.
 *
 * @see {@link sourcesPresentRule} — ensures the `sources` object exists
 */
import type { Rule } from '@tileguard/core';
import {
  getLayerId,
  getStyleLayers,
  getStyleObject,
  isRecord,
  STYLE_ARTIFACT_TYPE,
} from '../types.js';

export const knownSourceRule: Rule = {
  id: 'style/known-source',
  meta: {
    description:
      'Style layer source references must point to declared sources.',
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
      if (typeof layer.source !== 'string' || sourceIds.has(layer.source))
        continue;

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
