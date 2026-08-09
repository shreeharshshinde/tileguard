# @tileguard/reporters

Built-in output reporters for the TileGuard quality analysis framework. Reporters consume diagnostics produced by the engine and transform them into human- or machine-readable output.

> **Package boundary:** This package depends only on `@tileguard/core`. It has no knowledge of domain packages (`tile-rules`, `style-rules`) or configuration loading (`config`).

---

## Installation

```bash
npm install @tileguard/reporters @tileguard/core
```

---

## Reporters

| Reporter | CLI Flag | Output | Description |
|:---------|:---------|:-------|:------------|
| `textReporter` | `--reporter text` (default) | stdout | Human-readable terminal output with ANSI color, severity icons, and source grouping |
| `jsonReporter` | `--reporter json` | stdout | Structured `{ diagnostics, summary }` JSON for CI pipelines and programmatic consumption |

## Report Engine

In addition to real-time diagnostic reporters, this package includes a full **engineering report engine** that generates comprehensive analysis reports from comparison and regression data:

| Format | Description |
|:-------|:------------|
| Markdown | GitHub-ready engineering reports (Issues, PRs, CI summaries) |
| HTML | Self-contained dashboard with embedded styles |
| JSON | Machine-readable report API (`schemaVersion: 2`) |

Reports include: executive summary, key findings, layer impact analysis, regression candidates with confidence scores, diagnostic breakdowns, before/after statistics, prioritized recommendations, and full evidence appendix.

```typescript
import { ReportEngine } from '@tileguard/reporters';

const engine = new ReportEngine();
const report = engine.generate({ comparison, regressions, diagnostics });
const markdown = engine.render(report, 'markdown');
const html = engine.render(report, 'html');
const json = engine.render(report, 'json');
```

---

## Usage

### Default text reporter

```typescript
import { textReporter } from '@tileguard/reporters';
import { createEngine } from '@tileguard/core';

const engine = createEngine({
  plugins: [tilePlugin],
  reporter: textReporter,
});

await engine.run(['./tile.pbf']);
```

Output:

```
./tile.pbf
  ✗ tile/required-layers
    Required layer "buildings" is not present in the tile.
    at ./tile.pbf → layer: buildings
    ℹ Add a "buildings" layer to your tile generation pipeline.

  ⚠ tile/no-empty
    Tile contains 0 features.
    at ./empty-tile.pbf

────────────────────────────────────────
  1 error, 1 warning in 1 source (47ms)
```

### JSON reporter

```typescript
import { jsonReporter } from '@tileguard/reporters';

const engine = createEngine({
  plugins: [stylePlugin],
  reporter: jsonReporter,
});
```

Output:

```json
{
  "diagnostics": [
    {
      "ruleId": "style/version",
      "severity": "error",
      "message": "Style specification version must be 8, found \"7\".",
      "artifact": { "type": "StyleSpecification", "source": "./style.json" }
    }
  ],
  "summary": {
    "errors": 1,
    "warnings": 0,
    "infos": 0,
    "pass": false,
    "sources": 1,
    "rules": 9,
    "duration": 12
  }
}
```

### Custom configuration

Both reporters expose factory functions for custom options:

```typescript
import { createTextReporter, createJsonReporter } from '@tileguard/reporters';

// Text reporter without color (for CI logs or file output)
const plainReporter = createTextReporter({ color: false });

// JSON reporter with compact output (no indentation)
const compactJson = createJsonReporter({ indent: 0 });

// Capture output programmatically instead of writing to stdout
const lines: string[] = [];
const captureReporter = createTextReporter({
  write: (text) => lines.push(text),
  color: false,
});
```

---

## API Reference

### Text Reporter

| Export | Type | Description |
|:-------|:-----|:------------|
| `textReporter` | `Reporter` | Default instance — auto-detects TTY for color |
| `createTextReporter(options?)` | `(TextReporterOptions) => Reporter` | Factory with custom options |

**`TextReporterOptions`**

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `write` | `(text: string) => void` | `process.stdout.write` | Output destination |
| `color` | `boolean` | `process.stdout.isTTY` | Enable/disable ANSI color codes |

**Output format details:**

- **Severity icons:** `✗` error, `⚠` warning, `ℹ` info
- **Grouping:** Diagnostics are grouped under their source file path
- **Location breadcrumbs:** `at source → layer: x, feature: y, part: z` — renders whichever location fields are present
- **Suggestions:** Indented with `ℹ` prefix
- **Summary:** Error/warning/info counts, source count, wall-clock duration
- **No-problems case:** `✔ No problems found (N sources, Xms)`

### JSON Reporter

| Export | Type | Description |
|:-------|:-----|:------------|
| `jsonReporter` | `Reporter` | Default instance — 2-space indent, stdout |
| `createJsonReporter(options?)` | `(JsonReporterOptions) => Reporter` | Factory with custom options |

**`JsonReporterOptions`**

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `write` | `(text: string) => void` | `process.stdout.write` | Output destination |
| `indent` | `number` | `2` | JSON indentation spaces (0 for compact) |

**Exported types for downstream parsing:**

| Type | Description |
|:-----|:------------|
| `JsonReporterOutput` | Top-level `{ diagnostics, summary }` shape |
| `SerializedDiagnostic` | Individual diagnostic entry in JSON output |

---

## CLI Usage

Reporters are selected via the `--reporter` flag on the CLI:

