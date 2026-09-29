<p align="center">
  <img src="https://raw.githubusercontent.com/shreeharshshinde/tileguard/main/public/tileguard_horizontal.png" alt="TileGuard" width="480" style="background:#000;border-radius:8px;padding:16px;" />
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/shreeharshshinde/tileguard/actions/workflows/tile-quality.yml/badge.svg)](https://github.com/shreeharshshinde/tileguard/actions/workflows/tile-quality.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![FOSS4G 2026](https://img.shields.io/badge/FOSS4G%202026-Hiroshima-red)](https://2026.foss4g.org)

Rule-based validation for vector tiles and MapLibre style files.

---

Vector tile bugs are silent. A self-intersecting polygon in your `countries` layer renders fine at z3, breaks earcut triangulation at z8, and nobody notices until a user files a report. A style referencing an undeclared source loads without error in development and fails in production. TileGuard catches these things before they ship.

```bash
npx @tileguard/cli check ./tiles/ ./style.json
```

```
✖  tile/self-intersection  countries[0] ring 91 — segments 3 and 7 cross
✖  style/known-source      layer "roads" references undeclared source "streets"
✔  tile/winding-order      pass (94 tiles)
✔  tile/coordinate-range   pass (94 tiles)

2 errors, 0 warnings
```

---

## Install

```bash
# Run without installing
npx @tileguard/cli check ./tiles/

# Or install globally
npm install -g @tileguard/cli

# Programmatic use
npm install @tileguard/core @tileguard/tile-rules @tileguard/style-rules
```

---

## Usage

```bash
tileguard check ./tiles/ ./style.json          # validate tiles and styles
tileguard check ./tiles/ --reporter json        # JSON output for CI
tileguard check ./tiles/ --reporter sarif       # SARIF for GitHub Code Scanning
tileguard compare ./v1.pbf ./v2.pbf            # diff two tile versions
tileguard profile ./tile.pbf                   # size, vertex count, layer breakdown
tileguard report ./v1.pbf ./v2.pbf --format markdown
tileguard check ./tiles/ --rule tile/self-intersection
tileguard hook install                         # pre-commit hook for staged .pbf files
tileguard init                                 # scaffold a config file
```

---

## Configuration

`tileguard init` writes a `tileguard.config.ts` at your project root. Without one, all recommended rules run at their default severities.

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

    // Performance rules are opt-in — set your own thresholds
    'perf/tile-size': ['warning', { maxBytes: 500_000, maxGzipBytes: 100_000 }],
    'perf/vertex-budget': ['warning', { maxPerFeature: 10_000 }],
  },
  reporter: 'text',
};

export default config;
```

---

## Rules

### Tile validation

| Rule | Catches |
|:-----|:--------|
| `tile/self-intersection` | Polygon rings that cross themselves |
| `tile/winding-order` | Ring winding inconsistent with detected convention (MVT or OGC) |
| `tile/hole-containment` | Hole rings outside their outer ring |
| `tile/unclosed-ring` | Polygon rings where first ≠ last vertex |
| `tile/zero-area-ring` | Degenerate polygons with zero or near-zero area |
| `tile/degenerate-geometry` | Lines or polygons with too few vertices to be meaningful |
| `tile/coordinate-range` | Coordinates outside the tile extent + buffer |
| `tile/required-layers` | Missing layers you declared as required |
| `tile/required-properties` | Features missing properties you declared as required |
| `tile/feature-count` | Total feature count outside configured bounds |
| `tile/layer-feature-count` | Per-layer feature count outside configured bounds |
| `tile/no-empty` | Tiles that contain zero features |

### Performance (opt-in)

All four rules are off by default. Set thresholds to match your pipeline.

| Rule | Catches |
|:-----|:--------|
| `perf/tile-size` | Raw or gzip byte size over budget |
| `perf/vertex-budget` | Per-feature or total vertex count over limit |
| `perf/feature-density` | Feature count per layer over maximum |
| `perf/layer-size` | Single layer dominating the tile's vertex budget |

### Style linting

| Rule | Catches |
|:-----|:--------|
| `style/valid-json` | Style file is not valid JSON |
| `style/version` | Version field is not `8` |
| `style/sources-present` | Missing top-level `sources` object |
| `style/layers-present` | Missing top-level `layers` array |
| `style/layer-id-required` | Layers without an `id` field |
| `style/unique-layer-id` | Duplicate layer IDs |
| `style/known-source` | Layers referencing undeclared sources |
| `style/zoom-range` | `minzoom` greater than `maxzoom` |
| `style/no-deprecated-ref` | Use of the deprecated `ref` property |

---

## CI

```yaml
# .github/workflows/tile-quality.yml
name: Tile Quality
on:
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx @tileguard/cli check ./tiles/ ./styles/ --reporter json
      # Surface findings inline on the PR diff
      - run: npx @tileguard/cli check ./tiles/ --reporter sarif
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: tileguard-results.sarif }
```

Exit code is `1` if any `error`-severity rule fires, `0` otherwise. `warning` and `info` don't fail the build unless you configure them to.

---

## Programmatic API

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
    'tile/self-intersection': 'error',
  },
});

const result = await engine.run(['./tile.pbf', './style.json']);

console.log(result.summary.pass);        // true | false
console.log(result.summary.errorCount);  // number of errors
console.log(result.diagnostics);         // full structured findings
```

