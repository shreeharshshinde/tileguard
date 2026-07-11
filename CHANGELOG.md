# Changelog

All notable changes to TileGuard are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
TileGuard uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- `@tileguard/cli` package — unified `tileguard check` command
- Text and JSON reporters
- `tileguard init` config scaffold command

---

## [0.3.0] — 2026-07-07
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.

<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->

**Image Description / Generation Prompt:** A UML Sequence Diagram visualizing the end-to-end execution pipeline of TileGuard. The actors/objects from left to right are: `User/Shell`, `cli.ts (CLI Entrypoint)`, `loadConfig() (@tileguard/config)`, `Engine (@tileguard/core)`, `RulesRunner (Execution Loop)`, and `Reporters (@tileguard/reporters)`. The execution steps flow sequentially:
1. `User/Shell` runs the CLI check command.
2. `cli.ts` invokes `loadConfig()` to find and parse configuration files.
3. `loadConfig()` returns the validated `TileGuardConfig` object to `cli.ts`.
4. `cli.ts` instantiates the `Engine` with the resolved configuration.
5. `cli.ts` calls `engine.run(sources)`.
6. The `Engine` initializes the `RulesRunner` check loop.
7. The `RulesRunner` fetches and decodes tile/style artifacts, executing matching active rules for each.
8. Rules call `context.report()` to append diagnostics back to the engine.
9. The `Engine` collects all diagnostics and invokes `reporters.report(diagnostics)`.
10. `Reporters` format the diagnostic outputs and write them to the terminal or JSON file.
11. `cli.ts` exits with code 1 if errors were found, or code 0 if none.


This is the first release of the TileGuard framework architecture. All tile and style
validation logic from the legacy prototype has been migrated to independent, configurable rules.

### Added

#### Packages
- **`@tileguard/core`** — Framework contracts: `Diagnostic`, `Artifact`, `Rule`, `Reporter`,
  `Plugin`, `Engine`. The engine orchestrates rule execution, severity overrides, and reporter
  invocation with zero runtime dependencies.
- **`@tileguard/tile-rules`** — 10 vector tile validation rules migrated from `validate.js`:
  - `tile/required-layers` — Required layers must be present
  - `tile/feature-count` — Total feature count within configured bounds
  - `tile/layer-feature-count` — Per-layer feature count within configured bounds
  - `tile/required-properties` — Features must include required properties
  - `tile/coordinate-range` — Coordinates must stay within tile extent
  - `tile/degenerate-geometry` — Geometries must have sufficient unique vertices
  - `tile/unclosed-ring` — Polygon rings must be explicitly closed
  - `tile/zero-area-ring` — Polygon rings must enclose non-zero area
  - `tile/self-intersection` — Line and polygon geometries must not self-intersect
  - `tile/no-empty` — Tiles must contain at least one feature (configurable)
- **`@tileguard/style-rules`** — 9 MapLibre style validation rules migrated from `style-lint.js`:
  - `style/valid-json` — Style file must be valid JSON (short-circuits other rules on failure)
  - `style/version` — Style must declare version 8
  - `style/sources-present` — Top-level `sources` object must be present
  - `style/layers-present` — Top-level `layers` array must be present
  - `style/layer-id-required` — Every layer must declare an `id`
  - `style/unique-layer-id` — Layer IDs must be unique
  - `style/known-source` — Layer `source` references must be declared in `sources`
  - `style/zoom-range` — `minzoom` must not exceed `maxzoom`
  - `style/no-deprecated-ref` — Layers must not use the deprecated `ref` property

#### Tests
- `packages/tile-rules` — 49 tests (pass / fail / edge case per rule)
- `packages/style-rules` — 33 tests (pass / fail / edge case per rule)

#### Fixtures
- `fixtures/good/valid-style.json` — Canonical passing MapLibre style
- `fixtures/bad/broken-style.json` — Multi-rule failure (version, known-source, unique-layer-id, zoom-range)
- `fixtures/bad/invalid-json.json` — Unparseable JSON (triggers `style/valid-json`)
- `fixtures/bad/invalid-version.json` — Version 7 style
- `fixtures/bad/missing-sources.json` — Missing `sources` key
- `fixtures/bad/missing-layers.json` — Missing `layers` key
- `fixtures/bad/missing-layer-id.json` — Layer entry without `id`
- `fixtures/bad/duplicate-layer-id.json` — Two layers sharing the same `id`
- `fixtures/bad/unknown-source.json` — Layer referencing undeclared source
- `fixtures/bad/invalid-zoom-range.json` — Layer with `minzoom > maxzoom`
- `fixtures/bad/deprecated-ref.json` — Layer using deprecated `ref` property
- `fixtures/edge-cases/empty-style.json` — Zero-byte file (graceful no-op)
- `fixtures/edge-cases/minimal-valid-style.json` — Minimal passing style (`version:8, sources:{}, layers:[]`)
- `fixtures/edge-cases/version-as-string.json` — `"version": "8"` (string, not integer)
- `fixtures/edge-cases/sources-null.json` — `"sources": null`
- `fixtures/edge-cases/layers-not-array.json` — `"layers": {}` (object, not array)
- `fixtures/edge-cases/zoom-equal.json` — `minzoom === maxzoom` (valid edge case)
- `fixtures/edge-cases/background-no-source.json` — Background layer without `source` (valid)

#### Documentation
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

- `docs/architecture/` — 9-chapter architecture handbook (01–09)
- `docs/architecture/adr/` — 5 Architecture Decision Records
- `docs/architecture/CORE_CONTRACTS.md` — Full interface reference
- `docs/engineering/MIGRATION_COVERAGE.md` — Legacy → framework rule mapping table
- `docs/engineering/MIGRATION_PLAN.md` — Phased migration plan
- `docs/engineering/IMPLEMENTATION_GUIDELINES.md` — Implementation standards
- `docs/rules/README.md` — Per-rule documentation index
- `docs/rules/style/` — 9 style rule reference pages
- `docs/rules/tile/` — 10 tile rule reference pages

### Changed
- **Breaking:** Diagnostic shape changed from `{ code, message, details[] }` to structured
  `Diagnostic` objects with `ruleId`, `severity`, `location`, `suggestion`, and `data`.
- **Breaking:** Configuration shape changed from legacy flat JSON to the framework config
  (`plugins`, `rules`, `options`). See `MIGRATION_COVERAGE.md` for a field-by-field mapping.

### Deprecated
- Legacy `packages/js/` entry points (`validate.js`, `style-lint.js`, `render-compare.js`)
  remain functional but are superseded by the framework. They will be removed in v1.0.0.

### Fixed
- Style-rules test path resolution (3 failing tests corrected)

---

## [0.2.0] — 2026-06-15 *(prototype)*

Initial prototype: `validate.js`, `style-lint.js`, and `render-compare.js` as standalone scripts
with a basic CLI wrapper. Documented in `docs/archive/`.

---

## [0.1.0] — 2026-06-01 *(prototype)*

Python prototype (`validate.py`). Superseded by the JavaScript implementation.

---

[Unreleased]: https://github.com/shreeharshshinde/tileguard/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/shreeharshshinde/tileguard/releases/tag/v0.3.0
[0.2.0]: https://github.com/shreeharshshinde/tileguard/releases/tag/v0.2.0
[0.1.0]: https://github.com/shreeharshshinde/tileguard/releases/tag/v0.1.0
