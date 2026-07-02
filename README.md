# TileGuard 🛡️

**The quality analysis framework for geospatial software.**

TileGuard brings automated quality gates to the geospatial ecosystem — the same engineering discipline that ESLint, Ruff, and pytest provide for application code, applied to vector tiles, style specifications, and map rendering.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![FOSS4G 2026](https://img.shields.io/badge/Presented%20at-FOSS4G%202026%20Hiroshima-red)](https://2026.foss4g.org)

---

## The Problem

Map tile bugs are **silent**. A road layer disappears at zoom 14. A polygon self-intersects and causes an invisible render failure. A style expression references a property that doesn't exist. These regressions survive code review because there are no automated checks — they're discovered when a user reports them, often weeks after the change that caused them.

The broader software engineering ecosystem solved this long ago with lint tools, test frameworks, and CI pipelines. The geospatial ecosystem has not. Teams still rely on manual visual inspection to catch tile and rendering bugs.

**TileGuard closes this gap.** It provides configurable, automated quality gates that validate tile structures, lint style specifications, and detect visual regressions — all integrated into standard CI/CD workflows.

---

## What TileGuard Is (and Is Not)

TileGuard is a **framework**, not a collection of scripts. Its core is a rule engine that discovers validation rules, routes geospatial artifacts to the rules that understand them, collects structured diagnostics, and hands those diagnostics to reporter backends. The core engine validates nothing — the rules validate everything.

TileGuard is **not** a rendering engine, a tile server, or a GIS desktop application. It does not generate tiles or replace MapLibre's internal test suite. It acts as an independent quality assurance layer that integrates with existing tools and improves developer workflows.

---

## How It Works

```
  Source (tile.pbf, style.json)
         │
         ▼
  ┌─────────────────────┐
  │   Artifact Provider  │  ── Loads, detects format, decodes
  └─────────────────────┘
         │
         ▼  Decoded Artifact
  ┌─────────────────────┐
  │     Rule Engine      │  ── Routes artifact to matching rules
  └─────────────────────┘
         │
         ▼  Diagnostic[]
  ┌─────────────────────┐
  │      Reporter        │  ── Formats output (text, JSON, SARIF)
  └─────────────────────┘
         │
         ▼
    Terminal / CI / IDE
```

**Artifacts** are the things being validated — vector tiles, style specifications, render snapshots. **Artifact Providers** load and decode them. **Rules** are small, independent, deterministic functions that validate one concern each. **Diagnostics** are the structured results — every rule produces them, every reporter consumes them. **Reporters** transform diagnostics into output formats.

The key insight: rules never print output. Reporters never validate. The engine connects them. This separation means adding a new validation check never requires changing output formatting, and adding a new output format never requires changing validation logic.

---

## Capabilities

### Tile Validation

Validates vector tile structure, geometry, feature metadata, and content.

| Check | What it catches |
|:------|:----------------|
| Required layers | Missing layers in the tile |
| Coordinate range | Coordinates outside tile extent |
| Geometry validity | Unclosed rings, self-intersections, degenerate polygons, zero-area rings |
| Feature count | Too many or too few features (global and per-layer) |
| Required properties | Missing properties on features |

### Style Linting

Validates MapLibre style specifications against structural and semantic rules.

| Check | What it catches |
|:------|:----------------|
| Version | Style version must be `8` |
| Source references | Layers referencing non-existent sources |
| Layer IDs | Missing or duplicate layer identifiers |
| Zoom ranges | `minzoom` greater than `maxzoom` |
| Deprecated properties | Usage of unsupported `ref` property |

### Render Regression Testing

Compares deterministic render outputs against reference images using perceptual pixel comparison. Catches visual regressions that structural validation cannot detect.

### CI Integration

A ready-made GitHub Actions workflow that runs all quality gates in a tiered pipeline: fast checks first (style lint), structural checks next (tile validation), expensive checks last (render tests). One file to copy, zero configuration required.

---

## Quick Start

```bash
# Validate a vector tile
npx tileguard check ./tile.pbf

# Lint a MapLibre style
npx tileguard check ./style.json

# Validate multiple sources
npx tileguard check ./tile.pbf ./style.json

# JSON output for CI integration
npx tileguard check ./tile.pbf --reporter json
```

### Configuration

Create a `tileguard.config.ts` at your project root to customize rules:

```typescript
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

export default {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/self-intersection': 'warning',
    'tile/no-empty': 'off',
    'style/known-source': 'error',
  },
};
```

Rules can be set to `'error'`, `'warning'`, `'info'`, or `'off'`. Rules with configurable options use the `[severity, options]` tuple format. Without a config file, TileGuard runs all recommended rules at their default severities.

### CI Pipeline

Copy the workflow file into your repository:

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

Every pull request now runs automated quality checks before merge.

---

## Writing a Rule

A rule is a plain object. No base classes, no decorators, no magic.

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
      if (layer.minzoom !== undefined && layer.maxzoom !== undefined && layer.minzoom > layer.maxzoom) {
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

The engine automatically fills in `ruleId`, `severity`, `artifact`, and `docsUrl` from the rule's metadata. The rule only provides the `message`, `location`, and optional `suggestion`. This keeps rules short, focused, and free of boilerplate.

---

## Architecture

TileGuard is built as a monorepo of focused packages:

| Package | Responsibility |
|:--------|:---------------|
| `@tileguard/core` | Framework contracts: Diagnostic, Artifact, Rule, Reporter, Engine |
| `@tileguard/tile-rules` | Vector tile provider + all tile validation rules |
| `@tileguard/style-rules` | Style specification provider + all style lint rules |
| `tileguard` (CLI) | Command-line interface, config loading, built-in reporters |

Dependencies always point inward. Domain packages depend on Core. Core depends on nothing. Domain packages are independent of each other — a project using only tile validation never loads the style linter.

### Architectural Principles

1. **Contracts before implementation.** Components interact through explicit interfaces. Implementations are replaceable.
2. **Dependencies point inward.** Core has zero dependencies on outer packages.
3. **Rules are pure.** Given an artifact and config, a rule produces only diagnostics. No side effects.
4. **Diagnostics are the universal language.** Every validation result is a structured `Diagnostic`. Every reporter consumes the same type.
5. **Composition over inheritance.** Rules and reporters are plain objects, not class hierarchies.
6. **Explicit over clever.** Flat configuration, clear error messages, no magic.

### Architecture Handbook

The complete architectural specification — including interface definitions, design rationale, alternatives considered, and implementation roadmap — lives in the [Architecture Handbook](docs/architecture/README.md):

| Document | Contents |
|:---------|:---------|
| [Architecture Overview](docs/architecture/01-overview.md) | System design, component map, run pipeline |
| [Diagnostic Model](docs/architecture/02-diagnostic-model.md) | The universal contract between rules and reporters |
| [Artifact Model](docs/architecture/03-artifact-model.md) | Artifacts, providers, loading lifecycle |
| [Rule System](docs/architecture/04-rule-system.md) | Rule interface, context, registration, examples |
| [Reporter System](docs/architecture/05-reporter-system.md) | Reporter interface, built-in reporters |
| [Configuration](docs/architecture/06-configuration.md) | Config schema, resolution, presets |
| [Engine](docs/architecture/07-engine.md) | Core orchestration pipeline |
| [Package Structure](docs/architecture/08-package-structure.md) | Monorepo layout, dependency rules |
| [Implementation Roadmap](docs/architecture/09-implementation-roadmap.md) | Phased milestones |

### Architecture Decision Records

Key design decisions are documented as ADRs:

| ADR | Decision |
|:----|:---------|
| [ADR-001](docs/architecture/adr/001-typescript-reference-implementation.md) | TypeScript as the single reference implementation |
| [ADR-002](docs/architecture/adr/002-rule-based-architecture.md) | Rule-based validation over procedural validators |
| [ADR-003](docs/architecture/adr/003-diagnostic-as-contract.md) | Structured diagnostics as universal interface |
| [ADR-004](docs/architecture/adr/004-direct-artifact-access.md) | Direct artifact access over visitor pattern |
| [ADR-005](docs/architecture/adr/005-flat-configuration.md) | Flat configuration over cascading config |

---

## Project Status

TileGuard is in active development, transitioning from a working procedural prototype to the framework architecture described above.

| Component | Status |
|:----------|:-------|
| Architecture handbook | ✅ Complete |
| Core framework (`@tileguard/core`) | 🔨 In progress |
| Tile validation rules | 📋 Planned (prototype logic exists) |
| Style lint rules | 📋 Planned (prototype logic exists) |
| CLI | 📋 Planned |
| Render regression | 📋 Planned |
| CI workflow | ✅ Complete (existing) |

The existing prototype in `packages/js/` and `packages/python/` demonstrates the validation logic that will be decomposed into framework rules. The [Implementation Roadmap](docs/architecture/09-implementation-roadmap.md) describes the phased migration plan.

---

## Why TileGuard Exists

In 2013, the JavaScript ecosystem had no consistent way to enforce code quality. ESLint changed this — not by writing better validators, but by creating a framework where validation rules are isolated, composable, and community-maintained.

The geospatial ecosystem is in 2013. Teams running tile pipelines discover bugs when users report them. Style regressions survive code review because no tool checks whether a filter expression references a property that doesn't exist. Render changes merge silently because the CI pipeline has no pixel-level gate.

TileGuard is the framework that changes this. It applies proven patterns — rule engines, structured diagnostics, plugin architectures — to geospatial quality assurance. The long-term objective is not to build a tool, but to make automated geospatial quality gates as common and expected as linting or unit testing.

Read the full vision: [Project Vision](docs/PROJECT_VISION.md)

---

## Contributing

TileGuard is designed for community contribution. The primary extension point is writing new rules — a rule is a plain object with fewer than 25 lines of validation logic.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

---

## Presented At

**FOSS4G 2026 — Hiroshima, Japan**
*"Ensuring Tile Quality in MapLibre Through Automated Testing and CI"*

---

## License

[MIT](LICENSE)