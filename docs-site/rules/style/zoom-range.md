# style/zoom-range

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

A layer's `minzoom` must not be greater than its `maxzoom`. An inverted zoom range causes the layer to render at no zoom levels — it's invisible at every zoom.

## Why it matters

Setting `minzoom: 16` and `maxzoom: 14` means "show this layer between zoom 16 and 14" — which is an empty range. The layer will never be visible. This is almost always a mistake (swapped values) rather than intentional behavior, but produces no runtime error.

## Diagnostic output

```text
✗ style/zoom-range
  Layer "labels-small" has minzoom (16) greater than maxzoom (14).
  at ./styles/map.json → layers[8].minzoom
  ℹ Swap the minzoom and maxzoom values, or remove one of them.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/zoom-range': 'error',
}
```

::: tip
Equal values (`minzoom: 14, maxzoom: 14`) are valid — the layer renders at exactly zoom 14. Layers with only one value or neither are skipped.
:::

## Remediation

- Swap the `minzoom` and `maxzoom` values
- Remove one of the values if only a minimum or maximum is needed
- Check for accidental edits in style authoring tools
