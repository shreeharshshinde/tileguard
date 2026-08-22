# @tileguard/cli

**The command-line interface for TileGuard — automated quality gates for geospatial software.**

[![npm](https://img.shields.io/npm/v/@tileguard/cli)](https://www.npmjs.com/package/@tileguard/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Validate vector tiles and MapLibre styles from your terminal or CI pipeline. 19 built-in rules, zero-config defaults, JSON output for automation.

---

## Installation

```bash
# Run without installing
npx @tileguard/cli check ./tile.pbf

# Or install globally
npm install -g @tileguard/cli

# Or as a dev dependency
npm install -D @tileguard/cli
```

---

## Usage

```bash
# Validate a vector tile
tileguard check ./tile.pbf

# Lint a MapLibre style
tileguard check ./style.json

# Validate everything in a directory
tileguard check ./tiles/ ./styles/

# JSON output for CI
tileguard check ./tiles/ --reporter json

# Compare two tile versions
tileguard compare ./v1.pbf ./v2.pbf

# Generate an engineering report
tileguard report ./v1.pbf ./v2.pbf --format markdown

# View all available rules
tileguard rules list

# Scaffold a config file
tileguard init
```

**Output:**

```
✗ tile/required-layers
  Required layer "buildings" is not present in the tile.
  at ./tiles/14/8741/5476.pbf → layer: buildings
  ℹ Add a "buildings" layer to your tile generation pipeline.

⚠ tile/feature-count
  Tile has "52431" features total, expected at most "50000".
  at ./tiles/14/8741/5476.pbf

✗ style/known-source
  Layer "buildings-3d" references unknown source "composite".
  at ./styles/map.json → layers[12].source

──────────────────────────────────
  2 errors, 1 warning in 3 files (142ms)
```

---

## CI Integration

```yaml
# .github/workflows/tile-quality.yml
name: Tile Quality
on: [pull_request]
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx @tileguard/cli check ./tiles/ ./styles/ --reporter json
```

Exit codes: `0` = pass, `1` = validation errors found, `2` = usage error.

---

## Configuration

Create `tileguard.config.ts` (or run `tileguard init`):

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/self-intersection': 'warning',
    'style/known-source': 'error',
  },
};

export default config;
```

Without a config file, all 19 recommended rules run at default severities.

---

## Commands

| Command | Description |
|:--------|:------------|
| `check <sources...>` | Validate tiles and styles against configured rules |
| `compare <a> <b>` | Compare two tile versions, show feature-level diff |
| `analyze <a> <b>` | Regression analysis with confidence scores |
| `report <a> <b>` | Generate Markdown/HTML/JSON engineering report |
| `stats <source>` | Show tile statistics (layers, features, geometry) |
| `rules list` | List all available rules with severity |
| `init` | Scaffold a starter config file |
| `doctor` | Check environment and config health |
| `version` | Print version |

---

## Programmatic API

Every command is also exported as a pure function — no `process.exit()`, safe for tests and embedding:

```typescript
import { runCheck } from '@tileguard/cli';

const result = await runCheck(['./tiles/'], { reporter: 'json' });
console.log(result.exitCode); // 0 | 1 | 2
```

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| **@tileguard/cli** | Command-line interface (this package) |
| [`@tileguard/core`](https://www.npmjs.com/package/@tileguard/core) | Framework contracts |
| [`@tileguard/tile-rules`](https://www.npmjs.com/package/@tileguard/tile-rules) | 10 vector tile validation rules |
| [`@tileguard/style-rules`](https://www.npmjs.com/package/@tileguard/style-rules) | 9 MapLibre style lint rules |
| [`@tileguard/config`](https://www.npmjs.com/package/@tileguard/config) | Config file discovery + validation |
| [`@tileguard/reporters`](https://www.npmjs.com/package/@tileguard/reporters) | Text, JSON reporters + report engine |
| [`@tileguard/analysis`](https://www.npmjs.com/package/@tileguard/analysis) | Tile comparison + regression detection |

---

## Documentation

- [Rule Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/rules) — All 19 rules documented
- [API Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/api) — Generated TypeDoc
- [Repository](https://github.com/shindeshreeharsh/tileguard)

---

## License

[MIT](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shindeshreeharsh)
