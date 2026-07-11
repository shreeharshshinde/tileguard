# `tile/self-intersection`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Line and polygon geometries must not self-intersect. Non-adjacent segments that cross produce invalid topologies.

---

## Details
<!-- TODO: INSERT DIAGRAM 10: Segment Orientation Self-Intersection Check -->

**Image Description / Generation Prompt:** A vector geometry diagram explaining the segment orientation tests used to determine if two line segments AB and CD intersect without using float division.
1. Show two intersecting line segments AB and CD on a 2D plane.
2. Write the 2D cross-product orientation formula: val = (B_y - A_y)(C_x - B_x) - (B_x - A_x)(C_y - B_y).
3. Render three diagrams representing the three possible orientation outputs:
   - val > 0: Clockwise curvature.
   - val < 0: Counter-clockwise curvature.
   - val = 0: Collinear segments.
4. Intersection Condition: Show that segments AB and CD intersect if and only if the orientation of (A, B, C) and (A, B, D) have different signs, AND the orientation of (C, D, A) and (C, D, B) have different signs.


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
