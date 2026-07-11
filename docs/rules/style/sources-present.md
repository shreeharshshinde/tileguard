# `style/sources-present`

> **Package:** `@tileguard/style-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Style specifications must include a top-level `sources` object. A missing, `null`, or non-object `sources` field triggers this rule.

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
