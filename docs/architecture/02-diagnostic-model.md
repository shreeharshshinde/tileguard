# 02 — Diagnostic Model

## Why This Document Matters Most

The Diagnostic model is the single most important abstraction in TileGuard. Every
rule produces diagnostics. Every reporter consumes diagnostics. The engine's only
job is to collect diagnostics and hand them to reporters. If the diagnostic model
is wrong, every other component is built on a flawed foundation.

This document defines the diagnostic type with enough precision to implement it
directly. Every field is explained, every design choice is justified, and every
alternative that was considered is recorded.

---

## The Core Type

```typescript
/**
 * A Diagnostic is a structured, immutable record describing one validation
 * finding. It is the universal interface between rules and reporters.
 *
 * Diagnostics are value objects. They carry no behavior, hold no references
 * to mutable state, and can be serialized to JSON without loss of information.
 */
interface Diagnostic {
  /** Unique identifier for the rule that produced this diagnostic.
   *  Uses a namespaced format: "category/rule-name".
   *  Examples: "tile/required-layers", "style/unknown-source", "render/pixel-drift".
   */
  ruleId: string;

  /** The severity of this finding. Determines exit codes, reporter formatting,
   *  and whether the finding constitutes a "failure". */
  severity: Severity;

  /** Human-readable description of what was found. Should be a complete sentence
   *  that makes sense when read without additional context.
   *  Example: 'Required layer "buildings" is not present in the tile.' */
  message: string;

  /** A reference to the artifact being validated when this diagnostic was
   *  produced. Enables reporters to group diagnostics by artifact. */
  artifact: ArtifactRef;

  /** Optional. A structured pointer into the artifact indicating where the
   *  problem was found. The shape depends on the artifact type. */
  location?: Location;

  /** Optional. A human-readable suggestion for how to fix the problem.
   *  Should be actionable: "Add a 'buildings' layer to your tile generation
   *  pipeline" rather than "Fix the missing layer". */
  suggestion?: string;

  /** Optional. A URL to documentation about this rule. Reporters can include
   *  this as a clickable link. */
  docsUrl?: string;

  /** Optional. Rule-specific structured data that reporters may use for
   *  richer output. Must be JSON-serializable. */
  data?: Record<string, unknown>;
}
```

---

## Severity

```typescript
/**
 * Severity levels ordered by seriousness.
 *
 * 'error'   — The artifact has a defect. The run should fail (exit code 1).
 * 'warning' — The artifact has a potential problem. The run passes but the
 *             user should investigate.
 * 'info'    — An informational observation. Never causes failure.
 *
 * Only three levels. More levels create ambiguity ("is this a critical or
 * a major?") without adding actionable information.
 */
type Severity = 'error' | 'warning' | 'info';
```

### Why Three Levels

We considered four levels (error, warning, info, hint) and two levels (error,
warning). Three is the right balance:

- **Two levels** forces "informational" observations into `warning`, which
  dilutes the meaning of warnings and trains users to ignore them.
- **Four levels** creates a distinction between `info` and `hint` that is
  subjective and inconsistent across rule authors. ESLint uses two (error,
  warning) and many users find this insufficient; Ruff uses three and this
  has worked well.

Every diagnostic has exactly one severity. Severity is set by the rule's
default configuration and can be overridden per-project in configuration.

---

## Artifact Reference

```typescript
/**
 * A lightweight, serializable pointer to an artifact. Does not contain the
 * artifact's content — only enough information to identify it in output.
 *
 * This is deliberately separate from the full Artifact type. Diagnostics
 * must be serializable to JSON for SARIF output, JSON reporters, and
 * inter-process communication. Embedding the full decoded artifact would
 * make diagnostics enormous and non-serializable.
 */
interface ArtifactRef {
  /** The artifact type discriminant. Examples: "VectorTile", "StyleSpecification". */
  type: string;

  /** The source identifier. For files, this is the file path. For URLs, the
   *  URL. For MBTiles, the path + tile coordinates. */
  source: string;

  /** Optional. Human-readable label used in output when the source path
   *  is too long or uninformative. */
  label?: string;
}
```

### Why Not Embed the Full Artifact?

The full decoded artifact (a vector tile with all its layers, features, and
geometry) can be megabytes of data. Diagnostics are collected into arrays, passed
to reporters, and potentially serialized to JSON files. Embedding the full
artifact in every diagnostic would cause:

