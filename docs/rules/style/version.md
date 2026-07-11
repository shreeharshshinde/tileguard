# `style/version`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Style specifications must declare MapLibre style version 8. Any other value (including absent, `null`, or a non-numeric version like `"8"`) triggers an error.

---

## Details
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

MapLibre GL JS and compatible renderers only support version 8 of the style specification. Styles with any other version will not render correctly. This rule enforces the `"version": 8` field at the top level of the style JSON.

Runs only on artifacts of type `style` (successfully parsed JSON objects). Invalid JSON is handled by `style/valid-json`.

---

## Diagnostic

```
Style version must be 8, but found "<actual version>".
```

**Location:** `version` (JSON path)

**Suggestion:** Set `"version": 8` at the top level of your style JSON.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `expected` | `8` | Always `8` |
| `actual` | `unknown` | The value found at `version` |

---

## Examples

### ❌ Failing

```json
{ "version": 7, "sources": {}, "layers": [] }
```

*Diagnostic:* `Style version must be 8, but found "7".`

```json
{ "version": "8", "sources": {}, "layers": [] }
```

*Diagnostic:* `Style version must be 8, but found "8".`  
(String `"8"` is not equal to integer `8`.)

### ✅ Passing

```json
{ "version": 8, "sources": {}, "layers": [] }
```

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "style/version": "error"     // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `INVALID_VERSION` | `style/version` |

---

*Back to [Rule Index](../README.md)*
