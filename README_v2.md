# TileGuard — Remodified Specification
**Version 2.0 | FOSS4G 2026 Edition**
**Author:** Shreeharsh Shinde | **Target:** August 30, 2026 — Hiroshima, Japan

> This document supersedes the previous TileGuard spec entirely.
> It is the single source of truth for architecture, implementation order, and scope.

---

## Why This Exists

The talk is:
**"Ensuring Tile Quality in MapLibre Through Automated Testing and CI"**

TileGuard is the answer to the question every attendee asks after:
**"Where do I start?"**

It is not a presentation aid. It is a real, published, cloneable framework that implements the exact patterns described in the talk — before the talk happens.

The demo moment on stage:
```bash
npx tileguard validate ./tile.pbf --layers water roads buildings
npx tileguard style-lint ./style.json
npx tileguard render --fixtures ./fixtures/
```

Three commands. Every concept from the 30-minute talk, runnable in 3 minutes.

---

## What Changed From V1 and Why

| V1 (old spec) | V2 (this spec) | Why |
|---|---|---|
| Plain JavaScript | TypeScript | Type safety, IDE support, contributor confidence |
| Jest | Vitest | MapLibre itself uses Vitest — exact match |
| 4 standalone scripts | Monorepo with `packages/core` | Framework vs tools |
| Procedural validation | Rule engine | Extensible, composable, community-friendly |
| No config file | `tileguard.config.ts` | ESLint-style project configuration |
| No plugin surface | Plugin API (internal first) | Long-term sustainability |
| Reporter inside validators | Separate reporter packages | Separation of concerns |
| No Python strategy | Python mirrors JS API | FOSS4G audience is ~50% Python |

---

## Architecture

### The Fundamental Principle

**`packages/core` must own everything that is shared. Every module depends on core. Core depends on nothing.**

If a module ever modifies core to work, the architecture has failed.

### Monorepo Structure

```
tileguard/                            ← pnpm monorepo
├── packages/
│   ├── core/                         ← BUILT FIRST. Zero dependencies.
│   │   ├── src/
│   │   │   ├── diagnostic.ts         ← The contract. Built first of all.
│   │   │   ├── rule.ts               ← Rule<TArtifact> interface
│   │   │   ├── engine.ts             ← Discovery → execution → collection
│   │   │   ├── visitor.ts            ← Visitor + subscription registry
│   │   │   ├── config.ts             ← tileguard.config.ts loader
│   │   │   ├── plugin.ts             ← Plugin registration API
│   │   │   └── index.ts
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── tile-validator/               ← BUILT SECOND. Proves core.
│   │   ├── src/
│   │   │   ├── rules/
│   │   │   │   ├── decode.ts
│   │   │   │   ├── required-layers.ts
│   │   │   │   ├── coordinate-range.ts
│   │   │   │   ├── geometry-validity.ts
│   │   │   │   └── feature-count.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── style-linter/                 ← BUILT THIRD. Proves generalization.
│   │   ├── src/
│   │   │   ├── rules/
│   │   │   │   ├── spec-compliance.ts
│   │   │   │   ├── duplicate-layer-id.ts
│   │   │   │   ├── missing-source-layer.ts
│   │   │   │   ├── invalid-zoom-range.ts
│   │   │   │   └── deprecated-ref.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── render-compare/               ← BUILT FOURTH. The visual demo.
│   │   ├── src/
│   │   │   ├── rules/
│   │   │   │   ├── pixel-diff.ts
│   │   │   │   └── no-reference.ts
│   │   │   ├── playwright-runner.ts
│   │   │   ├── pixel-diff.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── reporters/                    ← Ships alongside tile-validator.
│   │   ├── src/
│   │   │   ├── text.ts
│   │   │   ├── json.ts
│   │   │   ├── sarif.ts
│   │   │   └── github-annotations.ts
│   │   └── package.json
│   │
│   └── python/                       ← STANDALONE. Starts week 5.
│       ├── tileguard/
│       │   ├── __init__.py
│       │   ├── __main__.py
│       │   ├── validate.py
│       │   ├── style_lint.py
│       │   └── reporter.py
│       └── pyproject.toml
│
├── fixtures/                         ← Mirrors MapLibre's exact format
│   ├── fill-color/
│   │   ├── style.json
│   │   ├── expected.png
│   │   └── info.json
│   ├── fill-opacity/
│   ├── line-width/
│   ├── line-dasharray/
│   ├── symbol-placement/
│   └── raster-opacity/
│
├── .github/
│   └── workflows/
│       └── tile-quality.yml
│
├── tileguard.config.ts               ← Example project configuration
├── pnpm-workspace.yaml
├── README.md
├── CONTRIBUTING.md
└── ARCHITECTURE.md
```

