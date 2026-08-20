# tile/degenerate-geometry

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Geometries must have enough unique vertices for their declared type:
- **LineString** requires ≥ 2 unique points
- **Polygon ring** requires ≥ 3 unique vertices (to form a triangle)

## Why it matters

Degenerate geometries cannot be meaningfully rendered or measured. A LineString with one unique point is a point, not a line. A polygon ring with 2 unique vertices is a line, not a polygon. These usually indicate bugs in tile generation — duplicate points, collapsed features after simplification, or coordinate quantization reducing distinct vertices to the same value.

## Diagnostic output

```text
✗ tile/degenerate-geometry
  LineString has fewer than 2 unique points. Layer "roads", feature 91.
  at ./tile.pbf → layer: roads, feature: 91
  ℹ Remove degenerate geometry or emit enough distinct coordinates for the feature type.
```

```text
✗ tile/degenerate-geometry
  Polygon ring has fewer than 3 unique vertices. Layer "buildings", feature 12.
  at ./tile.pbf → layer: buildings, feature: 12, part: 0
  ℹ Remove degenerate geometry or emit enough distinct coordinates for the feature type.
```

## Configuration

No configuration options.

```typescript
rules: {
  'tile/degenerate-geometry': 'error',  // or 'warning' or 'off'
}
```

## Remediation

- Filter out features that collapse below the minimum vertex count during simplification
- Downgrade geometry type when simplification reduces a polygon to a line or a line to a point
- Check for duplicate consecutive coordinates being emitted by the encoder
- Set a minimum geometry length/area threshold in the tile generation pipeline
