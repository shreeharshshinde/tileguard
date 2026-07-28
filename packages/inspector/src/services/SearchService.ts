/**
 * @tileguard/inspector — SearchService
 *
 * Executes text-based feature searches against the loaded tile, using
 * FeatureProvider to access features. Supports the following query patterns:
 *
 *   roads            — match layer name (case-insensitive, contains)
 *   feature:48       — match feature ID exactly
 *   highway=primary  — match property key=value (case-insensitive)
 *   bridge           — match any property key (case-insensitive, contains)
 *   Main Street      — match any string property value (case-insensitive, contains)
 *
 * SearchService never reads InspectorStore directly; it goes through
 * FeatureProvider, keeping it independent of the store's structure.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { FeatureProvider, ResolvedFeature } from '../providers/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single search match. */
export interface SearchResult {
  /** The matched feature. */
  readonly feature: ResolvedFeature;
  /**
   * Human-readable description of why this feature matched the query.
   * e.g. "Layer: roads", "Feature ID: 48", "highway = primary"
   */
  readonly matchReason: string;
}

// ---------------------------------------------------------------------------
// SearchService interface
// ---------------------------------------------------------------------------

export interface SearchService {
  /**
   * Execute a search query.
   * Returns all features that match the query, ordered by layer then index.
   * Returns an empty array when the provider has no features (no tile loaded).
   */
  search(query: string): readonly SearchResult[];
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

type ParsedQuery =
  | { kind: 'featureId'; id: string }
  | { kind: 'keyValue'; key: string; value: string }
  | { kind: 'text'; text: string };

function parseQuery(raw: string): ParsedQuery {
  const q = raw.trim();

  // feature:48 — feature ID lookup
  const featureIdMatch = /^feature:(.+)$/i.exec(q);
  if (featureIdMatch !== null) {
    const id = featureIdMatch[1];
    if (id === undefined) return { kind: 'text', text: q };
    return { kind: 'featureId', id: id.trim() };
  }

  // key=value — property key=value lookup
  const kvMatch = /^([^=]+)=(.+)$/.exec(q);
  if (kvMatch !== null) {
    const key = kvMatch[1];
    const value = kvMatch[2];
    if (key === undefined || value === undefined) return { kind: 'text', text: q };
    return {
      kind: 'keyValue',
      key: key.trim(),
      value: value.trim(),
    };
  }

  // Anything else — free text search across layer names and property values
  return { kind: 'text', text: q };
}

// ---------------------------------------------------------------------------
// Match functions
// ---------------------------------------------------------------------------

function matchFeature(
  feature: ResolvedFeature,
  query: ParsedQuery,
): string | null {
  switch (query.kind) {
    case 'featureId': {
      const id = feature.id;
      if (id !== undefined && String(id) === query.id) {
        return `Feature ID: ${id}`;
      }
      return null;
    }

    case 'keyValue': {
      const keyLower = query.key.toLowerCase();
      const valueLower = query.value.toLowerCase();
      for (const [k, v] of Object.entries(feature.properties)) {
        if (
          k.toLowerCase().includes(keyLower) &&
          String(v).toLowerCase().includes(valueLower)
        ) {
          return `${k} = ${String(v)}`;
        }
      }
      return null;
    }

    case 'text': {
      const textLower = query.text.toLowerCase();

      // 1. Layer name match
      if (feature.layerName.toLowerCase().includes(textLower)) {
        return `Layer: ${feature.layerName}`;
      }

      // 2. Property key match
      for (const k of Object.keys(feature.properties)) {
        if (k.toLowerCase().includes(textLower)) {
          return `Property key: ${k}`;
        }
      }

      // 3. Property value match (string values only)
      for (const [k, v] of Object.entries(feature.properties)) {
        if (typeof v === 'string' && v.toLowerCase().includes(textLower)) {
          return `${k} = ${v}`;
        }
      }

      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SearchServiceImpl implements SearchService {
  constructor(private readonly _featureProvider: FeatureProvider) {}

  search(query: string): readonly SearchResult[] {
    const trimmed = query.trim();
    if (trimmed === '') return [];

    const parsed = parseQuery(trimmed);
    const features = this._featureProvider.getAllFeatures();
    const results: SearchResult[] = [];

    for (const feature of features) {
      const reason = matchFeature(feature, parsed);
      if (reason !== null) {
        results.push({ feature, matchReason: reason });
      }
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a SearchService backed by the given FeatureProvider.
 *
 * @example
 *   const service = createSearchService(featureProvider);
 *   const results = service.search('highway=primary');
 */
export function createSearchService(
  featureProvider: FeatureProvider,
): SearchService {
  return new SearchServiceImpl(featureProvider);
}
