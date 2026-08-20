# tile/feature-count

> Severity: `warning` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

The total number of features across all layers must satisfy configured minimum and maximum bounds.

## Why it matters

Oversized tiles cause slow network transfers, high memory usage, and dropped frames during rendering. Undersized tiles may indicate broken generation pipelines. Setting budgets prevents performance degradation and catches pipeline failures early.

## Diagnostic output

```text
⚠ tile/feature-count
  Tile has 52431 features total, expected at most 50000.
  at ./tile.pbf
  ℹ Simplify, filter, or split the tile data, or raise the configured maximum.
```

```text
⚠ tile/feature-count
  Tile has 0 features total, expected at least 10.
  at ./tile.pbf
  ℹ Adjust tile generation filters or lower the configured minimum.
```

## Configuration

```typescript
rules: {
  'tile/feature-count': ['warning', { min: 1, max: 100000 }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `min` | `number` | — | Minimum total features required |
| `max` | `number` | — | Maximum total features allowed |

::: tip
When neither `min` nor `max` is configured, this rule is a no-op.
:::

## Remediation

- **Too many features**: Increase zoom-level-based simplification, apply stricter filters, or split data across more tiles
- **Too few features**: Check pipeline filters, verify source data coverage, or lower the minimum threshold

## Related rules

- [`tile/layer-feature-count`](/rules/tile/layer-feature-count) — Per-layer count bounds
- [`tile/no-empty`](/rules/tile/no-empty) — Zero-feature detection
