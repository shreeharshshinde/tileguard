# TileGuard Ground-Truth Reference

> **Purpose:** Single source of truth for the FOSS4G 2026 Hiroshima talk.
> Every claim in this document is traced to actual source code. If something
> could not be verified, it is explicitly marked `NOT FOUND / NOT VERIFIED IN CODEBASE`.
>
> **Generated:** 2026-08-09 from commit state on disk.

---

## 1. Project Identity

### Monorepo Root

| Field | Value | Source |
|:------|:------|:-------|
| Name | `tileguard-monorepo` | `package.json` → `name` |
| Version | `0.5.0-beta.1` | `package.json` → `version` |
| Description | "TileGuard — the quality analysis framework for geospatial software" | `package.json` → `description` |
| License | MIT | `package.json` → `license` |
| Package Manager | pnpm 9.15.9 | `package.json` → `packageManager` |
| Node Requirement | ≥20.0.0 | `package.json` → `engines.node` |

### All Packages

| Package | Version | Published | Description (from package.json) |
|:--------|:--------|:----------|:-------------------------------|
| `@tileguard/core` | 0.5.0-beta.1 | public | Framework contracts: Diagnostic, Artifact, Rule, Reporter, Engine — the foundation of TileGuard |
| `@tileguard/shared` | 0.5.0-beta.1 | public | Shared utilities and helpers used across TileGuard packages |
| `@tileguard/tile-rules` | 0.5.0-beta.1 | public | Vector tile (MVT) provider and 10 validation rules for TileGuard |
| `@tileguard/style-rules` | 0.5.0-beta.1 | public | MapLibre style specification provider and 9 style lint rules for TileGuard |
| `@tileguard/config` | 0.5.0-beta.1 | public | Configuration loading, schema validation, and preset resolution for TileGuard |
| `@tileguard/reporters` | 0.5.0-beta.1 | public | Output reporters for TileGuard: text, JSON, Markdown, and HTML engineering reports |
| `@tileguard/analysis` | 0.5.0-beta.1 | public | Comparison and regression analysis engine for TileGuard |
| `@tileguard/cli` | 0.5.0-beta.1 | public | Command-line interface for TileGuard — automated quality gates for geospatial software |
| `@tileguard/inspector` | 0.5.0-beta.1 | **private** | Visual debugging environment for TileGuard — renders MVT geometry and diagnostic overlays in the browser |

### Actual Dependency Graph (Import-Verified)

Derived by scanning every `import` statement in every `src/**/*.ts` file across all packages:

```
Package             → Depends On (via real imports)
────────────────────────────────────────────────────
core                → (none — zero runtime deps confirmed)
shared              → (none — placeholder, no actual code exports)
tile-rules          → core
style-rules         → core
config              → core (+ jiti as npm dep)
reporters           → core
analysis            → core
cli                 → core, config, reporters, analysis, tile-rules, style-rules
                      (+ commander, fast-glob as npm deps)
inspector           → core, tile-rules, style-rules, analysis, reporters
                      (+ react, react-dom, framer-motion, lucide-react, etc.)
```

**Key observations:**
- `@tileguard/shared` declares `@tileguard/core` as a dependency in package.json, but its `src/index.ts` is a placeholder with zero actual exports and zero imports. No other package imports from `@tileguard/shared` in source code.
- `@tileguard/inspector` imports from `@tileguard/style-rules/analysis` (in 2 component files: `StyleExplorerPage.tsx`, `StylePage.tsx`). This contradicts the earlier sub-agent finding — the inspector DOES depend on style-rules.
- No circular dependencies exist. The graph is a strict DAG.

---

## 2. Architecture, As It Actually Exists Today

### Core Contracts (`packages/core/src/`)

**Diagnostic** (`diagnostic.ts`): The universal, immutable record describing one validation finding. Exports `Severity` (union: `'error' | 'warning' | 'info'`), `ArtifactRef` (type + source + optional label), `Location` (layer, featureIndex, partIndex, jsonPath, line, column, region — all optional), `DiagnosticDescriptor` (what a rule passes to `context.report()`), and `Diagnostic` (the full record with ruleId, severity, message, artifact, location, suggestion, docsUrl, data). Every diagnostic is readonly and JSON-serializable.

**Artifact** (`artifact.ts`): The decoded in-memory content that rules validate. Exports `Artifact<T, C>` (generic: type discriminant + ref + decoded content + optional metadata), `ProviderOptions` (timeout, headers), and `ArtifactProvider` (id, artifactTypes, canHandle(), load()). Providers load and decode files; artifacts are the decoded result.

**Rule** (`rule.ts`): The primary extension mechanism — a plain object, no base class. Exports `RuleMeta` (description, defaultSeverity, docsUrl, recommended, since), `RuleContext<C>` (artifact, options, report()), and `Rule<C>` (id, meta, artifactTypes, optional schema, create()). A rule's `create()` function receives a context and calls `context.report()` for each finding.

**Plugin** (`plugin.ts`): The unit of extensibility that bundles providers and rules for a domain. Exports `Plugin` (id, optional name/version, optional providers[], optional rules[]). Plain object, no registration ceremony.

**Reporter** (`reporter.ts`): Transforms diagnostics into formatted output. Exports `ReporterContext` (duration, sources, ruleCount, artifactCount, summary with pass/fail, config) and `Reporter` (id, report()). Called once per run after all rules complete. Reporters never validate; rules never print.

