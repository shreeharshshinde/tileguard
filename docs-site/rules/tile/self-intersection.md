# tile/self-intersection

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Line and polygon geometries must not self-intersect. Non-adjacent segments that cross produce invalid topologies.

## Why it matters

Self-intersecting geometry violates the OGC Simple Features specification. It causes unpredictable behavior in fill extrusion (twisted or inverted faces), incorrect area calculations (negative or double-counted regions), and broken clip operations. Different renderers handle self-intersections differently — the same tile looks different in MapLibre vs QGIS vs deck.gl.

## Diagnostic output

```text
✗ tile/self-intersection
  Geometry in layer "landuse", feature 42 has intersecting segments 1 and 4.
  at ./tile.pbf → layer: landuse, feature: 42, part: 0
  ℹ Simplify or repair this geometry so non-adjacent segments do not cross.
```

## How it works

The rule tests every pair of non-adjacent segments in each ring using segment orientation tests (cross-product). When two segments cross, it reports both segment indices in the `data.segments` field:

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

No configuration options.

```typescript
rules: {
  'tile/self-intersection': 'error',  // or 'warning' or 'off'
}
```

## Remediation

- Run geometry repair (e.g., `ST_MakeValid` in PostGIS, `buffer(0)` in JTS/GEOS)
- Simplify with topology preservation (Douglas-Peucker can introduce self-intersections)
- Use a simplification algorithm that checks for intersections (Visvalingam-Whyatt is generally safer)
- For tile encoders: validate geometry before encoding, not after