---

## The Diagnostic Model

**This is the first thing built. Everything else depends on it.**

```typescript
// packages/core/src/diagnostic.ts

export type Severity = 'error' | 'warn' | 'info';

export type DiagnosticLocation =
  | { type: 'tile'; z: number; x: number; y: number }
  | { type: 'layer'; layerId: string; featureIndex?: number }
  | { type: 'style'; key: string; line?: number }
  | { type: 'render'; fixture: string; diffPercent?: number }
  | { type: 'generic' };

export interface Diagnostic {
  ruleId: string;         // 'tile/required-layers'
  severity: Severity;
  module: string;         // 'tile-validator'
  title: string;          // Short: "Required layer missing"
  message: string;        // Detailed: 'Layer "roads" not found. Available: water, earth'
  location: DiagnosticLocation;
  fix?: string;           // Suggested fix: 'Add "roads" to your tile generation config'
  docs?: string;          // Documentation URL
  metadata?: Record<string, unknown>;
}

export interface RunResult {
  pass: boolean;
  diagnostics: Diagnostic[];
  durationMs: number;
  source: string;
}
```

**Why this shape matters:**

Every reporter — text, JSON, SARIF, GitHub annotations — renders `Diagnostic[]`.
No reporter ever asks "what kind of thing just ran."
No validator ever cares how its output will be displayed.
The separation is total.

---

## The Rule Interface

**The second thing frozen. Never changes after week 1.**

```typescript
// packages/core/src/rule.ts

export interface RuleMeta {
  title: string;
  description: string;
  docs: string;        // URL
  fixable: boolean;    // Can TileGuard auto-fix this?
}

export interface Rule<TArtifact> {
  readonly id: string;             // Namespaced: 'tile/required-layers'
  readonly defaultSeverity: Severity;
  readonly meta: RuleMeta;

  /**
   * What artifact types this rule subscribes to.
   * The visitor system uses this to route artifacts.
   */
  readonly subscribes: ArtifactType[];

  /**
   * Validate one artifact. Returns zero or more diagnostics.
   * Never throws — catch internally and emit a diagnostic.
   */
  validate(artifact: TArtifact, context: RuleContext): Diagnostic[] | Promise<Diagnostic[]>;
}

export interface RuleContext {
  severity: Severity;             // Configured severity for this rule
  options: Record<string, unknown>; // Rule-specific options from config
  config: TileGuardConfig;        // Full project config
}

export type ArtifactType =
  | 'tile'
  | 'tile:layer'
  | 'tile:feature'
  | 'style'
  | 'style:layer'
  | 'render:output';
```

**The ID convention:**

```
tile/required-layers        ← core tile rules
style/duplicate-layer-id    ← core style rules
render/pixel-diff           ← core render rules
maplibre/3d-building-pitch  ← future: maplibre plugin rules (v1.1)
openmaptiles/schema         ← future: openmaptiles plugin rules (v1.1)
```

This mirrors ESLint's `plugin/rule-name` convention. External contributors immediately understand it.

---

## The Engine

