# TileGuard Project Outcomes

This document maps the complete list of 174 desired project outcomes to their respective semantic versions based on the project's execution roadmap. This serves as the definitive checklist for tracking what capabilities arrive in which release.

## v0.1.0: Architectural Baseline
*The architectural foundation and documentation freezing phase.*
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


*   1. A reusable geospatial quality analysis framework (not just a validator).
*   2. A stable framework core (`@tileguard/core`) that contains no geospatial-specific logic.
*   5. A universal Diagnostic model that becomes the communication contract between all components.
*   6. An Artifact model capable of representing any geospatial asset.
*   11. A scalable execution engine responsible only for orchestration.
*   12. A clean dependency architecture where dependencies always point inward.
*   13. A monorepo organized around independent packages.
*   14. A comprehensive Architecture Handbook documenting every subsystem.
*   15. Architecture Decision Records (ADRs) capturing every major design decision.
*   16. A maintainable framework that can evolve for years without architectural rewrites.
*   146. README.
*   147. Architecture Handbook.
*   148. Architecture Overview.
*   149. Diagnostic Model.
*   150. Artifact Model.
*   151. Rule System.
*   152. Reporter System.
*   153. Configuration System.
*   154. Engine documentation.
*   155. Package Structure.
*   156. Implementation Roadmap.
*   157. Plugin System.
*   158. Execution Model.
*   163. Complete architecture documentation.

## v0.2.0: Framework Core
*Implementation of the framework core, runtime engine, and modular plugin system.*
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


*   4. A modular plugin architecture for extending TileGuard without modifying the core.
*   8. A configurable Rule System where every validation concern is an independent rule.
*   9. A Reporter System that converts diagnostics into multiple output formats.
*   10. A flat, predictable configuration system (`tileguard.config.ts`).
*   106. TypeScript-first APIs.
*   107. Fully typed interfaces.
*   116. Rule Registry.
*   117. Artifact Registry.
*   118. Provider Registry.
*   119. Reporter Registry.
*   120. Plugin Registry.
*   121. Configuration Resolver.
*   122. Execution Scheduler.
*   123. Diagnostic Collector.
*   124. Artifact Cache.
*   125. Rule Context.
*   126. Plugin Loader.
*   127. Package discovery mechanism.
*   141. TypeScript as the reference implementation.
*   142. Node.js SDK.
*   143. JavaScript API.
*   164. Fully implemented `@tileguard/core`.

## v0.3.0: Rule Parity (Domain Rules)
*Migration of legacy validation checks into independent rules.*
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

<!-- TODO: INSERT DIAGRAM 10: Segment Orientation Self-Intersection Check -->

**Image Description / Generation Prompt:** A vector geometry diagram explaining the segment orientation tests used to determine if two line segments AB and CD intersect without using float division.
1. Show two intersecting line segments AB and CD on a 2D plane.
2. Write the 2D cross-product orientation formula: val = (B_y - A_y)(C_x - B_x) - (B_x - A_x)(C_y - B_y).
3. Render three diagrams representing the three possible orientation outputs:
   - val > 0: Clockwise curvature.
   - val < 0: Counter-clockwise curvature.
   - val = 0: Collinear segments.
4. Intersection Condition: Show that segments AB and CD intersect if and only if the orientation of (A, B, C) and (A, B, D) have different signs, AND the orientation of (C, D, A) and (C, D, B) have different signs.


*   17. Vector Tile Validator.
*   18. MapLibre Style Linter.
*   21. Validation of `.pbf` vector tiles.
*   22. Validation of MapLibre Style Specifications.
*   23. Structural validation before rendering.
*   27. Required layer validation.
*   28. Required property validation.
*   29. Feature count validation.
*   30. Layer feature count validation.
*   31. Coordinate range validation.
*   32. Degenerate geometry validation.
*   33. Polygon ring closure validation.
*   34. Zero-area polygon validation.
*   35. Self-intersection detection.
*   36. Tile metadata validation.
*   37. Tile schema validation.
*   38. Tile extent validation.
*   39. Tile version validation.
*   40. Geometry consistency validation.
*   41. Empty tile detection.
*   42. Style JSON validity.
*   43. Style specification version validation.
*   44. Source existence validation.
*   45. Layer existence validation.
*   46. Layer ID uniqueness validation.
*   47. Unknown source detection.
*   48. Invalid zoom range detection.
*   49. Deprecated style property detection.
*   50. Expression validation.
*   51. Source-layer validation.
*   52. Layer ordering validation.
*   53. Paint/Layout property validation.
*   54. Style semantic validation.
*   165. Tile Rules package.
*   166. Style Rules package.
*   172. Demonstration of extensibility by adding a new rule without modifying the core.

## v0.4.0: Developer Experience
*The user-facing CLI and core reporting functionality.*
<!-- TODO: INSERT DIAGRAM 11: Perceptual Visual Regression Stub -->