**Config** (`config.ts`): The user-facing and internal configuration system. Exports `RuleConfig` (severity | 'off' | [severity, options]), `GlobalOptions` (timeout, maxDetails, maxDiagnostics), `Override` (files + rules), `TileGuardConfig` (plugins, rules, reporter, overrides, options — all optional), `ResolvedRuleConfig`, `ResolvedOverride`, and `ResolvedConfig` (the fully-resolved internal form used by the engine).

**Engine** (`engine.ts`): The orchestrator. Exports `RunSummary` (errors, warnings, infos, sourceCount, artifactCount, ruleExecutions, duration, pass), `RunResult` (diagnostics + summary), `Engine` (run(sources)), `EngineOptions`, and `createEngine()` — the sole value export from the entire core package. The engine: resolves config → finds providers → loads artifacts → applies overrides → runs matching rules → collects diagnostics (with maxDiagnostics/maxDetails caps) → sorts deterministically → invokes reporter → returns RunResult.

### Real Dependency Diagram (ASCII)

```
                         ┌──────────┐
                         │   core   │  (zero runtime deps)
                         └────┬─────┘
          ┌────────┬─────────┼─────────┬──────────┬──────────┐
          ▼        ▼         ▼         ▼          ▼          ▼
    tile-rules  style-    config    reporters  analysis    shared
                rules                                    (placeholder)
          │        │         │         │          │
          └────┬───┴────┬────┴────┬────┴─────┬────┘
               ▼        ▼        ▼           ▼
            ┌─────┐              ┌───────────────┐
            │ cli │              │   inspector   │
            └─────┘              └───────────────┘
```

### Drift From Documentation

| Aspect | Docs/ADR Claim | Actual Code | Status |
|:-------|:---------------|:------------|:-------|
| Shared package | "Cross-package utilities" | Placeholder — zero exports, zero consumers | ⚠️ DRIFT |
| Inspector → style-rules | Dependency graph sub-agent initially said "does NOT import style-rules" | 2 component files import from `@tileguard/style-rules/analysis` | Corrected above |
| CLI command count | README: "CLI with 10 commands" | 10 top-level commands registered (check, init, rules, compare, analyze, report, stats, doctor, style, ver) with 3 subcommands under `rules` (list, explain, docs) = 12 distinct command actions | ⚠️ DISCREPANCY |

---

## 3. Every Rule, Fully Inventoried

**Total: 19 rules (10 tile + 9 style)**

Counted by reading every file in `packages/tile-rules/src/rules/` and `packages/style-rules/src/rules/`, extracting the `id`, `meta.defaultSeverity`, and `meta.description` fields from each rule object.

### Tile Validation Rules (`@tileguard/tile-rules`) — 10 rules

Source: `packages/tile-rules/src/rules/*.ts`
Plugin export: `tilePlugin` (id: `'tile-rules'`, version: `'0.3.0'`)

| # | Rule ID | Export | Default Severity | Description | Options |
|:--|:--------|:-------|:----------------|:------------|:--------|
| 1 | `tile/required-layers` | `requiredLayersRule` | `error` | Required vector tile layers must be present. | `{ layers?: string[] }` + JSON Schema |
| 2 | `tile/feature-count` | `featureCountRule` | `warning` | Vector tiles must satisfy configured total feature count bounds. | `{ min?, max?, minFeatures?, maxFeatures? }` |
| 3 | `tile/layer-feature-count` | `layerFeatureCountRule` | `warning` | Vector tile layers must satisfy configured per-layer feature count bounds. | `{ layers?, layerConfig? }` |
| 4 | `tile/required-properties` | `requiredPropertiesRule` | `error` | Vector tile features must include configured required properties. | `{ layers?, requiredProperties?, [layerName]: string[] }` |
| 5 | `tile/coordinate-range` | `coordinateRangeRule` | `error` | Vector tile coordinates must stay within each layer extent. | `{ buffer?, excludeLayers?, skipCrossTileFeatures? }` |
| 6 | `tile/degenerate-geometry` | `degenerateGeometryRule` | `error` | Vector tile geometries must have enough unique vertices for their type. | None |
| 7 | `tile/unclosed-ring` | `unclosedRingRule` | `error` | Polygon rings in vector tiles must be closed. | None |
| 8 | `tile/zero-area-ring` | `zeroAreaRingRule` | `error` | Polygon rings in vector tiles must have non-zero area. | None |
| 9 | `tile/self-intersection` | `selfIntersectionRule` | `error` | Vector tile line and polygon geometries must not self-intersect. | None |
| 10 | `tile/no-empty` | `noEmptyRule` | `warning` | Vector tiles should contain at least one feature unless empty tiles are explicitly allowed. | `{ allowEmpty?: boolean }` |

Severity breakdown: 7 error, 3 warning.

**Note:** Only `requiredLayersRule` has a formal `schema` property (JSON Schema object) on the rule definition. Other rules with options use TypeScript interfaces but have no runtime JSON Schema.

### Style Lint Rules (`@tileguard/style-rules`) — 9 rules

Source: `packages/style-rules/src/rules/*.ts`
Plugin export: `stylePlugin` (id: `'style-rules'`, version: `'0.4.0'`)