```typescript
// packages/core/src/engine.ts

export class TileGuardEngine {
  private rules = new Map<string, Rule<unknown>>();
  private config: TileGuardConfig;

  constructor(config: TileGuardConfig) {
    this.config = config;
  }

  registerRule(rule: Rule<unknown>): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule "${rule.id}" already registered`);
    }
    this.rules.set(rule.id, rule);
  }

  registerPlugin(plugin: TileGuardPlugin): void {
    for (const rule of plugin.rules) {
      this.registerRule(rule);
    }
  }

  async run(artifact: unknown, artifactType: ArtifactType): Promise<RunResult> {
    const start = Date.now();
    const diagnostics: Diagnostic[] = [];

    // Find all rules that subscribe to this artifact type
    const applicableRules = [...this.rules.values()]
      .filter(rule => rule.subscribes.includes(artifactType))
      .filter(rule => this.isRuleEnabled(rule.id));

    // Run rules in parallel where possible
    const results = await Promise.allSettled(
      applicableRules.map(rule => this.runRule(rule, artifact))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        diagnostics.push(...result.value);
      } else {
        // Rule threw — emit a diagnostic rather than crashing
        diagnostics.push({
          ruleId: 'core/rule-error',
          severity: 'error',
          module: 'core',
          title: 'Rule execution failed',
          message: result.reason?.message ?? 'Unknown error',
          location: { type: 'generic' }
        });
      }
    }

    const errors = diagnostics.filter(d => d.severity === 'error');

    return {
      pass: errors.length === 0,
      diagnostics,
      durationMs: Date.now() - start,
      source: String(artifact)
    };
  }

  private async runRule(rule: Rule<unknown>, artifact: unknown): Promise<Diagnostic[]> {
    const configuredSeverity = this.config.rules?.[rule.id]?.severity ?? rule.defaultSeverity;
    const options = this.config.rules?.[rule.id]?.options ?? {};

    const context: RuleContext = {
      severity: configuredSeverity,
      options,
      config: this.config
    };

    const diagnostics = await rule.validate(artifact, context);

    // Apply configured severity override
    return diagnostics.map(d => ({ ...d, severity: configuredSeverity }));
  }

  private isRuleEnabled(ruleId: string): boolean {
    const ruleConfig = this.config.rules?.[ruleId];
    if (!ruleConfig) return true; // Default: all rules enabled
    return ruleConfig.severity !== 'off';
  }
}
```

---

## Configuration — `tileguard.config.ts`

```typescript
// tileguard.config.ts (in user's project)
import { defineConfig } from 'tileguard';

export default defineConfig({
  // Plugins extend TileGuard with new rules
  plugins: [],

  // Rules: 'error' | 'warn' | 'info' | 'off'
  rules: {
    'tile/required-layers': {
      severity: 'error',
      options: {
        layers: ['water', 'roads', 'buildings', 'landuse']
      }
    },
    'tile/feature-count': {
      severity: 'warn',
      options: {
        min: 10,
        max: 10000,
        perLayer: {
          roads: { min: 5 }
        }
      }
    },
    'tile/geometry-validity': { severity: 'error' },
    'style/duplicate-layer-id': { severity: 'error' },
    'style/missing-source-layer': { severity: 'error' },
    'style/invalid-zoom-range': { severity: 'error' },
    'style/deprecated-ref': { severity: 'warn' },
    'render/pixel-diff': {
      severity: 'error',
      options: { threshold: 16, maxDiffPercent: 0.1 }
    }
  },

  // Render test settings
  render: {
    fixturesDir: './fixtures',
    browser: 'chromium',
    useSwiftShader: true  // Software renderer for CI consistency
  }
});
```

---

## A Complete Rule — Example

```typescript
// packages/tile-validator/src/rules/required-layers.ts

import type { Rule, Diagnostic, RuleContext } from '@tileguard/core';
import type { DecodedTile } from '../types.js';

export const requiredLayersRule: Rule<DecodedTile> = {
  id: 'tile/required-layers',
  defaultSeverity: 'error',
  subscribes: ['tile'],
  meta: {
    title: 'Required layers must be present',
    description: 'Validates that configured layer names exist in the tile.',
    docs: 'https://tileguard.dev/rules/tile/required-layers',
    fixable: false
  },

  validate(tile: DecodedTile, context: RuleContext): Diagnostic[] {
    const requiredLayers: string[] = context.options.layers ?? [];
    const availableLayers = Object.keys(tile.layers);
    const diagnostics: Diagnostic[] = [];

    for (const required of requiredLayers) {
      if (!tile.layers[required]) {
        diagnostics.push({
          ruleId: this.id,
          severity: context.severity,
          module: 'tile-validator',
          title: 'Required layer missing',
          message: `Layer "${required}" not found in tile. Available: ${availableLayers.join(', ')}`,
          location: { type: 'tile', z: tile.z, x: tile.x, y: tile.y },
          fix: `Ensure your tile generation pipeline includes "${required}" as a source layer`,
          docs: this.meta.docs,
          metadata: { required, available: availableLayers }
        });
      }
    }

    return diagnostics;
  }
};
```

**The pattern:** Every rule is this short. `validate()` receives one artifact, returns zero or more diagnostics. It knows nothing about how those diagnostics will be displayed.

---

## The CLI — What Users Type

```bash
# Validate a tile
npx tileguard validate https://tiles.example.com/14/8741/5321.pbf

