# TileGuard Execution Roadmap

This document defines the definitive roadmap for the TileGuard project. It establishes a dual-track strategy separating internal engineering milestones (**Phases**) from public releases (**Semantic Versions**). 

The roadmap is calibrated around our presentation at **FOSS4G 2026 (Hiroshima, Japan — August 30, 2026)**, dividing the project into a pre-conference stabilization track (culminating in **v0.5.0**) and a post-conference productionization track (culminating in **v1.0.0**).

---

## 1. Executive Summary & Project Success Criteria

TileGuard's mission is to become the standard quality assurance framework for the open-source geospatial ecosystem. To measure our progress against this vision, we define the following success criteria:

1.  **Adoption:** Integrated as the primary CI quality gate in at least 3 major open-source geospatial projects or enterprise tile pipelines within 12 months of v1.0.
2.  **Extensibility:** At least 30% of active validation rules are contributed or maintained by the community, proving the plugin architecture's viability.
3.  **Performance:** TileGuard can validate 10,000 vector tiles (structural + geometry checks) in under 60 seconds in a standard CI environment.
4.  **Reliability:** Zero false positives in structural validation; deterministic and reproducible render comparisons.
5.  **Language Inclusivity:** Frictionless consumption of the framework for both JavaScript/TypeScript and Python developers.

---

## 2. The Dual-Track Strategy: Phases vs. Versions

To ensure engineering discipline, we separate how we build the software (Phases) from how we release it to the community (Versions).

*   **Phases** represent internal, sequential engineering milestones and implementation order. They are governed strictly by architectural dependencies: an outer layer cannot be implemented until the inner contracts are stable.
*   **Versions** are public-facing milestones that group completed packages, CLI functionality, and integrations for user consumption. Each version represents a meaningful, usable release with well-defined goals.

### Phase-to-Version Mapping Matrix
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


```text
┌──────────────────────────────────────┐
│  Phase 1: Architecture & Contracts   │ ──► v0.1.0 (Architecture Baseline)
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 2: Framework Core             │ ──► v0.2.0 (Framework Core)
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 3: Domain Rules Migration     │ ──► v0.3.0 (Rule Parity)
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 4: Developer Experience       │ ──► v0.4.0 (Developer Experience)
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 5: FOSS4G Quality Gate        │ ──► v0.5.0 (FOSS4G Release - August 2026)
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 6: Post-Conf Visual & Formats │ ──► v0.6.0 - v0.9.0 (Beta / PMTiles / Playwright)
└──────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Phase 7: Python SDK & Stability     │ ──► v1.0.0 (Production Stable)
└──────────────────────────────────────┘
```

---

## 3. Release Cadence (Semantic Versions)

### v0.1.0: Architectural Baseline (Current)
*   **Goal:** Freeze the architectural framework before writing new production code.
*   **Scope:** The complete Architecture Handbook detailing the contracts and core engine orchestration. 
*   **Status:** Complete and tagged as `v0.1.0`.

### v0.2.0: Framework Core
*   **Goal:** A working `@tileguard/core` package defining all fundamental runtime systems.
*   **Scope:** Rule Engine, Artifact Model, Diagnostic System, Reporter System, Configuration System, and the modular plugin architecture itself. Capable of loading mock plugins, executing mock rules, and aggregating diagnostics.
*   **Status:** Complete and tagged as `v0.2.0`.

### v0.3.0: Rule Parity
*   **Goal:** Re-implement all existing legacy checks as decoupled, granular rules.
*   **Scope:** `@tileguard/tile-rules` and `@tileguard/style-rules` packages fully functional. The custom MVT/PBF decoder and geometry utilities ported to TypeScript.
*   **Status:** Complete and tagged as `v0.3.0`.

### v0.4.0: Developer Experience
*   **Goal:** Provide a productive CLI and configuration environment for engineers.
*   **Scope:** `tileguard` CLI package. Native config file loading (`tileguard.config.ts`), default text reporter with colored terminal output, and structured JSON output.
*   **Status:** Complete and tagged as `v0.4.0`.

### v0.5.0: FOSS4G Release (Target: August 15, 2026)
*   **Goal:** The public launch of TileGuard at FOSS4G. A stable, extensible toolchain demonstrating the framework's architecture, default rule sets, and GitHub Actions integration.
*   **Status:** Complete and tagged as `v0.5.0` (fully implements the type-safe configuration loading system in `@tileguard/config` and aligns package versions to `0.5.0`).
*   **API Stability:** Internal APIs may still change, but the user-facing CLI, configuration schema, and the core Plugin API are frozen for the conference.

