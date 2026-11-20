# tile/self-intersection

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Polygon geometries must not self-intersect. Non-adjacent segments that cross produce invalid topologies that break earcut triangulation and fill rendering.

By default, LineString features (such as footpaths, hiking trails, switchbacks, and highway cloverleaf loops) are skipped because self-crossing lines are valid cartography and render safely with stroke shaders. LineString checking can be opted into via `checkLines: true`.

## Why it matters

Self-intersecting polygon geometry violates the OGC Simple Features specification. In WebGL renderers like MapLibre GL JS, polygons rely on triangulation algorithms (`earcut`) and winding rules: when a polygon boundary self-intersects, it causes inverted faces, torn fills, incorrect area calculations, and visual flickering.

In contrast, vector tile renderers draw LineStrings using stroke shaders (`line-color`, `line-width`), which handle self-intersections naturally without triangulation errors. Therefore, TileGuard checks only polygons by default, eliminating false positives on real-world basemap trails and road networks while offering strict line topology checking when needed.

## Diagnostic output

```text
✗ tile/self-intersection
  Geometry in layer "landuse", feature 42 has intersecting segments 1 and 4.
  at ./tile.pbf → layer: landuse, feature: 42, part: 0
  ℹ Simplify or repair this geometry so non-adjacent segments do not cross.
```

## How it works

The rule tests pairs of non-adjacent segments in each ring using segment orientation tests (2D cross-product).

To prevent false positives on quantization artifacts and touching vertices, TileGuard uses **Guard 6 (`isProperCrossing`)** and five upstream pruning guards:
- Requires strictly opposite orientation signs (`orient ≠ 0` and `o1 ≠ o2 && o3 ≠ o4`), ensuring both segments genuinely cross through each other rather than merely touching at an endpoint or being collinear.
- Suppresses degenerate 5-vertex quantization slivers that arise during low-zoom polygon simplification.
- Achieved **100% precision and 100% recall** on our 407-ring validation corpus (EXP-003d) and **zero false positives** across 2,535 rings in the 1,800-tile held-out set (EXP-003e).

When two segments cross, it reports both segment indices in the `data.segments` field:

```typescript
{
  ruleId: 'tile/self-intersection',
  data: {
    segments: [1, 4],  // Segment 1→2 crosses segment 4→5
  },
}
```

In the Inspector, this produces:
- Two red highlighted segments on the geometry
- An ✕ marker at the exact intersection point

## Configuration

```typescript
rules: {
  // Default: check polygons only (footpaths and road loops pass cleanly)
  'tile/self-intersection': 'error',

  // Opt-in: enforce line simplicity (e.g. for routing or utility networks)
  'tile/self-intersection': ['error', {
    checkLines: true,
  }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `checkLines` | `boolean` | `false` | Whether to check LineString features (`type === 2`). When `false`, only Polygon geometries are checked. |

## Remediation

- Run geometry repair (e.g., `ST_MakeValid` in PostGIS, `buffer(0)` in JTS/GEOS)
- Simplify with topology preservation (Douglas-Peucker can introduce self-intersections)
- Use a simplification algorithm that checks for intersections (Visvalingam-Whyatt is generally safer)
- For tile encoders: validate geometry before encoding, not after