Each diagnostic has a rule ID, severity, file path, layer, feature index, message, and suggestion. No parsing required.

---

## Writing a Rule

Rules are plain objects. No base classes, no decorators, no registration ceremony.

```typescript
import type { Rule } from '@tileguard/core';

export const noNullIsland: Rule = {
  id: 'tile/no-null-island',
  meta: {
    description: 'Flag features suspiciously close to (0, 0).',
    defaultSeverity: 'warning',
    recommended: false,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    const tile = context.artifact.content;
    for (const layerName of Object.keys(tile.layers)) {
      const layer = tile.layers[layerName];
      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        const geom = feature.loadGeometry();
        for (const ring of geom) {
          for (const pt of ring) {
            if (Math.abs(pt.x) < 10 && Math.abs(pt.y) < 10) {
              context.report({
                message: `Feature near (0, 0) — likely a null island.`,
                location: { layer: layerName, featureIndex: i },
                suggestion: 'Verify the source coordinate and re-export.',
              });
            }
          }
        }
      }
    }
  },
};
```

Add it to your config under `plugins` and it runs alongside every built-in rule. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## How It Works

<img width="1448" height="1086" alt="TileGuard Pipeline" src="https://github.com/user-attachments/assets/33770335-1602-4ce5-9273-1ff0cc184871" />

Artifacts (tiles, styles) are loaded by Providers, passed to Rules, which emit Diagnostics, which Reporters format for output.

Rules never print. Reporters never validate. The separation is strict — adding a rule doesn't touch formatting, and adding a reporter doesn't touch validation logic.

---

## Packages

<img width="1448" height="1086" alt="TileGuard Architecture" src="https://github.com/user-attachments/assets/31fa61fc-14cc-4a43-af21-30b8a5e4eae3" />

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/core`](packages/core) | Contracts — Diagnostic, Artifact, Rule, Plugin, Reporter, Engine |
| [`@tileguard/shared`](packages/shared) | Utilities shared across packages |
| [`@tileguard/tile-rules`](packages/tile-rules) | MVT provider + 12 tile validation + 4 performance rules |
| [`@tileguard/style-rules`](packages/style-rules) | Style provider + 9 lint rules |
| [`@tileguard/config`](packages/config) | Config file discovery, loading, validation |
| [`@tileguard/reporters`](packages/reporters) | Text, JSON, SARIF reporters + Markdown/HTML/JSON report engine |
| [`@tileguard/analysis`](packages/analysis) | Tile comparison and regression detection |
| [`@tileguard/cli`](packages/cli) | CLI — 12 commands |
| [`@tileguard/inspector`](packages/inspector) | Browser-based tile debugger — canvas geometry, diagnostic overlays |

`@tileguard/core` has zero runtime dependencies. Install only the packages you need.

---

## Contributing

```bash
git clone https://github.com/shreeharshshinde/tileguard.git
cd tileguard
pnpm install
pnpm build
pnpm test        # 1,847 tests across 9 packages
```

The main extension point is writing rules. They're small (typically under 25 lines), isolated, and testable without the full engine. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) · [Shreeharsh Shinde](https://github.com/shreeharshshinde)
