# Quick Start

Get running in under 5 minutes. No configuration needed.

## Install

::: code-group

```bash [npm]
npm install -g @tileguard/cli
```

```bash [npx (no install)]
npx @tileguard/cli check ./tile.pbf
```

```bash [pnpm]
pnpm add -g @tileguard/cli
```

:::

::: tip Requirements
Node.js ≥ 20. That's it. No native dependencies, no Docker, no server.
:::

## Verify Installation

Check that TileGuard is installed and working:

```bash
tileguard ver
```

```text
tileguard v0.5.0
node     v22.x.x
platform linux (x64)

Packages:
  @tileguard/core         0.5.0
  @tileguard/tile-rules   0.5.0
  @tileguard/style-rules  0.5.0
  @tileguard/reporters    0.5.0
  @tileguard/config       0.5.0
  @tileguard/cli          0.5.0
```

Run the health check to confirm rules are loaded and configuration is found:

```bash
tileguard doctor
```

```text
✓ Node.js version    v22.x.x (≥20 required)
✓ Core loaded        @tileguard/core 0.5.0
✓ Tile rules         12 rules registered
✓ Style rules        9 rules registered
✓ Config discovery   tileguard.config.ts found
✓ Reporter           text (default)

All checks passed.
```

List all available rules:

```bash
tileguard rules list
```

```text
Tile Rules (12):
  tile/required-layers        error    Required layers must be present
  tile/self-intersection      error    Geometry must not self-intersect
  tile/winding-order          error    Rings must follow correct winding
  tile/hole-containment       error    Holes must stay inside outer ring
  ...

Style Rules (9):
  style/valid-json            error    Style must be valid JSON
  style/known-source          error    Layers must reference declared sources
  style/zoom-range            error    minzoom must not exceed maxzoom
  ...
```

::: tip
If `doctor` shows issues, check your Node.js version and ensure the package installed correctly.
:::

## Validate a Vector Tile

```bash
tileguard check ./tiles/14/8741/5476.pbf
```

**Output:**

```text
✗ tile/self-intersection
  Geometry in layer "landuse", feature 42 has intersecting segments 1 and 4.
  at ./tiles/14/8741/5476.pbf → layer: landuse, feature: 42
  ℹ Simplify or repair this geometry so non-adjacent segments do not cross.

⚠ tile/feature-count
  Tile has 52431 features total, expected at most 50000.
  at ./tiles/14/8741/5476.pbf

──────────────────────────────────
  1 error, 1 warning in 1 file (34ms)
```

Every diagnostic includes:
- **Rule ID**: which rule triggered (`tile/self-intersection`)
- **Severity**: error, warning, or info
- **Location**: file, layer, feature index
- **Suggestion**: what to do about it

## Lint a MapLibre Style

```bash
tileguard check ./styles/map.json
```

```text
✗ style/known-source
  Layer "buildings-3d" references unknown source "composite".
  at ./styles/map.json → layers[12].source
  ℹ Declare the source in the top-level "sources" object, or correct the layer's "source" field.

──────────────────────────────────
  1 error in 1 file (12ms)
```

## Validate Multiple Files

```bash
tileguard check ./tiles/ ./styles/ --reporter json
```

JSON output is machine-readable. Pipe it into CI gates, dashboards, or custom tooling.

## Compare Two Tile Versions

```bash
tileguard compare ./v1.pbf ./v2.pbf
```

```text
Comparison: v1.pbf ↔ v2.pbf

  +412 added · −37 removed · ~89 modified · 1,204 unchanged

Top regressions:
  92% — geometry: Building footprint area reduced by 73% in "buildings"
  85% — attribute: Property "class" changed on 4 road features
  71% — mixed: Feature moved 200+ tile units with property changes
```

## Generate a Report

```bash
tileguard report ./v1.pbf ./v2.pbf --format markdown
```

Produces a structured engineering report with:
- Executive summary
- Key findings with evidence
- Prioritized recommendations
- Full diagnostic breakdown

## Configure Rules

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

## More Commands

### Get tile statistics

```bash
tileguard stats ./tile.pbf
```

```text
File: ./tile.pbf

  Layers:    5
  Features:  4,217
  Extent:    4096

  Layer Breakdown:
    water        312 features   (polygons)
    roads      1,891 features   (lines)
    buildings  1,456 features   (polygons)
    landuse      401 features   (polygons)
    poi          157 features   (points)
```

### Scaffold a config file

```bash
tileguard init
```

Creates `tileguard.config.ts` with all recommended rules at default severities.

## What Next?

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">

[**View All Rules ›**](/rules/)\
21 built-in rules for tiles and styles

[**Set Up CI ›**](/guides/ci-github-actions)\
Fail PRs on quality gate violations

[**How It Works ›**](/learn/how-it-works)\
Understand the architecture

[**What is TileGuard? ›**](/learn/what-is-tileguard)\
The problem we solve

</div>
