/**
 * @tileguard/style-rules — StyleDocument Model
 *
 * An immutable, fully-typed representation of a parsed MapLibre style document.
 * This is the root model produced by the Style Parser.
 *
 * All fields are readonly. The document captures the full structure of a
 * MapLibre GL Style Specification (version 8) without performing validation.
 */

import type { StyleLayer } from './StyleLayer.js';
import type { StyleSource } from './StyleSource.js';

// ---------------------------------------------------------------------------
// Top-Level Style Properties
// ---------------------------------------------------------------------------

/**
 * Sprite configuration — either a simple URL string or a structured sprite
 * descriptor with id and url (MapLibre v4+).
 */
export type SpriteDescriptor =
  | string
  | readonly { readonly id: string; readonly url: string }[];

/**
 * Projection configuration for the map.
 */
export interface StyleProjection {
  readonly type: 'mercator' | 'globe' | string;
}

/**
 * Terrain configuration for 3D terrain rendering.
 */
export interface StyleTerrain {
  readonly source: string;
  readonly exaggeration?: number | undefined;
}

/**
 * Fog / atmosphere configuration.
 */
export interface StyleFog {
  readonly color?: string | undefined;
  readonly 'high-color'?: string | undefined;
  readonly 'horizon-blend'?: number | undefined;
  readonly range?: readonly [number, number] | undefined;
  readonly 'star-intensity'?: number | undefined;
  readonly 'space-color'?: string | undefined;
}

/**
 * Light configuration for 3D layers.
 */
export interface StyleLight {
  readonly anchor?: 'map' | 'viewport' | undefined;
  readonly color?: string | undefined;
  readonly intensity?: number | undefined;
  readonly position?: readonly [number, number, number] | undefined;
}

/**
 * Transition configuration for paint properties.
 */
export interface StyleTransition {
  readonly duration?: number | undefined;
  readonly delay?: number | undefined;
}

/**
 * Import descriptor for composable styles (future-ready).
 */
export interface StyleImport {
  readonly id: string;
  readonly url: string;
  readonly config?: Readonly<Record<string, unknown>> | undefined;
}

// ---------------------------------------------------------------------------
// StyleDocument
// ---------------------------------------------------------------------------

/**
 * The root style model. Represents a fully parsed MapLibre style document
 * with typed fields for every supported top-level property.
 *
 * Invariant: all fields are readonly. Mutations create new instances.
 * Invariant: optional fields are undefined rather than omitted.
 */
export interface StyleDocument {
  /** Style specification version. Must be 8 for MapLibre GL. */
  readonly version: number | undefined;

  /** Human-readable name for the style. */
  readonly name: string | undefined;

  /** Arbitrary metadata attached to the style. */
  readonly metadata: Readonly<Record<string, unknown>> | undefined;

  /** URL template for sprite image and JSON. */
  readonly sprite: SpriteDescriptor | undefined;

  /** URL template for glyph PBF files. */
  readonly glyphs: string | undefined;

  /** Map projection configuration. */
  readonly projection: StyleProjection | undefined;

  /** 3D terrain configuration. */
  readonly terrain: StyleTerrain | undefined;

  /** Fog / atmosphere settings. */
  readonly fog: StyleFog | undefined;

  /** Global light configuration. */
  readonly light: StyleLight | undefined;

  /** Default transition for paint properties. */
  readonly transition: StyleTransition | undefined;

  /** Map center [lng, lat]. */
  readonly center: readonly [number, number] | undefined;

  /** Default zoom level. */
  readonly zoom: number | undefined;

  /** Default bearing in degrees. */
  readonly bearing: number | undefined;

  /** Default pitch in degrees. */
  readonly pitch: number | undefined;

  /** Parsed source definitions, keyed by source ID. */
  readonly sources: ReadonlyMap<string, StyleSource>;

  /** Parsed layer definitions, in rendering order. */
  readonly layers: readonly StyleLayer[];

  /** Style imports (composable styles — future-ready). */
  readonly imports: readonly StyleImport[] | undefined;

  /**
   * The original raw JSON value for fields not explicitly modeled.
   * Allows the analysis engine to reference any property without losing data.
   */
  readonly raw: Readonly<Record<string, unknown>>;
}
