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

### Research Grounding & Suppression Guards

In empirical validation across 2,094 production vector tiles (EXP-003, EXP-008), bare segment-intersection testing yielded high false-positive rates on quantization artifacts and collinear contact points. TileGuard applies a cascade of six suppression guards in `geometry.ts`:

1. **Guard 1 (Minimum-vertex skip):** Rings with `< 4` vertices are delegated to `tile/degenerate-geometry`.
2. **Guard 2 (LineString closure skip):** Skips the artificial junction between first and last segments on closed LineStrings.
3. **Guard 3 (Duplicate-vertex pre-scan):** Suppresses adjacent duplicate vertex pairs before edge evaluations.
4. **Guard 4 (AABB pre-check):** Axis-aligned bounding box pruning prior to pairwise edge tests.
5. **Guard 5 (Self-tangency skip):** Isolated non-adjacent vertex touches.
6. **Guard 6 (Collinear-endpoint contact skip — `isProperCrossing`):** Replaces bare segment intersection with strict proper crossing detection. Requires all four orientation values to be non-zero (`orient ≠ 0`) with strictly straddling endpoints (`o1 ≠ o2 && o3 ≠ o4`), eliminating degenerate 5-vertex quantization slivers where a vertex touches a non-adjacent segment line without crossing.

**Empirical Performance (EXP-003d & EXP-003e):**
- **100% Precision & 100% Recall** on the 407-ring low-zoom validation corpus (`F1 = 1.0000`, 0 false positives).
- **Zero false positives** across 2,535 rings flagged in the 1,800-tile held-out set (EXP-003e, z8–z14).

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
