# `style/sources-present`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Style specifications must include a top-level `sources` object. A missing, `null`, or non-object `sources` field triggers this rule.

---

## Details
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

The MapLibre style specification requires a `sources` object that maps source IDs to source definitions. Without it, all tile data references fail. This rule validates the structural presence of `sources`.

An empty sources object (`"sources": {}`) is **valid** — the rule only checks for presence and correct type.

Runs only on artifacts of type `style`.

---

## Diagnostic

```
Style must include a "sources" object, but found "<actual value>".
```

**Location:** `sources` (JSON path)

**Suggestion:** Add a top-level `"sources"` object to your style JSON.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `actual` | `unknown` | The value found at `sources` |

---

## Examples

### ❌ Failing

```json
{ "version": 8, "layers": [] }
```

*Diagnostic:* `Style must include a "sources" object, but found "undefined".`

```json
{ "version": 8, "sources": null, "layers": [] }
```

*Diagnostic:* `Style must include a "sources" object, but found "null".`

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
    "style/sources-present": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `MISSING_SOURCES` | `style/sources-present` |

---

*Back to [Rule Index](../README.md)*
