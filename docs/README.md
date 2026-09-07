# TileGuard Documentation

Complete documentation for the TileGuard framework. Every document here has a clear home — use this index to find it.

---

## [vision/](./vision/)
Why TileGuard exists and where it's going.

| Document | Contents |
|:---------|:---------|
| [PROJECT_VISION.md](./vision/PROJECT_VISION.md) | The ESLint-for-geospatial analogy, what TileGuard is, and its four core capabilities |
| [PROBLEM_STATEMENT.md](./vision/PROBLEM_STATEMENT.md) | The concrete class of bugs TileGuard closes, with a real-world example |

---

## [architecture/](./architecture/)
System design, interface specifications, and decision records. Start here to understand how TileGuard is built.

| Document | Contents |
|:---------|:---------|
| [README.md](./architecture/README.md) | Handbook index and reading order |
| [CORE_CONTRACTS.md](./architecture/CORE_CONTRACTS.md) | Complete TypeScript interface specifications for every framework contract |
| [ARCHITECTURE_GUIDE.md](./architecture/ARCHITECTURE_GUIDE.md) | Narrative guide to the full system |
| [01-overview.md](./architecture/01-overview.md) | System overview and pipeline |
| [02-diagnostic-model.md](./architecture/02-diagnostic-model.md) | The Diagnostic contract — the most important abstraction |
| [03-artifact-model.md](./architecture/03-artifact-model.md) | How geospatial artifacts are represented |
| [04-rule-system.md](./architecture/04-rule-system.md) | Rule authoring, plugin system, execution model |
| [05-reporter-system.md](./architecture/05-reporter-system.md) | Reporter contract and output pipeline |
| [06-configuration.md](./architecture/06-configuration.md) | Config file discovery, schema, and resolution |
| [07-engine.md](./architecture/07-engine.md) | Orchestration engine internals |
| [08-package-structure.md](./architecture/08-package-structure.md) | Monorepo layout and dependency rules |
| [adr/](./architecture/adr/) | Architecture Decision Records (ADR-001 through ADR-011) |

---

## [rules/](./rules/)
Per-rule reference documentation for all 21 built-in rules.

| Document | Contents |
|:---------|:---------|
| [README.md](./rules/README.md) | Rules index with descriptions and severity |
| [tile/](./rules/tile/) | 12 vector tile validation rules |
| [style/](./rules/style/) | 9 MapLibre style lint rules |

---

## [engineering/](./engineering/)
Active engineering reference for contributors and maintainers.

| Document | Contents |
|:---------|:---------|
| [IMPLEMENTATION_GUIDELINES.md](./engineering/IMPLEMENTATION_GUIDELINES.md) | Authoritative coding conventions, naming, imports, testing, release engineering |
| [CROSS_TILE_COORDINATE_PROBLEM.md](./engineering/CROSS_TILE_COORDINATE_PROBLEM.md) | Open research question on cross-tile coordinate false positives |
| [investigations/](./engineering/investigations/) | Phase investigation journals (Phase 1 & 2) |

---

## [specs/](./specs/)
Product and technical specifications.

| Document | Contents |
|:---------|:---------|
| [PRODUCT_SPEC.md](./specs/PRODUCT_SPEC.md) | Inspector UI product specification — authoritative source of truth for `packages/inspector` |
| [REPORT_SPEC.md](./specs/REPORT_SPEC.md) | Report structure, schema v2, and format specifications for `@tileguard/reporters` |
| [DOCUMENTATION_SITE_PLAN.md](./specs/DOCUMENTATION_SITE_PLAN.md) | VitePress docs site implementation plan and design system |

---

## [foss4g/](./foss4g/)
Materials prepared for the FOSS4G 2026 Hiroshima talk.

| Document | Contents |
|:---------|:---------|
| [FOSS4G_DEMO.md](./foss4g/FOSS4G_DEMO.md) | Full 20-minute live demo script |
| [FOSS4G_SHORT.md](./foss4g/FOSS4G_SHORT.md) | Short-form talk summary |
| [FOSS4G_RULE_AUDIT.md](./foss4g/FOSS4G_RULE_AUDIT.md) | Deep algorithm audit of every rule — all claims traced to source code |
| [GROUND_TRUTH_REFERENCE.md](./foss4g/GROUND_TRUTH_REFERENCE.md) | Single source of truth for every factual claim in the talk |
| [FAQ.md](./foss4g/FAQ.md) | Anticipated questions from FOSS4G and the community |
| [REAL_WORLD_FINDING.md](./foss4g/REAL_WORLD_FINDING.md) | Real self-intersection defect found in Tokyo production tile |

---

## [api/](./api/)
Generated TypeDoc API reference. Rebuilt automatically via `pnpm docs`.

---

## [archive/](./archive/)
Superseded and completed documents. Retained for historical reference — not actively maintained.

| Document | Contents |
|:---------|:---------|
| [ROADMAP.md](./archive/ROADMAP.md) | Original dual-track execution roadmap (pre-v0.5.0) |
| [README_v2_spec.md](./archive/README_v2_spec.md) | Superseded v2 remodified specification |
| [ARCHITECTURE_legacy.md](./archive/ARCHITECTURE_legacy.md) | Legacy architecture document (pre-framework) |
| [PROJECT_OUTCOMES.md](./archive/PROJECT_OUTCOMES.md) | 174 desired outcomes mapped to semantic versions |
| [CURRENT_CODEBASE_ASSESSMENT.md](./archive/CURRENT_CODEBASE_ASSESSMENT.md) | Pre-migration prototype assessment (migration complete as of v0.5.0-beta.1) |
| [MIGRATION_PLAN.md](./archive/MIGRATION_PLAN.md) | Legacy-to-framework migration plan (completed) |
| [MIGRATION_COVERAGE.md](./archive/MIGRATION_COVERAGE.md) | Proof of coverage — every legacy check mapped to a framework rule |
