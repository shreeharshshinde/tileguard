# @tileguard/reporters

Text & JSON CLI reporters for terminal output, plus a full engineering report engine generating Markdown, HTML, and JSON reports.

```bash
npm install @tileguard/reporters @tileguard/core
```

---

## CLI Reporters

Real-time diagnostic output for terminal and CI.

| Export | Type | Description |
|:-------|:-----|:------------|
| `textReporter` | Reporter | Colored terminal output (default) |
| `jsonReporter` | Reporter | Machine-readable JSON output |
| `createTextReporter` | Function | Create text reporter with custom options |
| `createJsonReporter` | Function | Create JSON reporter with custom options |

```typescript
import { textReporter, jsonReporter } from '@tileguard/reporters';
import { createTextReporter, createJsonReporter } from '@tileguard/reporters';

// Default reporters
const engine = createEngine({ plugins: [...], reporter: textReporter });

// Custom text reporter (no color, for CI logs)
const plainReporter = createTextReporter({ color: false });

// Custom JSON reporter (pretty-printed)
const prettyJson = createJsonReporter({ indent: 2 });
```

### Text Reporter Options

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `color` | boolean | `true` | Enable ANSI colors |
| `showSuggestions` | boolean | `true` | Show `ℹ` suggestion lines |
| `showDocsUrl` | boolean | `true` | Show rule documentation URLs |

### JSON Reporter Options

| Option | Type | Default | Description |
|:-------|:-----|:--------|:------------|
| `indent` | number | `0` | JSON indentation (0 = minified) |

---

## Report Engine

Generate structured engineering reports from comparison and regression data.

| Export | Type | Description |
|:-------|:-----|:------------|
| `createReportEngine` | Function | Create the report generator |
| `ReportEngine` | Interface | Engine instance with `generate()` method |

```typescript
import { createReportEngine } from '@tileguard/reporters';

const reportEngine = createReportEngine();
const result = reportEngine.generate(comparisonInput, regressionInput, 'html');
```

### Report Formats

| Format | Best for | Output |
|:-------|:---------|:-------|
| `'markdown'` | GitHub PRs, documentation | GFM with tables, collapsible sections |
| `'html'` | Human investigation, CI artifacts | Self-contained page with sidebar, dark mode |
| `'json'` | Dashboards, automation, CI | Machine-readable with schema version |

### Report Generation

```typescript
import { createReportEngine } from '@tileguard/reporters';
import type { ReportResult, ComparisonInput, RegressionInput } from '@tileguard/reporters';

const reportEngine = createReportEngine();

const result: ReportResult = reportEngine.generate(
  comparisonInput,    // from @tileguard/analysis comparison
  regressionInput,    // from @tileguard/analysis regression
  'html',            // format: 'markdown' | 'html' | 'json'
);

if (result.ok) {
  console.log(result.value.content);    // The full report as a string
  console.log(result.value.format);     // 'html'
  console.log(result.value.report);     // EngineeringReport data object
} else {
  console.error(result.error.code);     // Error code
  console.error(result.error.message);  // Human-readable error
}
```

### Report Types

| Export | Type | Description |
|:-------|:-----|:------------|
| `ReportFormat` | Type | `'markdown' \| 'html' \| 'json'` |
| `ReportResult` | Type | `{ ok: true, value: ReportOutput } \| { ok: false, error: ReportError }` |
| `ReportOutput` | Interface | `{ format, content, report }` |
| `ReportError` | Interface | `{ code, message }` |
| `EngineeringReport` | Interface | Full report data model (shared across all formats) |
| `ComparisonInput` | Interface | Comparison data for report generation |
| `RegressionInput` | Interface | Regression data for report generation |

### Error Codes

| Code | When |
|:-----|:-----|
| `MISSING_COMPARISON` | `comparisonInput` is null/undefined |
| `MISSING_REGRESSION` | `regressionInput` is null/undefined |
| `UNSUPPORTED_FORMAT` | Format not in registry |
| `SERIALIZATION_ERROR` | Renderer threw during generation |

### Full Example

```typescript
import { createComparisonEngine, createRegressionEngine, createSnapshotFactory } from '@tileguard/analysis';
import { createReportEngine } from '@tileguard/reporters';
import fs from 'node:fs';

// 1. Build comparison + regression data
const factory = createSnapshotFactory();
const before = factory.createSnapshot('v1.pbf', layersBefore, diagsBefore);
const after = factory.createSnapshot('v2.pbf', layersAfter, diagsAfter);

const comparison = createComparisonEngine().compare(before, after);
const regression = createRegressionEngine().analyze(comparison);

// 2. Generate report in all formats
const reportEngine = createReportEngine();

const html = reportEngine.generate(comparison, regression, 'html');
const md = reportEngine.generate(comparison, regression, 'markdown');
const json = reportEngine.generate(comparison, regression, 'json');

// 3. Write to files
if (html.ok) fs.writeFileSync('report.html', html.value.content);
if (md.ok) fs.writeFileSync('report.md', md.value.content);
if (json.ok) fs.writeFileSync('report.json', json.value.content);
```
