# tile/no-empty

> Severity: `warning` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Vector tiles should contain at least one feature. An empty tile may indicate a broken pipeline or misaligned tile request.

## Why it matters

In most tilesets, every generated tile should contain at least some geometry. An empty tile at a zoom level/location where data is expected suggests a pipeline failure — broken filters, incorrect bounds, or a crashed generation job. Catching this prevents serving blank maps.

## Diagnostic output

```text
⚠ tile/no-empty
  Tile contains 0 features.
  at ./tile.pbf
  ℹ Confirm this is an intentional empty tile, or fix the tile generation filters.
```

## Configuration

```typescript
rules: {
  'tile/no-empty': ['warning', { allowEmpty: false }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `allowEmpty` | `boolean` | `false` | Set to `true` to suppress the diagnostic |

::: tip
For sparse datasets (e.g., ocean tiles, polar regions), some tiles are legitimately empty. Set `allowEmpty: true` or disable the rule entirely with `'off'`.
:::

## Remediation

- Check tile generation pipeline filters for the affected zoom level
- Verify source data coverage at the tile's geographic extent
- If empty tiles are expected for sparse datasets, set `allowEmpty: true`

## Related rules

- [`tile/feature-count`](/rules/tile/feature-count)
Configurable min/max total feature count
