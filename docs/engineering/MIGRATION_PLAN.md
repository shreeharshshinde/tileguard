# TileGuard Migration Plan

**Document status:** Active  
**Last updated:** 2026-07-02  
**Author:** TileGuard maintainers

---

## Overview

TileGuard began as a working procedural prototype — a Node.js implementation and a Python implementation that validated vector tiles and style specifications. These prototypes demonstrated the problem is solvable and captured the core algorithms. They are not, however, the architecture that TileGuard will ship as a stable framework.

This document describes the plan for migrating from that prototype to the rule-based framework architecture defined in [`docs/architecture/`](../architecture/README.md). It explains why the legacy code is being preserved, why the new packages start empty, how migration will proceed package by package, and the order in which work should happen.

---

## Why the legacy code is preserved

The legacy implementations in `legacy/js/` and `legacy/python/` are not being deleted. They serve three concrete purposes:

**1. Behavioral reference.** The legacy code encodes working validation logic. Before any framework rule can be considered complete, it must produce identical results to the legacy implementation on the same inputs. The legacy code is the specification for what "correct" means during migration.

**2. Test oracle.** The existing test suite in `legacy/js/test/` and `legacy/python/tests/` can be run against legacy outputs. These tests become the acceptance criteria for new framework rules: a rule is fully migrated when it passes the same tests.

**3. Continuity.** While the framework is being built, the legacy CLI (`legacy/js/bin/tileguard.js`) remains fully functional. Users and CI pipelines that depend on the current behavior are not broken during the migration period.

The legacy directory is intentionally frozen. No new features, refactors, or bug fixes should be applied to `legacy/`. Any discovered bugs should be fixed in the new framework implementation.

---

## Why the new packages start empty

The new `packages/` directory contains scaffold only — `package.json`, `tsconfig.json`, `src/index.ts` with comments, and `README.md`. There is no framework implementation yet.

This is intentional. The architecture must be established before algorithms are migrated into it. Migrating validation logic before the interfaces are stable creates churn: every interface change forces rewrites of migrated code. The correct sequence is:

1. Define the contracts (`@tileguard/core` interfaces).
2. Implement the engine that uses those contracts.
3. Implement reporters that consume those contracts.
4. Migrate domain logic (rules) into the established structure.
5. Wire the CLI to the engine.

Starting with empty packages makes it explicit where work has not yet happened and prevents premature coupling between packages whose interfaces are still being designed.

---

## Repository structure

