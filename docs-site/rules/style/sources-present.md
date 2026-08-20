# style/sources-present

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Style specifications must include a top-level `sources` object. A missing, `null`, or non-object value triggers this rule.

## Why it matters

MapLibre requires a `sources` object mapping source IDs to tile/GeoJSON/image source definitions. Without it, no tile data can be loaded — every layer referencing a source will silently fail to render. An empty `sources: {}` is valid; only presence and type are checked.

## Diagnostic output

```text
✗ style/sources-present
  Style must include a "sources" object, but found "undefined".
  at ./styles/map.json → sources
  ℹ Add a top-level "sources" object to your style JSON.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/sources-present': 'error',
}
```

## Remediation

- Add a `"sources"` key at the top level of your style JSON
- Ensure its value is an object (even if empty): `"sources": {}`
- Check for typos (`"source"` vs `"sources"`)
