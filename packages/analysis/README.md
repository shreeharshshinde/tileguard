# @tileguard/analysis

Comparison and regression analysis engine for TileGuard. Compares vector tile snapshots, identifies structural changes, matches features across versions, and ranks regression candidates by confidence.

> **Package boundary:** Depends only on `@tileguard/core`. Zero browser, DOM, React, or UI dependencies. Consumed by both `@tileguard/cli` and `@tileguard/inspector`.

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

// 1. Create snapshots from raw tile data
const factory = createSnapshotFactory();
const before = factory.create({ layers: rawLayersBefore, diagnostics: [] });
const after = factory.create({ layers: rawLayersAfter, diagnostics: [] });

// 2. Compare the two snapshots
const comparison = createComparisonEngine();
const diff = comparison.compare(before, after);

// 3. Detect regressions
const regression = createRegressionEngine();
const analysis = regression.analyze(diff);

console.log(analysis.summary.totalCandidates); // number of regression candidates
console.log(analysis.candidates[0]?.confidence); // 0.0 – 1.0
```

---

## Architecture

The analysis pipeline flows in one direction:

```
Raw Tile Data ──► SnapshotFactory ──► TileSnapshot
                                              │
                        ┌─────────────────────┘
                        ▼
              ComparisonEngine.compare(A, B)
                        │
                        ▼ TileComparison
              RegressionEngine.analyze(comparison)
                        │
                        ▼ RegressionAnalysis
              (ranked candidates with confidence)
```

### Core Components

| Component | Responsibility |
|:----------|:---------------|
| `SnapshotFactory` | Converts raw layer/feature data into immutable `TileSnapshot` objects with computed statistics |
| `ComparisonEngine` | Compares two snapshots — produces layer diffs, feature matches, geometry diffs, property diffs |
| `FeatureMatcher` | Matches features between snapshots using a 4-priority cascade (ID → stable properties → geometry similarity → property similarity) |
| `GeometryDiffer` | Computes geometry-level differences (bounding box delta, centroid shift, vertex changes) |
| `PropertyDiffer` | Computes property-level differences (added/removed/changed keys with values) |
| `RegressionEngine` | Analyzes a `TileComparison` to rank regression candidates by confidence |
| `ConfidenceScorer` | Produces normalized confidence scores ∈ [0, 1] from weighted evidence signals |
| `EvidenceBuilder` | Builds structured evidence (reasons, classification, recommendations) for each candidate |

---

## API Reference

### Factories

All components use factory functions (no `new`, no classes):

```typescript
createSnapshotFactory(): SnapshotFactory
createComparisonEngine(): ComparisonEngine
createRegressionEngine(options?: RegressionEngineOptions): RegressionEngine
createFeatureMatcher(): FeatureMatcher
createGeometryDiffer(): GeometryDiffer
createPropertyDiffer(): PropertyDiffer
createConfidenceScorer(weights?: ConfidenceWeights): ConfidenceScorer
createEvidenceBuilder(): EvidenceBuilder
```

### Key Types

```typescript
// Snapshots
interface TileSnapshot {
  layers: readonly LayerSnapshot[];
  statistics: TileStatistics;
  diagnostics: readonly Diagnostic[];
}

// Comparison output
interface TileComparison {
  layers: readonly LayerComparison[];
  features: readonly FeatureComparison[];
  statistics: StatisticsDelta;
  summary: ComparisonSummary;
  diagnostics: DiagnosticComparison;
}

// Regression output
interface RegressionAnalysis {
  candidates: readonly RegressionCandidate[];
  summary: RegressionSummary;
}

interface RegressionCandidate {
  feature: FeatureComparison;
  confidence: number; // 0.0 – 1.0
  kind: RegressionKind; // 'geometry' | 'attribute' | 'diagnostic' | 'mixed'
  evidence: RegressionEvidence;
  recommendations: readonly RegressionRecommendation[];
}
```

### Feature Matching Strategy

The `FeatureMatcher` uses a 4-priority greedy cascade:

1. **ID match** — definitive if both features have matching IDs
2. **Stable property match** — known stable identifiers (`osm_id`, `building_id`, `gid`, `fid`, etc.)
3. **Geometry similarity** — bounding box overlap + centroid proximity + type agreement (threshold: 0.7)
4. **Property similarity** — Jaccard index weighted by matching values (threshold: 0.5)

Unmatched features are classified as `added` (in B only) or `removed` (in A only).

### Confidence Scoring

Confidence is computed from weighted evidence signals:

| Signal | Default Weight | Description |
|:-------|:--------------|:------------|
| Geometry changes | 0.35 | Area change, centroid shift, vertex delta |
| Property changes | 0.25 | High-signal property modifications |
| Diagnostic changes | 0.25 | New diagnostics appearing on the feature |
| Feature match quality | 0.15 | How strongly the feature was matched |

Weights are configurable via `ConfidenceWeights`.

---

## Configuration

```typescript
interface RegressionEngineOptions {
  /** Custom confidence weights (default: balanced across all signals) */
  weights?: Partial<ConfidenceWeights>;
  /** Minimum confidence threshold to include a candidate (default: 0.3) */
  minConfidence?: number;
}
```

---

## Testing

```bash
# Run analysis tests
pnpm --filter @tileguard/analysis test

# Watch mode
pnpm --filter @tileguard/analysis test:watch
```

Tests verify:
- Snapshot creation from raw data
- Feature matching across all 4 priority levels
- Comparison engine correctness (layer diffs, feature correspondence)
- Regression engine scoring and ranking
- Parity with inspector's internal analysis logic

---

## Dependencies

| Dependency | Purpose |
|:-----------|:--------|
| `@tileguard/core` | `Diagnostic` type used in snapshots and comparisons |

**Zero external runtime dependencies.**

---

## Related Packages

| Package | Relationship |
|:--------|:-------------|
| `@tileguard/core` | Provides `Diagnostic` type |
| `@tileguard/cli` | Consumer — powers `compare` and `analyze` commands |
| `@tileguard/inspector` | Consumer — powers visual comparison and regression UI |
| `@tileguard/reporters` | Consumer — report engine uses analysis results to generate reports |