| # | Rule ID | Export | Default Severity | Description | Options |
|:--|:--------|:-------|:----------------|:------------|:--------|
| 1 | `style/valid-json` | `validJsonRule` | `error` | Style files must contain valid JSON. | None |
| 2 | `style/version` | `versionRule` | `error` | Style specifications must declare MapLibre style version 8. | None |
| 3 | `style/sources-present` | `sourcesPresentRule` | `error` | Style specifications must include a top-level sources object. | None |
| 4 | `style/layers-present` | `layersPresentRule` | `error` | Style specifications must include a top-level layers array. | None |
| 5 | `style/layer-id-required` | `layerIdRequiredRule` | `error` | Every style layer must declare a non-empty id. | None |
| 6 | `style/unique-layer-id` | `uniqueLayerIdRule` | `error` | Style layer ids must be unique. | None |
| 7 | `style/known-source` | `knownSourceRule` | `error` | Style layer source references must point to declared sources. | None |
| 8 | `style/zoom-range` | `zoomRangeRule` | `error` | Style layer minzoom values must not exceed maxzoom values. | None |
| 9 | `style/no-deprecated-ref` | `noDeprecatedRefRule` | `warning` | Style layers must not use the deprecated ref property. | None |

Severity breakdown: 8 error, 1 warning. All style rules are zero-config (no options).

### Common Rule Metadata

All 19 rules share: `recommended: true`, `since: '0.3.0'`, and `docsUrl` pointing to `https://tileguard.dev/rules/{ruleId}`.

---

## 4. Test Suite — Real, Current Numbers

Verified by running `pnpm test` across the monorepo on 2026-08-09. All tests pass.

### Per-Package Breakdown

| Package | Test Files | Tests Passed | Runner |
|:--------|:-----------|:-------------|:-------|
| `@tileguard/core` | 1 | 27 | vitest |
| `@tileguard/shared` | 0 | 0 | node --test (no test files exist) |
| `@tileguard/config` | 5 | 103 | vitest |
| `@tileguard/analysis` | 1 | 19 | vitest |
| `@tileguard/reporters` | 4 | 92 | vitest |
| `@tileguard/tile-rules` | 12 | 81 | vitest |
| `@tileguard/style-rules` | 17 | 198 | vitest |
| `@tileguard/cli` | 19 | 216 | vitest |
| `@tileguard/inspector` | 40 | 899 | vitest |
| **TOTAL** | **99** | **1,635** | — |

**Status:** 1,635 tests, 0 failures, 99 test files.

### Rule Test Coverage

**All 10 tile rules have dedicated test files** in `packages/tile-rules/tests/rules/`:
- `coordinate-range.test.ts` (18 tests)
- `self-intersection.test.ts` (18 tests)
- `degenerate-geometry.test.ts` (5 tests)
- `feature-count.test.ts` (5 tests)
- `layer-feature-count.test.ts` (5 tests)
- `no-empty.test.ts` (4 tests)
- `required-layers.test.ts` (4 tests)
- `required-properties.test.ts` (4 tests)
- `unclosed-ring.test.ts` (4 tests)
- `zero-area-ring.test.ts` (4 tests)

**All 9 style rules have dedicated test files** in `packages/style-rules/tests/rules/`:
- `known-source.test.ts` (3 tests)
- `layer-id-required.test.ts` (3 tests)
- `layers-present.test.ts` (3 tests)
- `no-deprecated-ref.test.ts` (3 tests)
- `sources-present.test.ts` (3 tests)
- `unique-layer-id.test.ts` (3 tests)
- `valid-json.test.ts` (3 tests)
- `version.test.ts` (3 tests)
- `zoom-range.test.ts` (4 tests)

Additionally, `style-rules` has deeper testing of internal architecture: parser (45 + 26 + 19 tests), resolver (11 tests), validator (22 tests), and analysis service (24 tests).

### Discrepancy Check

No prior documentation in this repo claims a specific test count to disagree with. The README does not cite a test count. The number 1,635 is the current verified count.

---

## 5. The CLI, As It Actually Works

Source: `packages/cli/src/bin.ts` + `packages/cli/src/commands/*.ts`

### Command Inventory

| # | Command | Source File | Description |
|:--|:--------|:-----------|:------------|
| 1 | `check <sources...>` | `commands/check.ts` | Validate geospatial artifacts against configured rules |
| 2 | `init` | `commands/init.ts` | Create a starter tileguard.config.ts |
| 3 | `rules list` | `commands/rules.ts` | List all rules from configured plugins |
| 4 | `rules explain <ruleId>` | `commands/rules.ts` | Print detailed explanation for a rule (stub — returns "coming soon") |
| 5 | `rules docs <ruleId>` | `commands/rules.ts` | Open documentation for a rule (stub — returns "coming soon") |
| 6 | `compare <before> <after>` | `commands/compare.ts` | Compare two vector tiles |
| 7 | `analyze <before> <after>` | `commands/analyze.ts` | Full analysis: comparison + regression |
| 8 | `report <before> <after>` | `commands/report.ts` | Generate engineering report (Markdown/HTML/JSON) |
| 9 | `stats <file>` | `commands/stats.ts` | Display tile statistics |
| 10 | `doctor` | `commands/doctor.ts` | Health check: config, rules, parser, reporters |
| 11 | `style <file>` | `commands/style.ts` | Analyze a MapLibre style specification |
| 12 | `ver` | `commands/version.ts` | Display detailed version information |

