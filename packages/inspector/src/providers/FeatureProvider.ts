/**
 * @tileguard/inspector — FeatureProvider
 *
 * Reads feature data from InspectorStore and exposes it in a flat,
 * service-friendly form. Services (SearchService, StatisticsService) use
 * providers instead of reading InspectorStore directly, keeping them
 * independent of the store's internal structure.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { InspectorStore } from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A fully resolved feature record suitable for display and search.
 * Flattened from the nested VectorTileArtifact layers structure.
 */
export interface ResolvedFeature {
  /** Layer this feature belongs to. */
  readonly layerName: string;
  /** Zero-based index within the layer's feature array. */
  readonly featureIndex: number;
  /** Raw feature ID from the tile (may be undefined). */
  readonly id: number | string | undefined;
  /** Geometry type string. */
  readonly geometryType: 'Point' | 'LineString' | 'Polygon' | string;
  /** Feature properties as a plain object. */
  readonly properties: Readonly<Record<string, unknown>>;
  /** Raw geometry (opaque — for display purposes). */
  readonly geometry: unknown;
}

// ---------------------------------------------------------------------------
// FeatureProvider interface
// ---------------------------------------------------------------------------

export interface FeatureProvider {
  /**
   * Returns all features across all layers, in layer declaration order.
   * Returns an empty array when no tile is loaded.
   */
  getAllFeatures(): readonly ResolvedFeature[];

  /**
   * Returns the feature currently selected in the store, or null if nothing
   * is selected or the referenced feature cannot be resolved.
   */
  getSelectedFeature(): ResolvedFeature | null;

  /**
   * Looks up a single feature by layer name and index.
   * Returns null if the layer or index does not exist.
   */
  getFeatureAt(layerName: string, featureIndex: number): ResolvedFeature | null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class FeatureProviderImpl implements FeatureProvider {
  constructor(private readonly _store: InspectorStore) {}

  getAllFeatures(): readonly ResolvedFeature[] {
    const { lifecycle } = this._store;
    if (lifecycle.status !== 'loaded') return [];
    return extractAllFeatures(lifecycle.artifact);
  }

  getSelectedFeature(): ResolvedFeature | null {
    const { selection, lifecycle } = this._store;
    if (
      selection.layerName === null ||
      selection.featureIndex === null ||
      lifecycle.status !== 'loaded'
    ) {
      return null;
    }
    return this.getFeatureAt(selection.layerName, selection.featureIndex);
  }

  getFeatureAt(
    layerName: string,
    featureIndex: number,
  ): ResolvedFeature | null {
    const { lifecycle } = this._store;
    if (lifecycle.status !== 'loaded') return null;
    // Cast via unknown: VectorTileLayer has readonly features, but we only read it.
    const layers = lifecycle.artifact.content.layers as unknown as Record<
      string,
      | {
          features: ReadonlyArray<{
            id?: number | string;
            geometryType: string;
            properties: unknown;
            geometry: unknown;
          }>;
        }
      | undefined
    >;
    const layer = layers[layerName];
    if (layer === undefined) return null;
    const feature = layer.features[featureIndex];
    if (feature === undefined) return null;
    return {
      layerName,
      featureIndex,
      id: feature.id,
      geometryType: feature.geometryType,
      properties: feature.properties as Record<string, unknown>,
      geometry: feature.geometry,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAllFeatures(artifact: VectorTileArtifact): ResolvedFeature[] {
  const result: ResolvedFeature[] = [];
  // Cast via unknown: VectorTileLayer has readonly features, but we only read it.
  const layers = artifact.content.layers as unknown as Record<
    string,
    {
      features: ReadonlyArray<{
        id?: number | string;
        geometryType: string;
        properties: unknown;
        geometry: unknown;
      }>;
    }
  >;
  for (const [layerName, layer] of Object.entries(layers)) {
    for (let i = 0; i < layer.features.length; i++) {
      const feature = layer.features[i];
      if (feature === undefined) continue;
      result.push({
        layerName,
        featureIndex: i,
        id: feature.id,
        geometryType: feature.geometryType,
        properties: feature.properties as Record<string, unknown>,
        geometry: feature.geometry,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a FeatureProvider backed by the given InspectorStore.
 *
 * @example
 *   const provider = createFeatureProvider(store);
 *   const features = provider.getAllFeatures();
 */
export function createFeatureProvider(store: InspectorStore): FeatureProvider {
  return new FeatureProviderImpl(store);
}
