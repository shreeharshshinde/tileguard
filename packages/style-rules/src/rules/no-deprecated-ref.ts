/**
 * Rule: `style/no-deprecated-ref`
 *
 * Flags style layers that use the deprecated `ref` property.
 *
 * @remarks
 * The `ref` property was an early style specification feature that allowed
 * one layer to inherit from another. It was deprecated in Mapbox GL JS v0.36
 * and removed from the specification because:
 *
 * - It created implicit coupling between layers
 * - It made style documents harder to reason about statically
 * - It complicated layer resolution in style tooling
 *
 * MapLibre GL JS still supports `ref` for backward compatibility but may
 * remove support in future versions. Styles using `ref` should be migrated
 * to use full layer definitions.
 *
 * The rule defaults to `warning` severity since `ref` layers still render
 * correctly in current MapLibre versions.
 *
 * @see {@link https://github.com/mapbox/mapbox-gl-js/issues/3965 | Original deprecation discussion}
 */
import type { Rule } from '@tileguard/core';
import {
  getLayerId,
  getStyleLayers,
  getStyleObject,
  STYLE_ARTIFACT_TYPE,
} from '../types.js';

export const noDeprecatedRefRule: Rule = {
  id: 'style/no-deprecated-ref',
  meta: {
    description: 'Style layers must not use the deprecated ref property.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/style/no-deprecated-ref',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    const layers = getStyleLayers(style);

    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index]!;
      if (!Object.hasOwn(layer, 'ref')) continue;

      const layerId = getLayerId(layer) ?? `<layer ${index}>`;
      context.report({
        message: `Layer "${layerId}" uses deprecated property "ref".`,
        location: { jsonPath: `layers[${index}].ref` },
        suggestion: 'Replace this ref layer with a full layer definition.',
        data: { layerId },
      });
    }
  },
};
