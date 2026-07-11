# `style/unique-layer-id`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Layer IDs must be unique across the entire `layers` array. Duplicate IDs cause undefined behaviour in MapLibre renderers and SDKs.

---

## Details
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

**Image Description / Generation Prompt:** An activity flowchart demonstrating the parallel non-short-circuiting configuration schema validation logic in `validator.ts`.
1. Start with the incoming configuration object.
2. Check: "Is the root configuration a plain object?"
   - No: Throw `ConfigValidationError` immediately (fast-fail root check).
   - Yes: Proceed to run validation sub-checkers.
3. Perform the following checks concurrently without stopping on failures:
   - `validatePlugins`: Check that plugins are not defined in JSON config files.
   - `validateRules`: Verify the syntax of rules, severities, and options shapes.
   - `validateReporters`: Verify reporter configurations (strings or tuples).
   - `validateOverrides`: Validate file globs and rule override maps.
   - `checkUnknownKeys`: Detect extraneous properties and collect warning diagnostics.
4. Aggregation Step: Accumulate all collected validation errors and warnings.
5. Decision: "Are there any errors in the accumulated list?"
   - Yes: Throw a single `ConfigValidationError` containing the complete list of errors and warnings.
   - No: Return the verified configuration object alongside any advisory warnings.


The MapLibre style specification requires that every layer has a globally unique `id` within the style. When two or more layers share an `id`, SDK methods like `getLayer()`, `setFilter()`, and `setPaintProperty()` will target the wrong layer unpredictably.

This rule collects all `id` strings from the `layers` array and reports a diagnostic for every layer (after the first occurrence) whose `id` has already been seen.

Runs only on artifacts of type `style`.

---

## Diagnostic

```
Layer ID "<id>" is used by multiple layers (first seen at index <N>, duplicate at index <M>).
```

**Location:** `layers[M].id` (JSON path, pointing to the duplicate)

**Suggestion:** Rename the duplicate layer to use a unique ID.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `id` | `string` | The duplicated layer ID |
| `firstIndex` | `number` | Zero-based index of the first occurrence |
| `duplicateIndex` | `number` | Zero-based index of the duplicate |

---

## Examples

### ❌ Failing

```json
{
  "version": 8,
  "sources": { "openmaptiles": { "type": "vector" } },
  "layers": [
    { "id": "roads", "type": "line", "source": "openmaptiles" },
    { "id": "roads", "type": "fill", "source": "openmaptiles" }
  ]
}
```

*Diagnostic:* `Layer ID "roads" is used by multiple layers (first seen at index 0, duplicate at index 1).`

### ✅ Passing

```json
{
  "version": 8,
  "sources": { "openmaptiles": { "type": "vector" } },
  "layers": [
    { "id": "roads-line", "type": "line", "source": "openmaptiles" },
    { "id": "roads-fill", "type": "fill", "source": "openmaptiles" }
  ]
}
```

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "style/unique-layer-id": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `DUPLICATE_LAYER_ID` | `style/unique-layer-id` |

---

*Back to [Rule Index](../README.md)*
