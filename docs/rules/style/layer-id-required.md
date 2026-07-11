# `style/layer-id-required`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every layer entry in the `layers` array must declare an `id` string field. Layers without an `id` cannot be referenced by other layers or the SDK.

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


The MapLibre style specification requires each layer to have a unique `id` string. This rule checks every element in the `layers` array for the presence of an `id` field. Non-string `id` values (including `null` or numeric) are also flagged.

Runs only on artifacts of type `style`. Depends on `style/layers-present` having passed (if `layers` is not an array, this rule is a no-op).

---

## Diagnostic

```
Layer at index <N> is missing a required "id" field.
```

**Location:** `layers[N]` (JSON path)

**Suggestion:** Add an `"id"` string field to every layer entry.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `index` | `number` | Zero-based index of the layer in the array |

---

## Examples

### ❌ Failing

```json
{
  "version": 8,
  "sources": {},
  "layers": [
    { "type": "background" }
  ]
}
```

*Diagnostic:* `Layer at index 0 is missing a required "id" field.`

### ✅ Passing

```json
{
  "version": 8,
  "sources": {},
  "layers": [
    { "id": "background", "type": "background" }
  ]
}
```

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "style/layer-id-required": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `MISSING_LAYER_ID` | `style/layer-id-required` |

---

*Back to [Rule Index](../README.md)*
