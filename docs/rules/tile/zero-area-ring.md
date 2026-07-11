# `tile/zero-area-ring`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `error`

## Summary

Every polygon ring must enclose a non-zero area. A ring whose signed area is zero (computed via the shoelace formula) is effectively a collinear sequence of points that cannot define a surface.

---

## Details
<!-- TODO: INSERT DIAGRAM 9: Shoelace Algorithm Math Solver -->

**Image Description / Generation Prompt:** A geometric matrix diagram visualizing the Shoelace algorithm calculation for signed area.
1. Show a 2D coordinate grid with a 4-vertex polygon: P0(x0, y0), P1(x1, y1), P2(x2, y2), and P3(x3, y3).
2. Render the Shoelace matrix:
   - Column 1: x0, x1, x2, x3, x0
   - Column 2: y0, y1, y2, y3, y0
3. Draw diagonal arrows:
   - Downward-right diagonal green arrows indicating positive term multiplications: x0 * y1, x1 * y2, x2 * y3, x3 * y0.
   - Downward-left diagonal red arrows indicating negative term multiplications: y0 * x1, y1 * x2, y2 * x3, y3 * x0.
4. Equation Box: Show the area formula: Area = 1/2 * sum(x_i * y_{i+1} - x_{i+1} * y_i). Indicate that a positive value means clockwise winding (outer ring), and a negative value means counter-clockwise winding (inner hole).


Zero-area rings usually result from tile simplification collapsing small polygons to a line or point while maintaining the `Polygon` geometry type. They break area-based rendering, measurements, and hit testing.

This rule delegates to `findZeroAreaRingIssues()` from `geometry.ts`, which computes the signed area of each ring using the shoelace formula. A ring with computed area `=== 0` is flagged.

One diagnostic is emitted per zero-area ring.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostic

```
Polygon ring in layer "<layerName>", feature "<featureIndex>" has zero area.
```

**Location:** `{ layer: "<layerName>", featureIndex: N, partIndex?: N }`

**Suggestion:** Remove zero-area rings or emit a polygon with measurable area.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureIndex` | `number` | Feature index |
| `partIndex` | `number?` | Ring index within the polygon |

---

## Examples

### ❌ Failing

Polygon ring with three collinear points `(0,0) → (1,0) → (2,0) → (0,0)`:

*Diagnostic:* `Polygon ring in layer "buildings", feature "5" has zero area.`

### ✅ Passing

Polygon ring that encloses measurable area (e.g., a square).

---

## Configuration

This rule accepts no options.

```jsonc
{
  "rules": {
    "tile/zero-area-ring": "error"   // "error" | "warning" | "off"
  }
}
```

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `GEOMETRY_INVALID` (zero-area ring) | `tile/zero-area-ring` |

---

*Back to [Rule Index](../README.md)*
