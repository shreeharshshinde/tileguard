# Validating Vector Tiles

This guide covers everything about validating MVT (Mapbox Vector Tile) files with TileGuard — from basic checks to advanced configuration.

## Basic Validation

```bash
# Single tile
tileguard check ./tiles/14/8741/5476.pbf

# Entire directory (recursive)
tileguard check ./tiles/

# Multiple paths
tileguard check ./tiles/ ./other-tiles/tile.pbf
```

TileGuard automatically detects `.pbf` files and applies all 12 tile validation rules.

## What Gets Checked

### Geometry Integrity

These rules validate that polygon and line geometry is mathematically correct:

| Rule | What it catches | Why it matters |
|:-----|:----------------|:---------------|
| `tile/self-intersection` | Edges that cross | Broken fill extrusion, incorrect area calculations |
| `tile/unclosed-ring` | Open polygons | Undefined fill behavior, rendering holes |
| `tile/winding-order` | Wrong ring direction | Inverted fill/hole, earcut triangulation failures |
| `tile/hole-containment` | Escaped holes | Holes rendered as separate polygons |
| `tile/zero-area-ring` | Collapsed polygons | Invisible geometry wasting bandwidth |
| `tile/degenerate-geometry` | Too few vertices | Structurally invalid features |
| `tile/coordinate-range` | Out-of-bounds vertices | Rendering artifacts at tile edges |

### Structural Validation

These rules validate the tile's content meets expectations:

| Rule | What it catches | When to use |
|:-----|:----------------|:------------|
| `tile/required-layers` | Missing layers | Ensure pipeline produces expected layers |
| `tile/required-properties` | Missing feature attributes | Catch schema drift in source data |
| `tile/feature-count` | Too many features total | Prevent oversized tiles |
| `tile/layer-feature-count` | Too many features per layer | Per-layer budgets |
| `tile/no-empty` | Zero features | Catch empty tiles in expected regions |

## Convention-Aware Validation

TileGuard auto-detects the winding convention used in your tiles:

- **MVT convention** — Outer rings clockwise, holes counter-clockwise (MapLibre native)
- **OGC/GeoJSON convention** — Outer rings counter-clockwise, holes clockwise (Planetiler, OpenMapTiles)

You don't need to configure this. TileGuard inspects the first ring and determines which convention is in use, then validates all other rings against it. No false positives on Planetiler output.

## Configuration

### Require Specific Layers

```typescript
rules: {
  'tile/required-layers': ['error', {
    layers: ['water', 'roads', 'buildings', 'landuse', 'poi'],
  }],
}
```

### Set Feature Count Budgets

```typescript
rules: {
  // Total features across all layers
  'tile/feature-count': ['warning', { max: 100000 }],

  // Per-layer limits
  'tile/layer-feature-count': ['warning', { max: 50000 }],
}
```

### Require Feature Properties

```typescript
rules: {
  'tile/required-properties': ['error', {
    layers: {
      roads: ['class', 'name'],
      buildings: ['height', 'type'],
    },
  }],
}
```

### Customize Coordinate Range

By default, coordinates must be within `[0, extent]` where extent is typically 4096. To allow buffer zone coordinates:

```typescript
rules: {
  'tile/coordinate-range': ['error', {
    allowBuffer: true,   // Allow ±buffer outside extent
    buffer: 256,         // How far outside extent is allowed
  }],
}
```

## Common Patterns

### Strict Geometry Validation

For tiles used in 3D extrusion or precise area calculations:

```typescript
rules: {
  'tile/self-intersection': 'error',
  'tile/winding-order': 'error',
  'tile/hole-containment': 'error',
  'tile/unclosed-ring': 'error',
  'tile/zero-area-ring': 'error',
  'tile/degenerate-geometry': 'error',
}
```

### Lightweight Content Checks

For quick validation that tiles have expected content:

```typescript
rules: {
  'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
  'tile/no-empty': 'warning',
  'tile/feature-count': ['warning', { max: 200000 }],
  // Disable geometry rules for speed
  'tile/self-intersection': 'off',
  'tile/winding-order': 'off',
}
```

### Pipeline Regression Guard

Check that a tile generation pipeline still produces expected output:

```typescript
rules: {
  'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings', 'landuse'] }],
  'tile/required-properties': ['error', {
    layers: { roads: ['class'], buildings: ['height'] },
  }],
  'tile/no-empty': 'error',
}
```

## Understanding Output

### Text Output (Default)

```text
✗ tile/self-intersection
  Geometry in layer "landuse", feature 42 has intersecting segments 1 and 4.
  at ./tiles/14/8741/5476.pbf → layer: landuse, feature: 42, part: 0
  ℹ Simplify or repair this geometry so non-adjacent segments do not cross.
```

### JSON Output

```bash
tileguard check ./tiles/ --reporter json
```

Produces machine-readable output for CI integration, custom dashboards, or programmatic consumption.

## Programmatic API

Validate tiles from your own code:

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/winding-order': 'error',
  },
});

const result = await engine.run(['./tiles/']);

if (!result.summary.pass) {
  console.error(`${result.summary.errors} errors found`);
  for (const d of result.diagnostics) {
    console.error(`  ${d.ruleId}: ${d.message}`);
  }
}
```

## What Next?

- [**Inspecting Findings ›**](/guides/inspecting-findings) — Visual debugging in the Inspector
- [**Comparing Tiles ›**](/guides/comparing-tiles) — Diff between tile versions
- [**Rules Reference ›**](/rules/) — Detailed per-rule documentation
