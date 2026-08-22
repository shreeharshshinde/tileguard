# tile/hole-containment

> Severity: `error` · Since: v0.4.0 · Package: `@tileguard/tile-rules`

## What it checks

All vertices of a polygon's hole rings must lie within (or on the boundary of) their parent outer ring. Holes outside the shell cause earcut triangulation to produce corrupted meshes.

## Why it matters

When a hole extends beyond its parent polygon, the triangulation algorithm (earcut) produces invalid triangles — visual artifacts like spikes, missing faces, or inverted geometry in 3D extrusion. This is especially damaging for building footprints where fill-extrusion is used.

## Diagnostic output

```text
✗ tile/hole-containment
  Hole ring 1 in layer "buildings", feature 42 has vertices outside the outer ring.
  at ./tile.pbf → layer: buildings, feature: 42, part: 1
  ℹ Simplify with topology preservation or clip holes to the outer ring boundary.
```

## Multi-polygon awareness

This rule is multi-polygon aware. It uses convention-aware ring grouping (`groupRingsIntoPolygons()`) to correctly identify which outer ring each hole belongs to, even in features with multiple outer rings.

Common causes of hole escape:
- Aggressive simplification moving hole vertices outside the shell
- Coordinate quantization (rounding) at tile encoding time
- Clipping errors at tile boundaries

## Configuration

No configuration options.

```typescript
rules: {
  'tile/hole-containment': 'error',  // or 'warning' or 'off'
}
```

## Remediation

- Use topology-preserving simplification that keeps holes within their parent
- Clip hole rings to the outer ring boundary as a post-processing step
- Increase coordinate precision to reduce quantization errors
- Check tile boundary clipping logic for edge cases

## Related rules

- [`tile/winding-order`](/rules/tile/winding-order)
Validates ring winding direction
- [`tile/self-intersection`](/rules/tile/self-intersection)
Catches rings that cross themselves
- [`tile/unclosed-ring`](/rules/tile/unclosed-ring)
Catches unclosed rings
