# `style/layer-id-required`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every layer entry in the `layers` array must declare an `id` string field. Layers without an `id` cannot be referenced by other layers or the SDK.

---

## Details
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

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
