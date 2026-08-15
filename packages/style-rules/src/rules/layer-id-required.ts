/**
 * Rule: `style/layer-id-required`
 *
 * Validates that every style layer declares a non-empty `id`.
 *
 * @remarks
 * Layer IDs are the primary identifier for layers in the style specification.
 * They are used by:
 *
 * - Map SDKs for programmatic layer manipulation (`map.setLayoutProperty(id, ...)`)
 * - Style editors (Maputnik, MapLibre Studio) for layer selection
 * - TileGuard itself for diagnostic location reporting
 * - The `style/unique-layer-id` rule for uniqueness validation
 *
 * A missing or empty ID makes the layer unreferenceable and typically
 * indicates a malformed style that will be rejected by MapLibre GL JS.
 *
 * @see {@link uniqueLayerIdRule} — validates IDs are unique
 * @see {@link layersPresentRule} — validates the layers array exists
 */
import type { Rule } from '@tileguard/core';
import { getStyleObject, isRecord, STYLE_ARTIFACT_TYPE } from '../types.js';

export const layerIdRequiredRule: Rule = {
  id: 'style/layer-id-required',
  meta: {
    description: 'Every style layer must declare a non-empty id.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/style/layer-id-required',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    if (!Array.isArray(style.layers)) return;

    for (let index = 0; index < style.layers.length; index += 1) {
      const layer = style.layers[index];
      if (
        isRecord(layer) &&
        typeof layer.id === 'string' &&
        layer.id.length > 0
      ) {
        continue;
      }

      context.report({
        message: `Layer at index "${index}" is missing a non-empty id.`,
        location: { jsonPath: `layers[${index}].id` },
        suggestion: 'Add a unique non-empty "id" to this style layer.',
        data: { index },
      });
    }
  },
};