1. Memory pressure (thousands of diagnostics × megabytes per artifact)
2. Serialization failure for complex objects with circular references
3. Unnecessary coupling between the diagnostic type and artifact internals

The `ArtifactRef` provides enough information for reporters to identify and group
diagnostics without any of these problems.

---

## Location

```typescript
/**
 * A structured pointer into a specific position within an artifact.
 *
 * Locations are artifact-type-specific. A location in a VectorTile points
 * to a layer, feature, or coordinate. A location in a StyleSpecification
 * points to a JSON path. A location in a RenderSnapshot might point to
 * a pixel region.
 *
 * The type is intentionally a flat record rather than a discriminated union.
 * Not all fields apply to all artifact types, and a single diagnostic might
 * use a subset of fields. This keeps the type simple and avoids deep nesting.
 */
interface Location {
  /** Layer name within a vector tile. */
  layer?: string;

  /** Feature index within a layer. */
  featureIndex?: number;

  /** Geometry part index within a feature (for multi-geometries). */
  partIndex?: number;

  /** JSON path within a style specification (e.g., "layers[3].paint.fill-color"). */
  jsonPath?: string;

  /** Line number within a source file (1-indexed). */
  line?: number;

  /** Column number within a source file (1-indexed). */
  column?: number;

  /** Pixel coordinates for render-related diagnostics. */
  region?: { x: number; y: number; width: number; height: number };
}
```

### Why a Flat Record Instead of a Discriminated Union

We considered:

```typescript
// Alternative: discriminated union
type Location =
  | { type: 'tile'; layer: string; featureIndex?: number; partIndex?: number }
  | { type: 'style'; jsonPath: string; line?: number; column?: number }
  | { type: 'render'; region: { x: number; y: number; width: number; height: number } };
```

The discriminated union is more type-safe but creates problems:

1. **Reporter complexity.** Every reporter must handle each variant with a switch
   statement. Adding a new artifact type requires updating every reporter.
2. **Mixed locations.** Some diagnostics relate to the intersection of two
   concepts (e.g., a style layer referencing a tile source — the location
   involves both a JSON path and a layer name).
3. **Evolution cost.** Adding a new location field to the union requires
   adding a new variant or modifying an existing one.

The flat record is less type-safe but more practical. Reporters use whichever
fields are present and ignore the rest. New artifact types can add new optional
fields without breaking existing reporters.

This is a pragmatic trade-off. If we find that the flat record causes real
confusion or bugs, we can revisit with a discriminated union later.

---

## Diagnostic Identity

Two diagnostics are considered equivalent if they have the same `ruleId`,
`artifact.source`, and `location`. This identity is used for:

1. **Deduplication.** If the same rule produces the same finding for the same
   location, reporters can deduplicate.
2. **Baseline comparison.** Future "baseline" features (ignore known findings)
   will compare diagnostics by identity.
3. **SARIF output.** SARIF uses fingerprints to track findings across runs.

The engine does not enforce deduplication automatically. This is the reporter's
responsibility. Some reporters (like JSON) may want to preserve all diagnostics
including duplicates.

---

## Immutability Contract

Diagnostics are immutable value objects. Once created, they must not be modified.
This is enforced by convention in TypeScript (the interface has no methods, and
`Readonly<Diagnostic>` is encouraged) but not at runtime via `Object.freeze()`
to avoid performance overhead.

Rules create diagnostics. The engine collects them. Reporters read them. No
component modifies them after creation.

---

## Creating Diagnostics

Rules should not construct `Diagnostic` objects directly. Instead, they use a
`RuleContext` that provides a factory method:

```typescript
// Inside a rule's create() function
context.report({
  message: 'Required layer "buildings" is not present in the tile.',
  location: { layer: 'buildings' },
  suggestion: 'Add a "buildings" layer to your tile generation pipeline.',
});
```

