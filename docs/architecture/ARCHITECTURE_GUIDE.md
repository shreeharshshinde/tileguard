# TileGuard: Comprehensive Architectural & Design Decision Guide (v0.0.0 - v0.5.0)

This guide documents the high-level architecture, subsystem boundaries, data workflows, and major milestone decisions of the TileGuard toolkit from its initial legacy design (`v0.0.0`) through the modern monorepo config implementation (`v0.5.0`).

---

## 1. System Architecture Overview

TileGuard has evolved from a monolithic layout into a modular, multi-package **pnpm monorepo** with distinct areas of responsibility:

<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

```mermaid
graph TD
    subgraph CLI / Entrypoints
        CLI[tileguard CLI] --> ConfigLoad[@tileguard/config]
    end

    subgraph Pre-Engine Configuration
        ConfigLoad --> Finder[finder.ts: Discover config file]
        ConfigLoad --> Loader[loader.ts: Evaluate JS/TS/JSON via jiti]
        ConfigLoad --> Validator[validator.ts: Schema sanity check]
    end

    subgraph Core Framework & Processing
        Engine[@tileguard/core: Engine] --> PluginRegistry[Plugin & Rule loader]
        Engine --> Runner[Rule check loop]
    end

    subgraph Validation Extensions
        TileRules[@tileguard/tile-rules: MVT & Geometry]
        StyleRules[@tileguard/style-rules: Layout & Zooms]
    end

    subgraph Diagnostics & Formatting
        Engine --> OutputFormatter[@tileguard/reporters]
        OutputFormatter --> TextRep[TextReporter]
        OutputFormatter --> JsonRep[JsonReporter]
    end

    ConfigLoad -. Pass validated object .-> Engine
    Runner --> TileRules
    Runner --> StyleRules
```

### Monorepo Packages Summary
- **`tileguard` (`packages/cli`)**: The CLI application wrapper executing commands and orchestrating configuration loading.
- **`@tileguard/config` (`packages/config`)**: Pre-engine loader. Discovers files, parses JS/TS/JSON configs, and validates shapes against schema contracts before the engine initializes.
- **`@tileguard/core` (`packages/core`)**: The central framework defining abstract interfaces (`Diagnostic`, `Artifact`, `Rule`, `Reporter`, `Engine`, `Plugin`) and executing the main runner loop.
- **`@tileguard/reporters` (`packages/reporters`)**: Implements human-readable text layouts and structured JSON diagnostic outputs.
- **`@tileguard/tile-rules` (`packages/tile-rules`)**: Implements MVT protobuf parsing, Shoelace area algorithms, and segment self-intersection geometry checks.
- **`@tileguard/style-rules` (`packages/style-rules`)**: Implements MapLibre style JSON specification validation rules.

---

## 2. Core Execution Workflow

The step-by-step pipeline from CLI invocation to reporting is structured as follows:

<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->

```
[CLI Invocation]
       │
       ▼
[Configuration Discovery (finder.ts)]
  - Walk upward from CWD to find tileguard.config.*
  - Custom stopAt boundary to prevent escaping root directories
       │
       ▼
[Configuration Loading (loader.ts)]
  - If JSON: read file directly and run JSON.parse()
  - If TS/JS/MJS: compile & evaluate dynamically using jiti
  - Enforce strict default export validation
       │
       ▼
[Configuration Schema Validation (validator.ts)]
  - Run non-short-circuiting check against TileGuardConfig
  - Disallow "plugins" keys in JSON files
  - Return validation warnings for unknown properties
       │
       ▼
[Engine Initialization (@tileguard/core)]
  - Load config-defined plugins and custom rules
  - Compile file globs, file overrides, and severity maps
       │
       ▼
[Validation Execution]
  - Decode vector tiles (MVT Protobuf) and style sheets
  - Run geometric checks (degeneracy, Shoelace area, orientation tests)
       │
       ▼
[Diagnostic Reporting (@tileguard/reporters)]
  - Group diagnostics by rule identifier
  - Print visually-structured CLI layouts or dump raw JSON
```

---

## 3. Milestone History & Major Decisions

