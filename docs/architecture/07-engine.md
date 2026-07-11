# 07 — Engine

## Purpose

The Engine is the core orchestrator of TileGuard. It connects configuration,
artifact providers, rules, and reporters into a coherent execution pipeline.
The engine itself has no knowledge of geospatial formats, specific rules, or
output formats. It is a generic quality analysis runner.

---

## The Engine Interface
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

```typescript
/**
 * Creates a configured engine instance ready for execution.
 */
function createEngine(config: TileGuardConfig): Engine;

/**
 * The Engine orchestrates a complete validation run.
 */
interface Engine {
  /** Executes validation on the given sources.
   *
   *  This is the primary entry point. It:
   *  1. Resolves configuration
   *  2. Loads artifacts from sources
   *  3. Executes matching rules against each artifact
   *  4. Collects diagnostics
   *  5. Invokes the reporter
   *  6. Returns a summary
   *
   *  @param sources - File paths, URLs, or other source identifiers.
   *  @returns Run result containing all diagnostics and summary statistics.
   */
  run(sources: string[]): Promise<RunResult>;
}

/**
 * The result of a complete engine run.
 */
interface RunResult {
  /** All diagnostics produced during the run, in order. */
  diagnostics: Diagnostic[];

  /** Summary statistics. */
  summary: RunSummary;
}

interface RunSummary {
  /** Total diagnostics by severity. */
  errors: number;
  warnings: number;
  infos: number;

  /** Number of sources processed. */
  sourceCount: number;

  /** Number of artifacts successfully loaded. */
  artifactCount: number;

  /** Number of rules executed (total across all artifacts). */
  ruleExecutions: number;

  /** Wall-clock duration of the entire run in milliseconds. */
  duration: number;

  /** Whether the run "passed" (no errors). */
  pass: boolean;
}
```

---

## Execution Pipeline
<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->
<!-- TODO: INSERT DIAGRAM 3: Upward Configuration Discovery Walk -->

The engine's `run()` method executes a deterministic pipeline:

```mermaid
flowchart TD
    A["run(sources)"] --> B[Resolve Configuration]
    B --> C[Build Rule Index]
    C --> D{For each source}
    D --> E[Select Provider]
    E --> F{Provider found?}
    F -->|No| G["Emit artifact/no-provider diagnostic"]
    F -->|Yes| H[Load Artifact]
    H --> I{Load succeeded?}
    I -->|No| J["Emit artifact/load-failed diagnostic"]
    I -->|Yes| K[Select Matching Rules]
    K --> L{For each matching rule}
    L --> M{Rule enabled?}
    M -->|No| N[Skip]
    M -->|Yes| O[Create RuleContext]
    O --> P["Call rule.create(context)"]
    P --> Q[Collect Diagnostics]
    Q --> L
    L -->|Done| D
    D -->|Done| R[Sort Diagnostics]
    R --> S["Invoke Reporter"]
    S --> T[Return RunResult]

    G --> D
    J --> D
```

### Stage 1: Configuration Resolution

See [06 — Configuration](./06-configuration.md). The engine resolves the
full configuration once at the start of the run. This produces a
`ResolvedConfig` containing all enabled rules with their severities and
options, all registered providers, and the selected reporter.

### Stage 2: Rule Index

The engine builds an index mapping artifact types to lists of enabled rules:

```typescript
// Internal structure
Map<string, ResolvedRuleConfig[]>
// Example:
// "VectorTile" → [requiredLayers, coordinateRange, unclosedRing, ...]
// "StyleSpecification" → [knownSource, zoomRange, uniqueLayerId, ...]
```

This avoids scanning all rules for every artifact.

### Stage 3: Artifact Loading

For each source string, the engine iterates registered providers and calls
`provider.canHandle(source)`. The first provider that returns `true` is used
to load the artifact.

If no provider matches, the engine emits an `artifact/no-provider` diagnostic
and continues to the next source. The run does not abort.

If loading fails (file not found, network error, decode error), the engine
emits an `artifact/load-failed` diagnostic and continues. This is important:
a single bad file should not prevent validation of all other files.