The context automatically fills in `ruleId`, `severity` (from the rule's config),
`artifact`, and `docsUrl` (from the rule's metadata). This reduces boilerplate
and ensures consistency.

See [04 — Rule System](./04-rule-system.md) for the full `RuleContext` interface.

---

## Diagnostic Data Field

The `data` field carries rule-specific structured information that is too
detailed for the `message` string but useful for tooling:

```typescript
// Example: tile/required-layers includes which layers are available
context.report({
  message: 'Required layer "buildings" is not present in the tile.',
  data: {
    requiredLayer: 'buildings',
    availableLayers: ['water', 'roads', 'landuse']
  }
});

// Example: tile/coordinate-range includes the offending coordinate
context.report({
  message: 'Coordinate (4200, -15) is outside tile extent 0–4096.',
  location: { layer: 'roads', featureIndex: 42, partIndex: 0 },
  data: {
    coordinate: { x: 4200, y: -15 },
    extent: 4096
  }
});
```

Rules define what their `data` contains in their own documentation. The
framework does not validate `data` — it is a `Record<string, unknown>` to
keep Core free of domain-specific types.

---

## Mapping to Current Error Codes

The existing codebase uses ad-hoc error codes (`MISSING_LAYER`, `GEOMETRY_INVALID`,
etc.). These map directly to rule IDs in the framework:

| Current Code | Framework Rule ID | Severity |
|:-------------|:------------------|:---------|
| `FETCH_ERROR` | `artifact/load-failed` | error |
| `EMPTY_SOURCE` | `artifact/empty-source` | error |
| `DECOMPRESS_ERROR` | `artifact/decompress-failed` | error |
| `DECODE_ERROR` | `artifact/decode-failed` | error |
| `MISSING_LAYER` | `tile/required-layers` | error |
| `LOW_TOTAL_FEATURES` | `tile/feature-count` | error |
| `HIGH_TOTAL_FEATURES` | `tile/feature-count` | error |
| `LOW_LAYER_FEATURES` | `tile/layer-feature-count` | error |
| `HIGH_LAYER_FEATURES` | `tile/layer-feature-count` | error |
| `MISSING_PROPERTY` | `tile/required-properties` | error |
| `GEOMETRY_INVALID` | (split into individual geometry rules) | error |
| `OUT_OF_RANGE` | `tile/coordinate-range` | error |
| `DEGENERATE_LINE` | `tile/degenerate-geometry` | error |
| `DEGENERATE_POLYGON` | `tile/degenerate-geometry` | error |
| `UNCLOSED_RING` | `tile/unclosed-ring` | error |
| `ZERO_AREA_RING` | `tile/zero-area-ring` | error |
| `SELF_INTERSECTION` | `tile/self-intersection` | error |
| `EMPTY_TILE` | `tile/no-empty` | warning |
| `INVALID_JSON` | `style/valid-json` | error |
| `INVALID_VERSION` | `style/version` | error |
| `MISSING_SOURCES` | `style/sources-present` | error |
| `MISSING_LAYERS` | `style/layers-present` | error |
| `MISSING_LAYER_ID` | `style/layer-id-required` | error |
| `DUPLICATE_LAYER_ID` | `style/unique-layer-id` | error |
| `UNKNOWN_SOURCE` | `style/known-source` | error |
| `INVALID_ZOOM_RANGE` | `style/zoom-range` | error |
| `DEPRECATED_REF` | `style/no-deprecated-ref` | warning |

Note that `GEOMETRY_INVALID` was a single catch-all code wrapping multiple
geometry issues. In the framework, each geometry concern becomes its own rule.
This is intentional — users should be able to disable `tile/self-intersection`
without disabling `tile/unclosed-ring`.

---

## Serialization

Diagnostics must be JSON-serializable. This is required for:

- JSON reporter output
- SARIF report generation
- Inter-process communication (future: language server protocol)
- Diagnostic storage for baseline comparison

All fields on `Diagnostic`, `ArtifactRef`, and `Location` are either primitives,
plain objects, or arrays of primitives. The `data` field must also be
JSON-serializable (no functions, no class instances, no Buffers).

---

## Full Example

A complete diagnostic as a JSON value:

```json
{
  "ruleId": "tile/required-layers",
  "severity": "error",
  "message": "Required layer \"buildings\" is not present in the tile.",
  "artifact": {
    "type": "VectorTile",
    "source": "./fixtures/test-tile.pbf"
  },
  "location": {
    "layer": "buildings"
  },
  "suggestion": "Add a \"buildings\" layer to your tile generation pipeline. Check your Planetiler or OpenMapTiles configuration.",
  "docsUrl": "https://tileguard.dev/rules/tile/required-layers",
  "data": {
    "requiredLayer": "buildings",
    "availableLayers": ["water", "roads", "landuse"]
  }
}
```

---

*Previous: [01 — Architecture Overview](./01-overview.md) · Next: [03 — Artifact Model](./03-artifact-model.md)*