**Count:** 10 top-level commands, 3 subcommands under `rules` = 12 distinct command actions.

**⚠️ DISCREPANCY:** README states "CLI with 10 commands". Actual count is 10 top-level + 2 subcommands beyond `rules list` (explain, docs are stubs). Depending on counting methodology this is either accurate (10 top-level) or inaccurate (12 actions).

### Flags Per Command

**`check`**: `-c, --config <path>`, `-r, --reporter <id>` (text|json), `--max-diagnostics <n>`
**`init`**: `--force`
**`rules list`**: `-c, --config <path>`, `-f, --format <format>` (text|json)
**`compare`**: `--json`, `-o, --output <path>`, `-v, --verbose`, `--debug`, `-q, --quiet`, `-c, --config <path>`
**`analyze`**: `--json`, `-o, --output <path>`, `-v, --verbose`, `--debug`, `-q, --quiet`, `-c, --config <path>`
**`report`**: `-f, --format <format>` (markdown|html|json), `-o, --output <path>`, `-v, --verbose`, `--debug`, `-q, --quiet`, `-c, --config <path>`
**`stats`**: `--json`, `-v, --verbose`, `--debug`, `-q, --quiet`, `-c, --config <path>`
**`doctor`**: `-v, --verbose`, `--debug`, `-c, --config <path>`
**`style`**: `--json`, `-v, --verbose`, `--debug`, `-q, --quiet`, `-c, --config <path>`
**`ver`**: `--json`

### Exit Codes

| Code | Meaning |
|:-----|:--------|
| 0 | Pass / success (no errors, no regressions, generation succeeded) |
| 1 | Fail / warnings (diagnostics exist, tiles changed, regressions with low severity) |
| 2 | Usage/config error, OR regressions found (analyze), OR style has errors, OR doctor failures |
| 3 | I/O or generation failure (report generation, file read failure) |

Per-command specifics:
- **check**: 0 = pass, 1 = fail (diagnostics), 2 = config error
- **init**: 0 = created, 2 = file exists without --force
- **compare**: 0 = tiles identical, 1 = tiles changed
- **analyze**: 0 = regression clean, 2 = regressions found
- **report**: 0 = clean, 1 = regressions, 3 = generation failed
- **doctor**: 0 = pass, 1 = warnings, 2 = failures
- **style**: 0 = valid, 1 = warnings, 2 = errors, 3 = read failure

### Full Call Chain: `tileguard check ./tile.pbf`

```
bin.ts
  └─ Commander parses argv → matches 'check' command
     └─ .action(sources, flags)
        └─ runCheck(sources, flags)            [commands/check.ts]
           ├─ loadConfig(options)              [@tileguard/config]
           │   ├─ findConfigFile(cwd)          [config/finder.ts] — upward search
           │   ├─ loadConfigFile(path)         [config/loader.ts] — jiti or JSON.parse
           │   └─ validateConfig(raw)          [config/validator.ts]
           ├─ expandSources(sources)           [expand-sources.ts] — resolve globs
           ├─ mergeConfig(fileConfig, flags)   [merge-config.ts] — CLI overrides file
           ├─ resolveReporterById(id)          [resolve-reporter.ts] → text|json reporter
           ├─ createEngine({...config})        [@tileguard/core engine.ts]
           │   └─ Resolves plugins, rules, providers, reporter, options
           └─ engine.run(expandedSources)      [@tileguard/core engine.ts]
               ├─ For each source: find provider → load artifact
               ├─ For each artifact: apply overrides → run matching rules
               ├─ Collect diagnostics (with caps)
               ├─ Sort deterministically
               ├─ Invoke reporter
               └─ Return { diagnostics, summary: { pass, errors, warnings, ... } }
bin.ts
  └─ present(result)
     ├─ stderr ← result.message
     ├─ stdout ← result.output
     └─ process.exit(result.exitCode)
```

---

## 6. Configuration System

Source: `packages/config/src/` (index.ts, finder.ts, loader.ts, validator.ts, errors.ts)

### Supported Config File Formats

| Extension | Loading Method | Plugin Support |
|:----------|:--------------|:---------------|
| `.ts` | jiti runtime import | ✅ Yes |
| `.js` | jiti runtime import | ✅ Yes |
| `.mjs` | jiti runtime import | ✅ Yes |
| `.json` | fs.readFileSync + JSON.parse | ❌ No (error if plugins attempted) |

### File Discovery Order

Function: `findConfigFile(cwd?, stopAt?)` in `finder.ts`

Searches **upward** from `cwd`, checking each directory for filenames in priority order:

1. `tileguard.config.ts` (preferred)
2. `tileguard.config.js`
3. `tileguard.config.mjs`
4. `tileguard.config.json`

Stops when: file found (returns absolute path), `stopAt` boundary reached (returns undefined), or filesystem root reached (returns undefined).

When no config file found and no explicit `--config` path provided: `loadConfig()` returns empty config `{}` — engine uses all defaults.

### Public API

