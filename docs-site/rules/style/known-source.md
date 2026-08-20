# style/known-source

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Every layer's `source` reference must point to a key declared in the top-level `sources` object. Layers referencing undeclared sources will silently fail to render.

## Why it matters

This is one of the most common style errors. A typo in the source name (`"compsite"` instead of `"composite"`) means the layer gets no data — it renders as blank with no error in the console. This rule catches the mismatch at validation time, before the map is deployed.

## Diagnostic output

```text
✗ style/known-source
  Layer "buildings-3d" references unknown source "composite".
  at ./styles/map.json → layers[12].source
  ℹ Add "composite" to the top-level "sources" object, or fix the source reference.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/known-source': 'error',
}
```

::: tip
Layers without a `source` property (e.g., `background` layers) are skipped — they don't reference any source.
:::

## Remediation

- Check for typos in the layer's `source` field
- Add the missing source to the top-level `"sources"` object
- If sources are injected at runtime (dynamic configuration), consider disabling this rule for those styles
