# style/layers-present

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Style specifications must include a top-level `layers` array. A missing, `null`, or non-array value triggers this rule.

## Why it matters

MapLibre requires a `layers` array listing all render layers in draw order. Without it, nothing can be rendered — the map shows a blank canvas. An empty `layers: []` is valid (results in no rendering); only presence and type are checked.

## Diagnostic output

```text
✗ style/layers-present
  Style must include a "layers" array, but found "undefined".
  at ./styles/map.json → layers
  ℹ Add a top-level "layers" array to your style JSON.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/layers-present': 'error',
}
```

## Remediation

- Add a `"layers"` key at the top level of your style JSON
- Ensure its value is an array (even if empty): `"layers": []`
- Check for typos (`"layer"` vs `"layers"`)