- **`loadConfig(options?: LoadConfigOptions): Promise<LoadConfigResult>`** — Primary entry point (index.ts). Discovers, loads, validates. Returns `{ config, configPath, warnings }`.
- **`findConfigFile(cwd?, stopAt?): string | undefined`** — Synchronous upward search (finder.ts).
- **`CONFIG_FILENAMES`** — Exported constant array of filename priorities (finder.ts).
- **`loadConfigFile(configPath): Promise<LoadedConfig>`** — Dispatches to JSON or module loader (loader.ts).
- **`validateConfig(value, options?): ValidateConfigResult`** — Full schema validation (validator.ts).
- **`isValidRuleConfig(value): boolean`** — Type guard for rule config entries (validator.ts).

### Validation Behavior

- **Single-pass** — never short-circuits on first error; user sees ALL issues at once.
- Issues have severity `'error'` or `'warning'`.
- `ConfigValidationError` thrown **only** when ≥1 error-severity issue exists.
- Warning-only results (e.g., unknown top-level keys) returned in `warnings[]`.

Validated fields: `plugins` (array of objects with string id), `rules` (object mapping ruleId → RuleConfig), `reporter` (string or [string, object] tuple), `overrides` (array with files + rules), `options` (timeout, maxDetails, maxDiagnostics — numbers if present). Unknown keys → warning (non-blocking).

### Error Classes (errors.ts)

- `ConfigNotFoundError` — explicit `--config` path doesn't exist
- `ConfigLoadError` — file exists but can't produce config (execution error, no default export, non-object, JSON parse failure)
- `ConfigValidationError` — loaded object has error-severity schema violations; contains all `ValidationIssue[]`

### Dual Config System Note

The CLI also has an internal YAML config system (`src/config/ConfigLoader.ts` → `loadYamlConfig()`) used by the analysis/comparison commands (compare, analyze, report, stats, doctor, style). This handles `tileguard.yml` / `tileguard.yaml` / `.tileguard.yml` files. This is **separate** from the `@tileguard/config` package's TypeScript/JSON config system used by `check` and `rules list`.

---

## 7. The Coordinate-Range Investigation — Full, Accurate Recap

### Source Documents Found

| Document | Path |
|:---------|:-----|
| Diagnostic Classification Report | `docs/engineering/phase1/DIAGNOSTIC_CLASSIFICATION.md` |
| ADR-006 (Coordinate-Range Defaults) | `docs/architecture/adr/006-coordinate-range-defaults.md` |
| Cross-Tile Coordinate Problem | `docs/engineering/CROSS_TILE_COORDINATE_PROBLEM.md` |
| Rule Documentation | `docs/rules/tile/coordinate-range.md` |

### Summary of Investigation

The coordinate-range rule flags coordinates that exceed a tile's declared extent (typically 4096). The original implementation with zero buffer and no exclusions produced false positives from:

1. **Label/centroid layers** — layers like `place`, `water_name`, `centroids` intentionally place points outside tile extent as label anchors
2. **Cross-tile features** — features from adjacent tiles where ALL coordinates are outside extent (not partial overflow, which is legitimate)

### Actual Defaults in Shipped Code

Source: `packages/tile-rules/src/rules/coordinate-range.ts`

```typescript
const buffer = context.options?.buffer ?? 80;

const DEFAULT_EXCLUDE_LAYERS = [
  'place',
  'water_name',
  'centroids',
  'poi',
  'housenumber',
  'transportation_name',
  'mountain_peak',
  'park',
  'aerodrome_label',
];

const skipCrossTile = context.options?.skipCrossTileFeatures ?? true;
```

### Cross-Check: Code vs. Documentation

| Parameter | Actual Code | ADR-006 | Rule Docs | CROSS_TILE doc |
|:----------|:-----------|:--------|:----------|:---------------|
| `buffer` default | **80** | 80 ✅ | 80 ✅ | 80 ✅ |
| `excludeLayers` default | **9 layers** | 3 layers ❌ | 3 layers ❌ | 9 layers ✅ |
| `skipCrossTileFeatures` | **true** (exists) | Not mentioned ❌ | Not mentioned ❌ | Documented ✅ |

### ⚠️ DISCREPANCY 1: `excludeLayers` — 9 layers in code, 3 in formal docs

**Code ships:** `place`, `water_name`, `centroids`, `poi`, `housenumber`, `transportation_name`, `mountain_peak`, `park`, `aerodrome_label`

**ADR-006 and rule docs claim:** only `place`, `water_name`, `centroids`

The additional 6 layers (`poi`, `housenumber`, `transportation_name`, `mountain_peak`, `park`, `aerodrome_label`) were added to address false positives discovered during higher-zoom testing (the CROSS_TILE_COORDINATE_PROBLEM doc mentions Tokyo producing 92 `transportation_name` + 8 `housenumber` false positives). ADR-006 and the formal rule docs were never updated.

**Resolution required before talk:** Either update ADR-006 and rule docs to reflect 9 layers, or acknowledge in the talk that the shipped defaults evolved beyond the documented decision.

### ⚠️ DISCREPANCY 2: `skipCrossTileFeatures` option undocumented in formal docs

This option (default: `true`) suppresses diagnostics for features where ALL coordinates are outside the allowed range — treating them as cross-tile spill-over rather than invalid data. It's only documented in `CROSS_TILE_COORDINATE_PROBLEM.md` (an engineering research document), not in the user-facing rule documentation or ADR-006.

