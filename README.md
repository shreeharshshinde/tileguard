# TileGuard 🛡️

**Automated quality gates for geospatial software.**

TileGuard is a rule-based validation framework for vector tiles and MapLibre style specifications — the same engineering discipline ESLint brings to JavaScript, applied to the geospatial stack.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/shreeharshshinde/tileguard/actions/workflows/tile-quality.yml/badge.svg)](https://github.com/shreeharshshinde/tileguard/actions/workflows/tile-quality.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![FOSS4G 2026](https://img.shields.io/badge/FOSS4G%202026-Hiroshima-red)](https://2026.foss4g.org)

---

## Features

- **25 built-in rules** — 12 tile validation + 4 performance + 9 style lint rules, all configurable
- **Visual Inspector** — browser-based debugging environment with canvas geometry rendering, diagnostic overlays, and investigation workflows
- **Plugin architecture** — write custom rules in ~25 lines of TypeScript
- **Zero-config defaults** — works out of the box, customize when you need to
- **CI-native** — exit codes, JSON output, GitHub Actions ready
- **Structured diagnostics** — every finding has a rule ID, severity, location, and suggestion
- **Comparison & regression detection** — diff tiles across versions, rank regressions by confidence
- **Report generation** — Markdown, HTML, and JSON engineering reports
- **Convention-aware geometry validation** — auto-detects MVT (CW) vs OGC/GeoJSON (CCW) winding conventions
- **12 CLI commands** — `check`, `init`, `compare`, `analyze`, `report`, `stats`, `doctor`, `style`, `rules`, `profile`, `hook`, `version`
- **Modular** — install only what you need (tile rules, style rules, or both)

---

## Quick Start

```bash
# Validate a vector tile
npx @tileguard/cli check ./tile.pbf

# Lint a MapLibre style
npx @tileguard/cli check ./style.json

# Multiple sources, JSON output for CI
npx @tileguard/cli check ./tiles/ ./styles/ --reporter json

# SARIF output for GitHub Code Scanning
npx @tileguard/cli check ./tiles/ --reporter sarif

# Profile a tile: size, vertex cost, per-layer breakdown
npx @tileguard/cli profile ./tile.pbf

# Install pre-commit hook (auto-check staged .pbf files)
npx @tileguard/cli hook install

# Compare two tile versions
npx @tileguard/cli compare ./v1.pbf ./v2.pbf

# Generate an engineering report
npx @tileguard/cli report ./v1.pbf ./v2.pbf --format markdown

# Scaffold a config file
npx @tileguard/cli init
```

---

## Configuration

Create `tileguard.config.ts` at your project root (or run `tileguard init`):

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/self-intersection': 'warning',
    'tile/winding-order': 'error',
    'tile/no-empty': 'off',
    'style/known-source': 'error',
  },
  reporter: 'text',
};

export default config;
```

Without a config file, all recommended rules run at their default severities.

---

## Rules

### Tile Validation (`@tileguard/tile-rules`)

| Rule | What it catches |
|:-----|:----------------|
| `tile/required-layers` | Missing expected layers |
| `tile/required-properties` | Features missing declared properties |
| `tile/coordinate-range` | Coordinates outside valid tile extent |
| `tile/feature-count` | Total feature count outside configured bounds |
| `tile/layer-feature-count` | Per-layer feature count outside configured bounds |
| `tile/unclosed-ring` | Polygon rings not closed (first ≠ last vertex) |
| `tile/zero-area-ring` | Degenerate polygons with zero/near-zero area |
| `tile/winding-order` | Incorrect ring winding order (convention-aware: MVT & OGC) |
| `tile/hole-containment` | Hole rings outside the outer ring (multi-polygon aware) |
| `tile/self-intersection` | Geometry that crosses itself |
| `tile/degenerate-geometry` | Lines/polygons with insufficient vertices |
| `tile/no-empty` | Tiles with zero features |

### Performance Rules (`@tileguard/tile-rules` · v0.6.0)

All performance rules are opt-in — configure thresholds explicitly to fit your tile pipeline.

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| `perf/tile-size` | warning | Raw and/or gzip-compressed tile byte size exceeds budget |
| `perf/vertex-budget` | warning | Per-feature or tile-level vertex count exceeds limit |
| `perf/feature-density` | warning | Per-layer feature count exceeds configured maximum |
| `perf/layer-size` | info | Single layer dominates the tile's vertex budget |

### Style Linting (`@tileguard/style-rules`)

| Rule | What it catches |
|:-----|:----------------|
| `style/valid-json` | Style file is not valid JSON |
| `style/version` | Version must be `8` |
| `style/sources-present` | Missing top-level `sources` object |
| `style/layers-present` | Missing top-level `layers` array |
| `style/layer-id-required` | Layers without an `id` field |
| `style/unique-layer-id` | Duplicate layer IDs |
| `style/known-source` | Layers referencing undeclared sources |
| `style/zoom-range` | `minzoom` greater than `maxzoom` |
| `style/no-deprecated-ref` | Usage of deprecated `ref` property |

---

## CI Integration

```yaml
# .github/workflows/tile-quality.yml
name: Tile Quality
on:
  pull_request:
    branches: [main]
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx @tileguard/cli check ./tiles/ ./styles/ --reporter json
      # Optional: surface findings inline on the PR diff
      - run: npx @tileguard/cli check ./tiles/ --reporter sarif
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: tileguard-results.sarif }
```

---

## Programmatic API

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: { 'tile/required-layers': ['error', { layers: ['water', 'roads'] }] },
});

const result = await engine.run(['./tile.pbf', './style.json']);
console.log(result.summary.pass);       // true | false
console.log(result.diagnostics.length); // number of findings
```

