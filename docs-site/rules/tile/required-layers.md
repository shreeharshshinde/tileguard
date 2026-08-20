# tile/required-layers

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Required vector tile layers must be present. Reports an error for each layer name in the configured list that is absent from the decoded tile.

## Why it matters

Tile consumers (styles, renderers, downstream processing) expect specific layers to exist. A missing layer silently breaks rendering — buildings disappear, roads vanish, labels are gone. Catching this in CI prevents broken maps from reaching production.

## Diagnostic output

```text
✗ tile/required-layers
  Required layer "buildings" is not present in the tile.
  at ./tile.pbf → layer: buildings
  ℹ Add a "buildings" layer to the tile generation pipeline, or remove it from the required layer list.
```

## Configuration

```typescript
rules: {
  'tile/required-layers': ['error', {
    layers: ['water', 'roads', 'buildings', 'landuse', 'poi'],
  }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `layers` | `string[]` | `[]` | Layer names that must exist in the tile |

::: tip
When `layers` is empty or not provided, this rule is a no-op.
:::

## Remediation

- Verify your tile generation pipeline includes the expected layer
- Check that source data contains features for this layer at the requested zoom level
- If the layer is legitimately optional, remove it from the configured list
