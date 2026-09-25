# perf/layer-size

> Severity: `off` (opt-in) · Since: v0.6.0 · Package: `@tileguard/tile-rules`

## What it checks

Fails if any individual layer's **uncompressed byte size** exceeds a configured
budget.

## Why it matters

While `perf/tile-size` catches the overall tile weight, `perf/layer-size` catches
the case where a single layer is disproportionately large — often because a few
features carry enormous property payloads (GeoJSON attributes that should have been
dropped before tile generation).

## Example output

```text
⚠ perf/layer-size
  Layer "landuse" is 312 KB (limit: 100 KB).
  at ./tiles/14/8741/5476.pbf → layer: landuse
  ℹ Remove unused properties from features in this layer before generating tiles.
```

## Configuration

```typescript
rules: {
  'perf/layer-size': ['warning', { maxLayerBytes: 100_000 }],
}
```

| Option | Type | Required | Description |
|:-------|:-----|:---------|:------------|
| `maxLayerBytes` | `number` | ✅ Yes | Maximum uncompressed layer size in bytes |

## Remediation

- **Drop unused properties** — the most common cause. A layer with 100 features but
  50 string properties per feature can easily exceed 100 KB
- **Trim long strings** — if you need property values, truncate long text fields
- **Check your tippecanoe config** for `--include` / `--exclude` to control which
  attributes reach the tile

## Related rules

- [`perf/tile-size`](/rules/perf/tile-size) — total tile byte budget
- [`perf/vertex-budget`](/rules/perf/vertex-budget) — vertex count budget
