# tile/coordinate-range

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

All vector tile coordinates must stay within the layer's declared extent plus an optional buffer margin. Out-of-range coordinates indicate broken encoders and cause rendering artefacts at tile boundaries.

## Why it matters

Each tile layer declares an `extent` (commonly 4096). Coordinates outside this range overflow the tile grid, causing features to render in the wrong position, bleed into adjacent tiles, or produce clipping artifacts. Detecting this in the data layer prevents visual corruption.

## Diagnostic output

```text
✗ tile/coordinate-range
  Coordinate "4200,−50" in layer "roads" is outside allowed range [−80, 4176] (extent: 4096, buffer: 80).
  at ./tile.pbf → layer: roads, feature: 7, part: 0
  ℹ Clamp, simplify, or reproject geometries so all coordinates fit within the allowed range.
```

## Configuration

```typescript
rules: {
  'tile/coordinate-range': ['error', {
    buffer: 80,
    excludeLayers: ['label', 'place'],
    skipCrossTileFeatures: true,
  }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `buffer` | `number` | `80` | Allowed margin outside extent on each axis |
| `excludeLayers` | `string[]` | 9 label/centroid layers | Layers to skip (often labels extend beyond extent) |
| `skipCrossTileFeatures` | `boolean` | `true` | Skip features that intentionally cross tile boundaries |

## Remediation

- Check your tile encoder's clipping configuration
- Ensure coordinate reprojection produces values within the tile extent
- For label layers that intentionally extend beyond tile boundaries, add them to `excludeLayers`