# Validate with explicit options (overrides config)
npx tileguard validate ./tile.pbf --layers water roads buildings

# Validate a batch from a list file
npx tileguard validate --batch ./tile-urls.txt

# Lint a style
npx tileguard style-lint ./style.json

# Lint all styles in project
npx tileguard style-lint --all

# Run render tests
npx tileguard render --fixtures ./fixtures/

# Run single fixture
npx tileguard render --fixture ./fixtures/fill-color

# Update reference images (intentional change)
npx tileguard render --update

# Run everything — the full quality gate
npx tileguard check

# Output formats
npx tileguard validate ./tile.pbf --format json
npx tileguard validate ./tile.pbf --format sarif     # GitHub Code Scanning
npx tileguard validate ./tile.pbf --format github    # GitHub annotations
```

**The `npx tileguard check` command** is the most important one for the talk. One command runs all three validators in sequence, respects the tiered pipeline (style-lint → validate → render), and exits non-zero if anything fails. This is what goes in CI.

---

## GitHub Actions — The Copy-Paste File

```yaml
# .github/workflows/tile-quality.yml
# ── Copy this file into your repo to get tile quality CI on every PR ──

name: Tile Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:

  # ── Fast gate: style lint (< 30s) ────────────────────────────────────────
  style-lint:
    name: Style Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm install -g tileguard
      - run: npx tileguard style-lint --all --format github

  # ── Tile validation (< 60s) ───────────────────────────────────────────────
  tile-validate:
    name: Tile Validation
    runs-on: ubuntu-latest
    needs: style-lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm install -g tileguard
      - run: npx tileguard validate --batch ./fixtures/ --format github

  # ── Render tests (6-9 min, gated behind fast tests) ──────────────────────
  render-test:
    name: Render Tests
    runs-on: ubuntu-latest
    needs: [style-lint, tile-validate]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm install -g tileguard
      - run: sudo apt-get install -y libgl1-mesa-dev xvfb libgbm-dev
      - run: npx playwright install chromium --with-deps
      - run: xvfb-run -a npx tileguard render --fixtures ./fixtures/ --format json --output render-results.json

      # Upload diff images so PR reviewers can see what changed visually
      - name: Upload render diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: render-diffs-${{ github.sha }}
          path: fixtures/**/diff.png
          retention-days: 14

      # Post results as PR comment
      - name: Comment render results
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const results = JSON.parse(require('fs').readFileSync('render-results.json'));
            const pass = results.filter(r => r.pass).length;
            const fail = results.filter(r => !r.pass).length;
            const body = `## ${fail === 0 ? '✅' : '❌'} Render Tests: ${pass}/${results.length} passing\n` +
              (fail > 0 ? results.filter(r=>!r.pass)
                .map(r => `- \`${r.fixture}\`: ${r.diffPercent}% pixels differ`)
                .join('\n') : '');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

---

## Python Package — Mirrors the JS API

The Python package ships independently. It does not wrap the JS package. It implements the same validation logic natively using Python geospatial libraries.

**Key decisions:**
- `validate_tile()` and `style_lint()` are the public API — same names, snake_case
- `mapbox-vector-tile` for .pbf decoding
- `shapely` for geometry validity
- `click` for CLI, `rich` for terminal output
- `pytest` integration: `from tileguard import validate_tile` in any pytest test

The Python package does NOT implement render-compare. Pixel diff requires a browser runtime — that stays in JS.

```toml
# pyproject.toml
[project]
name = "tileguard"
version = "0.1.0"
dependencies = [
  "mapbox-vector-tile>=2.0.1",
  "click>=8.1.0",
  "shapely>=2.0.0",
  "rich>=13.0.0",
  "requests>=2.31.0"
]

[project.scripts]
tileguard = "tileguard.__main__:cli"
```

---

## Fixtures — The Exact Format

Mirroring MapLibre's own render test format is not an accident. When you stand on stage and say "TileGuard uses the same fixture format as MapLibre itself — you can copy their fixtures directly," that is the credibility moment.

```
fixtures/
├── fill-color/              ← Tests basic fill color accuracy
│   ├── style.json           ← The MapLibre style to render
│   ├── info.json            ← Zoom, center, dimensions
│   └── expected.png         ← Reference image (256×256)
├── line-dasharray/          ← The war story fixture — 2px offset regression
│   ├── style.json
│   ├── info.json
│   └── expected.png
└── symbol-placement/        ← Platform font drift fixture
    ├── style.json
    ├── info.json
    └── expected.png
```

