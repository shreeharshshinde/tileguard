# `style/zoom-range`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

A layer's `minzoom` value must not be greater than its `maxzoom` value. An inverted zoom range causes the layer to render at no zoom levels.

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


When both `minzoom` and `maxzoom` are specified on a layer, `minzoom` must be less than or equal to `maxzoom`. The rule checks every layer where **both** values are present and numeric. Layers with only one or neither value are skipped — missing zoom values are treated as the implicit defaults (`0` and `24`).

Equal values (`minzoom === maxzoom`) are **valid** — the layer renders at exactly one zoom level.

Runs only on artifacts of type `style`.

---

## Diagnostic

```
Layer "<layerId>" has minzoom "<minzoom>" greater than maxzoom "<maxzoom>".
```

**Location:** `layers[N].minzoom` (JSON path)

**Suggestion:** Swap the `minzoom` and `maxzoom` values, or remove one of them.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layerId` | `string` | The ID of the offending layer |
| `minzoom` | `number` | The `minzoom` value |
| `maxzoom` | `number` | The `maxzoom` value |

---

## Examples

### ❌ Failing

```json
{
  "id": "roads",
  "type": "line",
  "source": "openmaptiles",
  "minzoom": 18,
  "maxzoom": 5
}
```

*Diagnostic:* `Layer "roads" has minzoom "18" greater than maxzoom "5".`

### ✅ Passing

```json
{ "id": "roads", "type": "line", "source": "openmaptiles", "minzoom": 8, "maxzoom": 22 }
```

```json
{ "id": "roads", "type": "line", "source": "openmaptiles", "minzoom": 10, "maxzoom": 10 }
```

Equal values are valid.

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "style/zoom-range": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `INVALID_ZOOM_RANGE` | `style/zoom-range` |

---

*Back to [Rule Index](../README.md)*