### Milestone v0.0.0 (Legacy Stage)
- **Structure**: Monolithic layout split between `packages/js/` and `packages/python/` with identical utility copies.
- **Scope**: Basic `.pbf` parsing using low-level byte readers, basic threshold checks (layer names, feature counts), and geometry boundary stubs.
- **Lessons**: Hard code replication between JS and Python made it difficult to scale the rule engine. A structured, plugin-based Javascript/TypeScript framework was chosen for future development.

### Milestones v0.1.0 - v0.2.0 (Core Engine & Rule Framework)
- **Structure**: Reorganized into a `pnpm` monorepo. Abstracted the core logic into `@tileguard/core` and rules into `@tileguard/tile-rules`.
- **Decisions**:
  - **Interface Separation**: Segregated the rule checker contract from the physical execution layer so custom third-party rule sets could be registered.
  - **Decoupled Geometry Algorithms**: Implemented strict mathematical algorithms (Shoelace formula for zero-area rings, and Segment Orientation tests for self-intersection) inside pure TS geometry utilities.

### Milestones v0.3.0 - v0.4.0 (Reporters Subsystem)
- **Structure**: Created `@tileguard/reporters` to extract formatting logic from core packages.
- **Decisions**:
  - **Standardized Diagnostic Contract**: Formulated the `Diagnostic` interface to include exact source spans, file references, severities, and error codes.
  - **User-Centric CLI Rendering**: Implemented the `TextReporter` with grouped diagnostic output, colored severity prefixes (`ERROR`, `WARNING`, `INFO`), status summaries, and execution timers.

### Milestone v0.5.0 (Pre-Engine Config Loading)
- **Structure**: Created `@tileguard/config` to decouple configuration management from `@tileguard/core`.
- **Decisions**:
  - **Directory Proximity over Format Priority**: Walking upward, all formats are checked innermost-first per directory level. Directory proximity is prioritized over file extensions.
    <!-- TODO: INSERT DIAGRAM 3: Upward Configuration Discovery Walk -->
  - **Jiti for Dynamic Loading**: Used `jiti` to load ESM/TypeScript configurations seamlessly at runtime without requiring an ahead-of-time TSC compile step.
    <!-- TODO: INSERT DIAGRAM 4: Dynamic Config Loader Evaluation -->
  - **Explicit Default Export Assertion**: Enforced strict `export default { ... }` detection to prevent `jiti`'s default interop from treating named exports as configuration keys. Verified with dedicated `.ts`, `.js`, and `.mjs` fixtures.
  - **JSON Plugins Restriction**: Disallowed the `plugins` field in `tileguard.config.json` configurations (as plugins require code imports). Typos in keys trigger warning-severity issues, but keep loading enabled.
    <!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->
  - **ES2022 Native Error Cause Chaining**: Configured `ConfigLoadError` to call `super(message, { cause })` to natively propagate original call stacks.

---

## 4. Architectural Design Decision Log (ADL)

### ADL-001: Synchronous Config Discovery
* **Context**: Should the configuration discovery walk be synchronous or asynchronous?
* **Decision**: **Synchronous.** Configuration discovery is a single, block-blocking startup operation. Wrapping standard `fs.existsSync` in async wrappers adds event-loop overhead without providing any performance or concurrency benefit during the boot sequence of a command-line tool.

### ADL-002: Dynamic TS/ESM Evaluation via Jiti
* **Context**: How do we load TypeScript (`.ts`) and ESM (`.mjs`) configs at runtime?
* **Decision**: **Use `jiti`.** Native node dynamic imports (`import()`) require either ahead-of-time transpilation, complex loaders, or experimental ts-node wrappers. `jiti` provides a fast, robust, and transparent TS/ESM bypass with synchronous execution fallbacks, custom caching configurations (`moduleCache: false` for clean reloads), and built-in interop compatibility.

### ADL-003: Non-Short-Circuiting Validator Pass
* **Context**: Should configuration validation fail-fast on the first schema error or collect all errors?
* **Decision**: **Collect all errors.** A fail-fast validator causes a frustrating loop of fixing one typo, re-running, and finding another. Collecting all errors in one pass lets users resolve all schema issues at once. The exception is a non-object root value, which throws immediately since property inspection cannot run.