**Image Description / Generation Prompt:** A workflow pipeline diagram visualizing the Playwright-based canvas rendering regression comparison flow.
1. Input: A MapLibre Style JSON configuration sheet.
2. Step 1: Launch a headless Chromium browser instance using Playwright.
3. Step 2: Load the style sheet into a mock canvas page. Disable GL transition animations to prevent frame mismatching.
4. Step 3: Take a high-resolution canvas snapshot of the map rendering output (actual.png).
5. Step 4: Pass actual.png and expected.png (reference baseline) into the pixelmatch comparison utility.
6. Output: A highlighted difference image (diff.png) indicating mismatching pixel regions, generating a regression error diagnostic if the pixel diff count exceeds the threshold.


*   7. Artifact Providers/Loaders that load, decode, and normalize different artifact types.
*   25. Configurable rule execution pipeline.
*   26. Support for project-specific validation rules.
*   62. Human-readable terminal reporter.
*   63. JSON reporter.
*   68. Summary statistics.
*   69. Grouped diagnostics.
*   70. Rich suggestions for fixes.
*   71. Unified `tileguard` CLI.
*   72. Validate command.
*   73. Lint command.
*   75. Check command (runs everything).
*   76. Config inspection command.
*   77. Rule listing command.
*   78. Help/documentation command.
*   79. Enable/disable rules.
*   80. Rule severity customization.
*   81. Rule-specific options.
*   82. Project overrides.
*   83. Presets.
*   84. Recommended configuration.
*   86. CLI overrides.
*   167. CLI package.
*   168. Text Reporter.
*   169. JSON Reporter.
*   171. Working end-to-end validation pipeline.

## v0.4.1: Configuration Loader
*Implementation of the configuration file discovery, loading, and validation system.*

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


## v0.5.0: FOSS4G Release (Quality Gate)
*The public pre-conference release featuring CI integration and plugin packaging.*

*   3. A rule-based validation engine inspired by ESLint and Ruff.
*   20. GitHub Actions CI integration.
*   65. GitHub Annotation reporter.
*   87. Tile validation plugins.
*   88. Style validation plugins.
*   98. GitHub Actions workflow.
*   102. Exit codes for CI.
*   103. Pull request annotations.
*   108. Easy custom rule creation.
*   109. Easy custom reporter creation.
*   110. Easy plugin creation.
*   112. Excellent documentation.
*   113. Examples repository.
*   114. Testing utilities.
*   115. Rule templates.
*   159. Contribution Guide.
*   160. Architecture Contribution Guide.
*   161. API Reference.
*   162. ADR collection.
*   170. GitHub Actions integration.
*   173. Professional documentation suitable for open-source contributors.
*   174. A framework that demonstrates the future vision of geospatial quality tooling rather than a collection of standalone validation scripts.

## v0.6.0: Visual Rendering Validation
*Post-conference release focused on render testing and pixel-level comparison.*

*   19. Render Regression Testing module.
*   24. Rendering validation after rendering.
*   55. Pixel comparison.
*   56. Threshold-based image comparison.
*   57. Baseline image management.
*   58. Headless browser rendering.
*   59. Regression snapshot generation.
*   60. Render artifact creation.
*   61. Configurable rendering thresholds.
*   74. Render regression command.
*   89. Render plugins.
*   105. Automated regression gates.
*   136. Baseline comparison.

## v0.7.0: Extended Artifacts
*Support for extended file formats and reporting tools.*

*   66. Future HTML report.
*   67. Machine-readable API output.
*   92. PMTiles plugin.

## v0.8.0: Security & Distributed Validation
*Code scanning outputs and advanced execution patterns.*

*   64. SARIF reporter.
*   104. Code scanning integration.
*   139. Distributed validation.
*   140. Remote artifact validation.

## v0.9.0: IDE & Editor Integrations
*Bringing validation directly into the developer workflow.*

*   90. OpenMapTiles plugin.
*   91. Planetiler plugin.
*   93. GeoJSON plugin.
*   94. GeoParquet plugin.
*   95. Cloud Optimized GeoTIFF plugin.
*   96. Custom enterprise plugins.
*   97. Community-contributed plugins.
*   132. Language Server Protocol (LSP) integration.
*   133. VS Code extension.
*   134. IDE diagnostics.
*   135. Automatic fix suggestions where possible.

## v1.0.0: Production Stable & Python SDK
*Long-term API stability and language cross-compatibility.*

*   85. Future organizational presets.
*   99. GitLab CI support.
*   100. Azure Pipelines support.
*   101. Jenkins support.
*   111. Stable public API.
*   128. Parallel rule execution.
*   129. Artifact caching.
*   130. Incremental validation.
*   131. Watch mode.
*   137. Performance profiling.
*   138. Validation benchmarking.
*   144. Future Python SDK built on top of the TypeScript engine (not a separate implementation).
*   145. Shared architecture across language bindings.
