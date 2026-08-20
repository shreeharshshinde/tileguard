# tile/required-properties

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/tile-rules`

## What it checks

Every feature in a configured layer must include all required property keys. Missing properties indicate incomplete data pipelines or schema drift.

## Why it matters

Styles and application logic depend on specific attributes existing — `class` for road styling, `height` for building extrusion, `name` for labels. A missing property causes silent rendering failures or blank labels rather than a visible error.

## Diagnostic output

```text
✗ tile/required-properties
  Feature 12 in layer "roads" is missing required property "class".
  at ./tile.pbf → layer: roads, feature: 12
  ℹ Add property "class" to every feature in layer "roads", or remove it from the required property list.
```

## Configuration

```typescript
rules: {
  'tile/required-properties': ['error', {
    layers: {
      roads: ['class', 'name'],
      buildings: ['height', 'type'],
      poi: ['name', 'category'],
    },
  }],
}
```

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `layers` | `Record<string, string[]>` | `{}` | Map of layer name → required property keys |

::: tip
Only presence is checked — `null` and `""` are considered present. Values are not validated.
:::

## Remediation

- Check that source data includes the expected attributes
- Verify that tile generation isn't stripping properties during simplification
- If a property is legitimately optional, remove it from the configured list