### ADL-004: Native Cause Chaining
* **Context**: How should custom errors preserve source exception stack traces?
* **Decision**: **Use ES2022 `cause` parameter.** Rather than inventing custom `.cause` fields or overriding properties, we compile to `ES2022` and pass the raw exception into `super(message, { cause })`. This integrates natively with Node's default uncaught exception printers.

---

## 5. Exhaustive Diagram Inventory for Visualizing TileGuard

To fully translate the concepts discussed in this codebase into visual assets, you should construct the following eleven diagrams. Below is the mapping of each concept to its recommended diagram type, logical nodes, and visualization goals:

### Diagram 1: Monorepo Package Dependencies (Component Diagram)
- **Concept**: Monorepo dependency layout.
- **Diagram Type**: UML Component Diagram or Node Dependency Graph.
- **Logical Nodes**:
  - `tileguard (cli)` (Root)
  - `@tileguard/config` (Pre-engine validation)
  - `@tileguard/core` (Orchestration Engine & Framework Contracts)
  - `@tileguard/reporters` (CLI formatting)
  - `@tileguard/tile-rules` (MVT parsing & geometry rules)
  - `@tileguard/style-rules` (Style sheet rules)
- **Goal**: Show import directions. Highlight that `@tileguard/config` and `@tileguard/core` are independent peers that only communicate via type definitions.

### Diagram 2: CLI-to-Output Flow (Sequence Diagram)
- **Concept**: End-to-end execution pipeline.
- **Diagram Type**: UML Sequence Diagram.
- **Actors & Timelines**:
  - User/CLI shell
  - `cli.ts` (Entrypoint)
  - `loadConfig()` (@tileguard/config)
  - `Engine` (@tileguard/core)
  - `RulesRunner` (Core check execution loop)
  - `Reporters` (@tileguard/reporters)
- **Goal**: Show the chronological ordering of configuration discovery, loader evaluation, validation, engine startup, rule check iteration, and reporter writing.

### Diagram 3: Upward Configuration Discovery Walk (Control Flowchart)
- **Concept**: The traversal logic in `finder.ts`.
- **Diagram Type**: Flowchart.
- **Key Decision Points**:
  - Start at CWD directory node.
  - Inner loop: Iterate priority file array (`.ts` → `.js` → `.mjs` → `.json`).
  - Decision: *Does candidate file exist?*
    - Yes → Return absolute file path.
    - No → Continue inner loop.
  - Decision: *Has traversal hit the injected `stopAt` boundary?*
    - Yes → Return `undefined`.
  - Decision: *Has traversal reached the file system root (`dirname(dir) === dir`)?*
    - Yes → Return `undefined`.
    - No → Move up (`dir = parent`) and repeat.
- **Goal**: Visualize why directory proximity always beats format priority.

### Diagram 4: Dynamic Config Loader Evaluation (Activity Diagram)
- **Concept**: Format checking and execution boundaries in `loader.ts`.
- **Diagram Type**: UML Activity Diagram.
- **Branches**:
  - Match extension: `.json` branch vs. `.ts/.js/.mjs` branch.
  - *JSON Branch*: `fs.readFileSync` → `JSON.parse` → Plain object validation.
  - *Module Branch*: `jiti.import` → Namespace verification → `default in moduleNamespace` test → Plain object validation.
  - *Exceptions*: Catch blocks that wrap failures into `ConfigLoadError` with ES2022 cause propagation.
- **Goal**: Show how dynamic loading abstracts file systems while enforcing type correctness.

### Diagram 5: Non-Short-Circuiting Schema Validation (Decision Flow)
- **Concept**: Collecting all errors in `validator.ts`.
- **Diagram Type**: Parallel Activity Flowchart.
- **Flow**:
  - Check root type: If not a plain object, throw `ConfigValidationError` immediately (fast-fail root exception).
  - If a plain object, run parallel validation checks:
    - `validatePlugins` (check JSON restrictions)
    - `validateRules` (check severity and rule config shapes)
    - `validateReporter` (check strings or tuples)
    - `validateOverrides` (check files and rule structures)
    - `validateOptions` (check timeouts and counts)
    - `checkUnknownKeys` (generate advisory warnings)
  - Aggregator: Check if any issue has `severity === 'error'`.
    - Yes → Throw `ConfigValidationError` containing all collected issues.
    - No → Return config object and warning list.
