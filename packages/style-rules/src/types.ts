/**
 * @tileguard/style-rules — Style Specification Domain Types
 *
 * Type definitions for MapLibre/Mapbox GL style specifications.
 * These types represent the in-memory structure produced by the style
 * provider and consumed by all style validation rules.
 *
 * The style specification defines how vector tile data is rendered:
 * sources declare where data comes from, and layers declare how to
 * style that data (colors, line widths, zoom levels, etc.).
 *
 * Three artifact variants exist to handle the full spectrum of inputs:
 * - {@link StyleArtifact} — valid, parseable JSON style
 * - {@link InvalidStyleArtifact} — file that is not valid JSON
 * - {@link EmptyStyleArtifact} — zero-byte placeholder fixture
 *
 * @see {@link https://maplibre.org/maplibre-style-spec/ | MapLibre Style Specification}
 * @packageDocumentation
 */

import type { Artifact } from '@tileguard/core';

// ---------------------------------------------------------------------------
// Artifact type constants
// ---------------------------------------------------------------------------

/**
 * Artifact type discriminant for successfully parsed style specifications.
 *
 * Rules that validate style structure (sources, layers, zoom ranges) should
 * declare this type in their `artifactTypes` array.
 */
export const STYLE_ARTIFACT_TYPE = 'StyleSpecification';

/**
 * Artifact type discriminant for style files that could not be parsed as JSON.
 *
 * Only the `style/valid-json` rule handles this type — it reports the parse
 * error. All other style rules skip invalid artifacts automatically.
 */
export const INVALID_STYLE_ARTIFACT_TYPE = 'InvalidStyleSpecification';

/**
 * Artifact type discriminant for zero-byte style files.
 *
 * Empty files are preserved in certain render test fixtures. They receive
 * this dedicated type so rules can distinguish them from actual parse failures.
 */
export const EMPTY_STYLE_ARTIFACT_TYPE = 'EmptyStyleSpecification';

// ---------------------------------------------------------------------------
// JSON primitives (internal utility types)
// ---------------------------------------------------------------------------

/** A JSON scalar value. */
export type JsonPrimitive = string | number | boolean | null;

/** Any valid JSON value (recursive). */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

// ---------------------------------------------------------------------------
// Style layer model
// ---------------------------------------------------------------------------

/**
 * A single layer object from the style specification's `layers` array.
 *
 * Typed permissively (most fields are `unknown`) because the style provider
 * does not validate individual field types — that is the responsibility of
 * rules. Rules narrow these fields with runtime type guards.
 *
 * @remarks
 * The permissive typing is intentional: it allows rules to report specific,
 * actionable diagnostics for each field rather than failing during decode.
 */
