# @tileguard/reporters

**Output reporters and engineering report engine for TileGuard.**

[![npm](https://img.shields.io/npm/v/@tileguard/reporters)](https://www.npmjs.com/package/@tileguard/reporters)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Two real-time diagnostic reporters (text + JSON) for terminal and CI output, plus a full engineering report engine that generates Markdown, HTML, and JSON analysis reports from comparison and regression data.

---

## Installation

```bash
npm install @tileguard/reporters @tileguard/core
```

> The CLI includes both reporters automatically — install this package directly only for programmatic use or custom reporter configuration.

---

## Quick Start — Reporters

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { textReporter, jsonReporter } from '@tileguard/reporters';

// Text output (default — colored terminal)
const engine = createEngine({
  plugins: [tilePlugin],
  reporter: textReporter,
});
await engine.run(['./tile.pbf']);
```

**Text reporter output:**

```
✗ tile/required-layers
  Required layer "buildings" is not present in the tile.
  at ./tile.pbf → layer: buildings
  ℹ Add a "buildings" layer to your tile generation pipeline.

⚠ tile/no-empty
  Tile contains 0 features.
  at ./fixtures/empty.pbf

──────────────────────────────────
  2 errors, 1 warning in 2 files (47ms)
```

**JSON reporter output:**

```typescript
const engine = createEngine({
  plugins: [tilePlugin],
  reporter: jsonReporter,
});
```

```json
{
  "diagnostics": [
    {
      "ruleId": "tile/required-layers",
      "severity": "error",
      "message": "Required layer \"buildings\" is not present in the tile.",
      "artifact": { "type": "VectorTile", "source": "./tile.pbf" }
    }
  ],
  "summary": { "errors": 1, "warnings": 0, "infos": 0, "pass": false }
}
```

---

## Quick Start — Report Engine

Generate comprehensive engineering reports from analysis data:

```typescript
import { createReportEngine, renderMarkdown, renderHtml } from '@tileguard/reporters';

const reportEngine = createReportEngine();
const report = reportEngine.generate({
  comparison: tileComparison,
  regressions: regressionAnalysis,
  diagnostics: { before: diagsBefore, after: diagsAfter },
});

const markdown = renderMarkdown(report);  // GitHub-ready .md
const html = renderHtml(report);          // Self-contained HTML dashboard
```

Reports include: executive summary, key findings, layer impact analysis, regression highlights with confidence scores, diagnostic breakdowns, before/after statistics, prioritized recommendations, and full evidence appendix.

---

## Available reporters

| Reporter | Output | Use case |
|:---------|:-------|:---------|
| `textReporter` | Colored terminal | Human review |
| `jsonReporter` | Structured JSON | CI pipelines, programmatic consumption |
| `createTextReporter(opts)` | Configurable text | Custom write functions |
| `createJsonReporter(opts)` | Configurable JSON | Custom indentation, output targets |

## Report formats

| Format | Function | Use case |
|:-------|:---------|:---------|
| Markdown | `renderMarkdown(report)` | GitHub Issues/PRs, CI summaries |
| HTML | `renderHtml(report)` | Self-contained dashboards |
| JSON | `renderJson(report)` | Machine-readable API (schema v2) |

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) | CLI (uses reporters internally) |
| [`@tileguard/core`](https://www.npmjs.com/package/@tileguard/core) | Framework contracts |
| [`@tileguard/tile-rules`](https://www.npmjs.com/package/@tileguard/tile-rules) | Vector tile validation rules |
| [`@tileguard/style-rules`](https://www.npmjs.com/package/@tileguard/style-rules) | MapLibre style lint rules |
| **@tileguard/reporters** | Reporters + report engine (this package) |
| [`@tileguard/analysis`](https://www.npmjs.com/package/@tileguard/analysis) | Tile comparison + regression detection |

---

## Documentation

- [Reporter System Architecture](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/architecture/05-reporter-system.md)
- [API Reference](https://github.com/shindeshreeharsh/tileguard/tree/main/docs/api)
- [Repository](https://github.com/shindeshreeharsh/tileguard)

---

## License

[MIT](https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shindeshreeharsh)
