# @tileguard/tile-rules

MVT provider + 12 tile validation rules. Decodes `.pbf` files and validates geometry, structure, and feature metadata.

```bash
npm install @tileguard/tile-rules @tileguard/core
```

---

## Plugin & Provider

| Export | Type | Description |
|:-------|:-----|:------------|
| `tilePlugin` | Plugin | All 12 rules + provider (batteries-included) |
| `tileRules` | `Rule[]` | All 12 rule objects as an array |
| `tileProvider` | Provider | Decodes `.pbf` → `VectorTileArtifact` |

```typescript
import { tilePlugin, tileProvider, tileRules } from '@tileguard/tile-rules';
```

---

## Artifact Types

| Export | Type | Description |
|:-------|:-----|:------------|
| `VectorTileArtifact` | Interface | Decoded MVT tile |
| `VectorTileLayer` | Interface | Layer with name, extent, features |
| `VectorTileFeature` | Interface | Feature with type, properties, geometry |
| `PropertyValue` | Type | `string \| number \| boolean \| null` |

```typescript
import type {
  VectorTileArtifact,
  VectorTileLayer,
  VectorTileFeature,
} from '@tileguard/tile-rules';

// VectorTileArtifact.content structure:
interface VectorTileContent {
  layers: Record<string, VectorTileLayer>;
}

interface VectorTileLayer {
  name: string;
  extent: number;  // Usually 4096
  features: VectorTileFeature[];
}

interface VectorTileFeature {
  type: 1 | 2 | 3;  // 1=Point, 2=LineString, 3=Polygon
  properties: Record<string, PropertyValue>;
  geometry: unknown; // Type-dependent coordinate arrays
}
```

---

## Individual Rule Exports

Each rule is exported for custom plugin composition:

| Export | Rule ID | Default Severity |
|:-------|:--------|:-----------------|
| `requiredLayersRule` | `tile/required-layers` | error |
| `requiredPropertiesRule` | `tile/required-properties` | error |
| `coordinateRangeRule` | `tile/coordinate-range` | error |
| `featureCountRule` | `tile/feature-count` | warning |
| `layerFeatureCountRule` | `tile/layer-feature-count` | warning |
| `unclosedRingRule` | `tile/unclosed-ring` | error |
| `zeroAreaRingRule` | `tile/zero-area-ring` | error |
| `windingOrderRule` | `tile/winding-order` | error |
| `holeContainmentRule` | `tile/hole-containment` | error |
| `selfIntersectionRule` | `tile/self-intersection` | error |
| `degenerateGeometryRule` | `tile/degenerate-geometry` | error |
| `noEmptyRule` | `tile/no-empty` | warning |

```typescript
import {
  selfIntersectionRule,
  windingOrderRule,
  unclosedRingRule,
  tileProvider,
} from '@tileguard/tile-rules';
import type { Plugin } from '@tileguard/core';

// Custom plugin with only geometry rules
const geometryPlugin: Plugin = {
  name: 'geometry-only',
  providers: [tileProvider],
  rules: [selfIntersectionRule, windingOrderRule, unclosedRingRule],
};
```

---

## Rule Options Types

| Export | For Rule | Key Options |
|:-------|:---------|:------------|
| `RequiredLayersOptions` | `tile/required-layers` | `layers: string[]` |
| `RequiredPropertiesOptions` | `tile/required-properties` | `layers: Record<string, string[]>` |
| `CoordinateRangeOptions` | `tile/coordinate-range` | `buffer`, `excludeLayers`, `skipCrossTileFeatures` |
| `FeatureCountOptions` | `tile/feature-count` | `min`, `max` |
| `LayerFeatureCountOptions` | `tile/layer-feature-count` | `layers: Record<string, {min?, max?}>` |
| `NoEmptyOptions` | `tile/no-empty` | `allowEmpty: boolean` |
| `ZeroAreaRingOptions` | `tile/zero-area-ring` | `minArea: number` |

```typescript
import type { RequiredLayersOptions, CoordinateRangeOptions } from '@tileguard/tile-rules';
```

---

## Low-Level Decoder

| Export | Type | Description |
|:-------|:-----|:------------|
| `decodeMvt` | Function | Decode raw MVT buffer to layers/features |
| `PbfReader` | Class | Low-level protobuf reader |
| `DecodeError` | Class | Decoder error with diagnostic data |
| `DecodeDiagnosticData` | Interface | Decoder error metadata |

```typescript
import { decodeMvt } from '@tileguard/tile-rules';

const buffer = fs.readFileSync('./tile.pbf');
const layers = decodeMvt(buffer);

for (const [name, layer] of Object.entries(layers)) {
  console.log(`${name}: ${layer.features.length} features`);
}
```

---

## Geometry Utilities

| Export | Type | Description |
|:-------|:-----|:------------|
| `WindingConvention` | Type | `'mvt' \| 'ogc'` |
| `LogicalPolygon` | Interface | Outer ring + holes grouped by convention |
| `detectWindingConvention` | Function | Determine convention from first ring |
| `groupRingsIntoPolygons` | Function | Split flat rings into logical polygons |

```typescript
import {
  detectWindingConvention,
  groupRingsIntoPolygons,
} from '@tileguard/tile-rules';
import type { WindingConvention, LogicalPolygon } from '@tileguard/tile-rules';

const convention: WindingConvention = detectWindingConvention(rings);
const polygons: LogicalPolygon[] = groupRingsIntoPolygons(rings, convention);
```