### False Positive Reduction Numbers

The Phase 1 classification report documents the original corpus as having false positives from label layers. The `CROSS_TILE_COORDINATE_PROBLEM.md` documents the cross-tile problem as producing additional false positives. Both the buffer (80 units) and the excludeLayers + skipCrossTileFeatures mechanisms address these.

**Note:** The specific FP reduction percentage for coordinate-range alone is NOT stated in a single verified source file with a clean before/after measurement. The 72.54% figure cited in this codebase belongs to the **self-intersection** investigation (Section 8), not coordinate-range.

---

## 8. Self-Intersection / Phase 2 Status

### Documents Found

| Document | Path |
|:---------|:-----|
| Root Cause Investigation | `docs/engineering/phase2/SELF_INTERSECTION_INVESTIGATION.md` |
| ADR-007 (Solution Design) | `docs/architecture/adr/007-self-intersection-fp-reduction.md` |
| Implementation Report | `docs/engineering/phase2/SELF_INTERSECTION_IMPLEMENTATION.md` |
| Evaluation Report | `docs/engineering/phase2/SELF_INTERSECTION_EVALUATION.md` |

### What Is Actually Completed ✅

**All four steps are done and shipped:**

1. **Root Cause Classification** — 619 flagged rings classified into 4 categories:
   - Category A (161 rings, 26%): Duplicate vertex spikes from integer quantization → FALSE POSITIVE
   - Category B1 (170 rings, 27.5%): Genuine topological crossings → TRUE POSITIVE
   - Category B2 (282 rings, 45.6%): Closed LineString missing closure skip → FALSE POSITIVE
   - Category C (6 rings, 1%): Collinear overlap → TRUE POSITIVE

2. **ADR-007** — Accepted 2026-07-21. Four algorithmic fixes designed.

3. **Implementation** — All four guards coded in `packages/tile-rules/src/geometry.ts`, function `findSelfIntersectionIssues()`:
   - Fix 1: Extend closure skip to closed LineStrings
   - Fix 2: Skip segment pairs sharing a duplicate interior vertex
   - Fix 3: Bounding-box pre-check (performance optimization)
   - Fix 4: Minimum-vertex guard (< 4 vertices)

4. **Evaluation** — Verified results:
   - **72.54% false-positive reduction** (449/619 false positives suppressed)
   - Source: `docs/engineering/phase2/SELF_INTERSECTION_EVALUATION.md`
   - 170 true positives retained (all genuine crossings)
   - Performance: CARTO Streets meets <60s/10,000-tile target (53.4s actual)
   - Marginal runtime overhead: effectively 0ms

### What Was Explicitly Rejected

- ≥80% reduction threshold: accepted 72.54% because remaining 27.46% are genuine defects
- Edge-tolerance option: rejected (only 9.9% intersections near tile boundary)
- `excludeLayers` option for self-intersection: rejected (would suppress real defects)
- Bentley–Ottmann sweep line: deferred (BB pre-check already achieves ~O(N) effective runtime)
- No new rule-level options were introduced — all fixes are internal algorithm corrections

### Current Rule Shape

The rule in `packages/tile-rules/src/rules/self-intersection.ts` is ~44 lines. It iterates all features in all layers, delegates geometry analysis to `findSelfIntersectionIssues()` in `geometry.ts`, and reports at most one diagnostic per ring with message containing layer name, feature index, and segment pair indices. Default severity: `error`. No user-configurable options.

---

## 9. Inspector Package — Real, Current State

Source: `packages/inspector/` (private package, not published to npm)

### Implementation Status: Fully Built

The inspector is a **complete React + Canvas 2D browser application** (Vite 5.4.21, React 18.3.1, Tailwind CSS 4) with 24+ source subdirectories, 40 test files (899 tests passing), and a 287-line progressive API facade (`create-inspector.ts`).

### Key Subsystems (All Genuinely Implemented)

| Subsystem | Directory | Description |
|:----------|:----------|:------------|
| Store | `src/store/` | Reactive state container with typed lifecycle machine (uninitialized → loading → loaded/empty/error → disposed), frozen snapshots, listener management |
| Overlay | `src/overlay/` | Diagnostic-to-visual bridge. `OverlayAdapter` class + 6 concrete strategies (self-intersection, coordinate-range, zero-area-ring, degenerate-geometry, unclosed-ring, no-empty) |
| Renderer | `src/renderer/` | Full Canvas 2D with z-ordered accumulation (polygons → lines → points), overlay rendering, viewport transforms. `canvas-renderer.ts` is 22KB |
| Geometry | `src/geometry/` | BoundingBox, traversal (walkArtifact/walkLayer/walkFeatureGeometry with typed visitor), 2D affine matrices, helpers (signedArea, distance, lerp) |
| Viewport | `src/viewport/` | Pan/zoom, fitBounds, coordinate transforms (14KB) |
| Hit-testing | `src/hittest/` | Feature hit-testing with spatial helpers (11.7KB + 5.3KB) |
| Interaction | `src/interaction/` | Pointer event controller (6.5KB) |
| Animation | `src/animation/` | CameraAnimator with easing (6.2KB) |
| Comparison | `src/comparison/` | ComparisonService delegates to `@tileguard/analysis` |
| Analysis | `src/analysis/` | Re-exports from `@tileguard/analysis` (regression engine, evidence builder, confidence scorer) |
| Services | `src/services/` | Navigation, Statistics, Search, Settings, Shortcut, Workspace, Export, DemoLoader, Presentation |
| Components | `src/components/` | 25+ component directories — full React UI |
| Performance | `src/performance/` | SpatialIndex, PerformanceProfiler |

