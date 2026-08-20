# style/valid-json

> Severity: `error` · Since: v0.3.0 · Package: `@tileguard/style-rules`

## What it checks

Style files must contain valid JSON. If parsing fails, this rule reports an error and all other style rules are skipped for that artifact.

## Why it matters

A style file with invalid JSON cannot be loaded by MapLibre at all — the map fails to initialize entirely. This rule acts as a gatekeeper, preventing cascading misleading diagnostics from downstream rules when the fundamental JSON structure is broken.

## Diagnostic output

```text
✗ style/valid-json
  Style JSON is invalid: "Unexpected token } in JSON at position 1247".
  at ./styles/map.json
  ℹ Fix the JSON syntax before running style validation rules.
```

## Configuration

No configuration options. Cannot be meaningfully disabled while keeping other style rules active.

```typescript
rules: {
  'style/valid-json': 'error',
}
```

## Remediation

- Run your style file through a JSON linter (e.g., `jq .` or VS Code's JSON formatter)
- Check for trailing commas, missing quotes, or unescaped characters
- Validate JSON before committing with a pre-commit hook
