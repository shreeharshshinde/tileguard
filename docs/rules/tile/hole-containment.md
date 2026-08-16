# `tile/hole-containment`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.4.0 · **Default Severity:** `error`

## Summary

All vertices of a polygon's hole rings must lie within (or on the boundary of) their parent outer ring. Holes outside the shell cause earcut triangulation to produce corrupted meshes with missing triangles, visual gaps, or infinite loops.

---

## Details

### Multi-polygon awareness

MVT multi-polygon features encode multiple polygons as a flat array of rings. This rule uses convention-aware ring grouping to correctly identify which outer ring each hole belongs to:

1. **Convention detection:** The first ring's winding direction determines whether the tile uses MVT (CW=outer) or OGC (CCW=outer) convention.
2. **Ring grouping:** Rings are split into logical polygons — each ring with "outer" winding starts a new polygon; subsequent rings with "hole" winding are its holes.
3. **Containment check:** Each hole is tested against its parent outer ring (not against `ring[0]` of the entire feature).

This prevents false positives on multi-polygon features where separate buildings are encoded as multiple outer rings in a single feature (common in OpenMapTiles).

### Why this matters

Earcut's triangulation algorithm assumes that hole rings are fully contained within the outer ring. When this invariant is violated:

- Earcut's linked-list ear-clipping corrupts, producing overlapping or missing triangles
- The resulting mesh has visual gaps, z-fighting, or renders areas that should be empty
- In severe cases, earcut enters a degenerate state and produces zero triangles

**Common causes:**
- **Geometry simplification:** Douglas-Peucker at aggressive tolerances can push hole vertices outside a simplified outer ring
- **Coordinate quantization:** Float-to-integer snapping during tile compilation can shift vertices across ring boundaries
- **Clipping errors:** Buffer/clip operations at tile boundaries can corrupt hole/shell relationships

### Algorithm

The rule delegates to `findHoleContainmentIssues()` from `geometry.ts`, which:

1. Calls `groupRingsIntoPolygons()` to identify each polygon's outer + holes
2. For each hole ring in each polygon, tests every vertex against the parent outer ring using ray-casting (point-in-polygon):
   - Odd intersection count → inside (valid)
   - Even intersection count → outside (violation)
   - Point exactly on boundary → valid (treated as inside)

Only `Polygon` features with 2 or more rings are checked.

---

## Diagnostic

```
Hole ring <N> in layer "<layerName>", feature <featureIndex> has vertices outside the outer ring.
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex: N }`

**Suggestion:** Simplify with topology preservation or clip holes to the outer ring boundary.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index within the layer |
| `partIndex` | `number` | Hole ring index in the flat parts array |

---

## Examples

### ❌ Failing — Hole partially outside

```
Outer ring:  (0,0) → (0,100) → (100,100) → (100,0) → (0,0)
Hole ring:   (20,20) → (120,20) → (120,80) → (20,80) → (20,20)
                        ^^^
                        x=120 is outside outer ring (max x=100)
```

*Diagnostic:* `Hole ring 1 in layer "buildings", feature 0 has vertices outside the outer ring.`

### ❌ Failing — Hole fully outside (simplification artifact)

```
Outer ring:  (0,0) → (0,50) → (50,50) → (50,0) → (0,0)
Hole ring:   (60,60) → (90,60) → (90,90) → (60,90) → (60,60)

All hole vertices are outside the outer ring.
```

### ✅ Passing — Hole fully inside

```
Outer ring:  (0,0) → (0,100) → (100,100) → (100,0) → (0,0)
Hole ring:   (20,20) → (80,20) → (80,80) → (20,80) → (20,20)

All hole vertices are within the outer ring boundary.
```

### ✅ Passing — Hole vertex on boundary

```
Outer ring:  (0,0) → (0,100) → (100,100) → (100,0) → (0,0)
Hole ring:   (0,30) → (50,30) → (50,70) → (0,70) → (0,30)
              ^^^                             ^^^
              x=0 is ON the outer ring edge (valid)
```

### ✅ Passing — Multi-polygon (separate outers, no holes)

```
Ring 0 (CCW): building A    ← outer
Ring 1 (CCW): building B    ← outer (new polygon, not a hole)
Ring 2 (CCW): building C    ← outer (new polygon, not a hole)

Convention detected: OGC (CCW=outer)
No holes exist → no containment check needed → no diagnostic
```

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "tile/hole-containment": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Remediation

- **Preserve topology during simplification:** Use topology-aware simplification (e.g., Visvalingam with shared edges) instead of per-ring Douglas-Peucker
- **Clip holes to shell:** After simplification, clip hole rings to the outer ring boundary
- **PostGIS:** `ST_MakeValid(geom)` repairs hole/shell containment violations
- **Turf.js:** `turf.intersect(outerPolygon, holePolygon)` to re-clip

---

## Exported utilities

| Function | Description |
|:---------|:------------|
| `detectWindingConvention(parts)` | Returns `'mvt'` or `'ogc'` based on first ring's winding |
| `groupRingsIntoPolygons(parts, convention?)` | Splits flat rings into `LogicalPolygon[]` (outer + holes) |
| `findHoleContainmentIssues(feature)` | Returns `GeometryIssue[]` for holes outside their parent outer |

---

## Related Rules

| Rule | Relationship |
|:-----|:-------------|
| [`tile/winding-order`](./winding-order.md) | Validates ring winding direction consistency |
| [`tile/self-intersection`](./self-intersection.md) | Catches rings that cross themselves |
| [`tile/unclosed-ring`](./unclosed-ring.md) | Catches rings not properly closed |

---

*Back to [Rule Index](../README.md)*
