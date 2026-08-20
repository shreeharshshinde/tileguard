# tile/winding-order

> Severity: `error` · Since: v0.4.0 · Package: `@tileguard/tile-rules`

## What it checks

Polygon rings must follow a consistent winding order convention. The rule auto-detects whether the tile uses MVT convention (outer=CW, holes=CCW) or OGC/GeoJSON convention (outer=CCW, holes=CW), then flags any ring whose winding contradicts its role.

## Why it matters

Renderers use winding direction to distinguish outer rings from holes. Incorrect winding causes a renderer to misidentify a hole as an outer ring (or vice versa), breaking earcut triangulation silently. The result: filled areas that should be hollow, or missing geometry where a polygon should appear.

## Diagnostic output

```text
✗ tile/winding-order
  Outer ring at index 0 has inconsistent winding; expected CW per detected MVT convention.
  at ./tile.pbf → layer: buildings, feature: 17, part: 0
  ℹ Reverse the vertex order of the ring to match the detected convention.
```

## Convention detection

TileGuard inspects the first ring of each feature and determines which convention is in use:

| Convention | Outer rings | Holes | Used by |
|:-----------|:------------|:------|:--------|
| **MVT** | Clockwise (CW) | Counter-clockwise (CCW) | MapLibre, Mapbox |
| **OGC/GeoJSON** | Counter-clockwise (CCW) | Clockwise (CW) | Planetiler, OpenMapTiles |

This means **no false positives** on Planetiler or OpenMapTiles output — TileGuard adapts to whichever convention your pipeline uses.

## Configuration

No configuration options. Convention is auto-detected.

```typescript
rules: {
  'tile/winding-order': 'error',  // or 'warning' or 'off'
}
```

## Remediation

- Reverse the vertex order of flagged rings
- Check your tile encoder's winding enforcement settings
- For multi-polygon features, ensure `groupRingsIntoPolygons()` correctly identifies outer vs hole rings before encoding

## Related rules

- [`tile/hole-containment`](/rules/tile/hole-containment) — Validates holes lie within their parent outer ring
- [`tile/zero-area-ring`](/rules/tile/zero-area-ring) — Catches degenerate rings with no area
- [`tile/self-intersection`](/rules/tile/self-intersection) — Catches rings that cross themselves
