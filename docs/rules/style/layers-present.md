# `style/layers-present`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Style specifications must include a top-level `layers` array. A missing, `null`, or non-array `layers` field triggers this rule.

---

## Details

The MapLibre style specification requires a `layers` array listing all render layers. Without it, no content can be rendered. This rule validates the structural presence of `layers`.

An empty layers array (`"layers": []`) is **valid** — the rule only checks for presence and correct type.

Runs only on artifacts of type `style`.

---

## Diagnostic

```
Style must include a "layers" array, but found "<actual value>".
```

**Location:** `layers` (JSON path)

**Suggestion:** Add a top-level `"layers"` array to your style JSON.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `actual` | `unknown` | The value found at `layers` |

---

## Examples

### ❌ Failing

```json
{ "version": 8, "sources": {} }
```

*Diagnostic:* `Style must include a "layers" array, but found "undefined".`

```json
{ "version": 8, "sources": {}, "layers": {} }
```

*Diagnostic:* `Style must include a "layers" array, but found "[object Object]".`

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
    "style/layers-present": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `MISSING_LAYERS` | `style/layers-present` |

---

*Back to [Rule Index](../README.md)*
