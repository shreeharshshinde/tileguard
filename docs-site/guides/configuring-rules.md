# Configuring Rules

TileGuard works with zero configuration — all recommended rules run at their default severities. But every team has different needs. This guide shows you every way to customize rule behavior.

## Configuration File

Run `tileguard init` to scaffold a config file, or create `tileguard.config.ts` manually:

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    // Your rule overrides go here
  },
  reporter: 'text',
};

export default config;
```

TileGuard discovers config files automatically by walking up from the current directory. Supported filenames:

- `tileguard.config.ts`
- `tileguard.config.mjs`
- `tileguard.config.js`

## Rule Severity Levels

Every rule has a severity that controls how it's reported and whether it fails CI:

| Severity | Meaning | Exit code |
|:---------|:--------|:----------|
| `'error'` | Must fix. Fails the quality gate. | `1` |
| `'warning'` | Should fix. Reported but passes. | `0` |
| `'info'` | Informational. No action required. | `0` |
| `'off'` | Disabled completely. Not evaluated. | — |

## Setting Severities

### Simple severity (no options)

```typescript
rules: {
  'tile/self-intersection': 'error',
  'tile/no-empty': 'warning',
  'tile/feature-count': 'off',       // disable entirely
}
```

### With rule options (tuple syntax)

Some rules accept configuration. Pass a `[severity, options]` tuple:

```typescript
rules: {
  'tile/required-layers': ['error', {
    layers: ['water', 'roads', 'buildings', 'landuse'],
  }],
  'tile/feature-count': ['warning', {
    max: 50000,
  }],
  'tile/layer-feature-count': ['warning', {
    max: 10000,
    exclude: ['poi'],  // don't check the POI layer
  }],
}
```

## Rule Options Reference

### tile/required-layers

```typescript
['error', { layers: string[] }]
```

Specify which layers must exist in every tile. Tiles missing any listed layer produce a diagnostic.

### tile/feature-count

```typescript
['warning', { min?: number; max?: number }]
```

Set bounds on total feature count. Useful for catching oversized tiles that degrade rendering performance.

### tile/layer-feature-count

```typescript
['warning', { min?: number; max?: number; exclude?: string[] }]
```

Per-layer feature count bounds. Use `exclude` to skip high-cardinality layers.

### tile/required-properties

```typescript
['error', { properties: Record<string, string[]> }]
```

Require that features in specific layers have declared properties:

```typescript
'tile/required-properties': ['error', {
  properties: {
    roads: ['class', 'name'],
    buildings: ['height', 'type'],
  },
}],
```

### tile/coordinate-range

```typescript
['error', { buffer?: number; excludeLayers?: string[] }]
```

- `buffer`: Allow coordinates to exceed extent by this many units (default: auto-detected).
- `excludeLayers`: Skip specific layers from coordinate validation.

## Common Configuration Patterns

### Strict mode (CI quality gate)

Fail on any geometry issue. Good for production pipelines:

```typescript
rules: {
  'tile/self-intersection': 'error',
  'tile/unclosed-ring': 'error',
  'tile/winding-order': 'error',
  'tile/hole-containment': 'error',
  'tile/zero-area-ring': 'error',
  'tile/degenerate-geometry': 'error',
  'tile/coordinate-range': 'error',
  'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
  'tile/no-empty': 'error',
  'style/known-source': 'error',
  'style/zoom-range': 'error',
}
```

### Relaxed mode (early development)

Warn on everything, block on nothing:

```typescript
rules: {
  'tile/self-intersection': 'warning',
  'tile/unclosed-ring': 'warning',
  'tile/winding-order': 'warning',
  'tile/hole-containment': 'warning',
  'tile/no-empty': 'off',
  'tile/feature-count': 'off',
}
```

### Style-only (MapLibre teams)

Only lint style specs, skip tile validation:

```typescript
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [stylePlugin],  // no tilePlugin
  rules: {
    'style/valid-json': 'error',
    'style/known-source': 'error',
    'style/unique-layer-id': 'error',
    'style/zoom-range': 'error',
    'style/no-deprecated-ref': 'warning',
  },
};
```

### Tile-only (data pipeline teams)

Only validate geometry, skip style linting:

```typescript
import { tilePlugin } from '@tileguard/tile-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin],  // no stylePlugin
  rules: {
    'tile/self-intersection': 'error',
    'tile/winding-order': 'error',
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
  },
};
```

### Per-environment configs

Use environment variables or separate config files:

```typescript
const isCI = process.env.CI === 'true';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/no-empty': isCI ? 'error' : 'warning',
    'tile/feature-count': isCI ? ['error', { max: 50000 }] : 'off',
  },
};
```

## Overriding via CLI

The `--config` flag lets you point to a specific config file:

```bash
# Use a stricter config for CI
tileguard check ./tiles/ --config ./tileguard.ci.config.ts

# Use relaxed config locally
tileguard check ./tiles/ --config ./tileguard.dev.config.ts
```

## Viewing Active Rules

See which rules are loaded and their default severities:

```bash
tileguard rules list
```

Get detailed explanation of any rule:

```bash
tileguard rules explain tile/self-intersection
```

## Disabling Rules for Specific Files

TileGuard doesn't support inline disable comments (tiles are binary). Instead, use multiple config files or exclude paths via glob patterns:

```bash
# Check only production tiles
tileguard check ./tiles/production/

# Skip test fixtures
tileguard check ./tiles/ --config ./tileguard.config.ts
```

## What Next?

- [Validating Tiles](/guides/validating-tiles) — Full guide on tile checks
- [MapLibre Styles](/guides/maplibre-styles) — Style linting in depth
- [CI / GitHub Actions](/guides/ci-github-actions) — Automate quality gates
- [Rules Reference](/rules/) — Every rule explained
