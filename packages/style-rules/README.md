# @tileguard/style-rules

MapLibre style specification provider and lint rules for TileGuard.

This package delivers `stylePlugin` — a self-contained TileGuard plugin that loads style JSON files (or raw JSON strings) as `StyleSpecification` artifacts and runs nine independent lint rules against them. It depends only on `@tileguard/core` at runtime.

---

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Artifact types](#artifact-types)
- [Rules reference](#rules-reference)
- [Configuration](#configuration)
- [Provider details](#provider-details)
- [Public API](#public-api)
- [Testing](#testing)

---

## Installation

```bash
npm install @tileguard/style-rules @tileguard/core
```

---

## Quick start

```typescript
import { createEngine } from '@tileguard/core';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [stylePlugin],
});

const result = await engine.run(['path/to/style.json']);

console.log(result.summary.pass ? 'PASS' : 'FAIL');
for (const d of result.diagnostics) {
  console.log(`[${d.severity}] ${d.ruleId}: ${d.message}`);
}
```

The provider also accepts raw JSON strings directly as sources:

```typescript
const result = await engine.run([JSON.stringify({ version: 8, sources: {}, layers: [] })]);
```

---

## Artifact types
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


The provider produces one of three artifact types depending on what it reads:

| Type | When produced | Rules that fire |
|:-----|:--------------|:----------------|
| `StyleSpecification` | Valid JSON that parses to an object | All object-level style rules |
| `InvalidStyleSpecification` | File exists but JSON parse fails | `style/valid-json` only |
| `EmptyStyleSpecification` | File exists but is empty (0 bytes or whitespace) | None — loaded as a skipped artifact |

The three-type design means `style/valid-json` fires precisely on broken JSON without the engine treating it as a load failure, and empty render fixture placeholders (common in the `fixtures/` directory) load cleanly without false positives.

---

## Rules reference

All nine rules are `recommended: true` and enabled by default when you register `stylePlugin`. Default severities are listed below; all can be overridden in `tileguard.config.ts`.

### `style/valid-json`

**Default severity:** `error`

Fires only when the provider could not parse the file as JSON. Reports the parser error message and short-circuits all other rules, because object-level rules cannot operate on a malformed artifact.

```
[error] style/valid-json: Style JSON is invalid: "Unexpected token } in JSON at position 42".
```

**Options:** none

---

### `style/version`

**Default severity:** `error`

The MapLibre style specification requires `"version": 8` at the top level. Any other value (or its absence) is reported.

```
[error] style/version: Style version must be 8, but found "7".
  location: version
```

**Options:** none

---

### `style/sources-present`

**Default severity:** `error`

The top-level `sources` key must exist and must be an object. Missing or non-object values are reported.

```
[error] style/sources-present: Style must include a "sources" object, but found "undefined".
  location: sources
```

**Options:** none

---

### `style/layers-present`

**Default severity:** `error`

The top-level `layers` key must exist and must be an array. Missing or non-array values are reported.

```
[error] style/layers-present: Style must include a "layers" array, but found "undefined".
  location: layers
```

**Options:** none

---

### `style/layer-id-required`

**Default severity:** `error`

Every entry in the `layers` array must have a non-empty string `id`. Layers without an `id`, or with an empty string, are reported by array index.

```
[error] style/layer-id-required: Layer at index "2" is missing a non-empty id.
  location: layers[2].id
```

**Options:** none

---

### `style/unique-layer-id`

**Default severity:** `error`

Layer IDs must be unique within a style. Each duplicate occurrence is reported along with the index where the ID first appeared.

```
[error] style/unique-layer-id: Duplicate layer ID "water-fill" at index "5" (first seen at index "1").
  location: layers[5].id
```

**Options:** none

---

### `style/known-source`

**Default severity:** `error`

Every layer that declares a `source` property must reference a key that exists in the top-level `sources` object. Unknown source references indicate configuration drift between the sources and layers sections.

```
[error] style/known-source: Layer "roads-fill" references unknown source "openmaptiles-v4".
  location: layers[3].source
```

**Options:** none

---

### `style/zoom-range`

**Default severity:** `error`

When a layer declares both `minzoom` and `maxzoom`, `minzoom` must be less than or equal to `maxzoom`. An inverted zoom range means the layer is never visible.

```
[error] style/zoom-range: Layer "labels" has minzoom "18" greater than maxzoom "12".
  location: layers[7].minzoom
```

**Options:** none

---

### `style/no-deprecated-ref`

**Default severity:** `warning`

The `ref` property was removed from the MapLibre style specification. Layers that use `ref` to inherit properties from another layer should be rewritten as full layer definitions.

```
[warning] style/no-deprecated-ref: Layer "roads-label" uses deprecated property "ref".
  location: layers[4].ref
```

**Options:** none

---

## Configuration

Override severity or disable individual rules in `tileguard.config.ts`:

```typescript
import { stylePlugin } from '@tileguard/style-rules';

export default {
  plugins: [stylePlugin],
  rules: {
    // Downgrade version mismatch to a warning
    'style/version': 'warning',

    // Turn off deprecated-ref if you knowingly use it
    'style/no-deprecated-ref': 'off',

    // Upgrade zoom-range to error (it already is, shown for reference)
    'style/zoom-range': 'error',
  },
};
```

All rules follow the standard `RuleConfig` shape from `@tileguard/core`:

```typescript
type RuleConfig =
  | 'error' | 'warning' | 'info'  // set severity, keep defaults
  | 'off'                          // disable the rule
  | ['error' | 'warning' | 'info', options]  // set severity and options
```

None of the current style rules accept options, so the third form is not used here. Future rules (e.g. `style/required-sources`) will accept options.

---

## Provider details
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


### Handled sources

The `styleProvider` handles sources that:

- end in `.json`, `.style`, or `.style.json` (local files or HTTP/HTTPS URLs)
- start with `{` or `[` (treated as inline JSON strings — no file read)

```typescript
// All of these work as sources:
engine.run(['./my-style.json']);                       // local file
engine.run(['https://example.com/tile/style.json']);   // remote URL
engine.run([JSON.stringify(myStyleObject)]);           // inline JSON
```

### Empty fixture handling

Files that exist but contain only whitespace produce an `EmptyStyleSpecification` artifact. This artifact counts toward `artifactCount` (the file loaded successfully) but produces zero diagnostics. This is intentional for render fixture directories where `style.json` placeholders are committed but intentionally empty.

### Error handling

The provider does not throw to the engine for expected failures:

| Situation | Outcome |
|:----------|:--------|
| File does not exist | `artifact/load-failed` diagnostic |
| JSON parse error | `InvalidStyleSpecification` artifact → `style/valid-json` fires |
| Empty file | `EmptyStyleSpecification` artifact → no rules fire |
| HTTP error (non-2xx) | `artifact/load-failed` diagnostic |
| HTTP timeout | `artifact/load-failed` diagnostic |

---

## Public API

```typescript
import {
  // Plugin (register this with the engine)
  stylePlugin,

  // Rules array (if you want to compose your own plugin)
  styleRules,

  // Provider (if you want to compose your own plugin)
  styleProvider,

  // Individual rules
  validJsonRule,
  versionRule,
  sourcesPresentRule,
  layersPresentRule,
  layerIdRequiredRule,
  uniqueLayerIdRule,
  knownSourceRule,
  zoomRangeRule,
  noDeprecatedRefRule,

  // Artifact type discriminants
  STYLE_ARTIFACT_TYPE,           // 'StyleSpecification'
  INVALID_STYLE_ARTIFACT_TYPE,   // 'InvalidStyleSpecification'
  EMPTY_STYLE_ARTIFACT_TYPE,     // 'EmptyStyleSpecification'

  // Type guards and helpers
  isRecord,
  getStyleLayers,
  getLayerId,
} from '@tileguard/style-rules';

import type {
  StyleArtifact,
  InvalidStyleArtifact,
  EmptyStyleArtifact,
  AnyStyleArtifact,
  StyleSpecificationContent,
  InvalidStyleSpecificationContent,
  EmptyStyleSpecificationContent,
  StyleLayer,
} from '@tileguard/style-rules';
```

### Writing a custom style rule

```typescript
import type { Rule } from '@tileguard/core';
import { STYLE_ARTIFACT_TYPE, getStyleObject, getStyleLayers } from '@tileguard/style-rules';

export const noBackgroundRule: Rule = {
  id: 'style/no-background',
  meta: {
    description: 'Style must not use a background layer.',
    defaultSeverity: 'warning',
    recommended: false,
  },
  artifactTypes: [STYLE_ARTIFACT_TYPE],

  create(context) {
    const style = getStyleObject(context.artifact);
    const layers = getStyleLayers(style);

    for (let i = 0; i < layers.length; i++) {
      if (layers[i]?.type === 'background') {
        context.report({
          message: `Layer at index "${i}" is a background layer.`,
          location: { jsonPath: `layers[${i}].type` },
          suggestion: 'Remove the background layer or replace it with a raster source.',
        });
      }
    }
  },
};
```

---

## Testing

```bash
cd packages/style-rules
npx vitest run
```

Test coverage:

| Test | What it verifies |
|:-----|:----------------|
| accepts a valid style specification | `stylePlugin` loads a well-formed style with no diagnostics |
| reports independent diagnostics for the legacy broken-style checks | `style/known-source`, `style/unique-layer-id`, `style/version`, `style/zoom-range` fire independently in deterministic order |
| emits style/valid-json without running object-level rules on invalid JSON | `InvalidStyleSpecification` artifacts only trigger `style/valid-json` |
| treats empty placeholder style fixtures as loaded but skipped artifacts | `EmptyStyleSpecification` artifacts count as loaded but produce zero diagnostics |
| reports structural style errors and deprecated ref usage | `style/layer-id-required`, `style/sources-present` (error), `style/no-deprecated-ref` (warning) fire with correct severities |

---

## Status

✅ **Implemented.** All 9 rules and the provider are live and tested.

| Module | Status | Since |
|:-------|:-------|:------|
| `provider.ts` | ✅ Complete | v0.3.0 |
| `types.ts` | ✅ Complete | v0.3.0 |
| `rules/valid-json.ts` | ✅ Complete | v0.3.0 |
| `rules/version.ts` | ✅ Complete | v0.3.0 |
| `rules/sources-present.ts` | ✅ Complete | v0.3.0 |
| `rules/layers-present.ts` | ✅ Complete | v0.3.0 |
| `rules/layer-id-required.ts` | ✅ Complete | v0.3.0 |
| `rules/unique-layer-id.ts` | ✅ Complete | v0.3.0 |
| `rules/known-source.ts` | ✅ Complete | v0.3.0 |
| `rules/zoom-range.ts` | ✅ Complete | v0.3.0 |
| `rules/no-deprecated-ref.ts` | ✅ Complete | v0.3.0 |

---

## Architecture

- [04 — Rule System](../../docs/architecture/04-rule-system.md)
- [08 — Package Structure](../../docs/architecture/08-package-structure.md)
- [09 — Implementation Roadmap](../../docs/architecture/09-implementation-roadmap.md)