### OverlayDescriptor Consistency Check

The `OverlayDescriptor` interface is defined **once** in `src/overlay/overlay-adapter.ts`:

```typescript
interface OverlayDescriptor {
  readonly type: 'point-marker' | 'segment-highlight' | 'ring-highlight' | 'bbox-fill';
  readonly layerName: string;
  readonly featureIndex: number;
  readonly target: number | [number, number] | number[];
  readonly severity: 'error' | 'warning' | 'info';
}
```

**Verified consistent** across all 18+ files that produce or consume it:
- All 6 strategies produce descriptors matching this exact shape ✅
- Selection-producer produces matching descriptors ✅
- Canvas-renderer consumes `OverlayDescriptor[]` correctly ✅
- Render-coordinator bridges store → selection-producer → renderer correctly ✅
- All test files construct descriptors matching this shape ✅

**No OverlayDescriptor shape mismatches found.** (This was previously flagged as a recurring bug — it appears to have been resolved.)

### Facade API (`create-inspector.ts`)

Progressive 7-step API surface:
- Step 1: load, handlePointerMove/Leave/Click, render, dispose
- Step 2: selectDiagnostic, focusFeature, search, getSelectedFeature
- Step 3: getTileStatistics, getSettings, updateSettings, resetSettings
- Step 4: animateTo (CameraAnimator), cancelAnimation, export (stub)
- Step 5: createSnapshot, compare (delegates to @tileguard/analysis)
- Step 6: analyzeRegression (delegates to @tileguard/analysis)
- Step 7: generateReport (delegates to @tileguard/reporters)

### Test Coverage

40 test files, 899 tests passing. Coverage includes: canvas-renderer, hit-tester, viewport, traversal, interaction-controller, inspector-store, overlay-adapter, all strategies, selection-producer, render-coordinator, snapshots, search-service, settings-service, statistics-service, comparison-service, feature-matcher, property-differ, geometry-differ, evidence-builder, confidence-scorer, regression-engine, camera-animator, performance-profiler, spatial-index, export-service, workspace-service, shortcut-service, navigation-performance, UI integration tests.

---

## 10. CI / GitHub Actions — Current, Real Workflows

Source: `.github/workflows/`

### Workflow 1: `tile-quality.yml` (Main CI)

**Name:** CI
**Triggers:** push (all branches), pull_request (all branches), workflow_call, workflow_dispatch
**Concurrency:** cancel-in-progress per PR/ref

| Job | What It Does |
|:----|:-------------|
| `workspace` | Checkout → pnpm setup → Node 22 → `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm lint` → `pnpm test` |
| `boundaries` | Checkout → Node 22 → `node scripts/check-boundaries.mjs` (dependency boundary enforcement) |
| `test-coverage` | Checkout → `bash scripts/check-rule-tests.sh` (every rule must have a test file) |
| `api-surface` | PR only — git diff of `**/src/index.ts` vs base, posts to step summary |
| `legacy-js` | Checkout → Node 22 → npm install/test in `legacy/js/` → style-lint fixtures → smoke-test render fixtures |
| `legacy-python` | Checkout → Python 3.11 → pip install pytest → `pytest legacy/python/tests -v` |

### Workflow 2: `publish.yml`

**Name:** Publish
**Triggers:** Push of tags matching `v*`
**Permissions:** contents: write, id-token: write

Single job `publish`: Checkout → Node 22 → pnpm setup → install → build → lint → test → Publish 8 packages to npm (core, shared, tile-rules, style-rules, reporters, config, analysis, cli — NOT inspector) → Create GitHub Release via `softprops/action-gh-release@v2` (prerelease if tag contains "rc" or "beta").

### Workflow 3: `release.yml`

**Name:** Release Readiness
**Triggers:** workflow_dispatch (manual only)

Single job: Reuses `tile-quality.yml` via workflow_call.

### Workflow 4: `dependency-review.yml`

**Name:** Dependency Review
**Triggers:** pull_request targeting `main`
**Concurrency:** cancel-in-progress per PR

Single job: `actions/checkout@v6` → `actions/dependency-review-action@v5` (fail-on-severity: high, comment-summary-in-pr: always).

### Enforcement Scripts

| Script | Purpose | Run In |
|:-------|:--------|:-------|
| `scripts/check-boundaries.mjs` | Verifies no package imports from packages it shouldn't depend on | `boundaries` job |
| `scripts/check-rule-tests.sh` | Verifies every rule file has a corresponding test file | `test-coverage` job |

---

## 11. Everything That's Aspirational, Not Built

The following capabilities are mentioned in `ROADMAP.md`, `docs/PROJECT_VISION.md`, or other planning documents but have **no corresponding implementation in the codebase**. These must NOT be claimed as working in a live demo or on a talk slide.

