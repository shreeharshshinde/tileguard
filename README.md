# TileGuard 🛡️

**Automated quality gates for geospatial software.**

TileGuard is a rule-based validation framework for vector tiles and MapLibre style specifications — the same engineering discipline ESLint brings to JavaScript, applied to the geospatial stack.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/shreeharsh-shinde/tileguard/actions/workflows/tile-quality.yml/badge.svg)](https://github.com/shreeharsh-shinde/tileguard/actions/workflows/tile-quality.yml)
[![FOSS4G 2026](https://img.shields.io/badge/Presented%20at-FOSS4G%202026%20Hiroshima-red)](https://2026.foss4g.org)

---

## The Problem

Map tile bugs are **silent**. A road layer disappears at zoom 14. A polygon self-intersects and causes an invisible render failure. A style expression references a property that doesn't exist. These regressions survive code review because there are no automated checks — they surface when a user reports them, often weeks after the change that caused them.

Application developers solved this years ago: linters, test frameworks, CI pipelines. The geospatial ecosystem hasn't. Teams still rely on manual visual inspection.

**TileGuard closes this gap** — configurable, automated quality checks that run in CI the same way unit tests do.

---

## What TileGuard Is

TileGuard is a **framework**, not a script collection. At its center is a domain-agnostic rule engine: it loads geospatial artifacts, routes them to the rules that understand them, collects structured diagnostics, and delivers those diagnostics to a reporter. The engine validates nothing itself — the rules validate everything.

**TileGuard is not** a rendering engine, a tile server, or a GIS application. It is an independent quality assurance layer that sits alongside existing tools in a standard CI pipeline.

---

## How It Works
<img width="1448" height="1086" alt="image" src="https://github.com/user-attachments/assets/33770335-1602-4ce5-9273-1ff0cc184871" />



**Artifacts** are the things being validated — vector tiles and style specifications today, render snapshots in an upcoming release. **Providers** load and decode them. **Rules** are small, independent, deterministic functions — each validates one concern. **Diagnostics** are the structured results every rule produces and every reporter consumes.

The key separation: rules never print output, reporters never validate. Adding a new rule never requires touching output formatting. Adding a new reporter never requires touching validation logic.

---

## Capabilities

### Tile Validation — `@tileguard/tile-rules`
<!-- TODO: INSERT DIAGRAM 6: Vector Tile Decoder -->

**Image Description / Generation Prompt:** A block diagram representing the hierarchical structure of a decoded Mapbox Vector Tile (MVT) binary payload.
1. The top-level block is the raw `VectorTile` binary buffer (protobuf format).
2. Underneath, show that the buffer contains one or more `Layers`.
3. Each `Layer` contains:
   - `Name` (string identifier)
   - `Extent` (typically 4096 coordinate grid dimensions)
   - `Feature Pool` (an array of individual feature objects)
   - `Key Pool` (a list of unique property keys)
   - `Value Pool` (a list of unique property values across different types: string, float, integer, boolean)
4. Each `Feature` within the pool contains:
   - `ID` (unique identifier)
   - `Type` (Geometry Type: Point, LineString, or Polygon)
   - `Packed Tags` (an array of alternating integers mapping key indices to value indices in the layer pools)
   - `Geometry Commands` (packed draw commands containing command IDs and coordinate parameters: MoveTo, LineTo, ClosePath)


Validates Mapbox Vector Tile (MVT) structure, geometry, feature metadata, and content. **10 rules, fully tested against real `.pbf` fixtures.**

| Check | What it catches |
|:------|:----------------|
| Required layers | Missing expected layers in the tile |
| Required properties | Features missing declared properties |
| Coordinate range | Coordinates outside the valid tile extent |
| Feature count | Too many or too few features, globally or per-layer |
| Unclosed rings | Polygon rings whose first vertex doesn't equal its last |
| Zero-area polygons | Degenerate polygons with no meaningful area |
| Self-intersecting geometry | Polygons or lines that cross themselves |
| Structural conformance | Tile metadata, schema, version, and extent validity |
| Geometry consistency | Feature geometry type matching its declared type |
| Empty tiles | Tiles with zero features (configurable — sometimes intentional) |

### Style Linting — `@tileguard/style-rules`
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

**Image Description / Generation Prompt:** An activity flowchart demonstrating the parallel non-short-circuiting configuration schema validation logic in `validator.ts`.
1. Start with the incoming configuration object.
2. Check: "Is the root configuration a plain object?"
   - No: Throw `ConfigValidationError` immediately (fast-fail root check).
   - Yes: Proceed to run validation sub-checkers.
3. Perform the following checks concurrently without stopping on failures:
   - `validatePlugins`: Check that plugins are not defined in JSON config files.
   - `validateRules`: Verify the syntax of rules, severities, and options shapes.
   - `validateReporters`: Verify reporter configurations (strings or tuples).
   - `validateOverrides`: Validate file globs and rule override maps.
   - `checkUnknownKeys`: Detect extraneous properties and collect warning diagnostics.
4. Aggregation Step: Accumulate all collected validation errors and warnings.
5. Decision: "Are there any errors in the accumulated list?"
   - Yes: Throw a single `ConfigValidationError` containing the complete list of errors and warnings.
   - No: Return the verified configuration object alongside any advisory warnings.


Validates MapLibre style specifications against structural and semantic rules. **9 rules, fully tested.**

| Check | What it catches |
|:------|:----------------|
| Style version | Version must be `8` |
| Source references | Layers pointing to undeclared sources |
| Source-layer validation | Vector layers missing a required `source-layer` |
| Layer structure | Missing or structurally broken layer references |
| Duplicate layer IDs | Two layers silently overriding each other |
| Zoom ranges | `minzoom` greater than `maxzoom` |
| Deprecated properties | Usage of the unsupported `ref` property |
| Expression types | Paint/layout expressions with type mismatches |
| Semantic conformance | Broader style specification validity |

### Render Regression Testing — *coming in a future release*

Will compare deterministic render outputs against reference images using perceptual pixel comparison — catching visual regressions that structural checks cannot detect.

### CI Integration

A GitHub Actions workflow runs the full quality gate in a tiered pipeline: dependency boundary checks, per-rule test coverage enforcement, build, lint, and tests. See [CI Pipeline](#ci-pipeline) below.

---

## Quick Start

> **CLI status:** The `tileguard` CLI is fully implemented and stable. You can use it to validate vector tiles, styles, and scaffold config files directly. Refer to [Quick Start](#quick-start) below.

```bash
# Validate a vector tile
npx tileguard check ./tile.pbf

# Lint a MapLibre style
npx tileguard check ./style.json

# Validate multiple sources in one run
npx tileguard check ./tile.pbf ./style.json

# JSON output for CI or downstream tooling
npx tileguard check ./tile.pbf --reporter json

# Scaffold a starter config file
npx tileguard init
```

### Configuration

Create `tileguard.config.ts` at your project root to customize rules:

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/self-intersection': 'warning',
    'tile/no-empty': 'off',
    'style/known-source': 'error',
  },
  reporter: 'text',
};

export default config;
```

Rules accept `'error'`, `'warning'`, `'info'`, or `'off'`. Rules with options use the `[severity, options]` tuple. Without a config file, all recommended rules run at their default severities.

### Programmatic Usage

Available today, ahead of the CLI:

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
  },
});

const result = await engine.run(['./tile.pbf', './style.json']);

console.log(result.summary.pass);        // true | false
console.log(result.diagnostics.length);  // number of findings
```

### CI Pipeline

Drop this workflow into your repository to run tile quality checks on every pull request:

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
      - run: npx tileguard check ./tiles/ ./styles/ --reporter json
```

---

## Writing a Rule

A rule is a plain object. No base classes, no decorators, no framework-specific boilerplate.

```typescript
import type { Rule } from '@tileguard/core';

export const zoomRangeRule: Rule = {
  id: 'style/zoom-range',
  meta: {
    description: 'Layer minzoom must not exceed maxzoom.',
    defaultSeverity: 'error',
    recommended: true,
  },
  artifactTypes: ['StyleSpecification'],

  create(context) {
    const style = context.artifact.content;
    for (const layer of style.layers ?? []) {
      if (
        layer.minzoom !== undefined &&
        layer.maxzoom !== undefined &&
        layer.minzoom > layer.maxzoom
      ) {
        context.report({
          message: `Layer "${layer.id}" has minzoom (${layer.minzoom}) greater than maxzoom (${layer.maxzoom}).`,
          location: { jsonPath: `layers[].id="${layer.id}"` },
          suggestion: 'Swap the minzoom and maxzoom values, or remove one of them.',
        });
      }
    }
  },
};
```

The engine fills in `ruleId`, `severity`, `artifact`, and `docsUrl` from the rule's metadata and resolved config. The rule provides only `message`, `location`, and an optional `suggestion`. Rules stay short and focused.

---

## Architecture
<img width="1448" height="1086" alt="image" src="https://github.com/user-attachments/assets/31fa61fc-14cc-4a43-af21-30b8a5e4eae3" />



TileGuard is a pnpm monorepo. Dependencies flow strictly inward — Core depends on nothing; domain packages depend only on Core.

| Package | Responsibility | Status |
|:--------|:----------------|:-------|
| `@tileguard/core` | Framework contracts: Diagnostic, Artifact, Rule, Plugin, Reporter, Engine | ✅ Stable |
| `@tileguard/shared` | Utilities shared across domain packages | ✅ Stable |
| `@tileguard/tile-rules` | MVT provider + 10 tile validation rules | ✅ Stable |
| `@tileguard/style-rules` | Style provider + 9 style lint rules | ✅ Stable |
| `@tileguard/config` | Configuration file discovery, compilation, and schema validation | ✅ Stable |
| `@tileguard/reporters` | Built-in `text` and `json` reporters | ✅ Stable |
| `tileguard` (CLI) | Unified command-line interface check/init commands | ✅ Stable |

A project using only tile validation never loads the style package. A project using only style linting never loads the tile package. Packages are independently installable.

### Design Principles

1. **Contracts before implementation.** Components interact through explicit interfaces; implementations are replaceable.
2. **Dependencies point inward.** Core has zero runtime dependencies. Every outer package depends only toward Core.
3. **Rules are pure.** Given an artifact and resolved options, a rule produces diagnostics only — no I/O, no side effects, no shared state.
4. **Diagnostics are the universal currency.** Every rule produces a `Diagnostic`. Every reporter consumes the same type, regardless of which rule or package produced it.
5. **Composition over inheritance.** Rules, providers, and reporters are plain objects, not class hierarchies.
6. **Explicit over clever.** Flat configuration, no cascading, clear error messages, no implicit discovery.

### Architecture Handbook

Full interface specifications, design rationale, and decision records live in [`docs/architecture/`](docs/architecture/):

| Document | Contents |
|:---------|:---------|
| [CORE_CONTRACTS.md](docs/architecture/CORE_CONTRACTS.md) | Authoritative spec for every public interface in `@tileguard/core` |
| [PROJECT_VISION.md](docs/PROJECT_VISION.md) | Why TileGuard exists and where it's going |
| [PROBLEM_STATEMENT.md](docs/PROBLEM_STATEMENT.md) | The concrete, evidence-based problem TileGuard solves |
| [Implementation Guidelines](docs/engineering/IMPLEMENTATION_GUIDELINES.md) | Engineering conventions: naming, testing, error handling, CI gates |
| [Execution Roadmap](docs/engineering/ROADMAP.md) | Phase-by-phase delivery plan |
| [Codebase Assessment](docs/engineering/CODEBASE_ASSESSMENT.md) | Legacy-to-framework migration map |

Key design decisions are documented as ADRs in [`docs/architecture/adr/`](docs/architecture/adr/): rule-based architecture over procedural validators, structured diagnostics as the universal interface, direct artifact access over a visitor pattern, flat configuration over cascading config, Inspector subsystem architecture (ADR-008), and the Canvas Renderer contract ([ADR-009](docs/architecture/adr/009-canvas-renderer-contract.md)).

---

## Project Status

The framework's architectural foundation is complete. Two domain packages are fully implemented, tested end-to-end against real fixture files, and stable. The CLI and reporters are the active development milestone.

| Component | Status | Notes |
|:----------|:-------|:------|
| Architecture & Core contracts | ✅ Complete | Every public interface specified and stable |
| `@tileguard/core` | ✅ Complete | Zero runtime dependencies, full engine pipeline |
| `@tileguard/tile-rules` | ✅ Complete | 10 rules, verified against physical `.pbf` fixtures |
| `@tileguard/style-rules` | ✅ Complete | 9 rules, verified against physical style fixtures |
| `@tileguard/config` | ✅ Complete | Pre-engine config discovery, loading, and shape validation |
| `@tileguard/reporters` | ✅ Complete | `text` and `json` reporters |
| CLI (`tileguard`) | ✅ Complete | `check` and `init` commands |
| Render regression testing | 📋 Planned | Perceptual pixel comparison via headless rendering |
| CI workflow | ✅ Complete | Build, test, dependency boundary lint, per-rule test coverage |

**131 tests passing**, including end-to-end verification against real files on disk — not mocked artifacts — for both domain packages. The prototype in `legacy/js/` and `legacy/python/` is frozen and retained as a behavioral regression oracle; see the [Codebase Assessment](docs/engineering/CODEBASE_ASSESSMENT.md) for the full migration map.

---

## Why TileGuard Exists

In 2013, the JavaScript ecosystem had no consistent way to enforce code quality. ESLint didn't add better validators — it built a framework where validation rules are isolated, composable, and community-maintained. That architectural decision is why the ecosystem has thousands of rules today rather than a handful of blessed checkers.

The geospatial ecosystem is in 2013. Teams running tile pipelines discover bugs when users report them. Style regressions survive code review because nothing checks whether a filter expression references a property that doesn't exist. Render changes merge silently because most CI pipelines have no pixel-level gate at all.

TileGuard applies the same proven patterns — rule engines, structured diagnostics, plugin architectures — to geospatial quality assurance. The goal isn't to build another tool; it's to make automated geospatial quality checks as common and expected as linting or unit tests already are.

Read the full vision: [PROJECT_VISION.md](docs/PROJECT_VISION.md) · [PROBLEM_STATEMENT.md](docs/PROBLEM_STATEMENT.md)

---

## Contributing

The primary extension point is writing new rules. A rule is a plain TypeScript object, typically under 25 lines, that plugs into the engine without modifying it. No framework internals to understand, no class hierarchies to navigate.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, the rule authoring guide, and code review expectations.

---

## Presented At

**FOSS4G 2026 — Hiroshima, Japan**
*"Ensuring Tile Quality in MapLibre Through Automated Testing and CI"*

---

## License

[MIT](LICENSE)
