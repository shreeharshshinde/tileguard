/**
 * @tileguard/inspector — SearchService (Milestone 6 — Step 4 extended)
 *
 * Executes text-based feature searches against the loaded tile, using
 * FeatureProvider to access features.
 *
 * Supported query syntax:
 *
 *   roads                — free text: match layer name or any property
 *   feature:48           — feature ID exact match
 *   layer:roads          — explicit layer name match (contains)
 *   type:polygon         — geometry type match (contains)
 *   id:123               — feature ID (alias for feature:123)
 *   highway=primary      — property key=value
 *   /regex/              — regex match against all string property values
 *   query1 AND query2    — AND-combination of any two sub-queries
 *
 * Results are ranked by relevance:
 *   1. Exact layer-name match
 *   2. Property key=value match
 *   3. Feature-ID match
 *   4. Partial/free-text match
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
   */
  readonly matchReason: string;
  /**
   * Relevance score (higher = more relevant).
   * Used to sort results with the most relevant first.
   */
  readonly score: number;
}

// ---------------------------------------------------------------------------
// SearchService interface
// ---------------------------------------------------------------------------

export interface SearchService {
  /**
   * Execute a search query.
   * Returns all features that match, sorted by descending relevance score.
   * Returns an empty array when the provider has no features or the query
   * is blank.
   */
  search(query: string): readonly SearchResult[];
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

type AtomicQuery =
  | { kind: 'featureId'; id: string }
  | { kind: 'layer'; text: string }
  | { kind: 'type'; text: string }
  | { kind: 'keyValue'; key: string; value: string }
  | { kind: 'regex'; pattern: RegExp; raw: string }
  | { kind: 'text'; text: string };

type ParsedQuery =
  | { kind: 'and'; left: ParsedQuery; right: ParsedQuery }
  | AtomicQuery;

function parseAtomic(raw: string): AtomicQuery {
  const q = raw.trim();

  // feature:48 or id:48
  const featureIdMatch = /^(?:feature|id):(.+)$/i.exec(q);
  if (featureIdMatch !== null) {
    return { kind: 'featureId', id: (featureIdMatch[1] ?? '').trim() };
  }

  // layer:roads
  const layerMatch = /^layer:(.+)$/i.exec(q);
  if (layerMatch !== null) {
    return { kind: 'layer', text: (layerMatch[1] ?? '').trim() };
  }

  // type:polygon
  const typeMatch = /^type:(.+)$/i.exec(q);
  if (typeMatch !== null) {
    return { kind: 'type', text: (typeMatch[1] ?? '').trim() };
  }

  // /regex/ — a forward-slash-delimited regex (optional trailing slash)
  const regexMatch = /^\/(.+?)(?:\/)?\s*$/.exec(q);
  if (regexMatch !== null) {
    const pat = regexMatch[1] ?? '';
    try {
      return { kind: 'regex', pattern: new RegExp(pat, 'i'), raw: pat };
    } catch {
      // Invalid regex — fall through to free-text
    }
  }

  // key=value
  const kvMatch = /^([^=]+)=(.+)$/.exec(q);
  if (kvMatch !== null) {
    const key = kvMatch[1] ?? '';
    const value = kvMatch[2] ?? '';
    return { kind: 'keyValue', key: key.trim(), value: value.trim() };
  }

  // Free text
  return { kind: 'text', text: q };
}

function parseQuery(raw: string): ParsedQuery {
  // AND — split on first occurrence of " AND " (case-insensitive)
  const andIdx = raw.search(/ AND /i);
  if (andIdx !== -1) {
    const left = raw.slice(0, andIdx).trim();
    const right = raw.slice(andIdx + 5).trim(); // skip " AND "
    if (left.length > 0 && right.length > 0) {
      return {
        kind: 'and',
        left: parseQuery(left),
        right: parseQuery(right),
      };
    }
  }
  return parseAtomic(raw);
}

// ---------------------------------------------------------------------------
// Match functions (return reason string + score, or null)
// ---------------------------------------------------------------------------

interface MatchResult {
  reason: string;
  score: number;
}

function matchAtomic(
  feature: ResolvedFeature,
  query: AtomicQuery,
): MatchResult | null {
  switch (query.kind) {
    case 'featureId': {
      const id = feature.id;
      if (id !== undefined && String(id) === query.id) {
        return { reason: `Feature ID: ${id}`, score: 90 };
      }
      return null;
    }

    case 'layer': {
      if (feature.layerName.toLowerCase().includes(query.text.toLowerCase())) {
        const exact =
          feature.layerName.toLowerCase() === query.text.toLowerCase();
        return {
          reason: `Layer: ${feature.layerName}`,
          score: exact ? 100 : 70,
        };
      }
      return null;
    }

    case 'type': {
      if (
        feature.geometryType.toLowerCase().includes(query.text.toLowerCase())
      ) {
        return {
          reason: `Type: ${feature.geometryType}`,
          score: 60,
        };
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
          return { reason: `${k} = ${String(v)}`, score: 80 };
        }
      }
      return null;
    }

    case 'regex': {
      for (const [k, v] of Object.entries(feature.properties)) {
        if (typeof v === 'string' && query.pattern.test(v)) {
          return { reason: `/${query.raw}/ → ${k} = ${v}`, score: 75 };
        }
      }
      return null;
    }

    case 'text': {
      const textLower = query.text.toLowerCase();

      // Layer name — best partial match
      if (feature.layerName.toLowerCase().includes(textLower)) {
        const exact = feature.layerName.toLowerCase() === textLower;
        return {
          reason: `Layer: ${feature.layerName}`,
          score: exact ? 100 : 65,
        };
      }

      // Property key match
      for (const k of Object.keys(feature.properties)) {
        if (k.toLowerCase().includes(textLower)) {
          return { reason: `Property key: ${k}`, score: 55 };
        }
      }

      // Property value match
      for (const [k, v] of Object.entries(feature.properties)) {
        if (typeof v === 'string' && v.toLowerCase().includes(textLower)) {
          return { reason: `${k} = ${v}`, score: 50 };
        }
      }

      return null;
    }
  }
}

function matchQuery(
  feature: ResolvedFeature,
  query: ParsedQuery,
): MatchResult | null {
  if (query.kind === 'and') {
    const left = matchQuery(feature, query.left);
    const right = matchQuery(feature, query.right);
    if (left !== null && right !== null) {
      return {
        reason: `${left.reason} & ${right.reason}`,
        score: Math.min(left.score, right.score) + 10,
      };
    }
    return null;
  }
  return matchAtomic(feature, query);
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
      const match = matchQuery(feature, parsed);
      if (match !== null) {
        results.push({
          feature,
          matchReason: match.reason,
          score: match.score,
        });
      }
    }

    // Sort by score descending, then by layer+index for stability
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const layerCmp = a.feature.layerName.localeCompare(b.feature.layerName);
      if (layerCmp !== 0) return layerCmp;
      return a.feature.featureIndex - b.feature.featureIndex;
    });

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
 *   const layerResults = service.search('layer:roads');
 *   const polyResults = service.search('type:polygon AND height=30');
 */
export function createSearchService(
  featureProvider: FeatureProvider,
): SearchService {
  return new SearchServiceImpl(featureProvider);
}
