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

- **Objective**: Build a synchronous file finder that searches upward from a starting directory for one of the four supported file names in priority order: `.ts` → `.js` → `.mjs` → `.json`.
- **Code Review Feedback & Resolutions**:
  - *Precedence Ambiguity (Proximity vs. Format)*: Clarified and enforced that **directory proximity always beats format priority**. Discovery checks all supported names innermost-first per directory level before traversing up to the parent directory.
  - *Traversal Boundary (`stopAt`)*: Added an optional `stopAt` parameter to prevent the directory search from traversing too high (e.g. escaping the project root into the user's home directory). This keeps testing deterministic and sandboxed.

---

### Phase 3 — `validator.ts` (Schema Validation)
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

- **Objective**: Implement configuration schema validation against the `TileGuardConfig` type contract from `@tileguard/core`. The validator collects all errors in a single pass instead of short-circuiting on the first violation.
- **Code Review Feedback & Resolutions**:
  - *Top-Level Short-Circuit*: If the top-level configuration is not a plain object (e.g. an array, string, or primitive), property-level verification cannot run. We documented this as an intentional exception: an invalid top-level shape immediately throws a `ConfigValidationError` with a single `(root)` issue.
  - *Array-as-Rules Case*: Identified a test coverage gap for non-object values passed to the `rules` field. Added a dedicated unit test `rejects an array as rules` to ensure arrays are correctly rejected.
  - *JSON Plugins Constraint*: Disallowed the `plugins` field in `.json` configs. Typos on this key (e.g., `plguins: [...]`) warn the user about unknown keys, but the configuration still prevents plugins from loading.

---

### Phase 4 — `loader.ts` (Dynamic Loading)
<!-- TODO: INSERT DIAGRAM 4: Dynamic Config Loader Evaluation -->

- **Objective**: Dynamically load configuration files, resolving ESM/TS using `jiti` and static JSON configurations via native `JSON.parse`.
- **Code Review Feedback & Resolutions**:
  - *No Default Export Verification*: Since `jiti`'s `interopDefault: true` could synthesize a default export from named exports (leading to named configuration properties being misidentified as the default config), we added explicit checks: `!isPlainObject(moduleNamespace) || !('default' in moduleNamespace)`.
  - *Physical Fixtures*: Created physical ESM, CommonJS, and TypeScript fixtures (`no-default.mjs`, `no-default.js`, `no-default.ts`) containing only named exports to verify that "no default export" errors trigger consistently across all formats.
  - *Syntax & Type Verification*: Added fixtures for malformed JSON (`invalid.json`) and non-object default exports (`non-object-default.mjs`) to verify appropriate `ConfigLoadError` wrapping.
  - *Explicit Extension Guard*: Added a `SUPPORTED_EXTENSIONS` check (`.ts`, `.js`, `.mjs`, `.json`) at the entry of `loadConfigFile` to reject unsupported formats (like `.yaml`) with a clear error message instead of letting `jiti` fail downstream with opaque parse errors.

---

### Phase 5 — `index.ts` (Composition Layer)
<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->

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


