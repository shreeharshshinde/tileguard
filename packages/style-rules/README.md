# @tileguard/style-rules

**MapLibre style specification validation rules for TileGuard.**

[![npm](https://img.shields.io/npm/v/@tileguard/style-rules)](https://www.npmjs.com/package/@tileguard/style-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

9 configurable rules that validate MapLibre/Mapbox GL style specifications. Catches dangling source references, duplicate layer IDs, invalid zoom ranges, and structural issues before they silently break your map rendering.

---

## Installation

```bash
npm install @tileguard/style-rules @tileguard/core
```

> Or use the CLI directly: `npx @tileguard/cli check ./style.json`

---

## Quick Start

```typescript
import { createEngine } from '@tileguard/core';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [stylePlugin],
  rules: {
    'style/known-source': 'error',
    'style/zoom-range': 'error',
  },
});

const result = await engine.run(['./map-style.json']);

console.log(result.summary.pass ? '✓ PASS' : '✗ FAIL');
for (const d of result.diagnostics) {
  console.log(`  ${d.severity} ${d.ruleId}: ${d.message}`);
  if (d.location?.jsonPath) console.log(`    at ${d.location.jsonPath}`);
}
```

**Output:**

```
✗ FAIL
  error style/known-source: Layer "buildings-3d" references unknown source "composite".
    at layers[12].source
  error style/zoom-range: Layer "roads-label" has minzoom "16" greater than maxzoom "14".
    at layers[8].minzoom
  error style/unique-layer-id: Duplicate layer ID "water-fill" at index "15" (first seen at index "3").
    at layers[15].id
```

---

## Rules

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| `style/valid-json` | error | Style file is not valid JSON |
| `style/version` | error | Version must be `8` |
| `style/sources-present` | error | Missing top-level `sources` object |
| `style/layers-present` | error | Missing top-level `layers` array |
| `style/layer-id-required` | error | Layers without an `id` field |
| `style/unique-layer-id` | error | Duplicate layer IDs |
| `style/known-source` | error | Layers referencing undeclared sources |
| `style/zoom-range` | error | `minzoom` greater than `maxzoom` |
| `style/no-deprecated-ref` | warning | Usage of deprecated `ref` property |

All rules are enabled by default. Override any rule:

```typescript
rules: {
  'style/no-deprecated-ref': 'off',   // disable
  'style/zoom-range': 'warning',       // demote to warning
}
```

---

## Style Analysis Engine

Beyond rule-based validation, this package includes a full style analysis pipeline for advanced tooling:

```typescript
import { parseStyle, analyzeStyle, getStatistics } from '@tileguard/style-rules';

const doc = parseStyle(styleJson);
const analysis = analyzeStyle(doc);
const stats = getStatistics(analysis);

console.log(`${stats.layerCount} layers, ${stats.sourceCount} sources`);
```

Includes: expression parser, layer resolver, style validator, and statistics extraction.

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) | CLI — `npx tileguard check ./style.json` |
| [`@tileguard/core`](https://www.npmjs.com/package/@tileguard/core) | Framework contracts |
| [`@tileguard/tile-rules`](https://www.npmjs.com/package/@tileguard/tile-rules) | Vector tile validation rules |
| **@tileguard/style-rules** | MapLibre style lint rules (this package) |
| [`@tileguard/reporters`](https://www.npmjs.com/package/@tileguard/reporters) | Text, JSON, Markdown, HTML reports |
| [`@tileguard/analysis`](https://www.npmjs.com/package/@tileguard/analysis) | Tile comparison + regression detection |

---

## Documentation

- [Rule Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/rules/style) — Per-rule docs with examples
- [API Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/api) — Generated TypeDoc
- [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/) — The specification this package validates
- [Repository](https://github.com/shindeshreeharsh/tileguard)

---

## License

[MIT](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shindeshreeharsh)