```text
tileguard/
│
├── docs/                    # Architecture handbook, ADRs, engineering docs
├── fixtures/                # Render regression test fixtures
├── legacy/
│   ├── js/                  # First-generation Node.js prototype (frozen)
│   └── python/              # First-generation Python prototype (frozen)
│
├── packages/
│   ├── core/                # Framework contracts — interfaces only
│   ├── shared/              # Cross-package utilities
│   ├── reporters/           # Built-in output reporters
│   ├── config/              # Configuration loading and resolution
│   ├── tile-rules/          # Vector tile provider + validation rules
│   ├── style-rules/         # Style specification provider + lint rules
│   └── cli/                 # Command-line interface
│
├── examples/                # Integration examples (added as packages stabilise)
├── README.md
├── ROADMAP.md
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

---

## Legacy code inventory and framework mapping

### `legacy/js/src/validate.js`

The tile validation engine. Contains logic for:

| Legacy logic | Target in framework |
|:-------------|:--------------------|
| PBF decoding, layer iteration | `@tileguard/tile-rules` — `TileProvider` (ArtifactProvider) |
| Required layers check | `@tileguard/tile-rules` — `tile/required-layers` rule |
| Coordinate range check | `@tileguard/tile-rules` — `tile/coordinate-range` rule |
| Ring closure and self-intersection checks | `@tileguard/tile-rules` — `tile/geometry-validity` rule |
| Feature count bounds | `@tileguard/tile-rules` — `tile/feature-count` rule |
| Required properties on features | `@tileguard/tile-rules` — `tile/required-properties` rule |
| Geometry helper functions | `@tileguard/shared` — geometry utilities module |

### `legacy/js/src/style-lint.js`

The style specification linter. Contains logic for:

| Legacy logic | Target in framework |
|:-------------|:--------------------|
| JSON loading, style object parsing | `@tileguard/style-rules` — `StyleProvider` (ArtifactProvider) |
| Version check | `@tileguard/style-rules` — `style/version` rule |
| Source reference validation | `@tileguard/style-rules` — `style/known-source` rule |
| Layer ID uniqueness | `@tileguard/style-rules` — `style/layer-ids` rule |
| Zoom range validation | `@tileguard/style-rules` — `style/zoom-range` rule |
| Deprecated `ref` property | `@tileguard/style-rules` — `style/no-ref` rule |

### `legacy/js/src/reporter.js`

Output formatting. Contains logic for:

| Legacy logic | Target in framework |
|:-------------|:--------------------|
| Text output formatting | `@tileguard/reporters` — `textReporter` |
| JSON output formatting | `@tileguard/reporters` — `jsonReporter` |
| Exit code logic | `packages/cli` — exit code handler |

### `legacy/js/src/render-compare.js`

Pixel-level render regression. Contains logic for:

| Legacy logic | Target in framework |
|:-------------|:--------------------|
| Playwright rendering | `@tileguard/tile-rules` (future) or a dedicated `render-rules` package |
| `pixelmatch` comparison | Same package as renderer |
| PNG snapshot loading | `@tileguard/shared` — image utilities (future) |

### `legacy/js/bin/tileguard.js`

The CLI entry point. Contains logic for:

| Legacy logic | Target in framework |
|:-------------|:--------------------|
| Argument parsing (Commander) | `packages/cli` |
| Config file location | `@tileguard/config` |
| Plugin registration | `packages/cli` |
| Artifact file resolution | `packages/cli` |
| Reporter selection | `packages/cli` |

### `legacy/python/tileguard/validate.py`

Python tile validator. The Python implementation covers the same validation domain as the JS validator. It serves as a second behavioral reference for the tile validation rules: any ambiguity in the JS logic can be resolved by checking the Python implementation.

| Legacy logic | Target in framework |
|:-------------|:--------------------|
| Tile structure validation | Cross-reference for `@tileguard/tile-rules` rules |

### `legacy/python/tileguard/reporter.py`

Python reporter. Serves as a reference for JSON output structure consistency.

---

## Migration principles

These principles govern every step of the migration:

1. **Preserve working code until equivalent functionality exists in the new framework.** Do not delete or disable legacy code until the corresponding framework implementation passes the same test suite.

2. **Migrate incrementally, not in one rewrite.** Each migration step should be a small, reviewable, testable change. Big-bang rewrites introduce risk and make it hard to isolate regressions.

3. **Use the legacy implementation as the behavioral reference.** When the framework rule and the legacy logic disagree on a test case, the legacy logic is correct until a deliberate decision is made to change the behavior.

4. **Build the architecture first, then migrate algorithms into that architecture.** Interfaces must be stable before domain logic is written against them.

5. **Keep the repository buildable and testable throughout.** Every commit should leave the repository in a state where `pnpm test` passes on whatever is implemented.

---

## Migration phases

### Phase 1 — Framework contracts (`@tileguard/core`)

**Goal:** Define all the TypeScript interfaces that the rest of the system depends on. No implementation yet.

Deliverables:
- `Diagnostic` interface — rule ID, severity, message, location, suggestion, artifact reference
- `Artifact` and `ArtifactProvider` interfaces
- `Rule` and `RuleContext` interfaces
- `Reporter` interface
- `Engine` interface
- `Plugin` interface (bundles a provider with a set of rules)

All downstream packages are unblocked once this phase is complete, because they compile against interfaces not implementations.

Reference: [`docs/architecture/02-diagnostic-model.md`](../architecture/02-diagnostic-model.md), [`docs/architecture/03-artifact-model.md`](../architecture/03-artifact-model.md), [`docs/architecture/04-rule-system.md`](../architecture/04-rule-system.md)

---

### Phase 2 — Engine and reporters

**Goal:** Implement the orchestration pipeline and the built-in output reporters.

Deliverables:
- `@tileguard/core` — `Engine` implementation: receives an artifact + rule set, runs rules, collects diagnostics
- `@tileguard/reporters` — `textReporter`, `jsonReporter`
- Unit tests for the engine with stub rules
- Unit tests for reporters with fixture diagnostics

The engine can be tested with hand-written stub rules before any real validation logic is migrated. This validates the pipeline independently.

Reference: [`docs/architecture/07-engine.md`](../architecture/07-engine.md), [`docs/architecture/05-reporter-system.md`](../architecture/05-reporter-system.md)

---

### Phase 3 — Configuration loading (`@tileguard/config`)

**Goal:** Implement config file discovery, loading, and resolution.

Deliverables:
- Locate `tileguard.config.ts` / `tileguard.config.js` from the working directory upward
- Validate config schema
- Resolve `'recommended'` preset into concrete rule/severity map
- Merge project-level rule overrides with plugin defaults

Reference: [`docs/architecture/06-configuration.md`](../architecture/06-configuration.md)

---

### Phase 4 — Style rules (`@tileguard/style-rules`)

**Goal:** Migrate all style lint rules from `legacy/js/src/style-lint.js`.

Style rules are chosen before tile rules because they are simpler (operate on JSON, no binary decoding) and can be verified against the existing test suite more easily.

Deliverables per rule (repeat for each):
1. Write the rule against the `@tileguard/core` `Rule` interface
2. Write unit tests using fixture style files
3. Verify the rule produces identical results to the legacy linter on the same inputs
4. Register the rule in `stylePlugin`

Rules: `style/version`, `style/known-source`, `style/layer-ids`, `style/zoom-range`, `style/no-ref`

---

### Phase 5 — Tile rules (`@tileguard/tile-rules`)

**Goal:** Migrate all tile validation rules from `legacy/js/src/validate.js` and cross-reference with `legacy/python/tileguard/validate.py`.

Deliverables:
- `TileProvider` — ArtifactProvider that loads `.pbf` files using `@mapbox/vector-tile` and `pbf`
- Shared geometry utilities in `@tileguard/shared` (ring closure, coordinate math)
- Rules: `tile/required-layers`, `tile/coordinate-range`, `tile/geometry-validity`, `tile/feature-count`, `tile/required-properties`
- Unit tests for each rule; acceptance tests against legacy outputs

---

### Phase 6 — CLI (`packages/cli`)

**Goal:** Implement the `tileguard` CLI wired to the engine.

Deliverables:
- Argument parsing (file paths, `--reporter` flag, `--config` flag)
- Artifact path resolution
- Config loading via `@tileguard/config`
- Plugin registration
- Engine invocation
- Reporter selection and output
- Exit code: `0` if no errors, `1` if any error-severity diagnostics

Behavioral reference: `legacy/js/bin/tileguard.js`

---

### Phase 7 — Feature parity verification

**Goal:** Confirm the new framework reproduces all legacy behavior on all existing fixtures and test cases.

Deliverables:
- Run legacy test suites against both the legacy CLI and the new framework CLI; outputs must match
- Update `README.md` to remove the `legacy/` references and point to the new packages
- Update `.github/workflows/tile-quality.yml` to use the new CLI
- Archive the legacy implementations (keep in `legacy/` but add `FROZEN` notice to each README)

Once this phase is complete, the legacy directory is no longer the primary implementation. It remains as historical reference only.

---

### Phase 8 — SARIF reporter and IDE integration (post-parity)

**Goal:** Add the SARIF reporter for GitHub Code Scanning integration.

This is listed last because it is additive functionality not present in the legacy implementation. It should only be built once the framework is stable.

---

## Dependency order summary

```
Phase 1: @tileguard/core          (no deps)
Phase 2: @tileguard/reporters     (deps: core)
         Engine implementation    (in: core)
