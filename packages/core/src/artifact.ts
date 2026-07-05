/**
 * @tileguard/core — Artifact Contract
 *
 * Artifacts are the things TileGuard validates. An Artifact is a decoded,
 * in-memory representation of something that rules can inspect.
 *
 * Core defines the generic shape. Domain packages (tile-rules, style-rules)
 * extend it with concrete types — Core itself has zero geospatial knowledge.
 *
 * See docs/architecture/CORE_CONTRACTS.md §4 for the full specification.
 */

import type { ArtifactRef } from './diagnostic.js';

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

/**
 * An Artifact is a decoded, in-memory representation of something that
 * rules can validate. It is created by an ArtifactProvider and consumed
 * by the Rule Engine.
 *
 * The generic parameters let domain packages define concrete artifact types
 * while Core remains domain-agnostic:
 *
 *   T — the type discriminant string (e.g., "VectorTile")
 *   C — the content shape (e.g., VectorTileContent)
 *
 * Core only ever holds Artifact<string, unknown>. Domain packages narrow
 * these generics to their specific types.
 *
 * Invariant: content is complete at the time the Artifact is created.
 * Rules must not need to perform additional I/O to access content.
 *
 * Invariant: content is read-only. Rules must not mutate content.
 */
export interface Artifact<T extends string = string, C = unknown> {
  /**
   * The type discriminant. Used by the engine to index which rules
   * match this artifact.
   *
   * Must be stable across versions of a domain package. Changing a
   * type discriminant is a breaking change.
   *
   * Naming convention: PascalCase, descriptive noun.
   * Examples: "VectorTile", "StyleSpecification", "RenderSnapshot".
   */
  readonly type: T;

  /**
   * A lightweight reference to this artifact's source.
   * Used to populate the artifact field of all diagnostics produced
   * while validating this artifact.
   */
  readonly ref: ArtifactRef;

  /**
   * The fully decoded content of the artifact.
   *
   * The shape depends entirely on the type. For VectorTile: an object
   * with layers, features, and geometry. For StyleSpecification: a
   * parsed JSON style object. For RenderSnapshot: a pixel buffer.
   */
  readonly content: C;

  /**
   * Optional metadata attached by the provider during loading.
   *
   * Providers may attach information discovered during the load pipeline:
   * file size, compression type, HTTP response headers, tile coordinates,
   * etc. Rules and reporters may use this but must not depend on specific
   * keys being present.
   *
   * Must be JSON-serializable.
   */
  readonly metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ProviderOptions
// ---------------------------------------------------------------------------

/**
 * Options passed to a provider's load() method.
 * Providers may ignore options they do not support.
 */
export interface ProviderOptions {
  /** HTTP request timeout in milliseconds. Default: 30000. */
  timeout?: number;

  /** Additional HTTP headers for remote artifact loading. */
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// ArtifactProvider
// ---------------------------------------------------------------------------

/**
 * An ArtifactProvider loads artifacts from sources. It encapsulates the
 * full load pipeline: source detection → byte fetching → format detection
 * → decoding → Artifact creation.
 *
 * Providers are contributed by domain packages via the Plugin interface.
 * Core does not know about any specific provider implementation.
 */
export interface ArtifactProvider {
  /**
   * A unique, stable identifier for this provider.
   * Used in configuration, error messages, and provider selection logs.
   *
   * Convention: kebab-case, matches the domain package's artifact type
   * in lowercase. Examples: "vector-tile", "style-specification".
   */
  readonly id: string;

  /**
   * The artifact type discriminants this provider can produce.
   * The engine uses this for informational purposes and logging.
   */
  readonly artifactTypes: readonly string[];

  /**
   * Returns true if this provider can handle the given source string.
   *
   * The engine calls canHandle() for each registered provider in
   * registration order. The first provider that returns true is used.
   *
   * Implementations should be fast (simple pattern matching) and
   * must be synchronous. canHandle() must not perform I/O.
   *
   * canHandle() must be conservative: if in doubt, return false.
   */
  canHandle(source: string): boolean;

  /**
   * Loads and fully decodes an artifact from the given source.
   *
   * Returns a complete Artifact ready for rule execution.
   *
   * Error contract: load() must not throw exceptions for expected
   * failure modes (file not found, malformed data, unsupported format).
   * These are operational failures; the engine handles them by emitting
   * an "artifact/load-failed" diagnostic.
   *
   * load() may throw for programmer errors (null source, invalid option
   * types). These indicate bugs in the caller, not in the artifact.
   */
  load(source: string, options?: ProviderOptions): Promise<Artifact>;
}
