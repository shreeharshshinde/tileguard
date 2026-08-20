# Comparing Tiles

TileGuard can structurally diff two vector tile versions and detect regressions — answering "what changed between v1 and v2?" at the feature level.

## CLI Comparison

```bash
tileguard compare ./baseline.pbf ./updated.pbf
```

**Output:**

```text
Comparison: baseline.pbf ↔ updated.pbf

Layer Summary:
  buildings    +12 added · −3 removed · ~47 modified · 1,204 unchanged
  roads        +0 added  · −0 removed · ~2 modified  · 891 unchanged
  landuse      +400 added · −34 removed · ~40 modified · 2,100 unchanged

Totals: +412 added · −37 removed · ~89 modified · 4,195 unchanged

Top Regressions:
  92% — geometry: Building footprint area reduced by 73% in "buildings"
  85% — attribute: Property "class" changed from "primary" to "tertiary" on 4 road features
  71% — mixed: Feature moved 200+ tile units with property changes
```

## What Gets Compared

The comparison engine matches features between the two tiles and categorizes each as:

| Category | Meaning |
|:---------|:--------|
| **Added** | Feature exists in updated but not baseline |
| **Removed** | Feature exists in baseline but not updated |
| **Modified** | Feature exists in both but geometry or properties changed |
| **Unchanged** | Feature is identical in both |

### Feature Matching

Features are matched by:
1. Layer name (must be the same layer)
2. Feature ID (if available in the tile)
3. Property similarity (fallback when no ID)
4. Geometry proximity (last resort)

### Modification Detection

For modified features, TileGuard reports what changed:
- **Geometry changes** — vertex count, area, centroid position, bounding box
- **Property changes** — added, removed, or modified attributes
- **Mixed** — both geometry and properties changed

## Regression Detection

After comparison, TileGuard can analyze modifications to find **regressions** — changes that are likely bugs rather than intentional updates:

```bash
tileguard compare ./baseline.pbf ./updated.pbf --analyze
```

Each regression candidate includes:
- **Confidence score** (0–100%) — how likely it's a real issue
- **Kind** — geometry, attribute, or mixed
- **Summary** — human-readable description
- **Evidence** — specific measurements backing the finding

### High-Confidence Signals

| Signal | Confidence Boost |
|:-------|:-----------------|
| Large area reduction (>50%) | High |
| Feature moved far from original position | High |
| Property type changed (e.g., string → number) | Medium |
| Many features in same layer changed the same way | Medium |
| Small vertex count change | Low |

## Report Generation

Generate a full engineering report from a comparison:

```bash
tileguard report ./baseline.pbf ./updated.pbf --format markdown
```

Formats available:
- `markdown` — For documentation, pull request descriptions
- `html` — Self-contained page with styled tables
- `json` — Machine-readable for dashboards and automation

See [Generating Reports →](/guides/generating-reports) for details.

## Programmatic API

```typescript
import {
  createComparisonEngine,
  createRegressionEngine,
  createSnapshotFactory,
} from '@tileguard/analysis';

// Create snapshots from decoded tile data
const factory = createSnapshotFactory();
const before = factory.createSnapshot('v1.pbf', layersBefore, diagnosticsBefore);
const after = factory.createSnapshot('v2.pbf', layersAfter, diagnosticsAfter);

// Compare
const comparison = createComparisonEngine().compare(before, after);

console.log(`+${comparison.summary.addedFeatures} added`);
console.log(`−${comparison.summary.removedFeatures} removed`);
console.log(`~${comparison.summary.modifiedFeatures} modified`);

// Detect regressions
const regression = createRegressionEngine().analyze(comparison);

for (const candidate of regression.candidates) {
  console.log(`  ${(candidate.confidence * 100).toFixed(0)}% — ${candidate.kind}: ${candidate.summary}`);
}
```

## Inspector Comparison

The Inspector also supports visual comparison:

1. Open the **Compare** tab in the sidebar
2. Drop or select **Tile A** (baseline) and **Tile B** (updated)
3. Click **Compare**
4. View the difference explorer showing added/removed/modified features
5. Navigate to **Regression** tab for ranked regression candidates
6. Generate a **Report** directly from the UI

## CI Integration

Compare tiles in your pull request workflow:

```yaml
- name: Compare tile versions
  run: |
    git show main:tiles/city.pbf > /tmp/baseline.pbf
    npx @tileguard/cli compare /tmp/baseline.pbf ./tiles/city.pbf
```

## What Next?

- [**Generating Reports →**](/guides/generating-reports) — Produce engineering reports
- [**CI / GitHub Actions →**](/guides/ci-github-actions) — Automated pipelines
- [**Inspecting Findings →**](/guides/inspecting-findings) — Visual debugging
