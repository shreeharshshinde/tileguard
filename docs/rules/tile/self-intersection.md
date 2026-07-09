# `tile/self-intersection`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Line and polygon geometries must not self-intersect. Non-adjacent segments that cross produce invalid topologies.

---

## Details

Self-intersecting geometry violates the OGC Simple Features specification and causes unpredictable behaviour in fill extrusion, area calculations, and clip operations.

Delegates to `findSelfIntersectionIssues()` from `geometry.ts`. One diagnostic is emitted per intersecting segment pair.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Geometry in layer "<layerName>", feature "<featureIndex>" has intersecting segments "<segA>" and "<segB>".
```

**Location:** `{ layer, featureIndex, partIndex? }`

**Suggestion:** Simplify or repair this geometry so non-adjacent segments do not cross.

**Data fields:**

| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index |
| `partIndex` | `number?` | Ring/part index |
| `segments` | `[string, string]?` | The two intersecting segments |

---

## Examples

### ❌ Failing

A polygon ring shaped like a figure-eight where two non-adjacent edges cross.

### ✅ Passing

All geometries have simple, non-self-intersecting topologies.

---

## Configuration

```jsonc
{ "rules": { "tile/self-intersection": "error" } }
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `GEOMETRY_INVALID` (self-intersection) | `tile/self-intersection` |

---

*Back to [Rule Index](../README.md)*
