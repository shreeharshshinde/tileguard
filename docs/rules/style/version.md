# `style/version`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Style specifications must declare MapLibre style version 8. Any other value (including absent, `null`, or a non-numeric version like `"8"`) triggers an error.

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
