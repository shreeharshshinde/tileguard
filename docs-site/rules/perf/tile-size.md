# perf/tile-size

> Severity: `off` (opt-in) · Since: v0.6.0 · Package: `@tileguard/tile-rules`

## What it checks

Fails if the **compressed size** of a vector tile exceeds a configured byte budget.

## Why it matters

Large tiles cause slow load times, especially on mobile networks. A tile over 500 KB
will be noticeable on a 4G connection. A tile over 1 MB almost always indicates an
over-complex data pipeline.

## Example output

```text
✗ perf/tile-size
  Tile size 892 KB exceeds budget of 500 KB.
  at ./tiles/14/8741/5476.pbf
  ℹ Simplify geometry, reduce zoom levels, or split into smaller tiles.
```

## Configuration

```typescript
rules: {
  'perf/tile-size': ['error', { maxBytes: 500_000 }],
}
```

| Option | Type | Required | Description |
|:-------|:-----|:---------|:------------|
| `maxBytes` | `number` | ✅ Yes | Maximum compressed tile size in bytes |

## Suggested thresholds

| Use case | Suggested limit |
|:---------|:----------------|
| Mobile-first (4G) | 250 KB |
| General production | 500 KB |
| Desktop/broadband | 1 MB |

## Remediation

- **Simplify geometry** with tools like `tippecanoe --simplification` or PostGIS `ST_Simplify`
- **Lower feature count** by adjusting zoom-level feature selection
- **Split tiles** into sub-tiles at higher zoom levels
- **Remove unused properties** — large string properties bloat tiles significantly

## Related rules

- [`perf/vertex-budget`](/rules/perf/vertex-budget) — vertex count budget
- [`perf/layer-size`](/rules/perf/layer-size) — per-layer byte budget
