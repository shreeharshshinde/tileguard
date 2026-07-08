# `style/zoom-range`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

A layer's `minzoom` value must not be greater than its `maxzoom` value. An inverted zoom range causes the layer to render at no zoom levels.

---

## Details

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
