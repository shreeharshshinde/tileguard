# @tileguard/config

Configuration loading, schema validation, and preset resolution for TileGuard.

## Status

✅ **Implemented** (v0.5.0 milestone)

## Public API

```typescript
import { loadConfig } from '@tileguard/config';

// Primary CLI entry point: finds, loads, and validates configuration
const { config, configPath, warnings } = await loadConfig({
  cwd: process.cwd(), // optional
  configPath: './custom.config.ts' // optional
});
```

## Responsibilities

- **File Discovery**: Walk upward from CWD searching for `tileguard.config.ts` → `tileguard.config.js` → `tileguard.config.mjs` → `tileguard.config.json` (closest directory wins).
- **Runtime Loading**: Load configurations dynamically using `jiti` for TypeScript/ESM modules, and native `JSON.parse` for JSON.
- **Validation**: Strict schema checks against the `TileGuardConfig` contract. Collects all issues in a single pass.
- **Error Handling**: Throws dedicated error classes (`ConfigNotFoundError`, `ConfigLoadError`, `ConfigValidationError`).

## Common Configuration Mistakes

- **Specifying plugins in JSON**: JSON configurations (`tileguard.config.json`) are data-only and cannot specify code imports in `plugins`. If you need custom plugins, use `tileguard.config.ts` or `tileguard.config.js`.
- **Misspelling plugins in JSON**: Note that typos in JSON keys (like `plguins: [...]`) will be reported as warning-severity unknown keys, but the configuration will still prevent plugins from loading. Spelled correctly or incorrectly, plugins are not supported in JSON.
- **Missing default export**: TypeScript and JavaScript config files must export their configuration object as the default export (`export default { ... }`). Named exports are not resolved.

## v0.5.0 Development History & Decisions

The `v0.5.0` Milestone was completed following a strict phase-wise build and code review cycle to isolate and test every component before moving up the dependency tree.

---

### Phase 1 — `errors.ts` (Zero-Dependency Base)

- **Objective**: Build the foundational error-reporting structures for the package. This includes the `ValidationIssue` interface and three custom error classes:
  - `ConfigNotFoundError` (when an explicit configuration path cannot be found)
  - `ConfigLoadError` (when a configuration file is corrupt, malformed, or cannot be loaded)
  - `ConfigValidationError` (when a configuration violates the schema)
- **Code Review Feedback & Resolutions**:
  - *Native Error Cause Chaining*: To maintain inspectable stack traces in Node.js, `ConfigLoadError` originally manually assigned `this.cause = cause`. This was refactored to pass `{ cause }` natively to the `super()` call since the package target is `ES2022`.
  - *Severity Field*: Added a `severity: 'error' | 'warning'` field to `ValidationIssue` to support mixed-severity reporting.
  - *Summary Formatting*: Implemented multi-line error summaries in `ConfigValidationError` that interleave errors and warnings with visual status prefixes (`✗` for errors, `⚠` for warnings) to make CLI output highly readable.

---

### Phase 2 — `finder.ts` (File Discovery)
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


- **Objective**: Build a synchronous file finder that searches upward from a starting directory for one of the four supported file names in priority order: `.ts` → `.js` → `.mjs` → `.json`.
- **Code Review Feedback & Resolutions**:
  - *Precedence Ambiguity (Proximity vs. Format)*: Clarified and enforced that **directory proximity always beats format priority**. Discovery checks all supported names innermost-first per directory level before traversing up to the parent directory.
  - *Traversal Boundary (`stopAt`)*: Added an optional `stopAt` parameter to prevent the directory search from traversing too high (e.g. escaping the project root into the user's home directory). This keeps testing deterministic and sandboxed.

---

### Phase 3 — `validator.ts` (Schema Validation)
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


- **Objective**: Implement configuration schema validation against the `TileGuardConfig` type contract from `@tileguard/core`. The validator collects all errors in a single pass instead of short-circuiting on the first violation.
- **Code Review Feedback & Resolutions**:
  - *Top-Level Short-Circuit*: If the top-level configuration is not a plain object (e.g. an array, string, or primitive), property-level verification cannot run. We documented this as an intentional exception: an invalid top-level shape immediately throws a `ConfigValidationError` with a single `(root)` issue.
  - *Array-as-Rules Case*: Identified a test coverage gap for non-object values passed to the `rules` field. Added a dedicated unit test `rejects an array as rules` to ensure arrays are correctly rejected.
  - *JSON Plugins Constraint*: Disallowed the `plugins` field in `.json` configs. Typos on this key (e.g., `plguins: [...]`) warn the user about unknown keys, but the configuration still prevents plugins from loading.

---

### Phase 4 — `loader.ts` (Dynamic Loading)
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


- **Objective**: Dynamically load configuration files, resolving ESM/TS using `jiti` and static JSON configurations via native `JSON.parse`.
- **Code Review Feedback & Resolutions**:
  - *No Default Export Verification*: Since `jiti`'s `interopDefault: true` could synthesize a default export from named exports (leading to named configuration properties being misidentified as the default config), we added explicit checks: `!isPlainObject(moduleNamespace) || !('default' in moduleNamespace)`.
  - *Physical Fixtures*: Created physical ESM, CommonJS, and TypeScript fixtures (`no-default.mjs`, `no-default.js`, `no-default.ts`) containing only named exports to verify that "no default export" errors trigger consistently across all formats.
  - *Syntax & Type Verification*: Added fixtures for malformed JSON (`invalid.json`) and non-object default exports (`non-object-default.mjs`) to verify appropriate `ConfigLoadError` wrapping.
  - *Explicit Extension Guard*: Added a `SUPPORTED_EXTENSIONS` check (`.ts`, `.js`, `.mjs`, `.json`) at the entry of `loadConfigFile` to reject unsupported formats (like `.yaml`) with a clear error message instead of letting `jiti` fail downstream with opaque parse errors.

---

### Phase 5 — `index.ts` (Composition Layer)
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


- **Objective**: Compose the low-level primitives into a single CLI-facing entry point, `loadConfig()`, which discovers, loads, and validates the configuration in sequence.
- **Code Review Feedback & Resolutions**:
  - *Interface Redundancy*: `LoadConfigResult` replicates the fields of `ValidateConfigResult`. We chose to keep them as separate interfaces to avoid tight coupling between the public CLI contract and the validator's internal validation schema.

---

### Phase 6 — Integration & Test Suite
- **Objective**: Run end-to-end integration tests using real fixture configurations to verify the entire pipeline (discover → load → validate → error propagation).
- **Verification Results**:
  - Fully sandboxed directory traversals verified.
  - All **103 unit and integration tests** pass successfully.
  - The package builds with zero TypeScript compilation errors.


