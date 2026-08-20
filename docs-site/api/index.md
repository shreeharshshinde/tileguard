# API Reference

TileGuard's public API is distributed across focused packages. Each package has a single responsibility and exports only what consumers need.

## Core Interfaces

**Package:** `@tileguard/core`

The foundation — all other packages depend on these contracts.

| Export | Type | Description |
|:-------|:-----|:------------|
| `createEngine` | Function | Create a validation engine with plugins and config |
| `Diagnostic` | Interface | Structured validation finding |
| `Rule` | Interface | Validation rule contract |
| `RuleContext` | Interface | Context passed to `rule.create()` |
| `Plugin` | Interface | Package of providers + rules |
| `Artifact` | Interface | Decoded, typed source file |
| `Provider` | Interface | File decoder contract |
| `EngineResult` | Interface | Result of `engine.run()` |
| `Severity` | Type | `'error' \| 'warning' \| 'info'` |

```typescript
import { createEngine } from '@tileguard/core';
import type { Diagnostic, Rule, Plugin } from '@tileguard/core';
```

---

## Tile Rules

**Package:** `@tileguard/tile-rules`

| Export | Type | Description |
|:-------|:-----|:------------|
| `tilePlugin` | Plugin | All 12 tile rules + tile provider |
| `tileProvider` | Provider | Decodes `.pbf` → `VectorTileArtifact` |
| `VectorTileArtifact` | Interface | Decoded MVT tile |
| `VectorTileLayer` | Interface | Single layer with features |
| `VectorTileFeature` | Interface | Feature with type, properties, geometry |

```typescript
import { tilePlugin, tileProvider } from '@tileguard/tile-rules';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
```

---

## Style Rules

**Package:** `@tileguard/style-rules`

| Export | Type | Description |
|:-------|:-----|:------------|
| `stylePlugin` | Plugin | All 9 style rules + style provider |
| `styleProvider` | Provider | Parses `.json` → `StyleSpecArtifact` |

```typescript
import { stylePlugin } from '@tileguard/style-rules';
```

---

## Analysis

**Package:** `@tileguard/analysis`

| Export | Type | Description |
|:-------|:-----|:------------|
| `createComparisonEngine` | Function | Create a tile comparison engine |
| `createRegressionEngine` | Function | Create a regression detector |
| `createSnapshotFactory` | Function | Create tile snapshots for comparison |
| `TileComparison` | Interface | Comparison result |
| `RegressionAnalysis` | Interface | Regression detection result |
| `TileSnapshot` | Interface | Snapshot of a tile version |

```typescript
import {
  createComparisonEngine,
  createRegressionEngine,
  createSnapshotFactory,
} from '@tileguard/analysis';
```

---

## Reporters

**Package:** `@tileguard/reporters`

| Export | Type | Description |
|:-------|:-----|:------------|
| `textReporter` | Reporter | Colored terminal output |
| `jsonReporter` | Reporter | Machine-readable JSON |
| `createReportEngine` | Function | Generate Markdown/HTML/JSON reports |

```typescript
import { textReporter, jsonReporter, createReportEngine } from '@tileguard/reporters';
```

---

## Config

**Package:** `@tileguard/config`

| Export | Type | Description |
|:-------|:-----|:------------|
| `loadConfig` | Function | Discover and load `tileguard.config.ts` |
| `TileGuardConfig` | Interface | Configuration schema |

```typescript
import { loadConfig } from '@tileguard/config';
import type { TileGuardConfig } from '@tileguard/config';
```

---

## Common Usage Pattern

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
    'style/known-source': 'error',
  },
});

const result = await engine.run(['./tiles/', './styles/']);

if (!result.summary.pass) {
  console.error(`${result.summary.errors} errors, ${result.summary.warnings} warnings`);
  for (const d of result.diagnostics) {
    console.error(`  ${d.ruleId}: ${d.message}`);
  }
  process.exit(1);
}
```

## What Next?

- [**Rule Engine ›**](/architecture/rule-engine) — How rules are structured internally
- [**Decoder & Diagnostics ›**](/architecture/decoder-diagnostics) — Artifact and Diagnostic models in detail
- [**Writing Rules ›**](/rules/#writing-custom-rules) — Create your own rules
