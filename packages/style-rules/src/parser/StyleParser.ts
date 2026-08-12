/**
 * @tileguard/style-rules — Style Parser
 *
 * Parses raw JSON (as a plain object or string) into the StyleDocument model.
 * Parsing is structural — it does NOT validate. Validation comes later.
 *
 * Responsibilities:
 *   - Extract and type all top-level fields
 *   - Parse sources into typed StyleSource models
 *   - Parse layers into typed StyleLayer models (with expression ASTs)
 *   - Preserve raw JSON for anything not explicitly modeled
 */

import type {
  SpriteDescriptor,
  StyleDocument,
  StyleFog,
  StyleImport,
  StyleLight,
  StyleProjection,
  StyleTerrain,
  StyleTransition,
} from '../models/StyleDocument.js';
import type {
  LayerFilter,
  PropertyValue,
  StyleLayer,
} from '../models/StyleLayer.js';
import type {
  GeoJsonSource,
  ImageSource,
  RasterDemSource,
  RasterSource,
  SourceType,
  StyleSource,
  VectorSource,
  VideoSource,
} from '../models/StyleSource.js';
import { isExpressionArray, parseExpression } from './ExpressionParser.js';
import { parseFilter } from './FilterParser.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Result of parsing — either a document or an error.
 */
export interface ParseResult {
  readonly document: StyleDocument | undefined;
  readonly error: string | undefined;
}

/**
 * Parse a style JSON value into a StyleDocument.
 *
 * Accepts either:
 *   - A string (raw JSON to be parsed)
 *   - A plain object (already-parsed JSON)
 *
 * Returns a ParseResult with either a document or an error.
 */
export function parseStyleDocument(input: unknown): ParseResult {
  let raw: Record<string, unknown>;

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (!isRecord(parsed)) {
        return {
          document: undefined,
          error: 'Style document must be a JSON object.',
        };
      }
      raw = parsed as Record<string, unknown>;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { document: undefined, error: `Invalid JSON: ${message}` };
    }
  } else if (isRecord(input)) {
    raw = input as Record<string, unknown>;
  } else {
    return {
      document: undefined,
      error: 'Style document must be a JSON object.',
    };
  }

  const document = buildDocument(raw);
  return { document, error: undefined };
}

// ---------------------------------------------------------------------------
// Document Builder
// ---------------------------------------------------------------------------

function buildDocument(raw: Record<string, unknown>): StyleDocument {
  return {
    version: typeof raw.version === 'number' ? raw.version : undefined,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    metadata: isRecord(raw.metadata)
      ? (raw.metadata as Record<string, unknown>)
      : undefined,
    sprite: parseSpriteValue(raw.sprite),
    glyphs: typeof raw.glyphs === 'string' ? raw.glyphs : undefined,
    projection: parseProjection(raw.projection),
    terrain: parseTerrain(raw.terrain),
    fog: parseFog(raw.fog),
    light: parseLight(raw.light),
    transition: parseTransition(raw.transition),
    center: parseCenter(raw.center),
    zoom: typeof raw.zoom === 'number' ? raw.zoom : undefined,
    bearing: typeof raw.bearing === 'number' ? raw.bearing : undefined,
    pitch: typeof raw.pitch === 'number' ? raw.pitch : undefined,
    sources: parseSources(raw.sources),
    layers: parseLayers(raw.layers),
    imports: parseImports(raw.imports),
    raw,
  };
}

// ---------------------------------------------------------------------------
// Top-Level Field Parsers
// ---------------------------------------------------------------------------

function parseSpriteValue(value: unknown): SpriteDescriptor | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    // Structured sprite format: [{id, url}, ...]
    const descriptors = value.filter(
      (item): item is { id: string; url: string } =>
        isRecord(item) &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).url === 'string',
    );
    return descriptors.length > 0 ? descriptors : undefined;
  }
  return undefined;
}

function parseProjection(value: unknown): StyleProjection | undefined {
  if (!isRecord(value)) return undefined;
  const rec = value as Record<string, unknown>;
  const type = typeof rec.type === 'string' ? rec.type : 'mercator';
  return { type };
}

function parseTerrain(value: unknown): StyleTerrain | undefined {
  if (!isRecord(value)) return undefined;
  const rec = value as Record<string, unknown>;
  if (typeof rec.source !== 'string') return undefined;
  return {
    source: rec.source,
    exaggeration:
      typeof rec.exaggeration === 'number' ? rec.exaggeration : undefined,
  };
}

