# Problem Statement

## The Bug Nobody Catches

In 2024, a team shipping a MapLibre-based transit map merged a style update that changed the `source-layer` value on their roads layer from `"transportation"` to `"transport"`. The property name existed in their staging tile server, which had been separately updated. It did not exist in their production tile server. Roads disappeared from the map. The bug reached production. It was discovered by a user.

The style file was valid JSON. It passed all schema checks. It rendered correctly in staging. The team had unit tests. They had a CI pipeline. None of it caught a property name mismatch between a style and its tile source.

This is the category of problem TileGuard exists to close.

---

## What the Geospatial Ecosystem Is Missing

Software teams operating geospatial pipelines face a class of bugs that their existing tools don't catch:

**Structural tile defects** that survive the tile generation step:
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

- Polygon rings that are not closed (first vertex ≠ last vertex)
- Self-intersecting geometries that cause rendering artifacts
- Coordinate values outside the valid tile extent
- Layers declared in the schema but absent from the tile
- Feature counts far below or above expected ranges

**Style specification errors** that survive visual review:
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.

- Layers referencing source keys that don't exist in the style's `sources` block
- `minzoom` values greater than `maxzoom` (silently ignored by renderers — the layer disappears)
- Duplicate layer IDs (the second layer silently overrides the first)
- Usage of the deprecated `ref` property, which MapLibre dropped years ago
- Missing or invalid version fields

**Semantic mismatches** that survive both:
- A style references a `source-layer` that doesn't exist in the tile source
- A filter expression references a feature property that doesn't exist in the tile data
- A layer type incompatible with its declared source type

The common thread: **none of these are caught by the tools that exist today**, because those tools don't cross the boundary between artifacts. A JSON schema validator checks the style in isolation. A tile server validates encoding, not content. A renderer renders what it's given — silently skipping what it can't resolve.

---

## Why Manual Review Doesn't Scale

The standard response to this gap has been visual inspection: deploy to staging, load the map, look at it, check that roads appear, zoom in, check that labels appear. This approach has three failure modes that compound as projects grow:

**Coverage collapses at scale.** A style for a global basemap may have 80+ layers across 15+ zoom levels. Comprehensive visual inspection of every layer at every zoom in every language locale is not a realistic workflow. Teams inspect the layers they care about today and miss regressions in layers they didn't think to check.

**Transient environments hide bugs.** Bugs that depend on specific tile content — a missing layer at a specific zoom, an invalid geometry in a specific region — are unlikely to surface in a staged environment that uses a small, curated tile extract. They surface in production when a real user requests a tile the test data didn't cover.

**Visual inspection is not reproducible.** A passing visual review is not a documented artifact. It does not appear in CI logs. It cannot be diffed, compared over time, or attached to a commit. It provides no signal when the same change is made six months later by a different person.

---

## The Exact Cost

These are not hypothetical risks. In any active geospatial project:

| Scenario | Current detection mechanism | Time to detection |
|:---------|:---------------------------|:-----------------|
| Road layer disappears at zoom 14 | User reports it | Days to weeks |
| Polygon self-intersects in tile | Renderer fails silently | Never, or after visible artifact |
| Style references unknown source | Renderer skips layer silently | Visual review (if thorough) |
| `minzoom > maxzoom` on a layer | Layer disappears at that zoom | Visual review (if thorough) |
| Missing required tile layer | Client crashes or falls back | User reports it |
| Duplicate layer IDs | Second layer overrides first | Visual review (if thorough) |

The cost is not just bug discovery time. It is the compounding cost of shipping bugs that were preventable, debugging systems with no reproducible artifact, and building visual review processes that slow down every deployment.

---

## What Already Exists

To be precise about the gap, it's worth naming what the ecosystem already provides:

**MapLibre GL JS** has internal validation for styles it loads — it logs warnings for some invalid properties. This validation is not accessible as a standalone tool, not configurable, not integrated into CI, and not designed to be run against tile content.

**maplibre-gl-style-spec** provides a JSON schema for style documents and a programmatic validator. It catches syntactic violations of the specification. It does not validate semantic correctness (source references, source-layer compatibility), and it does not validate tile content at all.