Phase 3: @tileguard/config        (deps: core)
Phase 4: @tileguard/style-rules   (deps: core, shared)
Phase 5: @tileguard/shared        (deps: core)
         @tileguard/tile-rules    (deps: core, shared)
Phase 6: packages/cli             (deps: core, config, tile-rules, style-rules, reporters)
Phase 7: Verification             (all packages)
Phase 8: SARIF reporter           (deps: reporters)
```

Note: `@tileguard/shared` is listed in Phase 5 because its contents emerge from the tile validation migration. Geometry utilities that the tile rules need will be extracted there. If a utility is needed earlier (e.g. for style rules), it can be added to `@tileguard/shared` sooner.

---

## What to do if the legacy and framework implementations disagree

If a new framework rule produces a different result than the legacy implementation on the same input:

1. Check whether the input is a valid edge case or a pathological fixture.
2. If the legacy output is correct, fix the framework rule.
3. If the legacy output is wrong (a known bug), document the divergence explicitly in the rule's JSDoc and update the test expectations. Do not silently fix bugs during migration — this makes it impossible to trust the behavioral equivalence.

---

## Glossary

| Term | Definition |
|:-----|:-----------|
| Legacy | The `legacy/js/` and `legacy/python/` directories containing the first-generation prototype |
| Framework | The new `packages/` directory implementing the rule-based architecture |
| Behavioral reference | Using legacy outputs as the correct expectation for new rule tests |
| Feature parity | The state where the framework CLI can replace the legacy CLI without behavior differences |
