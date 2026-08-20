# style/no-deprecated-ref

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Layers must not use the deprecated `ref` property. The `ref` mechanism was removed from the MapLibre style specification and is no longer honored by renderers.

## Why it matters

In an earlier spec version, layers could inherit properties from another layer using `"ref": "<other-layer-id>"`. This was removed — layers using `ref` are now silently ignored or cause rendering errors in modern MapLibre. Any style still using `ref` will break when upgrading MapLibre GL JS.

## Diagnostic output

```text
✗ style/no-deprecated-ref
  Layer "roads-ref" uses the deprecated "ref" property.
  at ./styles/map.json → layers[5].ref
  ℹ Inline the properties from the referenced layer into this layer directly, and remove the "ref" field.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/no-deprecated-ref': 'error',  // or 'warning' during migration
}
```

::: tip
During a migration from an older style spec, you may want to set this to `'warning'` while you inline the referenced properties across your style.
:::

## Remediation

- Copy all properties from the referenced layer into this layer
- Remove the `"ref"` field
- Use style authoring tools that support modern spec (Maputnik, MapLibre Studio)
- If many layers use `ref`, write a script to inline properties automatically
