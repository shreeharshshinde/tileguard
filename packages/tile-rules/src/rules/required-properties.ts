/**
 * Rule: `tile/required-properties`
 *
 * Validates that features in specified layers include required properties.
 *
 * @remarks
 * Map renderers and data consumers depend on specific feature properties
 * being present. Missing properties can cause:
 *
 * - Labels failing to render (missing `name` or `name:en`)
 * - Style expressions evaluating to fallback values
 * - Data pipeline consumers silently dropping features
 * - Incorrect classification (missing `class` or `type` property)
 *
 * This rule checks every feature in the configured layers and reports
 * each missing property individually, enabling precise diagnosis of which
 * features and which properties are affected.
 *
 * Layers not present in the tile are silently skipped (use
 * `tile/required-layers` to enforce layer presence).
 *
 * @example
 * ```ts
 * rules: {
 *   'tile/required-properties': ['error', {
 *     layers: {
 *       buildings: ['name', 'height', 'type'],
 *       roads: ['name', 'class', 'oneway'],
 *     }
 *   }]
 * }
 * ```
 *
 * @see {@link requiredLayersRule} for enforcing layer presence
 * @see {@link RequiredPropertiesOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

/**
 * Configuration options for the `tile/required-properties` rule.
 *
 * Supports three equivalent configuration forms for flexibility:
 * - `{ layers: { water: ['name', 'class'] } }` (preferred)
 * - `{ requiredProperties: { water: ['name', 'class'] } }` (legacy)
 * - `{ water: ['name', 'class'] }` (shorthand)
 */
export interface RequiredPropertiesOptions {
  /** Per-layer required property lists. Preferred configuration form. */
  readonly layers?: Readonly<Record<string, readonly string[]>>;
  /** @deprecated Use `layers` instead. */
  readonly requiredProperties?: Readonly<Record<string, readonly string[]>>;
  /** Shorthand: layer names as top-level keys with property arrays as values. */
  readonly [layerName: string]: unknown;
}

export const requiredPropertiesRule: Rule<RequiredPropertiesOptions> = {
  id: 'tile/required-properties',
  meta: {
    description:
      'Vector tile features must include configured required properties.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/required-properties',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const requiredProperties = normalizeRequiredProperties(context.options);
    const tile = getVectorTile(context.artifact);

    for (const [layerName, properties] of Object.entries(requiredProperties)) {
      if (properties.length === 0) continue;

      const layer = tile.layers[layerName];
      if (layer === undefined) continue;

      for (
        let featureIndex = 0;
        featureIndex < layer.features.length;
        featureIndex += 1
      ) {
        const feature = layer.features[featureIndex]!;
        for (const property of properties) {
          if (Object.hasOwn(feature.properties, property)) continue;

          context.report({
            message: `Feature "${featureIndex}" in layer "${layerName}" is missing required property "${property}".`,
            location: { layer: layerName, featureIndex },
            suggestion: `Add property "${property}" to every feature in layer "${layerName}", or remove it from the required property list.`,
            data: { layer: layerName, featureIndex, property },
          });
        }
      }
    }
  },
};

function normalizeRequiredProperties(
  options: RequiredPropertiesOptions | undefined,
): Readonly<Record<string, readonly string[]>> {
  if (options === undefined) return {};
  if (options.layers !== undefined) return options.layers;
  if (options.requiredProperties !== undefined)
    return options.requiredProperties;

  const result: Record<string, readonly string[]> = {};
  for (const [key, value] of Object.entries(options)) {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      result[key] = value;
    }
  }
  return result;
}
