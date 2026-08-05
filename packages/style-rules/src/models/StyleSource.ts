/**
 * @tileguard/style-rules — StyleSource Model
 *
 * Immutable representation of a MapLibre source definition.
 * Supports all source types: vector, geojson, raster, raster-dem, image, video.
 */

// ---------------------------------------------------------------------------
// Source Types
// ---------------------------------------------------------------------------

export type SourceType =
  | 'vector'
  | 'geojson'
  | 'raster'
  | 'raster-dem'
  | 'image'
  | 'video';

// ---------------------------------------------------------------------------
// Base Source
// ---------------------------------------------------------------------------

interface StyleSourceBase {
  /** The source ID (key in the sources object). */
  readonly id: string;

  /** The source type discriminant. */
  readonly type: SourceType;

  /** Minimum zoom level at which tiles are available. */
  readonly minzoom?: number | undefined;

  /** Maximum zoom level at which tiles are available. */
  readonly maxzoom?: number | undefined;

  /** Attribution text to display on the map. */
  readonly attribution?: string | undefined;
}

// ---------------------------------------------------------------------------
// Concrete Source Types
// ---------------------------------------------------------------------------

export interface VectorSource extends StyleSourceBase {
  readonly type: 'vector';
  /** TileJSON URL. */
  readonly url?: string | undefined;
  /** Tile URL templates. */
  readonly tiles?: readonly string[] | undefined;
  /** Bounds [west, south, east, north]. */
  readonly bounds?: readonly [number, number, number, number] | undefined;
  /** Tile scheme: 'xyz' or 'tms'. */
  readonly scheme?: 'xyz' | 'tms' | undefined;
  /** Whether to promote feature IDs to properties. */
  readonly promoteId?: string | Readonly<Record<string, string>> | undefined;
}

export interface GeoJsonSource extends StyleSourceBase {
  readonly type: 'geojson';
  /** Inline GeoJSON data or a URL to a GeoJSON file. */
  readonly data?: unknown;
  /** Maximum zoom to cluster at. */
  readonly clusterMaxZoom?: number | undefined;
  /** Radius of each cluster (in pixels). */
  readonly clusterRadius?: number | undefined;
  /** Whether to enable clustering. */
  readonly cluster?: boolean | undefined;
  /** Properties to aggregate in clusters. */
  readonly clusterProperties?: Readonly<Record<string, unknown>> | undefined;
  /** Whether to generate feature IDs automatically. */
  readonly generateId?: boolean | undefined;
  /** Property to use as feature ID. */
  readonly promoteId?: string | undefined;
  /** Buffer around tiles (in pixels) for line and polygon geometry. */
  readonly buffer?: number | undefined;
  /** Douglas-Peucker tolerance for simplification. */
  readonly tolerance?: number | undefined;
  /** Whether to calculate line metrics. */
  readonly lineMetrics?: boolean | undefined;
}

export interface RasterSource extends StyleSourceBase {
  readonly type: 'raster';
  /** TileJSON URL. */
  readonly url?: string | undefined;
  /** Tile URL templates. */
  readonly tiles?: readonly string[] | undefined;
  /** Tile size in pixels. */
  readonly tileSize?: number | undefined;
  /** Bounds [west, south, east, north]. */
  readonly bounds?: readonly [number, number, number, number] | undefined;
  /** Tile scheme: 'xyz' or 'tms'. */
  readonly scheme?: 'xyz' | 'tms' | undefined;
}

export interface RasterDemSource extends StyleSourceBase {
  readonly type: 'raster-dem';
  /** TileJSON URL. */
  readonly url?: string | undefined;
  /** Tile URL templates. */
  readonly tiles?: readonly string[] | undefined;
  /** Tile size in pixels. */
  readonly tileSize?: number | undefined;
  /** Encoding format: 'mapbox' or 'terrarium'. */
  readonly encoding?: 'mapbox' | 'terrarium' | undefined;
  /** Bounds [west, south, east, north]. */
  readonly bounds?: readonly [number, number, number, number] | undefined;
}

export interface ImageSource extends StyleSourceBase {
  readonly type: 'image';
  /** URL of the image. */
  readonly url?: string | undefined;
  /** Corner coordinates [[lng, lat], ...] for the image. */
  readonly coordinates?: readonly (readonly [number, number])[] | undefined;
}

export interface VideoSource extends StyleSourceBase {
  readonly type: 'video';
  /** URLs of the video sources. */
  readonly urls?: readonly string[] | undefined;
  /** Corner coordinates [[lng, lat], ...] for the video. */
  readonly coordinates?: readonly (readonly [number, number])[] | undefined;
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type StyleSource =
  | VectorSource
  | GeoJsonSource
  | RasterSource
  | RasterDemSource
  | ImageSource
  | VideoSource;
