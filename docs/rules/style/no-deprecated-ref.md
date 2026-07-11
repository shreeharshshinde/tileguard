# `style/no-deprecated-ref`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Layers must not use the deprecated `ref` property. The `ref` mechanism was removed from the MapLibre style specification and is no longer honoured by renderers.

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


In an earlier version of the Mapbox/MapLibre style specification, layers could inherit properties from another layer using a `"ref": "<other-layer-id>"` field. This feature was removed and is no longer supported. Layers using `ref` will be silently ignored or cause rendering errors.

The rule flags every layer entry that contains a `ref` property (regardless of its value).

Runs only on artifacts of type `style`.

---

## Diagnostic

```
Layer "<layerId>" uses the deprecated "ref" property.
```

**Location:** `layers[N].ref` (JSON path)

**Suggestion:** Inline the properties from the referenced layer into this layer directly, and remove the `"ref"` field.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layerId` | `string` | The ID of the offending layer (or `<layer N>` if no `id`) |
| `ref` | `string` | The value of the deprecated `ref` property |

---

## Examples

### ❌ Failing

```json
{
  "version": 8,
  "sources": { "openmaptiles": { "type": "vector" } },
  "layers": [
    { "id": "roads", "type": "line", "source": "openmaptiles" },
    { "id": "roads-tunnels", "ref": "roads" }
  ]
}
```

*Diagnostic:* `Layer "roads-tunnels" uses the deprecated "ref" property.`

### ✅ Passing

```json
{
  "version": 8,
  "sources": { "openmaptiles": { "type": "vector" } },
  "layers": [
    { "id": "roads", "type": "line", "source": "openmaptiles" },
    { "id": "roads-tunnels", "type": "line", "source": "openmaptiles" }
  ]
}
```

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "style/no-deprecated-ref": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `DEPRECATED_REF` | `style/no-deprecated-ref` |

---

*Back to [Rule Index](../README.md)*