| Claimed Feature | Where Mentioned | Scheduled For | Evidence of Absence |
|:----------------|:---------------|:-------------|:-------------------|
| Render regression testing (Playwright-based) | PROJECT_VISION, ROADMAP | v0.8.0 | No `@tileguard/render-rules` package exists |
| PMTiles/MBTiles archive providers | ROADMAP | v0.7.0 | No archive provider code found |
| SARIF reporter | ROADMAP | v0.8.0 | Only Text, JSON, Markdown, HTML reporters exist |
| Cross-domain rules (style↔tile validation) | ROADMAP | v0.7.0 | No `cross/*` rules exist |
| Python SDK (`pip install tileguard`) | ROADMAP | v1.0.0 | Only a legacy test oracle under `legacy/python/` |
| VS Code extension / LSP | ROADMAP | v1.0.0+ | No LSP or extension code |
| `watch` command (hot-reloading runner) | ROADMAP (post-conference) | Post-v1.0 | Not in CLI commands |
| Auto-fix suggestions for fixable rules | ROADMAP | v1.0.0 | `hasSuggestions` field exists in RuleMeta but no fix infrastructure |
| Parallel rule execution / worker threads | ROADMAP | Future | No worker thread code |
| Plugin templates / scaffolding CLI command | ROADMAP | v1.0.0 | Not in CLI commands |
| Community plugin registry / discovery | ROADMAP | v1.0.0 | No registry code |
| `@tileguard/shared` actual utilities | Package exists | Current | Placeholder — zero exports, zero consumers |

### README Accuracy

The README itself is **accurately backed by implemented code**. It claims 19 rules, plugin architecture, CI-native, structured diagnostics, comparison/regression detection, report generation, and modular install — all verified. The README does NOT overclaim render regression, PMTiles, SARIF, or Python SDK. The only README inaccuracy is "CLI with 10 commands" vs. the actual 12 distinct command actions.

---

## 12. One-Paragraph Elevator Pitch (Grounded Only in Sections 1–10)

TileGuard is a rule-based validation framework for vector tiles (MVT/PBF) and MapLibre style specifications, shipping 19 built-in rules (10 tile geometry/structure checks, 9 style lint rules) across a 9-package TypeScript monorepo at v0.5.0-beta.1. Its plugin architecture lets users write custom rules as plain objects in ~25 lines of TypeScript. The CLI provides 10 top-level commands with CI-native exit codes, JSON output, and zero-config defaults; the engine supports comparison of tile versions with confidence-scored regression detection and generates Markdown/HTML/JSON engineering reports. A private browser-based inspector renders tile geometry and diagnostic overlays on Canvas 2D with hit-testing, pan/zoom, and full analysis integration. The project has 1,635 passing tests across 99 files, CI enforcement of dependency boundaries and rule-test coverage, and has completed two major false-positive reduction investigations (coordinate-range label-layer exclusion, self-intersection 72.54% FP reduction via four algorithmic guards in ADR-007).

---

## Appendix: Summary of All Discrepancies Found

| # | Discrepancy | Details |
|:--|:-----------|:--------|
| 1 | **coordinate-range `excludeLayers`: 9 in code, 3 in docs** | Code: `place, water_name, centroids, poi, housenumber, transportation_name, mountain_peak, park, aerodrome_label`. ADR-006 and rule docs only list `place, water_name, centroids`. Only `CROSS_TILE_COORDINATE_PROBLEM.md` is accurate. |
| 2 | **`skipCrossTileFeatures` undocumented** | Exists in code (default: `true`), documented in `CROSS_TILE_COORDINATE_PROBLEM.md`, but NOT in ADR-006 or user-facing rule docs. |
| 3 | **CLI command count: README says "10 commands"** | Actual: 10 top-level commands + 3 subcommands under `rules` = 12 distinct actions. The 2 extra are `style` and `ver` top-level commands (README likely written before these were added). |
| 4 | **`@tileguard/shared` described as "Cross-package utilities"** | Package exists but is a placeholder with zero exports and zero consumers. No package imports from it. |
| 5 | **Inspector → style-rules dependency exists** | Inspector's package.json lists `@tileguard/style-rules` as a dependency, and 2 component files (`StyleExplorerPage.tsx`, `StylePage.tsx`) import from `@tileguard/style-rules/analysis`. The dependency graph in earlier analysis initially missed this. |
| 6 | **Plugin version mismatches** | `tilePlugin` declares version `'0.3.0'`, `stylePlugin` declares version `'0.4.0'`, but both packages' `package.json` are at `0.5.0-beta.1`. These internal plugin version strings haven't been updated to match the package version. |

### Recommendations Before Talk

1. **Must fix:** Update ADR-006 and `docs/rules/tile/coordinate-range.md` to reflect the 9-layer default and the `skipCrossTileFeatures` option.
2. **Should fix:** Update README to say "12 commands" or "10+ commands" to reflect `style` and `ver`.
3. **Cosmetic:** Update plugin version strings to match package version, or document why they differ.
4. **Safe to claim in talk:** 19 rules, 1,635 tests, 72.54% self-intersection FP reduction, zero-dep core, plugin architecture, CI-native exit codes, comparison/regression engine, report generation, Canvas 2D inspector.
5. **Do NOT claim in talk:** render regression testing, PMTiles/MBTiles, SARIF, cross-domain rules, Python SDK, VS Code extension, watch command, auto-fix, parallel execution.
