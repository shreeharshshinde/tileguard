# 05 — Reporter System

## Purpose

Reporters are responsible for presenting diagnostics to users. They consume a
list of `Diagnostic` values and transform them into a specific output format:
human-readable terminal text, structured JSON, SARIF for GitHub Code Scanning,
or any future format.

No other component in the framework should produce formatted output. Rules emit
diagnostics. The engine collects diagnostics. Reporters present diagnostics.
This separation means adding a new output format never requires changes to
validation logic.

---

## The Reporter Interface

```typescript
/**
 * A Reporter transforms a list of diagnostics into formatted output.
 *
 * Reporters are plain objects with a report() method. They are invoked
 * once per engine run, after all rules have completed.
 */
interface Reporter {
  /** Unique identifier for this reporter. Used in configuration.
   *  Examples: "text", "json", "sarif", "github". */
  id: string;

  /** Transforms diagnostics into formatted output.
   *
   *  The reporter decides where output goes: stdout, a file, an API call.
   *  The engine does not constrain output destinations.
   *
   *  @param diagnostics - All diagnostics from the completed run, in order.
   *  @param context - Metadata about the run (timing, sources, config). */
  report(diagnostics: readonly Diagnostic[], context: ReporterContext): void | Promise<void>;
}

/**
 * Metadata about the completed run, available to reporters for
 * enriching their output.
 */
interface ReporterContext {
  /** Wall-clock duration of the entire run in milliseconds. */
  duration: number;

  /** The sources that were processed. */
  sources: string[];

  /** The number of rules that were executed. */
  ruleCount: number;

  /** The number of artifacts that were loaded. */
  artifactCount: number;

  /** The resolved configuration (for reporters that include config
   *  metadata in their output, like SARIF). */
  config: Readonly<ResolvedConfig>;
}
```

---

## Built-In Reporters

### Text Reporter

The default reporter. Produces colored, human-readable terminal output.

```
✗ tile/required-layers
  Required layer "buildings" is not present in the tile.
  at ./fixtures/test-tile.pbf → layer: buildings
  ℹ Add a "buildings" layer to your tile generation pipeline.

✗ tile/unclosed-ring
  Polygon ring is not closed in layer "water", feature 7.
  at ./fixtures/test-tile.pbf → layer: water, feature: 7, part: 0
  ℹ Ensure the last coordinate of each polygon ring matches the first.

⚠ tile/no-empty
  Tile contains 0 features.
  at ./fixtures/empty-tile.pbf

──────────────────────────────────
  2 errors, 1 warning in 2 files (47ms)
```

Design decisions for text output:

- **Severity icons:** `✗` for error, `⚠` for warning, `ℹ` for info.
- **Rule ID first.** The rule ID is the most important identifier — it's
  what users search for in documentation and configuration.
- **Location as breadcrumb.** `at source → layer: x, feature: y` reads
  naturally and supports varying levels of location specificity.
- **Suggestions indented.** Suggestions are actionable advice, visually
  distinct from the error itself.
- **Summary line.** Total counts of errors and warnings, number of files,
  and wall-clock duration.

### JSON Reporter

Produces a JSON array of diagnostics. Useful for CI integration, programmatic
consumption, and piping to other tools.

```json
{
  "diagnostics": [
    {
      "ruleId": "tile/required-layers",
      "severity": "error",
      "message": "Required layer \"buildings\" is not present in the tile.",
      "artifact": { "type": "VectorTile", "source": "./fixtures/test-tile.pbf" },
      "location": { "layer": "buildings" },
      "suggestion": "Add a \"buildings\" layer to your tile generation pipeline.",
      "data": { "requiredLayer": "buildings", "availableLayers": ["water", "roads"] }
    }
  ],
  "summary": {
    "errors": 2,
    "warnings": 1,
    "infos": 0,
    "sources": 2,
    "rules": 12,
    "duration": 47
  }
}
```

### SARIF Reporter (Future)

Produces SARIF 2.1.0 output for integration with GitHub Code Scanning and
other SARIF-consuming tools. SARIF output includes:

- Tool information (TileGuard version, rules executed)
- Results mapped from diagnostics
- Rule metadata (description, help text, docs URL)
- Artifact locations mapped from artifact refs

SARIF is the most demanding reporter because it requires structured metadata
about every rule that produced a diagnostic. This is why `RuleMeta` includes
`description` and `docsUrl` — these fields map directly to SARIF's `rule`
reporting descriptors.

### GitHub Annotation Reporter (Future)

Uses the GitHub Actions `::error` and `::warning` workflow commands to
produce inline annotations on pull requests. Each diagnostic becomes an
annotation pointing to the relevant file.

---

## Reporter Selection

The user selects a reporter through configuration or CLI flags:

```bash
tileguard validate tile.pbf --reporter text      # default
tileguard validate tile.pbf --reporter json
tileguard validate tile.pbf --reporter sarif --output results.sarif
```

```typescript
// tileguard.config.ts
export default {
  reporter: 'json',
  // or with options:
  reporter: ['sarif', { output: './results.sarif' }],
};
```

The engine resolves the reporter from its ID and passes it diagnostics after
rule execution completes.

---

## Reporter Output Destinations

Reporters control where their output goes. This is intentional — different
reporters have different natural destinations:

| Reporter | Default Destination | Configurable |
|:---------|:-------------------|:-------------|
| Text | stdout | No |
| JSON | stdout | Yes (--output flag) |
| SARIF | File (required) | Yes (output path) |
| GitHub | stdout (workflow commands) | No |

Reporters that write to stdout should use the provided `write` function rather
than `console.log` directly, so the engine can capture output for testing.

---

## Reporter Testing

Because reporters are plain objects with a single method, they are trivially
testable:

```typescript
import { textReporter } from '@tileguard/reporters';

test('formats errors with severity icon', () => {
  const output: string[] = [];
  const write = (line: string) => output.push(line);

  textReporter.report(
    [{ ruleId: 'tile/required-layers', severity: 'error', message: '...', artifact: { ... } }],
    { duration: 10, sources: ['test.pbf'], ruleCount: 1, artifactCount: 1 },
    { write }
  );

  assert(output[0].includes('✗'));
  assert(output[0].includes('tile/required-layers'));
});
```

---

## Design Decision: Single Invocation vs. Streaming

We chose **single invocation** (reporters receive all diagnostics at once) over
**streaming** (reporters receive diagnostics one at a time as rules produce them).

**Rationale:**

1. **Grouping.** The text reporter groups diagnostics by file. This requires
   seeing all diagnostics before producing output. Streaming would require
   buffering in the reporter, which is the same as single invocation but
   with more complexity.

2. **Summary statistics.** Every reporter needs total counts (errors, warnings).
   These are only available after all rules have run.

3. **Deterministic output.** Streaming output depends on rule execution order.
   Single invocation allows the reporter to sort diagnostics in whatever order
   is most useful.

4. **Simplicity.** A function that receives an array is simpler than a class
   that manages state across multiple invocations.

If a future use case requires streaming (e.g., a long-running watch mode that
validates files as they change), the reporter interface can be extended with an
optional `reportIncremental` method without breaking existing reporters.

---

*Previous: [04 — Rule System](./04-rule-system.md) · Next: [06 — Configuration](./06-configuration.md)*