```bash
# Default text output (human-readable, colored)
npx @tileguard/cli check ./tile.pbf

# JSON output for CI pipelines
npx @tileguard/cli check ./tile.pbf --reporter json

# JSON output piped to jq
npx @tileguard/cli check ./tiles/ --reporter json | jq '.summary'
```

Or set the default reporter in your config file:

```typescript
// tileguard.config.ts
export default {
  plugins: [tilePlugin, stylePlugin],
  reporter: 'json',  // all runs use JSON output
};
```

---

## Architecture

Reporters sit at the end of the TileGuard execution pipeline:

```
Rules emit diagnostics → Engine collects & sorts → Reporter presents output
```

The engine calls `reporter.report(diagnostics, context)` exactly once per run, after all rules have completed. The reporter receives:

- **`diagnostics`** — the full sorted `Diagnostic[]` (sorted by source → severity → rule ID → location)
- **`context`** — a `ReporterContext` with `duration`, `sources`, `ruleCount`, `artifactCount`, and `summary` stats

Reporters control their own output destination. The engine does not constrain where output goes.

### Dependency graph

```
@tileguard/reporters ──┐
                        ├──► packages/cli (resolves reporter strings to objects)
@tileguard/config ─────┘
         │
         ▼
   @tileguard/core
```

This package depends **only** on `@tileguard/core`. It does not import `@tileguard/config` or any domain package. Reporter resolution (`'json'` → `jsonReporter` object) is handled by the CLI package, not here.

---

## Testing

```bash
# Run reporter tests
pnpm --filter @tileguard/reporters test

# Run in watch mode
pnpm --filter @tileguard/reporters test:watch
```

**Test coverage: 94 tests across 4 suites**

| Suite | Tests | Covers |
|:------|------:|:-------|
| `text-reporter.test.ts` | 23 | Severity icons, PASS/FAIL verdicts, source grouping, location breadcrumbs (including region), suggestions, summary, color modes |
| `json-reporter.test.ts` | 15 | Output structure, diagnostic serialization, summary stats, indentation options |
| `report-engine.test.ts` | 46 | ReportEngine, ReportAssembler, Markdown/HTML/JSON rendering, evidence chains, recommendations, schema version |
| `stress-and-edge.test.ts` | 10 | Emojis & Unicode strings, extremely long paths (1,000+ chars) & messages (5,000+ chars), boundary context values, high-volume stress (2,000+ items), browser portability checks (non-Node execution) |

All test suites use the injectable `write` function to capture output without touching real stdout, ensuring 100% deterministic test execution.

### Stress & Edge Case Verification

The reporters are validated against extreme inputs and runtime settings to ensure stability under production loads:

- **High-Volume Loads:** Validated to format and output **2,000+ distinct diagnostics** across multiple files in a single pass without timing degradation or call stack limits.
- **Unicode & Internationalization:** Tested against emojis (`🌐`, `🏢`, `📐`), multi-byte languages (e.g. Chinese characters: `建筑物`), and Right-to-Left (RTL) text (e.g. Arabic scripts: `السلام عليكم`) in diagnostic messages, suggestions, and rule identifiers.
- **Extreme Payload Sizes:** Handles paths extending up to **1,000 characters** and message content up to **5,000 characters** without rendering offsets or memory leaks.
- **Context Boundaries:** Verified safe execution on boundary values: zero rule executions, zero source assets, zero execution duration, and extremely large clock metrics (`999,999,999ms`).
- **Runtimes & Sandboxes (Portability):** Verified behavior under zero-dependency mock environments (e.g., simulating web browser bundling by executing with undefined `process` global). Output routes smoothly to standard `console` channels when system streams are not present.

---

## 🚀 Future Scope

While the package already includes text, JSON, and the full engineering report engine (Markdown, HTML, JSON), the architecture supports further extensions:

### Planned Reporters

- **SARIF (Static Analysis Results Interchange Format):** Standard JSON format for integration with security and code-scanning platforms like GitHub Code Scanning.
- **GitHub PR Annotations:** Native output format formatting to directly annotate line-level linting/validation warnings in GitHub Actions.

### Future Framework Roadmaps

The broader roadmap for the TileGuard project includes:

*   **Validation:** Visual regression testing using pixel-level image comparisons, baseline snapshot management, and performance benchmarking.
*   **Artifacts:** Extending beyond MVTs and MapLibre Styles to support PMTiles, GeoJSON, GeoParquet, and Cloud Optimized GeoTIFFs (COGs).
*   **Developer Experience:** Watch mode for continuous local validation and Language Server Protocol (LSP) integrations.
*   **Performance:** Distributed validation pipelines, parallel rule evaluation, and incremental caching.
*   **Multi-Language:** Python bindings that wrap the reference TypeScript core.

## Legacy Reference

The legacy reporter implementation served as the behavioral reference for this package:

- [`legacy/js/src/reporter.js`](../../legacy/js/src/reporter.js) — original text and JSON output logic
- [`legacy/python/tileguard/reporter.py`](../../legacy/python/tileguard/reporter.py) — Python reporter reference

Key differences from legacy:

| Aspect | Legacy | Framework |
|:-------|:-------|:----------|
| Interface | Class with `printValidation`, `printLint`, `printRender` | Single `report(diagnostics, context)` method |
| Output | `console.log` directly | Injectable `write` function |
| Grouping | None — prints results linearly | Groups diagnostics by source file |
| Location | Not rendered | Full breadcrumb: layer, feature, part, jsonPath, line/column |
| Testability | Requires stdout capture | Inject `write` function in constructor |
