# tile/unclosed-ring

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Every polygon ring must be closed — the first and last coordinate must be identical. Unclosed rings indicate broken encoders and cause incorrect area calculations.

## Why it matters

The MVT specification requires polygon rings to be explicitly closed. An unclosed ring is an ambiguous shape — renderers may close it implicitly (connecting last to first), leave a gap, or produce undefined fill behavior. Area calculations, hit testing, and clipping all depend on proper closure.

## Diagnostic output

```text
✗ tile/unclosed-ring
  Polygon ring in layer "buildings", feature 17 is not closed.
  at ./tile.pbf → layer: buildings, feature: 17, part: 0
  ℹ Ensure every polygon ring ends with the same coordinate it starts with.
```

## Configuration

No configuration options. The MVT spec unconditionally requires closed rings.

```typescript
rules: {
  'tile/unclosed-ring': 'error',  // or 'warning' or 'off'
}
```

## Remediation

- Fix the tile encoder to explicitly close all rings (append first vertex at end)
- If using a geometry library, ensure `closeRing()` or equivalent is called before encoding
- Check for coordinate truncation that might make the first and last vertex differ by a sub-pixel amount
