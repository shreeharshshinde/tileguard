# perf/feature-density

> Severity: `off` (opt-in) · Since: v0.6.0 · Package: `@tileguard/tile-rules`

## What it checks

Fails if any single layer exceeds a configured **feature count** per tile.

## Why it matters

High feature density in a single layer causes two problems:
1. **Style performance** — MapLibre must evaluate style expressions for every feature
2. **Interaction overhead** — hit testing on click/hover becomes slow with thousands
   of features visible simultaneously

## Example output

```text
⚠ perf/feature-density
  Layer "roads" has 8,924 features (limit: 5,000).
  at ./tiles/14/8741/5476.pbf → layer: roads
  ℹ Filter low-importance features at this zoom level, or cluster at lower zooms.
```

## Configuration

```typescript
rules: {
  'perf/feature-density': ['warning', { maxFeaturesPerLayer: 5_000 }],
}
```

| Option | Type | Required | Description |
|:-------|:-----|:---------|:------------|
| `maxFeaturesPerLayer` | `number` | ✅ Yes | Maximum feature count in any single layer |

## Remediation

- **Filter by zoom** — road networks are the usual culprit; show only highways at
  z10–z12, add arterials at z13, local roads at z14+
- **Cluster POIs** at low zoom levels using tippecanoe `--cluster-distance`
- **Drop low-rank features** that are invisible at the target zoom level

## Related rules

- [`perf/vertex-budget`](/rules/perf/vertex-budget) — total vertex budget
- [`tile/feature-count`](/rules/tile/feature-count) — total tile feature count
