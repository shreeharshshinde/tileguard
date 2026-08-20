# tile/zero-area-ring

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Every polygon ring must enclose a non-zero area. A ring whose signed area is zero (via the shoelace formula) is a collinear sequence of points that cannot define a surface.

## Why it matters

Zero-area rings usually result from tile simplification collapsing small polygons to a line while maintaining the Polygon geometry type. They break area-based rendering (fill extrusion shows nothing), measurements return zero, and hit testing fails. They waste bandwidth without producing any visual output.

## Diagnostic output

```text
✗ tile/zero-area-ring
  Polygon ring in layer "landuse", feature 89 has zero area.
  at ./tile.pbf → layer: landuse, feature: 89, part: 0
  ℹ Remove zero-area rings or emit a polygon with measurable area.
```

## Configuration

No configuration options.

```typescript
rules: {
  'tile/zero-area-ring': 'error',  // or 'warning' or 'off'
}
```

## Remediation

- Set a minimum area threshold in your tile generation pipeline to drop collapsed polygons
- Downgrade the geometry type to Point for features that simplify below a visible size
- Check simplification tolerance settings — they may be too aggressive for the zoom level
