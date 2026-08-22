# Validating MapLibre Styles

TileGuard validates MapLibre Style Specification JSON files with 9 dedicated rules, catching configuration errors before they reach production rendering.

## Basic Usage

```bash
# Validate a single style
tileguard check ./style.json

# Validate multiple styles
tileguard check ./styles/

# Mix tiles and styles
tileguard check ./tiles/ ./styles/
```

TileGuard auto-detects `.json` files as style specs and applies the 9 style rules.

## What Gets Checked

| Rule | What it catches | Impact if missed |
|:-----|:----------------|:-----------------|
| `style/valid-json` | File is not parseable JSON | Map fails to load entirely |
| `style/version` | Missing or wrong `version` field | MapLibre rejects the style |
| `style/sources-present` | No `sources` object | No data loaded |
| `style/layers-present` | No `layers` array | Nothing rendered |
| `style/layer-id-required` | Layer missing `id` | MapLibre throws at runtime |
| `style/unique-layer-id` | Duplicate layer IDs | Unpredictable layer overwrite |
| `style/known-source` | Layer references undeclared source | Layer renders blank |
| `style/zoom-range` | `minzoom` > `maxzoom` | Layer never visible |
| `style/no-deprecated-ref` | Uses deprecated `ref` property | Will break in future MapLibre |

## Example Output

```bash
tileguard check ./styles/map.json
```

```text
✗ style/known-source
  Layer "buildings-3d" references unknown source "composite".
  at ./styles/map.json → layers[12].source
  ℹ Declare the source in the top-level "sources" object, or correct the layer's "source" field.

⚠ style/zoom-range
  Layer "labels-small" has minzoom (16) greater than maxzoom (14).
  at ./styles/map.json → layers[8]
  ℹ Swap the values or set maxzoom ≥ minzoom.

⚠ style/no-deprecated-ref
  Layer "roads-ref" uses the deprecated "ref" property.
  at ./styles/map.json → layers[5].ref
  ℹ Inline the referenced layer's properties directly. "ref" is removed in modern MapLibre.

──────────────────────────────────
  1 error, 2 warnings in 1 file (12ms)
```

## Configuration

### Enable Only Style Rules

If you only want to lint styles (no tile validation):

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [stylePlugin],  // Only style rules
  rules: {
    'style/known-source': 'error',
    'style/zoom-range': 'error',
    'style/no-deprecated-ref': 'warning',
  },
};

export default config;
```

### Customize Severities

```typescript
rules: {
  // Strict: catch everything
  'style/valid-json': 'error',
  'style/version': 'error',
  'style/known-source': 'error',
  'style/unique-layer-id': 'error',
  'style/zoom-range': 'error',

  // Lenient on deprecated patterns during migration
  'style/no-deprecated-ref': 'warning',
}
```

## Common Issues

### "Unknown source" false positives

If your build system dynamically generates source definitions:

```typescript
// If "composite" is injected at runtime
rules: {
  'style/known-source': 'off',
}
```

### Multiple style files

Validate all styles in a directory:

```bash
tileguard check ./styles/**/*.json --reporter json
```

## Programmatic API

```typescript
import { createEngine } from '@tileguard/core';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [stylePlugin],
});

const result = await engine.run(['./styles/map.json']);

for (const d of result.diagnostics) {
  console.log(`${d.severity}: ${d.ruleId} — ${d.message}`);
}
```

## Style + Tile Together

TileGuard validates both in a single pass. Sources declared in your style should match the layers produced by your tiles:

```bash
# Validate tile content AND style references together
tileguard check ./tiles/city.pbf ./styles/map.json
```

If your style references a source that provides a `buildings` layer, and your tile is missing that layer, you'll get:
- `style/known-source` passes (source is declared)
- `tile/required-layers` fails (if configured to require `buildings`)

This gives you end-to-end validation of the tile + style contract.

## What Next?

- [**Validating Tiles ›**](/guides/validating-tiles)
Tile-specific validation
- [**CI / GitHub Actions ›**](/guides/ci-github-actions)
Automate in your pipeline
- [**Rules Reference ›**](/rules/)
All 21 rules