All infrastructure diagnostics use the same `maxDiagnostics` budget as rule
diagnostics. Once the hard cap is reached, the final slot contains
`engine/max-diagnostics` and the engine stops dispatching further work.

### Stage 4: Rule Execution
<!-- TODO: INSERT DIAGRAM 4: Dynamic Config Loader Evaluation -->
<!-- TODO: INSERT DIAGRAM 5: Non-Short-Circuiting Schema Validation -->

For each successfully loaded artifact, the engine looks up matching rules
in the rule index using `artifact.type`. Before that lookup, it applies every
path override matching the source, in declaration order. For each matching,
enabled rule:

1. Create a `RuleContext` with the artifact and the rule's resolved options.
2. Call `rule.create(context)`.
3. If `create` returns a Promise, await it.
4. Collect any diagnostics emitted via `context.report()`.

The engine wraps each rule invocation in error handling. If a rule throws an
unexpected exception:
- The engine catches the error.
- It emits an internal `engine/rule-error` diagnostic with the error details.
- It continues executing remaining rules.
- A rule bug must never crash the entire run.

### Stage 5: Diagnostic Ordering

After all rules have executed across all artifacts, the engine sorts
diagnostics in a deterministic order:

1. By artifact source (alphabetical)
2. By severity (error → warning → info)
3. By rule ID (alphabetical)
4. By location (layer → feature index → part index)

This ordering is deterministic regardless of rule execution order, which
is important for snapshot testing and reproducible CI output.

### Stage 6: Reporting

The engine constructs a `ReporterContext` with run metadata and invokes:

```typescript
await reporter.report(diagnostics, reporterContext);
```

### Stage 7: Result

The engine returns a `RunResult` containing all diagnostics and a summary.
The caller (CLI or programmatic API) uses `summary.pass` to determine the
exit code.

---

## Error Handling Philosophy

The engine distinguishes three categories of errors:

| Category | Example | Handling |
|:---------|:--------|:---------|
| **Validation finding** | Missing layer, unclosed ring | Normal diagnostic |
| **Infrastructure error** | File not found, network timeout | Diagnostic with `artifact/` rule ID |
| **Framework bug** | Null reference in engine, invalid rule interface | Error diagnostic + continue |

The engine never throws exceptions to its caller during normal operation.
Everything is reported through diagnostics. The only exceptions the caller
might see are truly catastrophic failures (out of memory, config file
syntax error that prevents the run from starting).

---

## Concurrency Model

The initial implementation is sequential: sources are processed one at a time,
rules execute one at a time within each source. This is the simplest correct
implementation.

The architecture supports future parallelism without interface changes:

- **Artifact loading** can be parallelized (I/O-bound).
- **Rule execution** can be parallelized for rules that handle the same artifact,
  because rules are stateless and share nothing.
- **Reporting** must remain sequential (reporters write to stdout/files).

Parallelism is an optimization that should be driven by measured performance
problems, not speculative design. The sequential model is correct, predictable,
and sufficient for typical project sizes.

---

## Engine Configuration

The engine itself has minimal configuration. Most configuration is delegated
to rules (via rule options) and reporters (via reporter options). The engine
only controls:

- **Source ordering** — whether to process sources in argument order or
  sorted alphabetically (default: argument order).
- **Fail fast** — whether to stop after the first error (default: false,
  validate all sources).
- **Max diagnostics** — upper limit on total diagnostics to prevent
  runaway output (default: 1000).

---

## Programmatic API

The engine is designed for programmatic use, not just CLI invocation:

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
  },
  reporter: 'json',
});

const result = await engine.run(['./tiles/14/8741/5321.pbf']);

console.log(result.summary.pass);      // true or false
console.log(result.diagnostics.length); // number of findings
```

This enables:
- Integration tests that validate tiles programmatically
- Custom scripts that process diagnostics
- IDE integrations that run TileGuard on file save
- Watch mode implementations

---

*Previous: [06 — Configuration](./06-configuration.md) · Next: [08 — Package Structure](./08-package-structure.md)*
