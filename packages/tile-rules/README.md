# @tileguard/tile-rules

**Vector tile validation rules for Mapbox Vector Tiles.**

[![npm](https://img.shields.io/npm/v/@tileguard/tile-rules)](https://www.npmjs.com/package/@tileguard/tile-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shreeharshshinde/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

16 configurable rules for vector tile validation and performance budgeting. Catches self-intersections, unclosed rings, incorrect winding order, holes outside shells, missing layers, coordinate range violations, oversized tiles, and vertex-heavy features before they reach production rendering.

---

## Installation

```bash
npm install @tileguard/tile-rules @tileguard/core
```

> Or use the CLI directly: `npx @tileguard/cli check ./tile.pbf`

---

## Quick Start

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/feature-count': ['warning', { max: 50000 }],
  },
});

const result = await engine.run(['./tiles/14/8741/5476.pbf']);

console.log(result.summary.pass ? '✓ PASS' : '✗ FAIL');
for (const d of result.diagnostics) {
  console.log(`  ${d.severity} ${d.ruleId}: ${d.message}`);
}
```

**Output:**

```
✗ FAIL
  error tile/required-layers: Required layer "buildings" is not present in the tile.
  error tile/self-intersection: Geometry in layer "water", feature "12" has intersecting segments "3" and "7".
  warning tile/feature-count: Tile has "52431" features total, expected at most "50000".
```

---

## Rules

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| `tile/required-layers` | error | Missing expected layers |
| `tile/required-properties` | error | Features missing declared properties |
| `tile/coordinate-range` | error | Coordinates outside valid tile extent |
| `tile/unclosed-ring` | error | Polygon rings not closed (first ≠ last vertex) |
| `tile/zero-area-ring` | error | Degenerate polygons with zero/near-zero area |
| `tile/winding-order` | error | Incorrect ring winding order (earcut safety) |
| `tile/hole-containment` | error | Hole rings outside the outer ring (earcut safety) |
| `tile/self-intersection` | error | Geometry that crosses itself |
| `tile/degenerate-geometry` | error | Lines/polygons with insufficient vertices |
| `tile/feature-count` | warning | Total feature count outside configured bounds |
| `tile/layer-feature-count` | warning | Per-layer feature count outside bounds |
| `tile/no-empty` | warning | Tiles with zero features |

### Performance Rules (v0.6.0 · opt-in)

All performance rules ship with **no default thresholds** — enable them and set budgets explicitly.

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| `perf/tile-size` | warning | Raw and/or gzip-compressed byte size exceeds budget |
| `perf/vertex-budget` | warning | Per-feature or tile-level vertex count too high |
| `perf/feature-density` | warning | Per-layer feature count too high |
| `perf/layer-size` | info | Single layer dominates tile's vertex budget |

```typescript
rules: {
  // Flag tiles over 500 KB raw or 150 KB gzip-compressed
  'perf/tile-size': ['warning', { maxBytes: 500_000, maxGzipBytes: 150_000 }],
  // Flag any feature with more than 5,000 vertices
  'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 5_000 }],
  // Flag layers with more than 10,000 features
  'perf/feature-density': ['warning', { maxFeaturesPerLayer: 10_000 }],
  // Flag any layer that accounts for more than 50% of tile vertices
  'perf/layer-size': ['info', { maxLayerFraction: 0.5 }],
}
```

> **Tip:** Run `tileguard profile <tile.pbf>` first to see the actual vertex distribution before setting budgets.

```typescript
rules: {
  'tile/self-intersection': 'off',       // disable
  'tile/no-empty': 'error',              // promote to error
  'tile/coordinate-range': ['error', { buffer: 128 }],  // custom options
}
```

---

## Configuration examples

```typescript
// Require specific layers in every tile
'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings', 'landuse'] }]

// Require properties on features in specific layers
'tile/required-properties': ['error', {
  layers: {
    roads: ['class', 'name'],
    buildings: ['height', 'type'],
  }
}]

// Per-layer feature count bounds
'tile/layer-feature-count': ['warning', {
  layers: {
    buildings: { max: 10000 },
    roads: { min: 5, max: 5000 },
  }
}]

// Wider coordinate buffer for tiles with aggressive clipping
'tile/coordinate-range': ['error', { buffer: 128 }]
```

---

## Also exports

Beyond the plugin, this package exports utilities for advanced use:

| Export | Purpose |
|:-------|:--------|
| `tileProvider` | Artifact provider for `.pbf`/`.mvt` files |
| `decodeMvt()` | Low-level MVT protobuf decoder |
| `DecodeError` | Structured decode error with byte offsets |
| `findSelfIntersectionIssues()` | Pure geometry analysis functions |
| `VectorTileContent`, `VectorTileFeature` | Decoded tile types |

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) | CLI — `npx tileguard check ./tile.pbf` |
| [`@tileguard/core`](https://www.npmjs.com/package/@tileguard/core) | Framework contracts |
| **@tileguard/tile-rules** | Vector tile validation (this package) |
| [`@tileguard/style-rules`](https://www.npmjs.com/package/@tileguard/style-rules) | MapLibre style lint rules |
| [`@tileguard/reporters`](https://www.npmjs.com/package/@tileguard/reporters) | Text, JSON, Markdown, HTML reports |
| [`@tileguard/analysis`](https://www.npmjs.com/package/@tileguard/analysis) | Tile comparison + regression detection |

---

## Documentation

- [Rule Reference](https://github.com/shreeharshshinde/tileguard/tree/main/docs/rules/tile) — Per-rule docs with examples
- [API Reference](https://github.com/shreeharshshinde/tileguard/tree/main/docs/api) — Generated TypeDoc
- [Repository](https://github.com/shreeharshshinde/tileguard)

---

## License

[MIT](https://github.com/shreeharshshinde/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shreeharshshinde)