function parseFog(value: unknown): StyleFog | undefined {
  if (!isRecord(value)) return undefined;
  const rec = value as Record<string, unknown>;
  return {
    color: typeof rec.color === 'string' ? rec.color : undefined,
    'high-color':
      typeof rec['high-color'] === 'string' ? rec['high-color'] : undefined,
    'horizon-blend':
      typeof rec['horizon-blend'] === 'number'
        ? rec['horizon-blend']
        : undefined,
    range: parseTuple2(rec.range),
    'star-intensity':
      typeof rec['star-intensity'] === 'number'
        ? rec['star-intensity']
        : undefined,
    'space-color':
      typeof rec['space-color'] === 'string' ? rec['space-color'] : undefined,
  };
}

function parseLight(value: unknown): StyleLight | undefined {
  if (!isRecord(value)) return undefined;
  const rec = value as Record<string, unknown>;
  return {
    anchor:
      rec.anchor === 'map' || rec.anchor === 'viewport'
        ? rec.anchor
        : undefined,
    color: typeof rec.color === 'string' ? rec.color : undefined,
    intensity: typeof rec.intensity === 'number' ? rec.intensity : undefined,
    position: parseTuple3(rec.position),
  };
}

function parseTransition(value: unknown): StyleTransition | undefined {
  if (!isRecord(value)) return undefined;
  const rec = value as Record<string, unknown>;
  return {
    duration: typeof rec.duration === 'number' ? rec.duration : undefined,
    delay: typeof rec.delay === 'number' ? rec.delay : undefined,
  };
}

function parseCenter(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  if (typeof value[0] !== 'number' || typeof value[1] !== 'number')
    return undefined;
  return [value[0], value[1]] as const;
}

function parseImports(value: unknown): readonly StyleImport[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const imports: StyleImport[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== 'string' || typeof rec.url !== 'string') continue;
    imports.push({
      id: rec.id,
      url: rec.url,
      config: isRecord(rec.config)
        ? (rec.config as Record<string, unknown>)
        : undefined,
    });
  }
  return imports.length > 0 ? imports : undefined;
}

// ---------------------------------------------------------------------------
// Source Parsing
// ---------------------------------------------------------------------------

function parseSources(value: unknown): ReadonlyMap<string, StyleSource> {
  const map = new Map<string, StyleSource>();
  if (!isRecord(value)) return map;

  const sources = value as Record<string, unknown>;
  for (const [id, sourceDef] of Object.entries(sources)) {
    if (!isRecord(sourceDef)) continue;
    const source = parseSource(id, sourceDef as Record<string, unknown>);
    if (source) map.set(id, source);
  }
  return map;
}

function parseSource(
  id: string,
  raw: Record<string, unknown>,
): StyleSource | undefined {
  const type = raw.type as string | undefined;
  if (typeof type !== 'string') return undefined;

  const base = {
    id,
    minzoom: typeof raw.minzoom === 'number' ? raw.minzoom : undefined,
    maxzoom: typeof raw.maxzoom === 'number' ? raw.maxzoom : undefined,
    attribution:
      typeof raw.attribution === 'string' ? raw.attribution : undefined,
  };

  switch (type) {
    case 'vector':
      return {
        ...base,
        type: 'vector',
        url: typeof raw.url === 'string' ? raw.url : undefined,
        tiles: parseStringArray(raw.tiles),
        bounds: parseBounds(raw.bounds),
        scheme:
          raw.scheme === 'xyz' || raw.scheme === 'tms' ? raw.scheme : undefined,
        promoteId: parsePromoteId(raw.promoteId),
      } satisfies VectorSource;

    case 'geojson':
      return {
        ...base,
        type: 'geojson',
        data: raw.data,
        cluster: typeof raw.cluster === 'boolean' ? raw.cluster : undefined,
        clusterMaxZoom:
          typeof raw.clusterMaxZoom === 'number'
            ? raw.clusterMaxZoom
            : undefined,
        clusterRadius:
          typeof raw.clusterRadius === 'number' ? raw.clusterRadius : undefined,
        clusterProperties: isRecord(raw.clusterProperties)
          ? (raw.clusterProperties as Record<string, unknown>)
          : undefined,
        generateId:
          typeof raw.generateId === 'boolean' ? raw.generateId : undefined,
        promoteId:
          typeof raw.promoteId === 'string' ? raw.promoteId : undefined,
        buffer: typeof raw.buffer === 'number' ? raw.buffer : undefined,
        tolerance:
          typeof raw.tolerance === 'number' ? raw.tolerance : undefined,
        lineMetrics:
          typeof raw.lineMetrics === 'boolean' ? raw.lineMetrics : undefined,
      } satisfies GeoJsonSource;

    case 'raster':
      return {
        ...base,
        type: 'raster',
        url: typeof raw.url === 'string' ? raw.url : undefined,
        tiles: parseStringArray(raw.tiles),
        tileSize: typeof raw.tileSize === 'number' ? raw.tileSize : undefined,
        bounds: parseBounds(raw.bounds),
        scheme:
          raw.scheme === 'xyz' || raw.scheme === 'tms' ? raw.scheme : undefined,
      } satisfies RasterSource;

    case 'raster-dem':
      return {
        ...base,
        type: 'raster-dem',
        url: typeof raw.url === 'string' ? raw.url : undefined,
        tiles: parseStringArray(raw.tiles),
        tileSize: typeof raw.tileSize === 'number' ? raw.tileSize : undefined,
        encoding:
          raw.encoding === 'mapbox' || raw.encoding === 'terrarium'
            ? raw.encoding
            : undefined,
        bounds: parseBounds(raw.bounds),
      } satisfies RasterDemSource;

    case 'image':
      return {
        ...base,
        type: 'image',
        url: typeof raw.url === 'string' ? raw.url : undefined,
        coordinates: parseCoordinateArray(raw.coordinates),
      } satisfies ImageSource;

    case 'video':
      return {
        ...base,
        type: 'video',
        urls: parseStringArray(raw.urls),
        coordinates: parseCoordinateArray(raw.coordinates),
      } satisfies VideoSource;

    default:
      // Unknown source type — still parse as a vector source shape
      return { ...base, type: type as SourceType };
  }
}

