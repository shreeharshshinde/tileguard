# style/version

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Style specifications must declare MapLibre style version `8`. Any other value — including absent, `null`, or the string `"8"` — triggers an error.

## Why it matters

MapLibre GL JS and compatible renderers only support version 8 of the style specification. A style with any other version number will not render correctly or will be rejected entirely. The check is strict: the value must be the integer `8`, not the string `"8"`.

## Diagnostic output

```text
✗ style/version
  Style version must be 8, but found "7".
  at ./styles/map.json → version
  ℹ Set "version": 8 at the top level of your style JSON.
```

## Configuration

No configuration options.

```typescript
rules: {
  'style/version': 'error',
}
```

## Remediation

- Set `"version": 8` at the top level of your style JSON
- Ensure it's a numeric `8`, not the string `"8"`
- If migrating from an older style spec, update the style to version 8 format
