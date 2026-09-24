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
✓ Core loaded        @tileguard/core 0.6.0
✓ Tile rules         12 rules registered
✓ Performance rules  4 rules registered (opt-in)
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

Performance Rules (4 — opt-in, off by default):
  perf/tile-size              off      Tile size must not exceed budget
  perf/vertex-budget          off      Vertex count per layer must be within budget
  perf/feature-density        off      Feature density per layer must be within budget
  perf/layer-size             off      Compressed layer size must not exceed budget

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

## Analyze a Style in Depth

While `tileguard check` runs the style lint rules as a pass/fail gate, the
dedicated `tileguard style` command parses a MapLibre style and reports a full
breakdown — version, sources, layers by type, expression/filter counts, and
any diagnostics — in one view.

```bash
tileguard style ./styles/map.json
```

```text
TileGuard Style — ./styles/map.json
═════════════════════════════════════════════

  ✓ Valid


Overview
────────────────────────────────────────
  Version      8
  Name         My Basemap
  Sources      1
  Layers       5
  Expressions  0
  Filters      0


Sources
────────────────────────────────────────
  vector  1


Layers
────────────────────────────────────────
  background  1
  fill        2
  line        1
  symbol      1
```

When the style has problems, they appear under a **Findings** section:

```text
  ✗ Issues found

  ...

Diagnostics
────────────────────────────────────────
  Errors    1
  Warnings  0
  Info      0

Findings
────────────────────────────────────────
  ✗ [known-source] Layer "buildings-3d" references unknown source "composite".
    → Declare the source in the top-level "sources" object, or correct the layer's "source" field.
```

Add `--json` for machine-readable output with the full statistics object:

```bash
tileguard style ./styles/map.json --json
```

```json
{
  "file": "./styles/map.json",
  "valid": true,
  "version": 8,
  "name": "My Basemap",
  "statistics": {
    "sources": 1,
    "sourcesByType": { "vector": 1 },
    "layers": 5,
    "layersByType": { "background": 1, "fill": 2, "line": 1, "symbol": 1 },
    "expressions": 0,
    "filters": 0,
    "paintProperties": 6,
    "layoutProperties": 1,
    "dataDrivenLayers": 0
  },
  "diagnostics": [],
  "errors": 0,
  "warnings": 0,
  "info": 0
}
```

::: tip When to use which
Use `tileguard check` in CI for a simple pass/fail gate across tiles **and**
styles. Use `tileguard style` when you want to inspect a single style's
structure and statistics during development.
:::

Exit codes: `0` valid, `1` warnings only, `2` errors (or parse failure), `3` file read failure.

## Validate Multiple Files

```bash
tileguard check ./tiles/ ./styles/ --reporter json
```

JSON output is machine-readable. Pipe it into CI gates, dashboards, or custom tooling.

### SARIF output for GitHub Code Scanning

```bash
tileguard check ./tiles/ --reporter sarif
```

Writes `./tileguard-results.sarif`. Upload it to GitHub Code Scanning to surface findings as PR annotations:

```yaml
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: tileguard-results.sarif
```

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

### Profile a tile for performance bottlenecks

```bash
tileguard profile ./tile.pbf
```

```text
Profile: ./tile.pbf  (88 KB compressed)

  Layer          Features  Vertices   Size (raw)  % of tile
  ─────────────────────────────────────────────────────────
  roads          1,891      98,432     142 KB      48%
  buildings      1,456      41,201      89 KB      30%
  water            312      15,980      32 KB      11%
  landuse          401       8,120      22 KB       7%
  poi              157         157       4 KB       1%

  Total vertices:   163,890
  Vertex budget:    100,000  ⚠ EXCEEDED by 63%

  Recommendation: Simplify "roads" geometry — it accounts for 60% of vertex cost.
```

::: tip When to use
`tileguard profile` is your performance microscope. Run it when tiles feel slow to render or when you want to set a budget before scaling to production.
:::

### Scaffold a config file

```bash
tileguard init
```

Creates `tileguard.config.ts` with all recommended rules at default severities.

### Install a pre-commit hook

```bash
tileguard hook install
```

Automatically checks any staged `.pbf` or `.mvt` files before every commit. Fast — only validates changed files.

```bash
tileguard hook status   # check whether the hook is installed
tileguard hook uninstall  # remove the hook
```

::: warning Git repo required
`tileguard hook install` must be run from inside a git repository.
:::

## What Next?

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">

[**View All Rules ›**](/rules/)\
25 built-in rules — tile, perf, and style

[**Set Up CI ›**](/guides/ci-github-actions)\
Fail PRs on quality gate violations

[**Profile Tiles ›**](/guides/profiling-tiles)\
Find rendering bottlenecks before production

[**How It Works ›**](/learn/how-it-works)\
Understand the architecture

</div>
