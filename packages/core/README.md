# @tileguard/core

The framework contracts package for TileGuard — the quality analysis framework for geospatial software.

This package defines every interface and type that TileGuard's runtime is built on. Domain packages (`@tileguard/tile-rules`, `@tileguard/style-rules`) depend on `@tileguard/core`. Core itself has **zero runtime dependencies**.

---

## Contents

- [Architecture in one diagram](#architecture-in-one-diagram)
- [Diagnostic model](#diagnostic-model)
- [Artifact model](#artifact-model)
- [Rule system](#rule-system)
- [Plugin system](#plugin-system)
- [Configuration system](#configuration-system)
- [Reporter system](#reporter-system)
- [Engine](#engine)
- [Complete example](#complete-example)
- [Public API reference](#public-api-reference)

---

## Architecture in one diagram
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

```
  Source string (file path, URL, …)
         │
         ▼
  ┌──────────────────────┐
  │   ArtifactProvider   │  ── canHandle() → load() → Artifact
  └──────────────────────┘
         │
         ▼  Artifact<T, C>
  ┌──────────────────────┐
  │   Rule Engine        │  ── routes by artifact.type, runs create(context)
  └──────────────────────┘
         │
         ▼  Diagnostic[]
  ┌──────────────────────┐
  │   Reporter           │  ── report(diagnostics, context)
  └──────────────────────┘
         │
         ▼
    Terminal / CI / IDE
```

Everything flows through `Diagnostic`. Rules produce them. The engine collects them. Reporters consume them. Nothing else produces formatted output.

---

## Diagnostic model

A `Diagnostic` is a structured, immutable record describing one validation finding. It is the universal currency between rules and reporters.

```typescript
interface Diagnostic {
  ruleId:     string;          // e.g. "tile/required-layers"
  severity:   Severity;        // "error" | "warning" | "info"
  message:    string;          // human-readable description
  artifact:   ArtifactRef;     // lightweight source identifier
  location?:  Location;        // where in the artifact
  suggestion?: string;         // actionable fix advice
  docsUrl?:   string;          // link to rule documentation
  data?:      Record<string, unknown>;  // rule-specific structured data
}
```

### Severity

| Value | Meaning | Exit code |
|:------|:--------|:----------|
| `'error'` | Defect. Run fails. | 1 |
| `'warning'` | Potential problem. Run passes. | 0 |
| `'info'` | Observation. Never fails the run. | 0 |

### ArtifactRef

A lightweight, serializable identifier for an artifact. Embedded in every diagnostic so diagnostics remain JSON-safe without holding a reference to the full decoded artifact.

```typescript
interface ArtifactRef {
  type:    string;   // e.g. "VectorTile"
  source:  string;   // e.g. "./tiles/14/8741.pbf"
  label?:  string;   // optional display name
}
```

### Location

A structured pointer into a specific position within an artifact. All fields are optional; include whichever subset is meaningful.

```typescript
interface Location {
  layer?:        string;   // vector tile layer name
  featureIndex?: number;   // 0-indexed feature position within a layer
  partIndex?:    number;   // 0-indexed geometry part index
  jsonPath?:     string;   // style spec path, e.g. "layers[3].paint.fill-color"
  line?:         number;   // source file line (1-indexed)
  column?:       number;   // source file column (1-indexed)
  region?:       { x: number; y: number; width: number; height: number };
}
```

### DiagnosticDescriptor

The subset of `Diagnostic` that a rule supplies when calling `context.report()`. The engine fills in `ruleId`, `severity`, `artifact`, and `docsUrl` automatically.

```typescript
interface DiagnosticDescriptor {
  message:     string;
  location?:   Location;
  suggestion?: string;
  data?:       Record<string, unknown>;
}
```

---

## Artifact model

An `Artifact` is a decoded, in-memory representation of something that rules can validate. It is created by an `ArtifactProvider` and consumed by the rule engine.

```typescript
interface Artifact<T extends string = string, C = unknown> {
  type:       T;               // discriminant, e.g. "VectorTile"
  ref:        ArtifactRef;     // serializable source identifier
  content:    C;               // fully decoded, read-only content
  metadata?:  Record<string, unknown>;  // provider-supplied extra info
}
```

Core uses `Artifact<string, unknown>`. Domain packages narrow the generics:

```typescript
// In @tileguard/tile-rules:
type VectorTileArtifact = Artifact<'VectorTile', VectorTileContent>;
```

### ArtifactProvider
<!-- TODO: INSERT DIAGRAM 4: Dynamic Config Loader Evaluation -->

An `ArtifactProvider` encapsulates the full load pipeline: source detection → byte fetching → format detection → decoding → `Artifact` construction.

```typescript
interface ArtifactProvider {
  id:             string;
  artifactTypes:  readonly string[];   // types this provider produces

  // Returns true if this provider can load the given source.
  // Must be fast, synchronous, and conservative (false if unsure).
  canHandle(source: string): boolean;

  // Loads and fully decodes an artifact from the source.
  // Must not throw for expected failure modes (file missing, bad format) —
  // the engine handles those by emitting artifact/load-failed.
  load(source: string, options?: ProviderOptions): Promise<Artifact>;
}
```

---

## Rule system

Rules are the primary extension mechanism. Each rule encapsulates exactly one validation concern as a plain object — no base classes, no decorators.

```typescript
interface Rule<C = unknown> {
  id:            string;          // "category/rule-name"
  meta:          RuleMeta;
  artifactTypes: readonly string[];
  schema?:       Record<string, unknown>;  // JSON Schema for options validation
  create(context: RuleContext<C>): void | Promise<void>;
}
```

### RuleMeta

```typescript
interface RuleMeta {
  description:      string;
  defaultSeverity:  Severity;
  docsUrl?:         string;
  recommended?:     boolean;    // included in "recommended" preset if true
  hasSuggestions?:  boolean;
  since?:           string;
}
```

### RuleContext

The rule's entire world. Rules must not access anything outside this object.

```typescript
interface RuleContext<C = unknown> {
  artifact:  Readonly<Artifact>;
  options:   Readonly<C> | undefined;
  report(descriptor: DiagnosticDescriptor): void;
}
```

### Writing a rule

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'tile/my-check',
  meta: {
    description: 'Ensures the tile has at least one feature.',
    defaultSeverity: 'error',
    recommended: true,
    docsUrl: 'https://tileguard.dev/rules/tile/my-check',
  },
  artifactTypes: ['VectorTile'],

  create(context) {
    const tile = context.artifact.content as { layers: Record<string, unknown> };
    if (Object.keys(tile.layers).length === 0) {
      context.report({
        message: 'The tile contains no layers.',
        suggestion: 'Ensure your tile generation pipeline produces at least one layer.',
      });
    }
  },
};
```

Rules with options:

```typescript
interface MyOptions { threshold: number }

export const myRule: Rule<MyOptions> = {
  id: 'tile/feature-count',
  meta: { description: 'Feature count check', defaultSeverity: 'warning', recommended: true },
  artifactTypes: ['VectorTile'],
  schema: {
    type: 'object',
    properties: { threshold: { type: 'number' } },
    required: ['threshold'],
  },

  create(context) {
    const threshold = context.options?.threshold ?? 100;
    // ...validate context.artifact.content against threshold...
  },
};
```

### Rule ID naming convention

| Category | Scope |
|:---------|:------|
| `tile/` | Vector tile structure and content |
| `style/` | MapLibre style specification |
| `render/` | Visual regression |
| `artifact/` | Artifact loading (framework-internal) |
| `engine/` | Engine runtime (framework-internal) |
| `project/` | Custom project rules |

---

## Plugin system

A `Plugin` bundles providers and rules into a named unit that the engine can register.

```typescript
interface Plugin {
  id:          string;
  name?:       string;
  version?:    string;
  providers?:  readonly ArtifactProvider[];
  rules?:      readonly Rule[];
}
```

Plugins are the only mechanism for registering providers and rules. The engine does not scan `node_modules` or the file system.

```typescript
// In @tileguard/tile-rules:
export const tilePlugin: Plugin = {
  id: 'tile-rules',
  name: 'TileGuard Tile Rules',
  version: '0.2.0',
  providers: [vectorTileProvider],
  rules: [requiredLayersRule, coordinateRangeRule, unclosedRingRule, /* … */],
};
```

---

## Configuration system

### TileGuardConfig

The shape of `tileguard.config.ts`:

```typescript
interface TileGuardConfig {
  plugins?:   readonly Plugin[];
  rules?:     Record<string, RuleConfig>;
  reporter?:  string | readonly [string, Record<string, unknown>];
  overrides?: readonly Override[];
  options?:   GlobalOptions;
}
```

### RuleConfig

```typescript
type RuleConfig =
  | Severity           // 'error' | 'warning' | 'info'
  | 'off'
  | readonly [Severity, unknown];  // [severity, options]
```

### GlobalOptions

```typescript
interface GlobalOptions {
  timeout?:        number;  // HTTP timeout, ms. Default: 30000
  maxDetails?:     number;  // max diagnostics per rule per artifact. Default: 100
  maxDiagnostics?: number;  // max total diagnostics per run. Default: 1000
}
```

### Configuration resolution
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

When the engine starts, it resolves configuration through these steps:

1. Collect all rules from all plugins into a flat registry (duplicate IDs throw)
2. Apply default severities: `recommended: true` rules use `meta.defaultSeverity`; non-recommended rules default to `'off'`
3. Apply user `rules` overrides on top of defaults
4. Register all providers in plugin order

The resolved config is represented as `ResolvedConfig`:

```typescript
interface ResolvedConfig {
  rules:     ReadonlyMap<string, ResolvedRuleConfig>;
  providers: readonly ArtifactProvider[];
  reporter:  Reporter;
  options:   Required<GlobalOptions>;
  overrides: readonly ResolvedOverride[];
}
```

### Overrides

Path-specific rule overrides for monorepo setups:

```typescript
// tileguard.config.ts
export default {
  plugins: [tilePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
  },
  overrides: [
    {
      files: ['fixtures/experimental/**'],
      rules: { 'tile/self-intersection': 'off' },
    },
  ],
};
```

Override globs support `*`, `**`, and `?`. They are compiled once during
configuration resolution and evaluated against each source before rule
dispatch. Matching overrides are applied in declaration order, so later
entries win. An override can disable a base rule or enable a rule that is
otherwise off.

`maxDiagnostics` is a hard cap over every diagnostic category, including
`artifact/*`, `engine/rule-error`, and `engine/max-diagnostics`. The
truncation notice occupies the final slot in that budget.

---

## Reporter system

Reporters transform the collected diagnostics into a specific output format. They are invoked once per run, after all rules have completed and diagnostics are sorted.

```typescript
interface Reporter {
  id: string;
  report(
    diagnostics: readonly Diagnostic[],
    context: ReporterContext,
  ): void | Promise<void>;
}
```

### ReporterContext

```typescript
interface ReporterContext {
  duration:       number;              // run wall-clock time, ms
  sources:        readonly string[];   // sources passed to engine.run()
  ruleCount:      number;              // total rule invocations
  artifactCount:  number;              // artifacts successfully loaded
  summary: {
    errors:   number;
    warnings: number;
    infos:    number;
    pass:     boolean;
  };
  config:  Readonly<Record<string, unknown>>;
}
```

Reporter implementations live in `@tileguard/reporters`. The core package only defines the contract.

---

## Engine

The engine is the core orchestrator. It is created once and can be called multiple times (e.g., in watch mode).

### createEngine

```typescript
function createEngine(config?: EngineOptions): Engine
```

Accepts a `TileGuardConfig` (or `EngineOptions` which additionally allows a pre-constructed `Reporter` object). Throws synchronously if configuration is invalid (e.g., duplicate rule IDs).

### Engine interface

```typescript
interface Engine {
  run(sources: readonly string[]): Promise<RunResult>;
}
```

### RunResult

```typescript
interface RunResult {
  diagnostics: readonly Diagnostic[];
  summary:     RunSummary;
}

interface RunSummary {
  errors:         number;
  warnings:       number;
  infos:          number;
  sourceCount:    number;
  artifactCount:  number;
  ruleExecutions: number;
  duration:       number;   // ms
  pass:           boolean;  // true when errors === 0
}
```

### Execution pipeline
<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->

```
run(sources)
  │
  ├─ [for each source]
  │    ├─ find provider via canHandle()
  │    │    └─ no match → emit artifact/no-provider, continue
  │    ├─ provider.load(source)
  │    │    └─ throws → emit artifact/load-failed, continue
  │    └─ [for each matching rule]
  │         ├─ skip if rule is disabled
  │         ├─ build RuleContext(artifact, options)
  │         ├─ await rule.create(context)
  │         │    └─ throws → emit engine/rule-error, continue
  │         └─ collect diagnostics from context.report()
  │
  ├─ sort diagnostics (source → severity → ruleId → location)
  ├─ await reporter.report(diagnostics, context)
  └─ return RunResult
```

### Error philosophy

The engine never throws to its caller during normal operation. All expected failure modes are represented as diagnostics:

| Situation | Diagnostic ruleId |
|:----------|:------------------|
| No provider handles source | `artifact/no-provider` |
| Provider load() throws | `artifact/load-failed` |
| Rule create() throws | `engine/rule-error` |
| maxDiagnostics cap reached | `engine/max-diagnostics` |

### Diagnostic sorting

Diagnostics are sorted deterministically:
1. By artifact `source` (alphabetical)
2. By `severity` (error → warning → info)
3. By `ruleId` (alphabetical)
4. By `location` fields (layer → featureIndex → partIndex)

This ordering is consistent regardless of rule execution order, enabling stable snapshot tests and reproducible CI output.

---

## Complete example

```typescript
import { createEngine } from '@tileguard/core';
import type { ArtifactProvider, Plugin, Reporter, Rule } from '@tileguard/core';

// ── Mock provider ────────────────────────────────────────────────────────────
const mockProvider: ArtifactProvider = {
  id: 'mock-provider',
  artifactTypes: ['MockArtifact'],
  canHandle: (source) => source.startsWith('mock://'),
  load: async (source) => ({
    type: 'MockArtifact',
    ref: { type: 'MockArtifact', source },
    content: { featureCount: 0 },
  }),
};

// ── Mock rule ────────────────────────────────────────────────────────────────
const emptyTileRule: Rule = {
  id: 'mock/no-empty',
  meta: {
    description: 'Tile must not be empty.',
    defaultSeverity: 'error',
    recommended: true,
  },
  artifactTypes: ['MockArtifact'],
  create(context) {
    const tile = context.artifact.content as { featureCount: number };
    if (tile.featureCount === 0) {
      context.report({
        message: 'The tile contains 0 features.',
        suggestion: 'Check whether your tile generation pipeline is producing data.',
      });
    }
  },
};

// ── Mock reporter ────────────────────────────────────────────────────────────
const textReporter: Reporter = {
  id: 'text',
  report(diagnostics, ctx) {
    for (const d of diagnostics) {
      process.stdout.write(`[${d.severity}] ${d.ruleId}: ${d.message}\n`);
    }
    process.stdout.write(`\n${ctx.summary.errors} errors — ${ctx.summary.pass ? 'PASS' : 'FAIL'}\n`);
  },
};

// ── Plugin ───────────────────────────────────────────────────────────────────
const mockPlugin: Plugin = {
  id: 'mock',
  providers: [mockProvider],
  rules: [emptyTileRule],
};

// ── Engine usage ─────────────────────────────────────────────────────────────
const engine = createEngine({
  plugins: [mockPlugin],
  reporter: textReporter,
  rules: {
    'mock/no-empty': 'error',
  },
});

const result = await engine.run(['mock://tile-a', 'mock://tile-b']);

console.log(`pass: ${result.summary.pass}`);
// Output:
// [error] mock/no-empty: The tile contains 0 features.
// [error] mock/no-empty: The tile contains 0 features.
//
// 2 errors — FAIL
// pass: false
```

---

## Public API reference

All types are exported from the package root:

```typescript
import type {
  // Diagnostic model
  Diagnostic, DiagnosticDescriptor, Severity, ArtifactRef, Location,

  // Artifact model
  Artifact, ArtifactProvider, ProviderOptions,

  // Rule system
  Rule, RuleMeta, RuleContext,

  // Reporter system
  Reporter, ReporterContext,

  // Plugin system
  Plugin,

  // Configuration system
  TileGuardConfig, ResolvedConfig, ResolvedRuleConfig, RuleConfig,
  ResolvedOverride, ResolvedRuleOverride, GlobalOptions, Override,

  // Engine
  Engine, EngineOptions, RunResult, RunSummary,
} from '@tileguard/core';

// Runtime value (only createEngine is a value, everything else is a type)
import { createEngine } from '@tileguard/core';
```

---

## Status

✅ **Implemented.** All contracts are live and tested.

| Module | Status | Tests |
|:-------|:-------|:------|
| `diagnostic.ts` | ✅ Complete | via engine tests |
| `artifact.ts` | ✅ Complete | via engine tests |
| `rule.ts` | ✅ Complete | via engine tests |
| `reporter.ts` | ✅ Complete | via engine tests |
| `plugin.ts` | ✅ Complete | via engine tests |
| `config.ts` | ✅ Complete | via engine tests |
| `engine.ts` | ✅ Complete | 23 unit tests |

Run tests:

```bash
cd packages/core
npm test
```

Build:

```bash
cd packages/core
npm run build
```

---

## Architecture

See the architecture handbook for detailed rationale and design decisions:

- [04 — Rule System](../../docs/architecture/04-rule-system.md)
- [05 — Reporter System](../../docs/architecture/05-reporter-system.md)
- [06 — Configuration](../../docs/architecture/06-configuration.md)
- [07 — Engine](../../docs/architecture/07-engine.md)
- [ADR-003: Diagnostic as Contract](../../docs/architecture/adr/003-diagnostic-as-contract.md)
- [ADR-004: Direct Artifact Access](../../docs/architecture/adr/004-direct-artifact-access.md)
