# `tile/winding-order`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.4.0 · **Default Severity:** `error`

## Summary

Validates that polygon rings follow a consistent winding order convention within each feature. The rule auto-detects whether the tile uses the MVT specification convention (outer=CW, holes=CCW) or the OGC/GeoJSON convention (outer=CCW, holes=CW), and only flags **inconsistencies** — rings that break the detected pattern.

---

## Details

### Convention detection

The Mapbox Vector Tile specification defines a strict winding convention (outer=CW, holes=CCW), but many major tile producers use the OGC/GeoJSON convention (outer=CCW, holes=CW) instead:

| Convention | Outer ring | Hole ring | Used by |
|:-----------|:-----------|:----------|:--------|
| **MVT spec** | Clockwise (signedArea < 0) | Counter-clockwise (signedArea > 0) | Mapbox |
| **OGC/GeoJSON** | Counter-clockwise (signedArea > 0) | Clockwise (signedArea < 0) | OpenMapTiles, Planetiler, CARTO |

Renderers (MapLibre, Mapbox GL) handle **both** conventions correctly. Rather than flagging every OGC-convention tile as broken, TileGuard detects the convention from the **first ring** of each feature:

- First ring CW (signedArea < 0) → MVT convention detected
- First ring CCW (signedArea > 0) → OGC convention detected

### Ring grouping (multi-polygon support)

MVT multi-polygon features encode multiple polygons as a flat array of rings. The rule uses `groupRingsIntoPolygons()` to split them into logical polygons based on winding sign changes under the detected convention:

- Each ring matching the "outer" winding starts a new logical polygon
- Subsequent rings with the opposite winding are holes of that polygon

### What gets flagged

A `WRONG_WINDING` diagnostic is emitted only when a ring's actual winding **contradicts its role** within the grouped structure:

- An outer ring (first in its group) whose winding doesn't match the detected outer convention
- A hole ring whose winding doesn't match the detected hole convention

If all rings in a feature are consistent (even if they all use OGC rather than MVT convention), **no issues are reported**.

### Why this matters

When winding order is truly inconsistent:
- Renderers can't distinguish outers from holes → polygon disappears or inverts
- Earcut triangulation produces garbage geometry
- MapLibre wraps earcut in try/catch, so errors are **silent visual bugs**

Rings with zero signed area (collinear/degenerate) are not flagged — they are handled by `tile/zero-area-ring`.

Only `Polygon` features are checked.

---

## Diagnostic

```
Outer ring at index <N> has inconsistent winding; expected <direction> per detected <CONVENTION> convention.
```
or
```
Hole ring at index <N> has inconsistent winding; expected <direction> per detected <CONVENTION> convention.
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex: N }`

**Suggestion:** Reverse the vertex order of the ring to match the detected convention.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index within the layer |
| `partIndex` | `number` | Ring index in the flat parts array |

---

## Examples

### ✅ Passing — MVT convention (outer=CW, hole=CCW)

```
Outer (CW): (0,0) → (0,100) → (100,100) → (100,0) → (0,0)    [area < 0]
Hole (CCW): (20,20) → (80,20) → (80,80) → (20,80) → (20,20)  [area > 0]

Convention detected: MVT (first ring is CW)
All rings consistent → no diagnostic
```

### ✅ Passing — OGC convention (outer=CCW, hole=CW)

```
Outer (CCW): (0,0) → (100,0) → (100,100) → (0,100) → (0,0)   [area > 0]
Hole (CW):   (20,20) → (20,80) → (80,80) → (80,20) → (20,20) [area < 0]

Convention detected: OGC (first ring is CCW)
All rings consistent → no diagnostic
```

### ✅ Passing — Multi-polygon (all CCW outers, OGC convention)

```
Ring 0 (CCW): building A outer   [area > 0]
Ring 1 (CCW): building B outer   [area > 0]
Ring 2 (CCW): building C outer   [area > 0]
...

Convention detected: OGC
All rings are outers (same winding) → valid multi-polygon, no diagnostic
```

This is the typical encoding from OpenMapTiles — many separate building polygons in a single feature.

### ❌ Failing — Inconsistent hole winding

```
Ring 0 (CW): outer ring          [area < 0] → MVT convention detected
Ring 1 (CW): supposed hole       [area < 0] → WRONG: should be CCW for MVT hole

Diagnostic: Hole ring at index 1 has inconsistent winding; expected counter-clockwise per detected MVT convention.
```

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "tile/winding-order": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Remediation

Reverse the vertex order of the offending ring:

- **Turf.js:** `turf.rewind(polygon, { mutate: true })`
- **JTS/GEOS:** `ring.reverse()`
- **Tippecanoe:** Automatically corrects winding on output
- **PostGIS:** `ST_ForcePolygonCW(geom)` (MVT) or `ST_ForcePolygonCCW(geom)` (OGC)

---

## Exported utilities

| Function | Description |
|:---------|:------------|
| `detectWindingConvention(parts)` | Returns `'mvt'` or `'ogc'` based on first ring's winding |
| `groupRingsIntoPolygons(parts, convention?)` | Splits flat rings into `LogicalPolygon[]` (outer + holes) |
| `findWindingOrderIssues(feature)` | Returns `GeometryIssue[]` for inconsistent rings |
| `signedArea(points)` | Shoelace formula: negative = CW, positive = CCW |

---

## Related Rules

| Rule | Relationship |
|:-----|:-------------|
| [`tile/zero-area-ring`](./zero-area-ring.md) | Catches degenerate rings with no winding |
| [`tile/hole-containment`](./hole-containment.md) | Validates holes are within their parent outer ring |
| [`tile/self-intersection`](./self-intersection.md) | Catches rings that cross themselves |

---

*Back to [Rule Index](../README.md)*
