# TileGuard Current Codebase Assessment

This document provides a comprehensive engineering assessment of the existing TileGuard repository before starting the migration to the new rule-based, extensible framework architecture.

---

## 1. High-Level Repository Overview
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


The current repository represents a functional **procedural prototype** written in two parallel codebases:
1.  **JavaScript/Node.js Prototype:** Located in `packages/js/`.
2.  **Python Prototype:** Located in `packages/python/` (a direct translation of the JS codebase to pythonic syntax).

Both codebases act as procedural toolkits. They parse CLI options, fetch vector tiles (local or remote), decode MVT/PBF binary payloads, execute hardcoded validation checks, and print results to the console. 

While the existing implementation successfully validates styles and vector tiles, it lacks extensibility. Adding a new validation concern requires modifying the core validation runners. There is no concept of plugins, independent rules, config files, or standardized diagnostic models.

---

## 2. Directory-by-Directory Assessment

### `.github/workflows/`
*   **Purpose:** Runs integration and unit tests on pushes/PRs.
*   **Current State:** Fully operational. Runs legacy Node.js/Python tests and visual rendering checks.
*   **Alignment:** Partially aligns. The jobs currently run on the legacy directory layout (`packages/js` and `packages/python`).
*   **Recommendation:** **Refactor**. Update the workflow in Phase 5 to support the `pnpm` monorepo structure, running tests across the new `@tileguard/*` packages.

### `fixtures/`
*   **Purpose:** Houses MVT `.pbf` tiles and MapLibre `style.json` configs for testing.
*   **Current State:** Complete.
*   **Alignment:** Fully aligns.
*   **Recommendation:** **Keep as-is**. This directory acts as the canonical test fixture suite.

### `packages/js/`
*   **Purpose:** Node.js implementation of the tile validator and style linter.
*   **Current State:** Complete prototype.
*   **Alignment:** Does not align with the new package boundaries.
*   **Recommendation:** **Archive**. Move to `packages/archive/js` or deprecate once equivalent rule packages are published.

### `packages/python/`
*   **Purpose:** Python port of the validator.
*   **Current State:** Complete prototype.
*   **Alignment:** Does not align. A parallel pythonic codebase violates the single-reference-implementation design (ADR-001).
*   **Recommendation:** **Archive**. Replace in Phase 7 with Python SDK bindings wrapping the TypeScript reference core.

---

## 3. Package-by-Package Assessment

### `packages/js` (Legacy NPM Package)
*   **Implemented Functionality:**
    *   MVT PBF decoding via custom binary parser.
    *   Geometry checks (degenerate lines/polygons, unclosed rings, self-intersections).
    *   MapLibre Style JSON validation (schema, zoom limits, missing sources/layers).
    *   Command Line Interface (`bin/tileguard.js`).
*   **New Architecture Alignment:** Poor. Monolithic and procedural.
*   **Action Plan:** **Split and Rewrite**.
    *   Move core interfaces to `@tileguard/core`.
    *   Move PBF decoding and geometry helpers to `@tileguard/core` (or as internal utilities in `@tileguard/tile-rules`).
    *   Rewrite checks into independent rules in `@tileguard/tile-rules` and `@tileguard/style-rules`.
    *   Rewrite CLI in `@tileguard/cli`.

### `packages/python` (Legacy Pip Package)
*   **Implemented Functionality:**
    *   Direct mirror of the JS package in Python.
    *   Custom pythonic PBF decoder.
*   **New Architecture Alignment:** Poor. Violates ADR-001 (maintain a single TS engine to prevent logic drift).
*   **Action Plan:** **Archive**. Rewrite as a lightweight Python wrapper in Phase 7.

---

## 4. File-by-File Summary (Important Files Only)

### JavaScript Codebase (`packages/js/`)