### v0.6.0 – v0.9.0: Post-Conference Beta Cycles
*   **Goal:** Expand capabilities, incorporate community feedback, and harden the API.
*   **Scope:** 
    *   **v0.6.0:** Playwright-based render regression testing module (`@tileguard/render-rules`).
    *   **v0.7.0:** Artifact providers for archive formats (PMTiles and MBTiles).
    *   **v0.8.0:** SARIF reporter for GitHub Code Scanning and HTML Dashboards.
    *   **v0.9.0 (Release Candidate):** API freeze. Plugin ecosystem documentation finalized.

### v1.0.0: Production Stable
*   **Goal:** Long-term stable API release and multi-language support.
*   **Scope:** Strict SemVer adherence begins. Comprehensive plugin SDK, and a Python SDK (Language Bindings) wrapping the TypeScript engine.

---

## 4. Internal Implementation Phases
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


---

### Phase 1: Architectural Foundation
*   **Objective:** Define the architecture, project structure, and core execution boundaries.
*   **Rationale:** The existing prototype is procedural and tightly coupled. Freezing the interfaces first prevents structural debt.
*   **Architectural Dependencies:** None. This is the root node.
*   **Expected Deliverables:** Architecture handbook (completed), monorepo setup.
*   **Completion Criteria:** Core, domain, and CLI packages laid out; build configurations defined.
*   **Target Release:** v0.1.0
*   **Status:** Complete.

---

### Phase 2: Core Framework & Engine
*   **Objective:** Build the foundational systems: Rule Engine, Artifact Model, Diagnostic System, Reporter System, Configuration System, and the modular plugin system APIs (registries, loaders).
*   **Rationale:** Domain packages (tile rules, style rules) and reporters rely on the interfaces and core engine types. These must be implemented and verified with mock plugins first.
*   **Architectural Dependencies:** Phase 1 must be complete.
*   **Package Milestones:** `@tileguard/core` is published internally.
*   **Expected Deliverables:** TypeScript implementation of `diagnostic.ts`, `artifact.ts`, `rule.ts`, `engine.ts`, `config.ts`, `reporter.ts`, `plugin.ts`.
*   **Completion Criteria:** 100% unit test coverage on engine execution using mock rules.
*   **Target Release:** v0.2.0
*   **Status:** Complete.

---

### Phase 3: Domain Rules Migration
*   **Objective:** Migrate legacy procedural checks to decoupled, granular framework rules.
*   **Rationale:** With the core runner established, we can implement the actual validation logic. Porting legacy code ensures we do not lose working, tested validator logic.
*   **Architectural Dependencies:** Phase 2 (`@tileguard/core`) must be compiled and stable.
*   **Package Milestones:** `@tileguard/tile-rules` and `@tileguard/style-rules` are implemented.
*   **Expected Deliverables:** `VectorTile` provider (9 rules), `StyleSpecification` provider (9 rules). Ported PBF decoder and geometry utilities.
*   **Completion Criteria:** All legacy validation test suites ported to Vitest and passing.
*   **Target Release:** v0.3.0
*   **Status:** Complete.

---

### Phase 4: Developer Experience & CLI
*   **Objective:** Implement the CLI application, configuration loader, and core reporters.
*   **Rationale:** A framework needs a user-facing tool to execute runs. The CLI parses files, resolves the configuration file, instantiates the engine, and outputs diagnostics via reporters.
*   **Architectural Dependencies:** Phase 3 must be complete.
*   **Package Milestones:** `tileguard` CLI package is implemented.
*   **Expected Deliverables:** CLI entry point (`check`, `init`), config loader, Text/JSON reporters.
*   **Completion Criteria:** E2E CLI tests passing against a mixture of vector tiles and styles.
*   **Target Release:** v0.4.0
*   **Status:** In Progress (config and reporters implemented, CLI commands pending).

---

### Phase 5: FOSS4G Delivery & Community Foundation
*   **Objective:** Deliver the pre-conference quality gates, testing infrastructure, CI integration, and initial governance structure.
*   **Rationale:** The climax of our pre-conference track. We must be ready for public adoption, which requires governance, docs, and CI workflows.
*   **Architectural Dependencies:** Phase 4 must be complete.
*   **Expected Deliverables:**
    *   GitHub Actions reporter and `.github/workflows/tile-quality.yml`.
    *   Governance docs: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
    *   Per-rule documentation pages.
*   **Completion Criteria:** E2E verification in GitHub Actions. Public repositories configured with community guidelines.
*   **Target Release:** v0.5.0

