# style/unique-layer-id

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Layer IDs must be unique across the entire `layers` array. Duplicate IDs cause undefined behaviour in MapLibre renderers and SDKs.

## Why it matters

SDK methods like `map.getLayer('buildings')` return the first match. If two layers share the ID `"buildings"`, calling `map.setPaintProperty('buildings', ...)` affects only one — unpredictably. Duplicate IDs also break style diffing, layer ordering, and developer tooling.

## Diagnostic output

```text
✗ style/unique-layer-id
  Layer ID "buildings" is used by multiple layers (first seen at index 3, duplicate at index 12).
  at ./styles/map.json → layers[12].id
  ℹ Rename the duplicate layer to use a unique ID.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/unique-layer-id': 'error',
}
```

## Remediation

- Rename the duplicate layer with a suffix (e.g., `buildings-outline`, `buildings-3d`)
- Check for copy-paste errors in manually authored styles
- If generated programmatically, ensure the ID generator produces unique values
