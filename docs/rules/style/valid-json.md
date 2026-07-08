# `style/valid-json`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Style files must contain valid JSON. If a style file cannot be parsed as JSON, this rule reports an error and all other style rules are skipped for that artifact.

---

## Details

The `style/valid-json` rule runs on three artifact types:

- `style` — a successfully parsed style object (this rule is a no-op for these)
- `invalid-style` — a file that failed JSON parsing (this rule fires)
- `empty-style` — a completely empty file (this rule is silent; an empty file is treated as a graceful no-op)

When a file fails JSON parsing, every other style rule (version, sources-present, etc.) receives the `invalid-style` artifact type, which they all ignore. This means `style/valid-json` is the **sole reporter** for unparseable inputs — preventing a cascade of misleading diagnostics.

---

## Diagnostic

```
Style JSON is invalid: "<parse error message>".
```

**Suggestion:** Fix the JSON syntax before running style validation rules.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `error` | `string` | The raw parse error message from `JSON.parse` |

---

## Examples

### ❌ Failing

```json
{ "version": 8, "sources": { "bad": }
```

*Diagnostic:* `Style JSON is invalid: "Unexpected token } in JSON at position 36".`

### ✅ Passing

```json
{ "version": 8, "sources": {}, "layers": [] }
```

No diagnostic. An empty file is also silent.

---

## Configuration

This rule has **no options**. It cannot be turned off via severity while keeping other style rules active, because its short-circuit behaviour is foundational.

```jsonc
{
  "rules": {
    "style/valid-json": "error"   // only "error" or "off" are meaningful here
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `INVALID_JSON` | `style/valid-json` |

---

*Back to [Rule Index](../README.md)*
