/**
 * @tileguard/inspector — LayerProvider
 *
 * Reads layer metadata from InspectorStore and exposes it in a flat,
 * service-friendly form. Provides layer names, feature counts, and geometry
 * type breakdowns for display in the filter panel and layer selector.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { InspectorStore } from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Metadata for a single layer in the loaded tile. */
export interface LayerInfo {
  /** Layer name as declared in the MVT. */
  readonly name: string;
  /** Total number of features in this layer. */
  readonly featureCount: number;
  /** Set of geometry types present in this layer. */
  readonly geometryTypes: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// LayerProvider interface
// ---------------------------------------------------------------------------

export interface LayerProvider {
  /**
   * Returns metadata for all layers in declaration order.
   * Returns an empty array when no tile is loaded.
   */
  getLayers(): readonly LayerInfo[];

  /**
   * Returns the names of all layers.
   * Convenience wrapper over getLayers().
   */
  getLayerNames(): readonly string[];

  /**
   * Returns metadata for a specific layer by name, or null if it doesn't exist.
   */
  getLayer(name: string): LayerInfo | null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class LayerProviderImpl implements LayerProvider {
  constructor(private readonly _store: InspectorStore) {}

  getLayers(): readonly LayerInfo[] {
    const { lifecycle } = this._store;
    if (lifecycle.status !== 'loaded') return [];
    return Object.entries(lifecycle.artifact.content.layers).map(
      ([name, layer]) => {
        const geometryTypes = new Set<string>();
        for (const f of layer.features) {
          geometryTypes.add(f.geometryType);
        }
        return {
          name,
          featureCount: layer.features.length,
          geometryTypes: Object.freeze(geometryTypes) as ReadonlySet<string>,
        };
      },
    );
  }

  getLayerNames(): readonly string[] {
    const { lifecycle } = this._store;
    if (lifecycle.status !== 'loaded') return [];
    return Object.keys(lifecycle.artifact.content.layers);
  }

  getLayer(name: string): LayerInfo | null {
    return this.getLayers().find((l) => l.name === name) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a LayerProvider backed by the given InspectorStore.
 *
 * @example
 *   const provider = createLayerProvider(store);
 *   const layers = provider.getLayers();
 */
export function createLayerProvider(store: InspectorStore): LayerProvider {
  return new LayerProviderImpl(store);
}