---

## How It Works

<img width="1448" height="1086" alt="TileGuard Pipeline" src="https://github.com/user-attachments/assets/33770335-1602-4ce5-9273-1ff0cc184871" />

**Artifacts** (tiles, styles) → **Providers** (load & decode) → **Rules** (validate one concern each) → **Diagnostics** (structured results) → **Reporters** (present output)

Rules never print. Reporters never validate. Adding a rule never touches formatting. Adding a reporter never touches validation.

---

## Packages

<img width="1448" height="1086" alt="TileGuard Architecture" src="https://github.com/user-attachments/assets/31fa61fc-14cc-4a43-af21-30b8a5e4eae3" />

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/core`](packages/core) | Framework contracts — Diagnostic, Artifact, Rule, Plugin, Reporter, Engine |
| [`@tileguard/shared`](packages/shared) | Cross-package utilities |
| [`@tileguard/tile-rules`](packages/tile-rules) | MVT provider + 12 tile validation rules + 4 performance rules |
| [`@tileguard/style-rules`](packages/style-rules) | Style provider + 9 lint rules + parser/resolver/validator |
| [`@tileguard/config`](packages/config) | Config file discovery, loading, and schema validation |
| [`@tileguard/reporters`](packages/reporters) | Text, JSON & SARIF reporters + report engine (Markdown, HTML, JSON) |
| [`@tileguard/analysis`](packages/analysis) | Comparison and regression analysis engine |
| [`@tileguard/cli`](packages/cli) | CLI with 12 commands |
| [`@tileguard/inspector`](packages/inspector) | Visual debugging environment — canvas rendering, diagnostic overlays, investigation workflows |

Dependencies flow strictly inward. Core has zero runtime dependencies. Domain packages depend only on Core. Install only what you need.

---

## Writing a Rule

A rule is a plain object — no base classes, no decorators:

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'tile/my-check',
  meta: { description: 'Validates something.', defaultSeverity: 'error', recommended: true },
  artifactTypes: ['VectorTile'],
  create(context) {
    const tile = context.artifact.content;
    // Inspect tile, call context.report() for each finding
    context.report({
      message: 'Something is wrong.',
      location: { layer: 'buildings', featureIndex: 0 },
      suggestion: 'Fix it by doing X.',
    });
  },
};
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full rule authoring guide.

---

## Documentation

| Document | Contents |
|:---------|:---------|
| [API Reference](docs/api/) | Generated TypeDoc API documentation |
| [Architecture Handbook](docs/architecture/) | System design, interface specs, decision records |
| [Rule Reference](docs/rules/) | Per-rule documentation with examples and remediation |
| [Project Vision](docs/PROJECT_VISION.md) | Why TileGuard exists and where it's going |
| [Problem Statement](docs/PROBLEM_STATEMENT.md) | The concrete problem TileGuard solves |
| [Execution Roadmap](ROADMAP.md) | Phase-by-phase delivery plan |

### Package Documentation

Each package includes its own README with detailed API documentation:

| Package | README |
|:--------|:-------|
| `@tileguard/core` | [Core Contracts](packages/core/README.md) |
| `@tileguard/tile-rules` | [Tile Validation](packages/tile-rules/README.md) |
| `@tileguard/style-rules` | [Style Linting](packages/style-rules/README.md) |
| `@tileguard/config` | [Configuration](packages/config/README.md) |
| `@tileguard/reporters` | [Reporters & Reports](packages/reporters/README.md) |
| `@tileguard/analysis` | [Comparison & Regression](packages/analysis/README.md) |
| `@tileguard/cli` | [CLI Commands](packages/cli/README.md) |
| `@tileguard/inspector` | [Visual Inspector](packages/inspector/README.md) |

---

## Contributing

The primary extension point is writing new rules — plain TypeScript objects, typically under 25 lines. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and code review expectations.

```bash
git clone https://github.com/shreeharshshinde/tileguard.git
cd tileguard && pnpm install && pnpm build && pnpm test
```

---

## License

[MIT](LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shreeharshshinde)
