# @tileguard/analysis

Tile comparison engine, regression detection, and statistics. Compare two tile versions, match features, detect regressions, and score confidence.

```bash
npm install @tileguard/analysis @tileguard/core
```

---

## Top-Level Factories

| Export | Type | Description |
|:-------|:-----|:------------|
| `createComparisonEngine` | Function | Create a tile comparison engine |
| `createRegressionEngine` | Function | Create a regression detector |
| `createSnapshotFactory` | Function | Create tile snapshots for comparison input |

```typescript
import {
  createComparisonEngine,
  createRegressionEngine,
  createSnapshotFactory,
} from '@tileguard/analysis';
```

### Full Usage Example

```typescript
const factory = createSnapshotFactory();
const before = factory.createSnapshot('v1.pbf', layersBefore, diagsBefore);
const after = factory.createSnapshot('v2.pbf', layersAfter, diagsAfter);

// Compare
const comparison = createComparisonEngine().compare(before, after);
console.log(`+${comparison.summary.addedFeatures} added`);
console.log(`−${comparison.summary.removedFeatures} removed`);
console.log(`~${comparison.summary.modifiedFeatures} modified`);

// Detect regressions
const regression = createRegressionEngine().analyze(comparison);
for (const candidate of regression.candidates.slice(0, 5)) {
  console.log(`${(candidate.confidence * 100).toFixed(0)}% — ${candidate.kind}: ${candidate.summary}`);
}
```

---

## Sub-Engines (Advanced)

For building custom analysis pipelines with fine-grained control:

| Export | Type | Description |
|:-------|:-----|:------------|
| `createFeatureMatcher` | Function | Match features between two tiles by ID, properties, or geometry similarity |
| `createGeometryDiffer` | Function | Compute geometry differences: area delta, centroid shift, vertex count change |
| `createPropertyDiffer` | Function | Compute property differences: added, removed, changed keys |
| `createConfidenceScorer` | Function | Score regression confidence from accumulated evidence |
| `createEvidenceBuilder` | Function | Build evidence chains linking observations to conclusions |

```typescript
import {
  createFeatureMatcher,
  createGeometryDiffer,
  createPropertyDiffer,
  createConfidenceScorer,
  createEvidenceBuilder,
} from '@tileguard/analysis';

// Match features between two layers
const matcher = createFeatureMatcher();
const matchResult = matcher.match(layerA.features, layerB.features);
// matchResult.matched — paired features
// matchResult.addedInB — features only in B
// matchResult.removedFromA — features only in A

// Diff geometry of matched features
const geoDiffer = createGeometryDiffer();
for (const pair of matchResult.matched) {
  const diff = geoDiffer.diff(pair.featureA.geometry, pair.featureB.geometry);
  console.log(`Area change: ${diff.areaDelta}%`);
  console.log(`Centroid shift: ${diff.centroidDistance} units`);
}

// Score confidence
const scorer = createConfidenceScorer();
const score = scorer.score(evidence);
console.log(`Confidence: ${(score * 100).toFixed(0)}%`);
```

---

## Model Types

### Comparison

| Export | Type | Description |
|:-------|:-----|:------------|
| `TileComparison` | Interface | Full comparison result with summary + per-layer details |
| `TileSnapshot` | Interface | Snapshot of one tile version (layers, features, diagnostics) |
| `FeatureMatchResult` | Interface | Matched/added/removed feature lists |

```typescript
import type { TileComparison, TileSnapshot } from '@tileguard/analysis';
```

### Regression

| Export | Type | Description |
|:-------|:-----|:------------|
| `RegressionAnalysis` | Interface | Full regression detection result |
| `RegressionCandidate` | Interface | Single candidate with confidence, kind, evidence |
| `BuiltEvidence` | Interface | Evidence chain supporting a regression candidate |

```typescript
import type { RegressionAnalysis, RegressionCandidate } from '@tileguard/analysis';

interface RegressionCandidate {
  layerName: string;
  featureId?: number;
  kind: 'geometry' | 'attribute' | 'layer' | 'mixed';
  confidence: number;      // 0–1
  summary: string;
  evidence: string[];
}
```

### Statistics

| Export | Type | Description |
|:-------|:-----|:------------|
| `TileStatistics` | Interface | Aggregate: layers, features, vertices, diagnostics |
| `LayerStatistics` | Interface | Per-layer: name, feature count, vertex count, geometry types |
| `EMPTY_TILE_STATISTICS` | Constant | Default empty statistics object |

```typescript
import type { TileStatistics, LayerStatistics } from '@tileguard/analysis';
import { EMPTY_TILE_STATISTICS } from '@tileguard/analysis';
```