---

### Phase 6: Post-Conference Expansion & API Hardening
*   **Objective:** Add rendering validation, archive formats, and prepare the plugin API for v1.0 stabilization.
*   **Rationale:** Post-FOSS4G, we shift focus to visual rendering validation, dashboards, and API hardening.
*   **Architectural Dependencies:** Phase 5 must be released and stable.
*   **Expected Deliverables:**
    *   `@tileguard/render-rules` (Playwright + perceptual pixel diff).
    *   MBTiles/PMTiles archive providers.
    *   SARIF and HTML reporters.
    *   Finalized Plugin API specifications.
    *   Engine API hardening (expose `ReporterContext` on `RunResult` and track unique `enabledRuleCount` dynamically).
*   **Completion Criteria:** Render tests run successfully via CLI. Plugin API is documented and verified via a community-built test plugin.
*   **Target Release:** v0.6.0 – v0.9.0

---

### Phase 7: Python SDK & Language Bindings
*   **Objective:** Bring first-class support to the Python geospatial ecosystem through language bindings.
*   **Rationale:** Half of the geospatial community uses Python. We wrap the TypeScript engine to provide pythonic interfaces.
*   **Architectural Dependencies:** The TypeScript core engine API must be frozen at v1.0.0-candidate.
*   **Expected Deliverables:** Python package wrapper, `pytest` integration module, CLI bindings.
*   **Completion Criteria:** Python developers can write standard pytest test cases importing `tileguard`.
*   **Target Release:** v1.0.0

---

## 5. Cross-Cutting Strategies

To ensure the framework remains maintainable and reliable, the following strategies apply across all phases:

### 5.1 Testing Strategy
TileGuard employs a layered testing approach:
*   **Unit Testing (Vitest):** Core engine logic, individual rules (using mocked artifact payloads), and utility functions (geometry math, PBF decoding). Required coverage: >90%.
*   **Integration Testing:** CLI commands, configuration resolution, and reporter output formatting.
*   **Fixture Testing (End-to-End):** The `.fixtures/` directory acts as the canonical source of truth, mirroring MapLibre's testing strategy. We test the compiled CLI against real `.pbf` and `style.json` files to guarantee systemic correctness.
*   **Performance Benchmarking:** Baseline benchmarks are run on the granular tile geometry rules (`tile/coordinate-range`, `tile/degenerate-geometry`, `tile/unclosed-ring`, `tile/zero-area-ring`, and `tile/self-intersection`) to prevent degradation in tile parsing speeds.

### 5.2 Documentation Roadmap
Documentation is built iteratively:
*   **Phase 1:** Architecture Handbook (for core contributors).
*   **Phase 4:** User Guide (CLI usage, configuration).
*   **Phase 5:** Rule Index (auto-generated schemas and descriptions for all built-in rules).
*   **Phase 6/7:** Plugin Authoring Guide and API Reference.

### 5.3 Release Management & API Stability Policy
<!-- TODO: INSERT DIAGRAM 3: Upward Configuration Discovery Walk -->

**Image Description / Generation Prompt:** A control flowchart explaining the directory-proximity-first configuration discovery walk performed by `finder.ts`. Start with a node "Start at current working directory (CWD)". For each directory level:
1. Loop through the ordered list of configuration file names: `tileguard.config.ts`, `tileguard.config.js`, `tileguard.config.mjs`, then `tileguard.config.json`.
2. Decision: "Does the current file candidate exist in this directory?"
   - Yes: Immediately return the absolute path of this file (Stop).
   - No: Move to the next candidate in the priority list.
3. Once all candidates at the current directory level are exhausted:
4. Decision: "Has the traversal hit the stopAt boundary or the file system root?"
   - Yes: Stop and return `undefined` (no configuration found).
   - No: Move up to the parent directory (`dir = parent`) and repeat the search for candidates.
This flowchart must emphasize that directory level proximity is checked completely before moving up a directory, meaning a `.json` file at a lower directory level will be found instead of a `.ts` file at a higher parent level.

<!-- TODO: INSERT DIAGRAM 4: Dynamic Config Loader Evaluation -->

**Image Description / Generation Prompt:** A UML Activity Diagram illustrating the dynamic file format evaluation and loading execution paths in `loader.ts`. The process accepts an absolute file path.
1. Branch: Check the file extension.
2. If the extension is `.json`:
   - Read the file using `fs.readFileSync`.
   - Parse the contents using `JSON.parse`.
   - Validate that the parsed value is a plain object.
   - If any parsing/reading fails, catch the error, wrap it in a `ConfigLoadError` using ES2022 cause chaining, and throw.
