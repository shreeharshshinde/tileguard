# TileGuard Report Specification

**Version:** 2.0  
**Package:** `@tileguard/reporters`  
**Schema:** `schemaVersion: 2`  
**Status:** Stable — backward-compatible changes only

---

## Overview

TileGuard reports are structured engineering artifacts produced by the `ReportEngine`. They contain the complete analysis of a tile comparison and regression investigation in a format suitable for GitHub Issues, Pull Requests, CI/CD pipelines, and incident documentation.

```
ComparisonInput + RegressionInput
        │
        ▼
   ReportEngine
        │
        ├── ReportAssembler (builds EngineeringReport)
        │
        ▼
   FormatRenderer
        │
        ├── Markdown (GitHub-ready)
        ├── HTML (self-contained dashboard)
        └── JSON (API/CI consumption)
```

---

## Report Structure

Every report contains these sections in order:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Executive Summary** | One-screen status: PASS/FAIL, risk, confidence, metrics |
| 2 | **Key Findings** | Top 5–7 auto-derived findings with severity |
| 3 | **Overview** | Comparison header: source/target, status, confidence |
| 4 | **Layer Impact** | Per-layer change table: added/modified/removed |
| 5 | **Regression Analysis** | Top-N candidates with confidence bars and evidence |
| 6 | **Diagnostics** | New/resolved/persistent breakdown + top rules |
| 7 | **Statistics** | Before/after/delta table (layers, features, vertices) |
| 8 | **Recommendations** | Prioritized actions (HIGH/MEDIUM/LOW) with evidence |
| 9 | **Comparison** | Legacy feature/layer/stats tables |
| 10 | **Appendix** | Full detail in collapsible panels |

---

## JSON Schema (v2)

### Root Object

```jsonc
{
  "$schema": "https://tileguard.dev/schemas/report-v2.json",
  "schemaVersion": 2,
  "generator": {
    "name": "TileGuard",
    "version": "0.4.5",
    "url": "https://github.com/shindeshreeharsh/tileguard"
  },
  "metadata": { /* ReportMetadata */ },
  "executiveSummary": { /* ExecutiveSummary */ },
  "keyFindings": [ /* KeyFinding[] */ ],
  "overview": { /* OverviewSection */ },
  "layerImpact": [ /* LayerImpactEntry[] */ ],
  "regressionHighlights": { /* RegressionHighlightSection */ },
  "diagnosticsSummary": { /* DiagnosticsSummarySection */ },
  "statisticsDashboard": { /* StatisticsDashboard */ },
  "prioritizedRecommendations": [ /* PrioritizedRecommendation[] */ ],
  "comparison": { /* ComparisonSection */ },
  "regression": { /* RegressionSection */ },
  "statistics": { /* StatisticsSection */ },
  "diagnostics": { /* DiagnosticSection */ },
  "recommendations": { /* RecommendationSection */ },
  "appendix": { /* ReportAppendix */ }
}
```

### ReportMetadata

```typescript
interface ReportMetadata {
  generatedAt: string;          // ISO 8601 timestamp
  tileguardVersion: string;     // semver
  sourceTile: string;           // file path
  targetTile: string;           // file path
  totalDurationMs: number;      // wall-clock milliseconds
  platform?: string;            // e.g. "linux x64"
  cliVersion?: string;          // CLI package version
  nodeVersion?: string;         // e.g. "v20.11.0"
  ruleSetVersion?: string;      // config hash or version
  configPath?: string;          // tileguard.config.ts path
  sourceTileHash?: string;      // SHA-256 hex
  targetTileHash?: string;      // SHA-256 hex
  reportId?: string;            // unique ID (e.g. "tg-a1b2c3d4")
}
```

### ExecutiveSummary

```typescript
interface ExecutiveSummary {
  status: 'identical' | 'changes-detected' | 'regressions-found' | 'clean';
  regressionRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  durationMs: number;
  sourceTile: string;
  targetTile: string;
  generatedAt: string;
  metrics: {
    layersChanged: number;
    featuresAdded: number;
    featuresModified: number;
    featuresRemoved: number;
    regressionCandidates: number;
    newDiagnostics: number;
    overallConfidencePct: number;
  };
}
```

### KeyFinding

```typescript
interface KeyFinding {
  rank: number;                 // 1-based
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  references?: string[];        // links to sections/layers
}
```

### PrioritizedRecommendation

```typescript
interface PrioritizedRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  reason: string;
  affectedLayers: string[];
  evidence: string[];           // why this recommendation exists
  actions: string[];            // specific steps to take
}
```