`info.json` schema:
```json
{
  "width": 256,
  "height": 256,
  "zoom": 0,
  "center": [0, 0],
  "bearing": 0,
  "pitch": 0,
  "description": "Solid fill polygon — basic color correctness"
}
```

The 6 core fixtures to ship by August:

| Fixture | Tests | Connects to talk |
|---------|-------|-----------------|
| `fill-color` | Basic color accuracy | Render test explainer |
| `fill-opacity` | Transparent fill blending | Anti-aliasing tolerance |
| `line-width` | Width interpolation | Zoom-dependent rendering |
| `line-dasharray` | Dash phase accuracy | **The war story fixture** |
| `symbol-placement` | Label collision | **Platform drift war story** |
| `raster-opacity` | Raster blending | Tile source variety |

---

## What Is NOT In Scope For August 30

These are correct ideas. They are v1.1 and v2.0. Do not build them before the talk.

- Public plugin API (build internal plugins first, stabilize API after)
- HTML report output
- PMTiles / MBTiles source support
- Multi-platform render comparison (Linux vs macOS vs Windows)
- Web dashboard with trend graphs
- MapLibre Native (Android/iOS) render tests
- OpenMapTiles schema plugin
- Auto-fix functionality
- VSCode extension

---

## The Rule ID Space — Reserved

```
tile/*         ← tile-validator (core)
style/*        ← style-linter (core)
render/*       ← render-compare (core)
maplibre/*     ← future maplibre plugin (v1.1)
openmaptiles/* ← future openmaptiles plugin (v1.1)
planetiler/*   ← future planetiler plugin (v1.1+)
```

External contributors namespace under their own prefix. The core never owns `maplibre/*`.

---

## Publishing Plan

```bash
# Week 13 — first publish
npm publish packages/core      # @tileguard/core@0.1.0
npm publish packages/tile-validator  # @tileguard/tile-validator@0.1.0
npm publish packages/style-linter    # @tileguard/style-linter@0.1.0
npm publish packages/render-compare  # @tileguard/render-compare@0.1.0
npm publish packages/reporters       # @tileguard/reporters@0.1.0

# The umbrella package
npm publish  # tileguard@0.1.0 — re-exports all packages

# Python
pip publish packages/python  # tileguard@0.1.0 on PyPI
```

**The GitHub repo:** `github.com/shreeharsh-shinde/tileguard`
- Public from day one
- MIT license
- Issues enabled — let people file bugs during development
- Star count by talk day is a real metric. The LinkedIn post, Harel's mention, the talk acceptance tweet all drive stars.

---

## The Talk Demo — Exact Script

```
SLIDE: "What if you could catch this in CI?"

[open terminal, split view with browser demo on left, terminal on right]

"Let me show you TileGuard — a framework I built to implement exactly what we've been discussing."

# Run 1 — the silent bug
$ npx tileguard validate https://demotiles.maplibre.org/tiles/1/0/0.pbf
  ✕ tile/required-layers: Layer "roads" not found
    Available: water, earth, countries
    Fix: Add "roads" to your tile generation config

"That's the exact bug from Slide 2 — now caught in 400 milliseconds."

# Run 2 — the style regression
$ npx tileguard style-lint ./broken-style.json
  ✕ style/missing-source-layer: Layer "roads" uses vector source but has no source-layer
  ✕ style/duplicate-layer-id: Layer "water" appears twice

"This runs in 25 seconds. Cheaper than a render test."

# Run 3 — pixel diff
$ npx tileguard render --fixtures ./fixtures/
  ✓ fill-color: PASS (0.00%)
  ✓ fill-opacity: PASS (0.01%)
  ✕ line-dasharray: FAIL (4.8% > threshold 0.1%) — diff.png saved

"And here's what that diff looks like."
[show diff.png — expected vs actual vs highlighted difference]

# Run 4 — the copy-paste moment
$ cat .github/workflows/tile-quality.yml
[show the YAML]

"Copy this one file. That's it. Every PR on your project now runs all three checks automatically."

SLIDE: "TileGuard — github.com/shreeharsh-shinde/tileguard"
[QR code]
```