3. If the extension is `.ts`, `.js`, or `.mjs`:
   - Load the file dynamically using `jiti`'s runtime compiler (`jiti.import`).
   - Verify that the module namespace has a `default` property (`'default' in module`).
   - Extract the default export value as the configuration object.
   - Validate that the value is a plain object.
   - If loading or validation fails, catch the error, wrap it in a `ConfigLoadError` with ES2022 cause chaining, and throw.
4. Output the loaded configuration object.

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

*   **Pre-v1.0 (v0.x):** Minor versions (`0.x.0`) may introduce breaking changes to internal APIs (Rule contexts, engine internals). Patch versions (`0.x.y`) are strictly backward compatible. The CLI command structure is frozen at `v0.5.0`.
*   **Post-v1.0:** Strict Semantic Versioning. Breaking changes to the Configuration Schema, CLI commands, or Plugin API will require a major version bump (`v2.0`).

### 5.4 Governance and Contribution Planning
As a community-driven project, TileGuard will transition from a single-maintainer model to a community-governed model by v1.0:
*   **v0.5.0:** Establish standard OSS templates (Issues, PRs, `CONTRIBUTING.md`, Code of Conduct).
*   **v1.0.0:** Establish a core maintainers group, a defined RFC (Request for Comments) process for new core rules, and a mechanism for promoting community plugins to "official" status.

---

## 6. Pre-Conference vs. Post-Conference Scope Cut

To meet the FOSS4G deadline (58 days remaining), we must ruthlessly enforce what is out-of-scope for the v0.5.0 launch.

| Feature Area | Pre-Conference (v0.5.0) | Post-Conference (v1.0.0) |
|:---|:---|:---|
| **Core Languages** | TypeScript Reference Implementation only | Python SDK / Language Bindings |
| **CLI Commands** | `check`, `init` | `watch` (hot-reloading runner) |
| **Artifacts** | `VectorTile` (unpacked), `StyleSpecification` | PMTiles, MBTiles, `RenderSnapshot` |
| **Reporters** | Text (terminal), JSON, GitHub Annotations | SARIF, HTML Dashboard |
| **Visual Validation** | None (archived prototype) | Playwright rendering and Pixel diff rules |
| **Plugins & API** | Internal plugins only (`tile`, `style`) | Broader plugin ecosystem API |
| **Integrations** | GitHub Actions workflow | VS Code extension (LSP), Distributed execution |

---

## 7. Risk Register & Mitigations

### 1. FOSS4G Schedule Pressure (Aug 30, 2026)
*   **Risk:** Phase 4/5 slip past the presentation date, leaving us with an incomplete demo.
*   **Mitigation:** The scope cut in Section 6 is aggressive. Visual regression testing, IDE integrations, and Python bindings are intentionally scheduled for post-conference. The core framework, CLI, and basic tile/style verification take absolute precedence.

### 2. Geometry Validation Performance
*   **Risk:** Porting complex geometry validation to TypeScript rules results in slow checks when validating hundreds of tiles.
*   **Mitigation:** Decoded artifacts are cached and shared across rules. Rules operate on already-decoded coordinate structures. If performance becomes a bottleneck, the engine can execute rules concurrently using worker threads.

### 3. Dependency Fragility in Monorepos
*   **Risk:** Monorepo packages cross-importing from each other, breaking the dependency architecture.
*   **Mitigation:** Enforce boundary rules in CI (e.g., `eslint-plugin-boundaries`) to guarantee that `@tileguard/core` imports nothing from domain packages.

---

## 8. Beyond v1.0: Long-Term Ecosystem Vision

The long-term vision (v2.0 and beyond) is for TileGuard to evolve from a CLI tool into an embedded platform:

*   **IDE Integrations:** A dedicated Language Server (LSP) and VS Code extension providing real-time squiggly lines and auto-fixes for `style.json` and `tileguard.config.ts` files.
*   **Distributed Execution:** Native support for splitting massive tile archive validations (e.g., Planet-scale PMTiles) across distributed CI runners or cloud functions.
*   **Automated Remediation:** Expanding the `fix` capability to automatically rewrite malformed styles or execute GDAL commands to repair degenerate geometries in source data.
*   **Ecosystem Integrations:** Native plugins for Planetiler, Tippecanoe, and Mapbox Studio to validate data at the generation step before it ever reaches the serving infrastructure.

---
*Roadmap Version: 2.1 · Established: 2026-07-02*