// ---------------------------------------------------------------------------
// Layer Parsing
// ---------------------------------------------------------------------------

function parseLayers(value: unknown): readonly StyleLayer[] {
  if (!Array.isArray(value)) return [];

  const layers: StyleLayer[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!isRecord(item)) continue;
    const layer = parseLayer(item as Record<string, unknown>, i);
    layers.push(layer);
  }
  return layers;
}

function parseLayer(raw: Record<string, unknown>, index: number): StyleLayer {
  const id = typeof raw.id === 'string' ? raw.id : `<unnamed-${index}>`;
  const type = typeof raw.type === 'string' ? raw.type : 'unknown';

  return {
    id,
    type,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    sourceLayer:
      typeof raw['source-layer'] === 'string' ? raw['source-layer'] : undefined,
    filter: parseLayerFilter(raw.filter),
    minzoom: typeof raw.minzoom === 'number' ? raw.minzoom : undefined,
    maxzoom: typeof raw.maxzoom === 'number' ? raw.maxzoom : undefined,
    layout: parseProperties(raw.layout),
    paint: parseProperties(raw.paint),
    metadata: isRecord(raw.metadata)
      ? (raw.metadata as Record<string, unknown>)
      : undefined,
    index,
    raw,
  };
}

function parseLayerFilter(value: unknown): LayerFilter | undefined {
  if (value === undefined || value === null) return undefined;
  return {
    raw: value,
    expression: parseFilter(value),
  };
}

function parseProperties(value: unknown): ReadonlyMap<string, PropertyValue> {
  const map = new Map<string, PropertyValue>();
  if (!isRecord(value)) return map;

  const props = value as Record<string, unknown>;
  for (const [key, propValue] of Object.entries(props)) {
    map.set(key, parsePropertyValue(propValue));
  }
  return map;
}

function parsePropertyValue(value: unknown): PropertyValue {
  return {
    raw: value,
    expression: isExpressionArray(value) ? parseExpression(value) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Utility Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === 'string');
  return strings.length > 0 ? strings : undefined;
}

function parseBounds(
  value: unknown,
): readonly [number, number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 4) return undefined;
  if (value.slice(0, 4).some((v) => typeof v !== 'number')) return undefined;
  return [
    value[0] as number,
    value[1] as number,
    value[2] as number,
    value[3] as number,
  ];
}

function parseTuple2(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  if (typeof value[0] !== 'number' || typeof value[1] !== 'number')
    return undefined;
  return [value[0], value[1]];
}

function parseTuple3(
  value: unknown,
): readonly [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  if (
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    typeof value[2] !== 'number'
  )
    return undefined;
  return [value[0], value[1], value[2]];
}

function parsePromoteId(
  value: unknown,
): string | Record<string, string> | undefined {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string') result[k] = v;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return undefined;
}

function parseCoordinateArray(
  value: unknown,
): readonly (readonly [number, number])[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const coords: [number, number][] = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length < 2) return undefined;
    if (typeof item[0] !== 'number' || typeof item[1] !== 'number')
      return undefined;
    coords.push([item[0], item[1]]);
  }
  return coords.length > 0 ? coords : undefined;
}
