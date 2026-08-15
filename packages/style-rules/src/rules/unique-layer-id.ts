/**
 * Rule: `style/unique-layer-id`
 *
 * Validates that all layer IDs in the style are unique.
 *
 * @remarks
 * Duplicate layer IDs cause undefined behavior in map renderers:
 *
 * - `map.getLayer(id)` returns only the first match
 * - `map.setPaintProperty(id, ...)` modifies only the first match
 * - Style tooling may merge or overwrite duplicate layers during processing
 * - The rendered result depends on implementation-specific load order
 *
 * Duplicates typically arise from copy-paste errors during style editing or
 * incorrect style merging tools.
 *
 * The rule reports each duplicate occurrence with the index of both the
 * first and duplicate layer for easy identification.
 *
 * @see {@link layerIdRequiredRule} — validates IDs are present
 */
import type { Rule } from '@tileguard/core';
import {
  getLayerId,
  getStyleLayers,
  getStyleObject,
  STYLE_ARTIFACT_TYPE,
} from '../types.js';

export const uniqueLayerIdRule: Rule = {
  id: 'style/unique-layer-id',
  meta: {
    description: 'Style layer ids must be unique.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/unique-layer-id',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    const layers = getStyleLayers(style);
    const firstSeen = new Map<string, number>();

    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index]!;
      const id = getLayerId(layer);
      if (id === undefined) continue;

      const firstIndex = firstSeen.get(id);
      if (firstIndex !== undefined) {
        context.report({
          message: `Duplicate layer ID "${id}" at index "${index}" (first seen at index "${firstIndex}").`,
          location: { jsonPath: `layers[${index}].id` },
          suggestion: 'Rename one of the layers to use a unique ID.',
          data: { id, firstIndex, duplicateIndex: index },
        });
      } else {
        firstSeen.set(id, index);
      }
    }
  },
};