| File | Purpose | Exposed APIs | Dependencies | Reusable? | Action |
|:---|:---|:---|:---|:---|:---|
| `bin/tileguard.js` | CLI Application | None (CLI wrapper) | `commander` | No | **Rewrite** as `@tileguard/cli`. |
| `src/validate.js` | Monolithic tile validator | `validateTile`, `validateBatch` | `utils/pbf-decoder.js`, `utils/geometry.js` | Algorithms are, execution model is not. | **Split** checks into individual rules in `@tileguard/tile-rules`. |
| `src/style-lint.js` | Monolithic style validator | `styleLint` | None | Algorithms are. | **Split** checks into rules in `@tileguard/style-rules`. |
| `src/render-compare.js` | Visual validation placeholder | `renderCompare`, `renderAll` | None | No (it is stubbed out). | **Rewrite** as `@tileguard/render-rules` using Playwright in v0.6.0. |
| `src/reporter.js` | CLI Output Formatter | `Reporter` class | None | No. | **Rewrite** using new core `Reporter` contract. |
| `src/utils/pbf-decoder.js` | Raw MVT Binary Decoder | `decodeMvt`, `PbfReader` | None | Yes, highly reusable. | **Move** to `@tileguard/core` or `@tileguard/tile-rules` as a decoder utility. |
| `src/utils/geometry.js` | Line/Ring geometry math | `validateFeatureGeometry` | None | Yes, highly reusable. | **Move** to utility files in `@tileguard/tile-rules`. |

### Python Codebase (`packages/python/`)

All files in `packages/python/` (including `validate.py`, `style_lint.py`, `reporter.py`, `utils/pbf_decoder.py`, `utils/geometry.py`) are **obsolete** under the new single-reference-implementation architecture. Their validation logic will be archived, and the Python SDK will be rebuilt as bindings over the JS core.

---

## 5. Dependency Overview

### Legacy JS Dependencies (`packages/js/package.json`)
*   `@mapbox/vector-tile`: **DEAD DEPENDENCY**. Declared in `package.json` but never imported (replaced by custom `pbf-decoder.js`).
*   `pbf`: Low-level binary utility. Used by `pbf-decoder.js`. Keep.
*   `commander`: CLI parser. To be used in `@tileguard/cli`.
*   `pixelmatch` & `pngjs`: Declared but unused due to render comparison stub. To be used in `@tileguard/render-rules` in Phase 6.
*   `playwright`: Declared but unused. Move to `@tileguard/render-rules` devDependencies.
*   `@maplibre/maplibre-gl-style-spec`: Used in tests/linters. Keep for `@tileguard/style-rules`.

### Legacy Python Dependencies (`packages/python/pyproject.toml`)
*   `mapbox-vector-tile`: Used for decoding.
*   `shapely`: Used for complex geometry math.
*   `requests`: Used for downloading tiles.
*   *Note: All will be eliminated in Phase 7 by wrapping the compiled JS engine.*

---

## 6. Reusable Components

The following components contain high-quality algorithms that must be preserved during rewriting:
1.  **PBF MVT Decoding (`packages/js/src/utils/pbf-decoder.js`):** The custom parser successfully decodes raw Protobuf tags to layer structures without large external dependencies. This file can be ported to TypeScript with minimal changes.
2.  **Geometry Math (`packages/js/src/utils/geometry.js`):** The implementation of orientation math, segment intersection, and signed areas is correct and tested. This code can be copied into `@tileguard/tile-rules` geometry helpers.
3.  **Fixture Suite (`fixtures/`):** The test files represent real-world failure cases (e.g., self-intersecting polygons, gzipped tiles, missing style fields). They are highly reusable for E2E testing of the new engine.

---

## 7. Components Requiring Refactoring / Split

1.  **Tile Verification logic (`src/validate.js`):** 
    *   *Current:* A single loop executes coordinate validation, feature counting, property checking, and layer validation.
    *   *New:* Each checklist item must be extracted into a separate class/object implementing the `Rule` interface (e.g., `tile/feature-count`, `tile/missing-layer`, `geometry/self-intersection`).
2.  **Style Linting logic (`src/style-lint.js`):**
    *   *Current:* One function tests versions, sources, layers, and zoom ranges.
    *   *New:* Split into modular rules (e.g., `style/version`, `style/unknown-source`, `style/invalid-zoom`) under `@tileguard/style-rules`.

---

## 8. Components to Rewrite Completely