Total demo time: 4–5 minutes. The remaining 25 minutes is the conceptual talk that makes this demo meaningful.

---

## Week-by-Week Build Checklist

### Weeks 1–2: Core Foundation (Apr 22 – May 4)
- [ ] pnpm monorepo setup with workspaces
- [ ] `packages/core/src/diagnostic.ts` — the contract
- [ ] `packages/core/src/rule.ts` — Rule interface frozen
- [ ] `packages/core/src/engine.ts` — skeleton (zero rules, runs cleanly)
- [ ] `packages/core/src/visitor.ts` — ArtifactType enum + registry
- [ ] `packages/core/src/config.ts` — `defineConfig()` + loader
- [ ] `packages/core/src/plugin.ts` — TileGuardPlugin interface
- [ ] First vitest tests on core
- [ ] `packages/reporters/src/text.ts` — colored terminal output

### Weeks 3–4: Tile Validator (May 5–18)
- [ ] `tile/decode` rule
- [ ] `tile/required-layers` rule
- [ ] `tile/coordinate-range` rule
- [ ] `tile/geometry-validity` rule (turf.js for geometry checks)
- [ ] `tile/feature-count` rule
- [ ] CLI: `tileguard validate` command wired to engine
- [ ] `npx tileguard validate ./tile.pbf` works end-to-end
- [ ] Vitest tests for all rules, >80% coverage
- [ ] JSON reporter ships

### Weeks 5–6: Style Linter + Python starts (May 19 – Jun 1)
- [ ] `style/spec-compliance` rule (wraps `@maplibre/maplibre-gl-style-spec`)
- [ ] `style/duplicate-layer-id` rule
- [ ] `style/missing-source-layer` rule
- [ ] `style/invalid-zoom-range` rule
- [ ] `style/deprecated-ref` rule
- [ ] CLI: `tileguard style-lint` command
- [ ] `npx tileguard style-lint ./style.json` works end-to-end
- [ ] Python: `validate.py` + `__main__.py` validate command
- [ ] `pip install tileguard` + `tileguard validate ./tile.pbf` works

### Weeks 7–8: Render Compare + Fixtures (Jun 2–15)
- [ ] `playwright-runner.ts` — headless Chromium + SwiftShader
- [ ] `pixel-diff.ts` — pixelmatch + perceptual threshold
- [ ] `render/pixel-diff` rule
- [ ] `render/no-reference` rule
- [ ] CLI: `tileguard render` command
- [ ] 6 fixtures created and reference images generated
- [ ] `xvfb-run -a npx tileguard render --fixtures ./fixtures/` passes in CI
- [ ] Python: `style_lint.py` + CLI style-lint command

### Weeks 9–10: CI + Config + Polish (Jun 16–29)
- [ ] `tileguard.config.ts` loading in CLI
- [ ] `tileguard check` command (runs all three)
- [ ] `.github/workflows/tile-quality.yml` finalized
- [ ] SARIF reporter
- [ ] GitHub annotations reporter
- [ ] PR comment script tested on real PR
- [ ] `CODE COMPLETE` — no new features after June 29

### Weeks 11–12: Documentation + Publish (Jun 30 – Jul 13)
- [ ] `README.md` — 3-command quickstart above the fold
- [ ] `CONTRIBUTING.md` — rule authoring guide (adding a new rule = 20 lines)
- [ ] `ARCHITECTURE.md` — the framework decisions explained
- [ ] `tileguard@0.1.0` published to npm
- [ ] `tileguard@0.1.0` published to PyPI
- [ ] GitHub Releases with changelog

### Weeks 13–16: Talk Prep Only (Jul 14 – Aug 28)
- [ ] Bug fixes ONLY. No new features.
- [ ] Slides built (master guide has the outline)
- [ ] Demo sequence practiced until muscle memory
- [ ] Full 30-minute run-through × 3 timed
- [ ] Demo tested offline (WiFi off)
- [ ] Slide PDF backup created
- [ ] QR code tested

---

## First File to Write

`packages/core/src/diagnostic.ts`

It has zero dependencies, is 30 lines, and everything else depends on it. You cannot start `rule.ts` or `engine.ts` until this is finished and reviewed.

Start there. Today.

---

*TileGuard v2 spec | Shreeharsh Shinde | April 2026*
*Talk: "Ensuring Tile Quality in MapLibre Through Automated Testing and CI" | FOSS4G 2026 Hiroshima*