**PMTiles Inspector**, **Protomaps Viewer**, and similar tools provide interactive tile inspection. They are debugging tools, not quality gates. They require a human to look at each tile and know what to look for.

**Planetiler**, **tilemaker**, and similar tools produce tiles from source data. They validate their own output to varying degrees, but that validation is specific to their own pipeline — not reusable, not configurable for downstream consumers, and not applicable to tiles produced by different tools.

**Custom scripts** exist in every non-trivial geospatial project. They are the real indication of the problem: every team has independently built partial solutions to the same class of problems, in different languages, with different interfaces, with no interoperability and no shared rule ecosystem.

---

## The Structural Problem

The gap is not a missing validator. It's a missing framework.

ESLint did not succeed because it had better JavaScript rules than JSHint. It succeeded because it gave the community a shared architecture for expressing validation rules — isolated, composable, configurable, and reusable across any project without modification to the engine.

The geospatial ecosystem has the same structural need. The domain knowledge required to write correct validation logic for vector tiles, MapLibre styles, and rendering behavior exists in the ecosystem. What's missing is the framework that makes that knowledge:

- **Isolated**: One rule, one concern, one test, one documentation file.
- **Composable**: Projects combine rules from multiple sources without conflicts.
- **Configurable**: A rule that is an error in one project context is a warning or off in another.
- **Reusable**: A rule written for OpenMapTiles tiles works in any project using OpenMapTiles tiles.
- **Community-maintainable**: Rules can be proposed, reviewed, and published without touching the engine.

Without a framework, every team that builds a validator builds a monolith — tightly coupled validation logic, project-specific configuration, no plugin model, and a maintenance burden that discourages contribution. The ecosystem has dozens of partial solutions and no shared infrastructure.

---

## The Specific Failures TileGuard Addresses

TileGuard targets four concrete failure modes:

### 1. Undetected structural defects in tile content

**Root cause:** No standard tooling for running configurable validation rules against decoded tile content outside of a renderer.
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


**What TileGuard provides:** A provider-rule pipeline that decodes `.pbf` files using the MVT spec, routes decoded tiles to configured rules, and produces structured diagnostics — all without requiring a browser or rendering context.

### 2. Undetected semantic errors in style specifications

**Root cause:** Existing schema validators check structure, not semantics. Source references, zoom range logic, and deprecated property usage require domain knowledge that JSON Schema cannot express.
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


**What TileGuard provides:** A style provider that parses and normalizes style JSON, and a set of semantic rules that check cross-field relationships (source reference validity, zoom range ordering, duplicate identity), not just field types.

### 3. No CI integration path for geospatial quality checks

**Root cause:** Existing validation tools are either interactive desktop tools or embedding-only libraries with no standalone execution model, command-line interface, or structured output format.
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


**What TileGuard provides:** A CLI (`tileguard check`) with structured `text` and `json` output, exit codes compatible with CI pass/fail semantics, and a ready-made GitHub Actions workflow.

### 4. No shared rule ecosystem

**Root cause:** Every team that needs geospatial validation builds project-specific scripts. There is no plugin model for sharing validated, community-maintained rules across projects.

**What TileGuard provides:** A plugin architecture where rules are plain TypeScript objects with a standard interface — `id`, `meta`, `artifactTypes`, `create(context)`. Any rule that implements this interface integrates with the engine, the CLI, and all reporters without modification to any of them.

---

## What Success Looks Like

TileGuard is successful when the following workflow is unremarkable — expected, standard, boring:

A developer changes the source configuration for a tile layer. They open a pull request. A CI job runs `tileguard check`. It catches that a style layer now references a source that doesn't exist. The PR fails. The developer fixes it before merge. No user ever sees the bug.

This workflow does not require TileGuard to be adopted by every project. It requires that TileGuard makes the cost of adoption low enough that teams which would benefit actually integrate it — and that the rule ecosystem grows to cover the domain-specific validation needs that the default ruleset doesn't address.

The measure of success is not how sophisticated the tool is. It's how common this workflow becomes.

---

*For the long-term vision: [PROJECT_VISION.md](PROJECT_VISION.md)*
*For the current implementation state: [../README.md](../README.md)*
*For the engineering conventions: [engineering/IMPLEMENTATION_GUIDELINES.md](engineering/IMPLEMENTATION_GUIDELINES.md)*
