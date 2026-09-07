# PROJECT_VISION.md

## One Sentence

TileGuard is the ESLint for geospatial software — a configurable, extensible quality analysis framework that catches tile regressions, style errors, and rendering bugs before they reach production.

---

## The Analogy That Explains Everything

In 2013, the JavaScript ecosystem had no consistent way to enforce code quality. Every project had its own ad-hoc validation scripts, or none at all. Bugs that a static checker would have caught in milliseconds were instead caught in production by users.

ESLint changed this. Not by writing better validators, but by creating a framework where validation rules are isolated, composable, and community-maintained. The same engine that checks for `no-unused-vars` also checks for `react/no-direct-mutation-state`. The same config file that enables a rule for one team disables it for another. The same CI pipeline runs for every project.

The geospatial ecosystem is in 2013.

Teams running tile pipelines discover bugs when users report them. Style regressions survive code review because no tool checks whether a filter expression references a property that doesn't exist. Render changes merge silently because the CI pipeline has no pixel-level gate. Invalid geometries sit in tile servers for months because there is no automated structural validation that runs before rendering begins.

TileGuard is the framework that changes this. Not by writing better validators than MapLibre already has, but by making reusable, configurable, community-extensible quality gates available to every geospatial project — whether they use MapLibre, QGIS, GeoServer, Planetiler, or something that doesn't exist yet.

---

## What TileGuard Is

TileGuard is a **quality analysis framework** for geospatial artifacts.
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


Its core is a rule engine that discovers validation rules, routes artifacts to the rules that understand them, collects structured diagnostics, and hands those diagnostics to reporter backends. The core itself validates nothing. The rules validate everything.

On top of this engine sit four capabilities:

**Tile validation** — Fetches a vector tile (.pbf), decodes it, and runs configured rules against its structure, geometry, and content. Runs in milliseconds. Catches the category of bugs that render tests never will: missing layers, invalid geometries, coordinate range violations, inconsistent feature metadata.
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

<!-- TODO: INSERT DIAGRAM 8: Polygon Topology Sanity Checks -->

**Image Description / Generation Prompt:** A decision tree diagram mapping out the polygon topology sanity validation checks executed in `geometry.ts`.
1. Input: A sequence of coordinate vertices representing a polygon ring.
2. Condition 1: "Does the ring contain at least 3 unique vertices and 4 total points?"
   - No: Emit `DEGENERATE_POLYGON` diagnostic.
   - Yes: Proceed to next check.
3. Condition 2: "Is the first vertex identical to the last vertex (closure check)?"
   - No: Emit `UNCLOSED_RING` diagnostic.
   - Yes: Proceed to next check.
4. Condition 3: "Is the absolute signed area of the ring greater than zero (using Shoelace formula)?"
   - No: Emit `ZERO_AREA_RING` diagnostic.
   - Yes: The polygon ring is considered topologically sound (Pass).


**Style linting** — Parses a MapLibre style JSON and runs configured rules against its structure, source references, layer definitions, and expressions. Catches specification violations, semantic errors, and deprecated patterns before anything is rendered.

**Render regression testing** — Renders a MapLibre style against a known tile set using a headless browser, captures the output as pixels, and compares against a stored reference image with a configurable perceptual threshold. The same mechanism MapLibre uses internally, made available as a standalone tool.
<!-- TODO: INSERT DIAGRAM 11: Perceptual Visual Regression Stub -->

**Image Description / Generation Prompt:** A workflow pipeline diagram visualizing the Playwright-based canvas rendering regression comparison flow.
1. Input: A MapLibre Style JSON configuration sheet.
2. Step 1: Launch a headless Chromium browser instance using Playwright.
3. Step 2: Load the style sheet into a mock canvas page. Disable GL transition animations to prevent frame mismatching.
4. Step 3: Take a high-resolution canvas snapshot of the map rendering output (actual.png).
5. Step 4: Pass actual.png and expected.png (reference baseline) into the pixelmatch comparison utility.
6. Output: A highlighted difference image (diff.png) indicating mismatching pixel regions, generating a regression error diagnostic if the pixel diff count exceeds the threshold.


**CI integration** — A ready-made GitHub Actions workflow that runs all three capabilities in a tiered pipeline: fast gates first, expensive gates last. One file to copy. Zero configuration required to get started.
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

## What TileGuard Is Not

TileGuard is not a rendering engine. It does not generate tiles. It does not replace MapLibre's internal test suite. It does not have opinions about which tile schema you use, which tile server you run, or which rendering library you target.

TileGuard is infrastructure. It provides the framework, the engine, the plugin API, and a default rule set. The community provides the domain-specific rules for OpenMapTiles, Planetiler, PMTiles, and whatever comes next.

---

## The World When TileGuard Succeeds

A developer working on a QGIS plugin adds a new tile source. Before merging, their CI pipeline runs `tileguard check`. It validates the tile structure, lints the style configuration, and compares the render output against a reference. The check takes four minutes. It catches a missing source-layer that would have silently prevented three layers from rendering.

The developer fixes it, the check passes, and the PR merges. No user ever sees the bug.

This is the goal. Not a tool. Not a demo. A change in the default workflow of geospatial software development.

---

## Why Now

Two things are true simultaneously:

First, the FOSS geospatial ecosystem is scaling faster than its quality infrastructure. MapLibre GL JS has millions of downloads. OpenMapTiles is deployed globally. Planetiler processes the entire planet in hours. The user base has grown; the automated quality gates have not.

Second, the software engineering community has already solved the general problem. Rule engines, plugin architectures, structured diagnostics, SARIF output, GitHub annotations — these patterns exist and are mature. The geospatial ecosystem does not need to invent new solutions. It needs to apply existing ones.

TileGuard applies them.

---

## Long-Term

The framework ships with rules for vector tiles and MapLibre styles because that is where the author's contributor experience lives and where the first users are most likely to be. But the engine has no knowledge of vector tiles. It routes artifacts to rules and collects diagnostics. A rule that validates a Cloud-Optimized GeoTIFF, a GeoParquet schema, or a PMTiles archive is architecturally identical to one that validates a `.pbf`. The same config file, the same CI workflow, the same reporter output.

The long-term trajectory is a plugin ecosystem that extends TileGuard to cover the full range of geospatial artifact types, tile schemas, rendering targets, and organizational policies — without ever modifying the engine that runs them.

---

*This document describes where TileGuard is going. It does not describe what has been built yet.*
*For scope decisions, see `NON_GOALS.md`. For what "done" means, see `SUCCESS_CRITERIA.md`.*