---

## Severity Definitions

| Level | Meaning | Example |
|-------|---------|---------|
| `critical` | Data loss or silent render failure | Self-intersecting polygon causing invisible features |
| `high` | Significant quality degradation | Layer disappeared entirely |
| `medium` | Noticeable change requiring review | 500+ features modified |
| `low` | Minor change, likely intentional | Property value updated |
| `info` | Informational observation | Feature count increased |

---

## Recommendation Categories

| Priority | Meaning | Action Required |
|----------|---------|-----------------|
| `HIGH` | Immediate attention needed | Block deployment or investigate before merge |
| `MEDIUM` | Should be reviewed | Investigate during sprint, may be intentional |
| `LOW` | Worth noting | Monitor in future builds |

Each recommendation includes:
- **Reason:** Why this recommendation exists
- **Evidence:** Specific data points supporting it
- **Affected Layers:** Which layers are impacted
- **Actions:** Concrete steps the engineer should take

---

## Regression Risk Levels

| Risk | Confidence Range | Meaning |
|------|-----------------|---------|
| `none` | 0 candidates | No regressions detected |
| `low` | <50% confidence | Unlikely to be a real regression |
| `medium` | 50–70% confidence | Possible regression, investigate |
| `high` | 70–85% confidence | Likely regression |
| `critical` | >85% confidence | Almost certainly a regression |

---

## Export Formats

### Markdown
- GitHub-Flavored Markdown (GFM)
- Tables, collapsible `<details>` sections, code fences
- Emoji status indicators (✅ 🔴 🟠 🟡 🔵)
- Confidence bars (text-based `█░` representation)
- Renders cleanly in GitHub Issues, PRs, and README files

### HTML
- Self-contained (no external assets)
- Sticky sidebar navigation with section links
- Dark mode via `prefers-color-scheme`
- Print-optimized CSS
- Status cards with color-coded indicators
- Stat grids for metrics display
- Collapsible detail panels

### JSON
- Schema version 2 (stable)
- `$schema` URL for tooling integration
- `generator` metadata block
- Losslessly preserves all report data
- Suitable for CI/CD consumption, programmatic analysis, and archival

---

## Future Formats (Planned)

| Format | Purpose | Status |
|--------|---------|--------|
| PDF | Printable engineering document | Planned (jsPDF) |
| CSV | Spreadsheet-compatible data export | Planned |
| SARIF | GitHub Code Scanning integration | Planned |

SARIF (Static Analysis Results Interchange Format) will allow TileGuard findings to appear directly in GitHub's Security tab, making tile quality issues visible alongside code vulnerabilities.

---

## Backward Compatibility

### Version 1 → 2 Migration
- All v1 fields preserved in the `overview`, `comparison`, `regression`, `statistics`, `diagnostics`, `recommendations` sections
- New sections are **additive** — v1 consumers can ignore them
- `schemaVersion` field enables consumers to detect the format

### Stability Guarantees
- Fields will never be removed from a schema version
- New optional fields may be added (consumers should ignore unknown fields)
- Breaking changes increment `schemaVersion`
- Legacy section names (`## Overview`, `## Comparison`, etc.) preserved in Markdown for test compatibility

---

## API Usage

```typescript
import { createReportEngine } from '@tileguard/reporters';

const engine = createReportEngine({
  tileguardVersion: '0.4.5',
  platform: 'linux x64',
  nodeVersion: process.version,
});

const result = engine.generate(comparisonInput, regressionInput, 'markdown');

if (result.ok) {
  console.log(result.value.content); // formatted report string
  console.log(result.value.report);  // EngineeringReport object
} else {
  console.error(result.error.message);
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `MISSING_COMPARISON` | No comparison input provided |
| `MISSING_REGRESSION` | No regression input provided |
| `UNSUPPORTED_FORMAT` | Requested format not registered |
| `SERIALIZATION_ERROR` | Report build or render threw |

---

## Contributing

### Adding a New Report Section

1. Define the section type in `models/EngineeringReport.ts`
2. Add a builder function in `ReportAssembler.ts`
3. Call the builder in `ReportEngine.ts` `buildReport()`
4. Render the section in `MarkdownReporter.ts`, `HtmlReporter.ts`
5. Include the section in `EngineeringReport` interface
6. Add tests covering the new section
7. Update this spec

### Adding a New Export Format

1. Create a renderer function: `(report: EngineeringReport) => string`
2. Register it in `ReporterRegistry.ts`
3. Export from `report/index.ts`
4. Add tests
5. Document in this spec
