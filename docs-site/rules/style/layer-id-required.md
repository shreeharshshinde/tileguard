# style/layer-id-required

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Every layer entry in the `layers` array must declare an `id` string field. Layers without an `id` cannot be referenced by other layers, the SDK, or programmatic APIs.

## Why it matters

Layer IDs are the primary identifier for MapLibre's runtime API — `map.getLayer()`, `map.setFilter()`, `map.setPaintProperty()` all use the layer ID. A layer without an ID is unreachable at runtime and may cause the style to fail to load entirely.

## Diagnostic output

```text
✗ style/layer-id-required
  Layer at index 5 is missing a required "id" field.
  at ./styles/map.json → layers[5]
  ℹ Add an "id" string field to every layer entry.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/layer-id-required': 'error',
}
```

## Remediation

- Add a unique `"id"` string to every layer in the `layers` array
- Check for layers that were added programmatically without an ID
- Non-string values (including `null` or numeric) are also flagged — ensure the ID is a string
