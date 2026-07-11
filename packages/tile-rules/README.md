# @tileguard/tile-rules

Vector tile artifact provider and validation rules for TileGuard.

This package delivers `tilePlugin` — a self-contained TileGuard plugin that loads Mapbox Vector Tile (`.pbf` / `.mvt`) files as `VectorTile` artifacts and runs ten independent validation rules against them. It ships a zero-dependency custom PBF/protobuf decoder and a full geometry analysis library. It depends only on `@tileguard/core` at runtime.

---

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Artifact type](#artifact-type)
- [Rules reference](#rules-reference)
- [Configuration](#configuration)
- [Provider details](#provider-details)
- [Geometry utilities](#geometry-utilities)
- [Public API](#public-api)
- [Testing](#testing)

---

## Installation

```bash
npm install @tileguard/tile-rules @tileguard/core
```

---

## Quick start

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/required-properties': ['error', {
      layers: { roads: ['class', 'name'] },
    }],
  },
});

const result = await engine.run(['./tiles/14/8741/5476.pbf']);

console.log(result.summary.pass ? 'PASS' : 'FAIL');
for (const d of result.diagnostics) {
  console.log(`[${d.severity}] ${d.ruleId}: ${d.message}`);
}
```

---

## Artifact type
<!-- TODO: INSERT DIAGRAM 6: Vector Tile Decoder -->

The provider produces a single `VectorTile` artifact for every source it handles. The artifact's `content` is fully decoded into plain JavaScript objects before any rule sees it.

```typescript
interface VectorTileContent {
  readonly layers: Readonly<Record<string, VectorTileLayer>>;
}

interface VectorTileLayer {
  readonly name:     string;
  readonly version:  number | null;
  readonly extent:   number;           // default 4096
  readonly keys:     readonly string[];
  readonly values:   readonly TileValue[];
  readonly features: readonly VectorTileFeature[];
}

interface VectorTileFeature {
  readonly id?:           number;
  readonly type:          GeometryType;          // 0 | 1 | 2 | 3
  readonly geometryType:  GeometryTypeName;       // 'Unknown' | 'Point' | 'LineString' | 'Polygon'
  readonly properties:    Readonly<Record<string, TileValue>>;
  readonly geometry:      VectorTileGeometry;
}
```

---

## Rules reference

All ten rules are `recommended: true` and enabled by default when you register `tilePlugin`. Default severities are listed below; all can be overridden in `tileguard.config.ts`.

### `tile/no-empty`

**Default severity:** `warning`

A tile with zero features across all layers is usually a pipeline bug. This rule fires when `totalFeatureCount(tile) === 0`. You can suppress it for tiles that are intentionally empty.

```
[warning] tile/no-empty: Tile contains "0" features.
```

**Options:**

```typescript
interface NoEmptyOptions {
  allowEmpty?: boolean;  // set to true to suppress this rule
}
```

```typescript
'tile/no-empty': ['warning', { allowEmpty: true }]
```

---

### `tile/required-layers`

**Default severity:** `error`

Checks that every configured layer name is present in the tile. Reports each missing layer independently.

```
[error] tile/required-layers: Required layer "buildings" is not present in the tile.
  location: layer=buildings
```

**Options:**

```typescript
interface RequiredLayersOptions {
  layers?: readonly string[];  // layer names that must exist
}
```

```typescript
'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }]
```

If `layers` is empty or omitted, the rule skips all checks and produces no diagnostics.

---

### `tile/feature-count`

**Default severity:** `warning`

Checks that the total number of features across all layers falls within configured bounds. Both `min` and `max` are optional; omit either to skip that bound.

```
[warning] tile/feature-count: Tile has "3" features total, expected at least "10".
```

**Options:**

```typescript
interface FeatureCountOptions {
  min?: number;          // minimum total features (alias: minFeatures)
  max?: number;          // maximum total features (alias: maxFeatures)
  minFeatures?: number;  // legacy alias for min
  maxFeatures?: number;  // legacy alias for max
}
```

```typescript
'tile/feature-count': ['warning', { min: 1, max: 50000 }]
```

---

### `tile/layer-feature-count`

**Default severity:** `warning`

Checks per-layer feature count bounds. Layers not mentioned in the configuration are skipped. Each bound violation is reported independently.

```
[warning] tile/layer-feature-count: Layer "roads" has "1" features, expected at least "5".
  location: layer=roads
```

**Options:**

```typescript
interface LayerFeatureBounds {
  min?: number;          // minimum features for this layer
  max?: number;          // maximum features for this layer
  minFeatures?: number;  // legacy alias for min
  maxFeatures?: number;  // legacy alias for max
}

interface LayerFeatureCountOptions {
  layers?: Record<string, LayerFeatureBounds>;     // preferred key
  layerConfig?: Record<string, LayerFeatureBounds>; // legacy alias
}
```

```typescript
'tile/layer-feature-count': ['warning', {
  layers: {
    water:     { min: 1 },
    roads:     { min: 1, max: 10000 },
    buildings: { max: 50000 },
  },
}]
```

---

### `tile/required-properties`

**Default severity:** `error`

Checks that every feature in a configured layer contains each listed property key. Reports each missing property per feature independently.

```
[error] tile/required-properties: Feature "3" in layer "roads" is missing required property "class".
  location: layer=roads, featureIndex=3
```

**Options — three accepted shapes:**

```typescript
// Shape 1 (preferred): layers key
{ layers: { roads: ['class', 'name'], water: ['kind'] } }

// Shape 2: requiredProperties key (legacy alias)
{ requiredProperties: { roads: ['class', 'name'] } }

// Shape 3: flat object (legacy alias)
{ roads: ['class', 'name'], water: ['kind'] }
```

```typescript
'tile/required-properties': ['error', {
  layers: {
    roads:     ['class', 'name'],
    buildings: ['height'],
  },
}]
```

---

### `tile/coordinate-range`

**Default severity:** `error`

Every coordinate in every feature must fall within `[0, extent]` on both axes (where `extent` is layer-specific, defaulting to 4096). Out-of-range coordinates indicate an encoding or reprojection bug.

```
[error] tile/coordinate-range: Coordinate "-5,2048" in layer "roads" is outside tile extent "0-4096".
  location: layer=roads, featureIndex=0, partIndex=0
```

**Options:** none

---

### `tile/degenerate-geometry`

**Default severity:** `error`

Checks that geometry has enough unique vertices to be valid for its type:

- `LineString`: requires at least 2 unique points
- `Polygon`: requires at least 3 unique vertices and at least 4 total points (including the closing point)

```
[error] tile/degenerate-geometry: LineString has fewer than 2 unique points. Layer "roads", feature "2".
  location: layer=roads, featureIndex=2
```

**Options:** none

---

### `tile/unclosed-ring`

**Default severity:** `error`

Every polygon ring must be closed — its last coordinate must equal its first coordinate. Unclosed rings violate the MVT specification.

```
[error] tile/unclosed-ring: Polygon ring in layer "buildings", feature "1" is not closed.
  location: layer=buildings, featureIndex=1, partIndex=0
```

**Options:** none

---

### `tile/zero-area-ring`

**Default severity:** `error`

A polygon ring with a signed area of exactly zero is degenerate (all points are collinear). It cannot be rendered or used for hit testing.

```
[error] tile/zero-area-ring: Polygon ring in layer "buildings", feature "0" has zero area.
  location: layer=buildings, featureIndex=0, partIndex=0
```

**Options:** none

---

### `tile/self-intersection`

**Default severity:** `error`

Non-adjacent segments of a line or polygon ring must not intersect. Self-intersecting geometries violate OGC Simple Features and produce unpredictable rendering.

The check is O(n²) per ring — consider disabling it for large tiles where performance is a concern:

```typescript
'tile/self-intersection': 'off'
```

```
[error] tile/self-intersection: Geometry in layer "buildings", feature "0" has intersecting segments "0" and "2".
  location: layer=buildings, featureIndex=0, partIndex=0
```

**Options:** none

---

## Configuration

```typescript
import { tilePlugin } from '@tileguard/tile-rules';

export default {
  plugins: [tilePlugin],
  rules: {
    // Required layers for your schema
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings', 'landuse'] }],

    // Required properties per layer
    'tile/required-properties': ['error', {
      layers: {
        roads:     ['class', 'name'],
        buildings: ['height', 'min_height'],
      },
    }],

    // Per-layer feature count bounds
    'tile/layer-feature-count': ['warning', {
      layers: {
        water:     { min: 1 },
        roads:     { min: 1, max: 20000 },
        buildings: { max: 100000 },
      },
    }],

    // Disable expensive self-intersection check for large tiles
    'tile/self-intersection': 'off',

    // Allow intentionally empty tiles in some fixture sets
    'tile/no-empty': 'off',
  },
  overrides: [
    {
      files: ['fixtures/empty-tiles/**'],
      rules: { 'tile/no-empty': 'off' },
    },
  ],
};
```

---

## Provider details
<!-- TODO: INSERT DIAGRAM 7: ZigZag Coordinate Decoding (Bitwise Workflow) -->

### Handled sources

The `tileProvider` handles sources ending in:

- `.pbf`
- `.mvt`
- `.vector.pbf`

Both local filesystem paths and HTTP/HTTPS URLs are supported. `.mbtiles` is detected but deferred — the provider throws a descriptive error directing you to use a dedicated archive provider.

### Gzip decompression

Tiles are inspected for the gzip magic bytes (`0x1f 0x8b`) before decoding. Gzip-compressed tiles are decompressed transparently. The original and decompressed byte counts are stored in `artifact.metadata`.

### Error handling

| Situation | Outcome |
|:----------|:--------|
| File does not exist | `artifact/load-failed` diagnostic |
| Zero-byte file | `artifact/load-failed` diagnostic |
| Invalid protobuf data | `artifact/load-failed` diagnostic |
| HTTP error (non-2xx) | `artifact/load-failed` diagnostic |
| HTTP timeout | `artifact/load-failed` diagnostic |
| `.mbtiles` source | `artifact/load-failed` diagnostic with explanation |

---

## Geometry utilities
<!-- TODO: INSERT DIAGRAM 8: Polygon Topology Sanity Checks -->
<!-- TODO: INSERT DIAGRAM 9: Shoelace Algorithm Math Solver -->
<!-- TODO: INSERT DIAGRAM 10: Segment Orientation Self-Intersection Check -->

The geometry analysis functions are exported from the package for use in custom rules or test helpers. They operate on decoded `VectorTileFeature` objects and return typed `GeometryIssue[]` arrays.

```typescript
import {
  findCoordinateRangeIssues,
  findDegenerateGeometryIssues,
  findUnclosedRingIssues,
  findZeroAreaRingIssues,
  findSelfIntersectionIssues,
  signedArea,
  uniquePointCount,
  segmentsIntersect,
} from '@tileguard/tile-rules';
```

Each function is independent — you can call them individually without the engine:

```typescript
const issues = findSelfIntersectionIssues(feature);
if (issues.length > 0) {
  console.log(issues[0].message);
  // "Segments 0 and 2 intersect."
}
```

The `GeometryIssue` shape:

```typescript
interface GeometryIssue {
  code:
    | 'OUT_OF_RANGE'
    | 'DEGENERATE_LINE'
    | 'DEGENERATE_POLYGON'
    | 'UNCLOSED_RING'
    | 'ZERO_AREA_RING'
    | 'SELF_INTERSECTION'
    | 'EMPTY_GEOMETRY';
  message:     string;
  partIndex?:  number;
  pointIndex?: number;
  segments?:   readonly [number, number];
  point?:      Point;
}
```

---

## Public API

```typescript
import {
  // Plugin (register this with the engine)
  tilePlugin,

  // Rules array (compose your own plugin)
  tileRules,

  // Provider (compose your own plugin)
  tileProvider,

  // Individual rules
  noEmptyRule,
  requiredLayersRule,
  featureCountRule,
  layerFeatureCountRule,
  requiredPropertiesRule,
  coordinateRangeRule,
  degenerateGeometryRule,
  unclosedRingRule,
  zeroAreaRingRule,
  selfIntersectionRule,

  // PBF decoder
  PbfReader,
  decodeMvt,

  // Geometry analysis functions
  findCoordinateRangeIssues,
  findDegenerateGeometryIssues,
  findUnclosedRingIssues,
  findZeroAreaRingIssues,
  findSelfIntersectionIssues,
  segmentsIntersect,
  signedArea,
  uniquePointCount,

  // Content helpers
  VECTOR_TILE_ARTIFACT_TYPE,
  getVectorTile,
  getFeatureParts,
  totalFeatureCount,
} from '@tileguard/tile-rules';

import type {
  VectorTileArtifact,
  VectorTileContent,
  VectorTileLayer,
  VectorTileFeature,
  VectorTileGeometry,
  GeometryType,
  GeometryTypeName,
  LayerFeatureBounds,
  Point,
  TileValue,
} from '@tileguard/tile-rules';
```

### Writing a custom tile rule

```typescript
import type { Rule } from '@tileguard/core';
import { VECTOR_TILE_ARTIFACT_TYPE, getVectorTile } from '@tileguard/tile-rules';

export const noHighwayInWaterRule: Rule = {
  id: 'project/no-highway-in-water',
  meta: {
    description: 'Roads layer must not contain features with class=waterway.',
    defaultSeverity: 'error',
    recommended: false,
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);
    const roads = tile.layers['roads'];
    if (!roads) return;

    for (let i = 0; i < roads.features.length; i++) {
      const feature = roads.features[i]!;
      if (feature.properties['class'] === 'waterway') {
        context.report({
          message: `Feature "${i}" in layer "roads" has class="waterway".`,
          location: { layer: 'roads', featureIndex: i },
        });
      }
    }
  },
};
```

---

## Testing

```bash
cd packages/tile-rules
npx vitest run
```

Tests use an in-memory MVT encoder to construct binary tile buffers directly — no fixture files required for the tile-rules test suite.

Test coverage:

| Test | What it verifies |
|:-----|:----------------|
| decodes MVT layer, feature, geometry, and properties | Full round-trip: `decodeMvt` correctly decodes layers, features, properties |
| passes a valid raw vector tile through the engine | Engine integration: `required-layers`, `required-properties`, `feature-count` all pass on a valid tile |
| reports required layers, feature count, layer feature count, and required properties independently | Four rules fire as four independent diagnostics on the same malformed tile |
| detects gzip-compressed tiles and granular geometry issues | Gzip decompression works; `self-intersection` and `zero-area-ring` fire on a self-intersecting polygon |
| reports coordinate range and degenerate geometry as separate rule IDs | `coordinate-range` and `degenerate-geometry` fire as separate rule IDs on an out-of-range degenerate line |
| reports load-failed for invalid protobuf data | Provider emits `artifact/load-failed` for corrupt binary data |

---

## Status

✅ **Implemented.** All 10 rules, the PBF decoder, and the provider are live and tested.

| Module | Status | Since |
|:-------|:-------|:------|
| `pbf-decoder.ts` | ✅ Complete | v0.3.0 |
| `geometry.ts` | ✅ Complete | v0.3.0 |
| `types.ts` | ✅ Complete | v0.3.0 |
| `provider.ts` | ✅ Complete | v0.3.0 |
| `rules/no-empty.ts` | ✅ Complete | v0.3.0 |
| `rules/required-layers.ts` | ✅ Complete | v0.3.0 |
| `rules/feature-count.ts` | ✅ Complete | v0.3.0 |
| `rules/layer-feature-count.ts` | ✅ Complete | v0.3.0 |
| `rules/required-properties.ts` | ✅ Complete | v0.3.0 |
| `rules/coordinate-range.ts` | ✅ Complete | v0.3.0 |
| `rules/degenerate-geometry.ts` | ✅ Complete | v0.3.0 |
| `rules/unclosed-ring.ts` | ✅ Complete | v0.3.0 |
| `rules/zero-area-ring.ts` | ✅ Complete | v0.3.0 |
| `rules/self-intersection.ts` | ✅ Complete | v0.3.0 |

---

## Architecture

- [04 — Rule System](../../docs/architecture/04-rule-system.md)
- [08 — Package Structure](../../docs/architecture/08-package-structure.md)
- [09 — Implementation Roadmap](../../docs/architecture/09-implementation-roadmap.md)