export interface StyleLayer {
  /** Layer identifier. Should be a non-empty string per spec. */
  readonly id?: unknown;
  /** Layer type (e.g., "fill", "line", "symbol", "circle"). */
  readonly type?: unknown;
  /** Source ID this layer draws from. */
  readonly source?: unknown;
  /** Minimum zoom level for this layer. */
  readonly minzoom?: unknown;
  /** Maximum zoom level for this layer. */
  readonly maxzoom?: unknown;
  /** Deprecated `ref` property for layer inheritance. */
  readonly ref?: unknown;
  /** Allow any additional properties from the style spec. */
  readonly [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Style specification content
// ---------------------------------------------------------------------------

/**
 * The decoded content of a valid style JSON file.
 *
 * This is the shape of `artifact.content` for StyleSpecification artifacts.
 * Contains the top-level style fields that rules inspect: version, sources,
 * layers, and any additional spec-defined properties.
 *
 * @example
 * ```ts
 * const style = getStyleObject(context.artifact);
 * if (style.version !== 8) {
 *   context.report({ message: 'Version must be 8.' });
 * }
 * ```
 */
export interface StyleSpecificationContent {
  /** Style specification version (must be `8` for MapLibre). */
  readonly version?: unknown;
  /** Map of source definitions keyed by source ID. */
  readonly sources?: unknown;
  /** Ordered array of layer definitions. */
  readonly layers?: unknown;
  /** Allow any additional top-level properties. */
  readonly [key: string]: unknown;
}

/**
 * Content of an artifact that failed JSON parsing.
 *
 * Preserves both the raw file content (for potential recovery) and the
 * human-readable parse error message.
 */
export interface InvalidStyleSpecificationContent {
  /** The raw file content that could not be parsed. */
  readonly raw: string;
  /** Human-readable JSON parse error message. */
  readonly error: string;
}

/**
 * Content of a zero-byte style file.
 *
 * Empty files appear in render test fixture directories. They are
 * distinguished from invalid files because they represent intentional
 * placeholders rather than corrupted data.
 */
export interface EmptyStyleSpecificationContent {
  /** The raw file content (empty string). */
  readonly raw: string;
}

// ---------------------------------------------------------------------------
// Artifact type aliases
// ---------------------------------------------------------------------------

/**
 * A fully-typed style specification artifact (valid JSON).
 */
export type StyleArtifact = Artifact<
  typeof STYLE_ARTIFACT_TYPE,
  StyleSpecificationContent
>;

/**
 * A fully-typed artifact for style files that failed JSON parsing.
 */
export type InvalidStyleArtifact = Artifact<
  typeof INVALID_STYLE_ARTIFACT_TYPE,
  InvalidStyleSpecificationContent
>;

/**
 * A fully-typed artifact for empty (zero-byte) style files.
 */
export type EmptyStyleArtifact = Artifact<
  typeof EMPTY_STYLE_ARTIFACT_TYPE,
  EmptyStyleSpecificationContent
>;

/**
 * Union of all possible style artifact variants.
 *
 * Useful for provider return types and generic style-processing functions
 * that must handle all three cases.
 */
export type AnyStyleArtifact =
  | StyleArtifact
  | InvalidStyleArtifact
  | EmptyStyleArtifact;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Type guard: returns `true` if the value is a non-null, non-array object.
 *
 * Used throughout style rules to safely narrow `unknown` fields from the
 * permissively-typed {@link StyleSpecificationContent} before accessing
 * object properties.
 *
 * @param value - The value to check.
 * @returns `true` if value is a plain object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extracts the style specification content from a generic artifact.
 *
 * This is the standard way for style rules to access the parsed style
 * object from the rule context. It performs a type assertion from the
 * generic `Artifact<string, unknown>` to {@link StyleSpecificationContent}.
 *
 * @param artifact - The artifact provided by the rule context.
 * @returns The decoded style specification content.
 *
 * @example
 * ```ts
 * create(context) {
 *   const style = getStyleObject(context.artifact);
 *   if (!isRecord(style.sources)) {
 *     context.report({ message: 'Missing sources object.' });
 *   }
 * }
 * ```
 */
export function getStyleObject(artifact: Artifact): StyleSpecificationContent {
  return artifact.content as StyleSpecificationContent;
}

/**
 * Extracts the layers array from a style specification, filtering out
 * non-object entries.
 *
 * Returns an empty array if `style.layers` is not an array, ensuring
 * rules can safely iterate without null checks.
 *
 * @param style - The style specification content.
 * @returns An array of layer objects (non-object entries are excluded).
 */
export function getStyleLayers(
  style: StyleSpecificationContent,
): readonly StyleLayer[] {
  if (!Array.isArray(style.layers)) return [];
  return style.layers.filter(isRecord) as readonly StyleLayer[];
}

/**
 * Extracts the layer ID from a style layer object.
 *
 * Returns `undefined` if the layer has no `id` field or if the `id` is
 * not a non-empty string.
 *
 * @param layer - The style layer object.
 * @returns The layer ID string, or `undefined` if absent/invalid.
 */
export function getLayerId(layer: StyleLayer): string | undefined {
  return typeof layer.id === 'string' && layer.id.length > 0
    ? layer.id
    : undefined;
}
