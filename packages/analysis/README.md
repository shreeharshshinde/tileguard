# @tileguard/analysis

**Tile comparison and regression detection engine for TileGuard.**

[![npm](https://img.shields.io/npm/v/@tileguard/analysis)](https://www.npmjs.com/package/@tileguard/analysis)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Compare two vector tile versions and identify regressions. Feature-level matching, geometry differencing, property comparison, and confidence-scored regression ranking — all in a pure Node.js library with zero browser or DOM dependencies.

---

## Installation

```bash
npm install @tileguard/analysis @tileguard/core
```

---

## Quick Start

```typescript
import {
  createComparisonEngine,
  createRegressionEngine,
  createSnapshotFactory,
} from '@tileguard/analysis';

// 1. Create snapshots from decoded tile data
const factory = createSnapshotFactory();
const before = factory.createSnapshot('./v1.pbf', layersBefore, diagnosticsBefore);
const after = factory.createSnapshot('./v2.pbf', layersAfter, diagnosticsAfter);

// 2. Compare
const comparison = createComparisonEngine().compare(before, after);

console.log(`${comparison.summary.addedFeatures} added`);
console.log(`${comparison.summary.removedFeatures} removed`);
console.log(`${comparison.summary.modifiedFeatures} modified`);

// 3. Detect regressions
const regression = createRegressionEngine().analyze(comparison);

for (const candidate of regression.candidates.slice(0, 5)) {
  console.log(`  ${(candidate.confidence * 100).toFixed(0)}% — ${candidate.kind}: ${candidate.summary}`);
}
```

**Output:**

```
12 added
3 removed
47 modified
  92% — geometry: Building footprint area reduced by 73% in layer "buildings"
  85% — attribute: Property "class" changed from "primary" to "tertiary" on 4 road features
  71% — mixed: Feature moved 200+ tile units with property changes
```

---

## Pipeline

```
Raw Tile Data ──► SnapshotFactory ──► TileSnapshot
                                          │
TileSnapshot A + B ──► ComparisonEngine ──► TileComparison
                                                │
TileComparison ──► RegressionEngine ──► RegressionAnalysis
                                          │
                                     Ranked candidates
                                     with confidence scores
```

---

## Engines

| Factory | Creates | Purpose |
|:--------|:--------|:--------|
| `createSnapshotFactory()` | `SnapshotFactory` | Create immutable tile snapshots from raw data |
| `createComparisonEngine()` | `ComparisonEngine` | Feature-level comparison between two snapshots |
| `createRegressionEngine(opts?)` | `RegressionEngine` | Confidence-scored regression ranking |
| `createFeatureMatcher()` | `FeatureMatcher` | 4-priority feature matching (ID → stable props → geometry → Jaccard) |
| `createGeometryDiffer()` | `GeometryDiffer` | Area, centroid, and vertex-level geometry diffs |
| `createPropertyDiffer()` | `PropertyDiffer` | Added/removed/changed property detection |
| `createConfidenceScorer()` | `ConfidenceScorer` | Weighted confidence scoring |
| `createEvidenceBuilder()` | `EvidenceBuilder` | Structured evidence collection |

All engines are stateless — create once, reuse across multiple comparisons.

---

## When to use this package

- **Tile pipeline CI**: Compare output tiles before/after a pipeline change to detect regressions
- **Version diffing**: Understand what changed between two tile versions
- **Quality dashboards**: Feed comparison data into engineering reports via `@tileguard/reporters`
- **Custom analysis tools**: Build on the comparison/regression primitives

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) | CLI — `tileguard compare`, `tileguard analyze` |
| [`@tileguard/core`](https://www.npmjs.com/package/@tileguard/core) | Framework contracts |
| [`@tileguard/tile-rules`](https://www.npmjs.com/package/@tileguard/tile-rules) | Vector tile validation rules |
| [`@tileguard/reporters`](https://www.npmjs.com/package/@tileguard/reporters) | Generates reports from analysis data |
| **@tileguard/analysis** | Comparison + regression (this package) |

---

## Documentation

- [API Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/api)
- [ADR: Shared Analysis Engine](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/architecture/adr/010-shared-analysis-engine.md)
- [Repository](https://github.com/shindeshreeharsh/tileguard)

---

## License

[MIT](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shindeshreeharsh)
