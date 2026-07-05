/**
 * @tileguard/core — Diagnostic Contract
 *
 * A Diagnostic is the universal currency between rules and reporters.
 * Every validation finding — regardless of which rule produced it or which
 * reporter will consume it — is represented as a Diagnostic.
 *
 * See docs/architecture/CORE_CONTRACTS.md §3 for the full specification.
 */

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/**
 * The three severity levels, ordered by seriousness.
 *
 * 'error'   — A defect. The run should fail. Process exits with code 1.
 * 'warning' — A potential problem. The run passes (exit 0) but should
 *             be investigated.
 * 'info'    — An observation. Purely informational. Never causes failure.
 */
export type Severity = 'error' | 'warning' | 'info';

// ---------------------------------------------------------------------------
// ArtifactRef
// ---------------------------------------------------------------------------

/**
 * A serializable, lightweight identifier for an artifact.
 *
 * Separate from Artifact<T,C> so that Diagnostics remain small and
 * fully JSON-serializable. Embedding the full decoded artifact in every
 * diagnostic would cause memory pressure and serialization failures.
 */
export interface ArtifactRef {
  /** The artifact type discriminant. Example: "VectorTile". */
  readonly type: string;

  /**
   * The source identifier.
   * For files: the file path. For URLs: the full URL.
   * For tile archives: archive path + tile coordinates.
   * Used as the primary identity for grouping and deduplication.
   */
  readonly source: string;

  /**
   * Optional human-readable label for output when the source path
   * is too long or uninformative.
   */
  readonly label?: string;
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/**
 * A structured pointer into a specific position within an artifact.
 *
 * All fields are optional. A diagnostic includes whichever subset
 * of fields meaningfully identifies the problem location.
 * Reporters render present fields and ignore absent ones.
 */
export interface Location {
  /** Layer name within a vector tile. */
  readonly layer?: string;

  /** Feature index within a layer (0-indexed). */
  readonly featureIndex?: number;

  /** Geometry part index within a feature (0-indexed). */
  readonly partIndex?: number;

  /**
   * JSON path within a style specification.
   * Example: "layers[3].paint.fill-color"
   */
  readonly jsonPath?: string;

  /** Source file line number (1-indexed). */
  readonly line?: number;

  /** Source file column number (1-indexed). */
  readonly column?: number;

  /** Pixel region for render diagnostics. Origin is top-left. */
  readonly region?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

// ---------------------------------------------------------------------------
// DiagnosticDescriptor
// ---------------------------------------------------------------------------

/**
 * The subset of Diagnostic fields that a rule provides when reporting.
 * The engine fills in: ruleId, severity, artifact, docsUrl.
 * The rule provides: message, location, suggestion, data.
 */
export interface DiagnosticDescriptor {
  /**
   * Human-readable description of the finding.
   *
   * Requirements:
   * - Complete sentence, beginning with a capital letter.
   * - Includes the specific value that caused the finding quoted in double quotes.
   * - Readable without additional context.
   * - Does not include the rule ID or severity (reported separately).
   * - Does not suggest a fix (use the suggestion field for that).
   *
   * Good:  'Required layer "buildings" is not present in the tile.'
   * Bad:   'Missing layer'                 (too vague, no context)
   */
  message: string;

  /**
   * Optional. A structured pointer into the artifact indicating where
   * the problem was found.
   */
  location?: Location;

  /**
   * Optional. An actionable suggestion for resolving the finding.
   *
   * Requirements:
   * - Actionable: tells the user what to do, not just what is wrong.
   * - Specific: references the exact thing that needs to change.
   * - Does not repeat the message.
   */
  suggestion?: string;

  /**
   * Optional. Rule-specific structured data for richer reporter output.
   * Must be JSON-serializable (no functions, class instances, Buffers,
   * circular references). The framework does not validate data's shape.
   */
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------

/**
 * A Diagnostic is a structured, immutable record describing one validation
 * finding. It is the universal interface between rules and reporters.
 *
 * Diagnostics are value objects: they carry no behavior, hold no references
 * to mutable state, and can be serialized to JSON without loss of information.
 *
 * Diagnostics are created by rules (via context.report()), enriched by the
 * engine (ruleId, severity, artifact, docsUrl), and consumed by reporters.
 * No component modifies a Diagnostic after it is created.
 */
export interface Diagnostic {
  /**
   * The unique ID of the rule that produced this diagnostic.
   * Uses the namespaced format: "category/rule-name".
   *
   * Examples:
   *   "tile/required-layers"
   *   "style/known-source"
   *   "artifact/load-failed"
   *
   * Invariant: ruleId must match the id of a registered rule, or be a
   * framework-internal rule ID prefixed with "artifact/" or "engine/".
   */
  readonly ruleId: string;

  /**
   * How serious this finding is.
   * Set by the engine from the rule's resolved configuration.
   * Never set by the rule directly.
   */
  readonly severity: Severity;

  /** Human-readable description of the finding. */
  readonly message: string;

  /**
   * A lightweight reference to the artifact being validated.
   * Does not contain the artifact content — only enough to identify it.
   * Serializable. Reporters use this to group diagnostics by source.
   */
  readonly artifact: ArtifactRef;

  /**
   * Optional. A structured pointer into the artifact indicating where
   * the problem was found.
   */
  readonly location?: Location;

  /**
   * Optional. An actionable suggestion for resolving the finding.
   */
  readonly suggestion?: string;

  /**
   * Optional. URL to the rule's documentation page.
   * Set automatically by the engine from rule.meta.docsUrl.
   * Rules must not set this directly.
   */
  readonly docsUrl?: string;

  /**
   * Optional. Rule-specific structured data for richer reporter output.
   * Must be JSON-serializable.
   */
  readonly data?: Record<string, unknown>;
}
