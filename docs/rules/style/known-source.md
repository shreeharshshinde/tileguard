# `style/known-source`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every layer `source` reference must point to a key declared in the top-level `sources` object. Layers referencing undeclared sources will silently fail to render.

---

## Details

When a layer specifies a `source` property, that value must match a key in the style's top-level `sources` object. Layers that do **not** have a `source` property (e.g., `background` layers) are skipped.

The rule collects the set of declared source IDs and checks every layer that has a `source` string against it.

Runs only on artifacts of type `style`.

---

## Diagnostic

```
Layer "<layerId>" references unknown source "<source>".
```

**Location:** `layers[N].source` (JSON path)

**Suggestion:** Add `"<source>"` to the top-level `"sources"` object, or fix the source reference.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layerId` | `string` | The ID of the offending layer |
| `source` | `string` | The unrecognized source key |
| `availableSources` | `string[]` | All declared source keys |

---

## Examples

### ❌ Failing

```json
{
  "version": 8,
  "sources": { "openmaptiles": { "type": "vector" } },
  "layers": [
    { "id": "roads", "type": "line", "source": "nonexistent" }
  ]
}
```

*Diagnostic:* `Layer "roads" references unknown source "nonexistent".`

### ✅ Passing

```json
{
  "version": 8,
  "sources": { "openmaptiles": { "type": "vector" } },
  "layers": [
    { "id": "background", "type": "background" },
    { "id": "roads", "type": "line", "source": "openmaptiles" }
  ]
}
```

Background layers without a `source` field are not flagged.

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "style/known-source": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `UNKNOWN_SOURCE` | `style/known-source` |

---

*Back to [Rule Index](../README.md)*