- **Goal**: Illustrate how warnings and errors are collected concurrently without stopping early.

### Diagram 6: Vector Tile Decoder (Data Layout Diagram)
- **Concept**: Mapbox Vector Tile (MVT) binary layout structure.
- **Diagram Type**: Block Diagram / Data Hierarchy.
- **Structure**:
  - `MVT Raw Buffer` contains multiple `Layers`.
  - `Layer` contains:
    - Name (string)
    - Feature Pool (array of features)
    - Key Pool (string keys)
    - Value Pool (typed variant properties)
  - `Feature` contains:
    - ID (varint)
    - Packed Tags (alternating key/value index pairs mapping to pools)
    - Geometry Type (Point, LineString, Polygon)
    - Geometry Commands (packed draw commands)
- **Goal**: Map byte pools to structured memory variables.

### Diagram 7: ZigZag Coordinate Decoding (Bitwise Workflow)
- **Concept**: Relative offset coordinates and bitwise unpacking in `pbf-decoder.ts`.
- **Diagram Type**: Mathematical Pipeline Diagram.
- **Operations**:
  - Raw Varint Byte → Unsigned Integer `N`.
  - Bitwise ZigZag Decode: `(N >>> 1) ^ -(N & 1)` → Signed delta offset `dx` or `dy`.
  - Cursor Accumulator: `x_new = x_prev + dx` and `y_new = y_prev + dy`.
- **Goal**: Visually explain how relative delta coordinate grids are expanded.

### Diagram 8: Polygon Topology Sanity Checks (State/Decision Tree)
- **Concept**: Core geometry validations in `geometry.ts`.
- **Diagram Type**: Decision Tree.
- **Logical Rules**:
  - Vertex Count: Does polygon have $\ge 3$ unique vertices and $\ge 4$ total points?
  - Closure: Does first vertex $(x_0, y_0)$ equal last vertex $(x_n, y_n)$?
  - Area: Calculate Area using Shoelace Formula. Is $|\text{Area}| > 0$?
- **Goal**: Visual check-list showing which criteria must pass for a polygon to be topology-sound.

### Diagram 9: Shoelace Algorithm Math Solver (Geometric Layout)
- **Concept**: Shoelace formula calculation.
- **Diagram Type**: 2D Grid Plotting Diagram.
- **Formulation**:
  - Visual matrix showing vertex cross-multiplication:
    $$\begin{matrix} x_0 & y_0 \\ x_1 & y_1 \\ \vdots & \vdots \\ x_n & y_n \end{matrix}$$
  - Green arrows for positive diagonal multiplications ($x_i \cdot y_{i+1}$).
  - Red arrows for negative diagonal multiplications ($y_i \cdot x_{i+1}$).
  - Signed Area output calculation block.
- **Goal**: Explain the math behind calculating clockwise vs. counter-clockwise loop areas.

### Diagram 10: Segment Orientation Self-Intersection Check (Math Geometry Diagram)
- **Concept**: Orientation test for intersection of line segments AB and CD.
- **Diagram Type**: Vector/Geometry Diagram.
- **Visuals**:
  - Plot points A, B, C, D in coordinate space.
  - Show orientation formula: $(B_y - A_y)(C_x - B_x) - (B_x - A_x)(C_y - B_y)$.
  - Illustrate the three states: Clockwise (positive curvature), Counter-Clockwise (negative curvature), and Colinear (zero curvature).
  - Show intersection criteria: Segment AB intersects CD if the orientation of (A,B,C) and (A,B,D) differ AND orientation of (C,D,A) and (C,D,B) differ.
- **Goal**: Graphically display the vector-orientation logic that avoids floating-point slope division errors.

### Diagram 11: Perceptual Visual Regression Stub (Pipeline Diagram)
- **Concept**: Playwright headless comparison in `render-compare.js`.
- **Diagram Type**: Flow Pipeline.
- **Nodes**:
  - Style JSON config input.
  - Headless Playwright Chromium launcher.
  - Disable MapLibre GL transitions layer (fade-in, speed modifiers).
  - Canvas screenshot capture.
  - Pixelmatch comparison engine (comparing canvas render with `expected.png`).
  - Output: Diff PNG generation highlighting mismatching pixels.
- **Goal**: Show render compare test logic and perceptual regression checks.