1.  **CLI Entrypoint (`bin/tileguard.js`):** Needs a complete rewrite in TypeScript to support configuration resolution, loading external plugins, and using the new reporter APIs.
2.  **Reporter (`src/reporter.js`):** Replaced entirely by the decoupled `Reporter` system, allowing different reporter plugins (e.g., GitHub annotations, SARIF, JSON, Text) to consume the standardized `Diagnostic` payloads.
3.  **Render Validation (`src/render-compare.js`):** The current code is a dummy placeholder. This must be written from scratch using Playwright in v0.6.0.

---

## 9. Obsolete/Removable Code

1.  **`@mapbox/vector-tile`** in `package.json`: Remove.
2.  **`packages/python/` validation logic:** Archive. All Python validation algorithms are redundant with the single reference implementation.
3.  **`packages/js/src/render-compare.js`**: Remove stub.

---

## 10. Architectural Conflicts with New Design

| Feature | Legacy Prototype | New Framework Architecture |
|:---|:---|:---|
| **Structure** | Hardcoded, procedural scripts | Modular, pluggable core + rules |
| **Logic Addition** | Must edit the core source code | Write a rule subscribing to an artifact |
| **Diagnostics** | Custom return objects per file type | Unified `Diagnostic` contract |
| **Configuration** | Passed manually via CLI flags | Flat `tileguard.config.ts` file |
| **Decoders** | Tightly coupled with the validation run | Decoupled `ArtifactProvider` ecosystem |
| **Reporters** | Standard console print statements | Pluggable `Reporter` interface |

---

## 11. Migration & Evolution Map
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


The following map shows how legacy files map to the new package architecture:

```text
LEGACY LOCATION                           NEW ARCHITECTURE TARGET
packages/js/src/utils/pbf-decoder.js ──►  @tileguard/tile-rules (internal utility)
packages/js/src/utils/geometry.js    ──►  @tileguard/tile-rules (internal utility)
packages/js/src/validate.js (checks) ──►  @tileguard/tile-rules/src/rules/*.ts (individual rule files)
packages/js/src/style-lint.js        ──►  @tileguard/style-rules/src/rules/*.ts (individual rule files)
packages/js/src/reporter.js          ──►  @tileguard/core (Reporter contracts) & @tileguard/cli (built-ins)
packages/js/bin/tileguard.js         ──►  @tileguard/cli/src/bin.ts
packages/python/*                    ──►  @tileguard/python (lightweight Node bindings wrapper)
```

---

## 12. Migration Order & Strategy

1.  **Step 1: Code Archival (Phase 1):** Move the current `packages/js/` and `packages/python/` to `packages/archive/js` and `packages/archive/python` respectively.
2.  **Step 2: Core Contracts (Phase 2):** Implement `@tileguard/core` defining the `Rule`, `Diagnostic`, `Artifact`, `Plugin`, and `Reporter` interfaces.
3.  **Step 3: Core Utility Porting (Phase 3):** Port `pbf-decoder.js` and `geometry.js` into TypeScript utility functions.
4.  **Step 4: Rule Extraction (Phase 3):** Extract rules into `@tileguard/tile-rules` and `@tileguard/style-rules`.
5.  **Step 5: CLI & Config Loader (Phase 4):** Write the new CLI in `@tileguard/cli` to parse configs and execute runs.
6.  **Step 6: CI Integration (Phase 5):** Hook the new CLI up to GitHub Actions workflows.

---

## 13. Risks & Mitigations

1.  **Logic Drift during rewrite:** 
    *   *Risk:* Extracted rules do not flag errors in the same way, causing regression.
    *   *Mitigation:* Keep the existing `fixtures/` unchanged. Run both the legacy tool and the new tool against the fixtures in CI to verify that output diagnostics match in meaning.
2.  **Node/Python Binding Complexity:**
    *   *Risk:* Calling the TS engine from Python introduces runtime overhead or complex build systems.
    *   *Mitigation:* Keep Python bindings strictly for post-FOSS4G (Phase 7). Use lightweight subprocess invocation or established JS-to-Python bridges (like `pyexecjs` or PyO3/Node).
