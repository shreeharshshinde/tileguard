# tile/layer-feature-count

> Severity: `warning` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Each named vector tile layer must satisfy independently configured minimum and maximum feature count bounds.

## Why it matters

Unlike `tile/feature-count` which checks the total, this rule enforces per-layer budgets. A `buildings` layer with 80,000 features might be acceptable in total but indicates a performance problem for that specific layer's rendering path.

## Diagnostic output

```text
⚠ tile/layer-feature-count
  Layer "buildings" has 80432 features, expected at most 50000.
  at ./tile.pbf → layer: buildings
  ℹ Simplify or filter the layer, or raise its configured maximum.
```

## Configuration

```typescript
rules: {
  'tile/layer-feature-count': ['warning', {
    layers: {
      buildings: { max: 50000 },
      roads: { min: 10, max: 30000 },
      poi: { max: 5000 },
    },
  }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `layers` | `Record<string, { min?, max? }>` | `{}` | Per-layer bounds |

Layers not listed in the config are not checked. Layers listed but absent from the tile are skipped.

## Remediation

- Apply layer-specific simplification at tile generation time
- Filter features by importance or zoom-level relevance
- Split dense layers into sub-layers by category

## Related rules

- [`tile/feature-count`](/rules/tile/feature-count) — Total feature count bounds
