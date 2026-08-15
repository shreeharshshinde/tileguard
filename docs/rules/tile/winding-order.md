# `tile/winding-order`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.4.0 · **Default Severity:** `error`

## Summary

Polygon rings must follow the MVT winding order convention: outer rings must be clockwise (CW), and hole rings must be counter-clockwise (CCW). Incorrect winding causes earcut triangulation to produce invisible polygons, inverted fills, or garbage geometry.

---

## Details

The Mapbox Vector Tile specification defines a strict winding convention that allows renderers to distinguish outer boundaries from holes:

- **Outer ring (index 0):** clockwise → negative signed area (shoelace formula)
- **Hole rings (index > 0):** counter-clockwise → positive signed area

When winding order is incorrect:
- Outer rings interpreted as holes → polygon disappears entirely
- Holes interpreted as outer rings → inverted fill (renders everything *except* the intended area)
- Mixed winding in multi-ring polygons → garbage triangulation with visual artefacts

MapLibre wraps earcut in a try/catch, so incorrect winding typically results in **silent visual errors** rather than crashes — making this a particularly insidious data quality issue.

The rule delegates to `findWindingOrderIssues()` from `geometry.ts`, which computes the signed area of each ring and verifies it matches the expected sign for its position (outer vs hole).

Rings with zero signed area (collinear/degenerate) are not flagged by this rule — they are handled by `tile/zero-area-ring`.

Only `Polygon` features are checked.

---

## Diagnostic

```
Outer ring in layer "<layerName>", feature <featureIndex> has incorrect winding order.
```
or
```
Hole ring <N> in layer "<layerName>", feature <featureIndex> has incorrect winding order.
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex: N }`

**Suggestion:** Reverse the vertex order of the ring to make it clockwise/counter-clockwise per the MVT specification.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index within the layer |
| `partIndex` | `number` | Ring index (0 = outer, >0 = holes) |

---

## Examples

### ❌ Failing — CCW outer ring

```
Vertices: (0,0) → (10,0) → (10,10) → (0,10) → (0,0)
Signed area: +100 (positive = CCW = WRONG for outer ring)
```

*Diagnostic:* `Outer ring in layer "buildings", feature 0 has incorrect winding order.`

### ❌ Failing — CW hole ring

```
Outer (CW, correct): (0,0) → (0,100) → (100,100) → (100,0) → (0,0)
Hole (CW, WRONG):    (20,20) → (20,80) → (80,80) → (80,20) → (20,20)
```

*Diagnostic:* `Hole ring 1 in layer "buildings", feature 0 has incorrect winding order.`

### ✅ Passing — Correct MVT winding

```
Outer (CW): (0,0) → (0,100) → (100,100) → (100,0) → (0,0)    [area < 0]
Hole (CCW): (20,20) → (80,20) → (80,80) → (20,80) → (20,20)  [area > 0]
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

Reverse the vertex order of the offending ring. Most geometry libraries provide a method for this:

- **Turf.js:** `turf.rewind(polygon, { mutate: true })`
- **JTS/GEOS:** `ring.reverse()`
- **Tippecanoe:** Automatically corrects winding on output
- **PostGIS:** `ST_ForcePolygonCW(geom)`

---

## Related Rules

| Rule | Relationship |
|:-----|:-------------|
| [`tile/zero-area-ring`](./zero-area-ring.md) | Catches degenerate rings with no winding |
| [`tile/hole-containment`](./hole-containment.md) | Validates holes are within the outer ring |
| [`tile/self-intersection`](./self-intersection.md) | Catches rings that cross themselves |

---

*Back to [Rule Index](../README.md)*
