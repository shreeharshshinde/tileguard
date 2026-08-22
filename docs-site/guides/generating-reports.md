# Generating Reports

TileGuard generates structured engineering reports from comparison and regression data: Markdown for documentation, HTML for sharing, JSON for automation.

## CLI Usage

```bash
# Markdown report (default)
tileguard report ./baseline.pbf ./updated.pbf --format markdown

# HTML report
tileguard report ./baseline.pbf ./updated.pbf --format html

# JSON report
tileguard report ./baseline.pbf ./updated.pbf --format json

# Save to file
tileguard report ./baseline.pbf ./updated.pbf --format markdown > report.md
```

## Report Contents

Every report includes:

### Executive Summary

A one-paragraph overview of what changed:

> **Tile B introduced 89 modifications and removed 37 features across 3 layers, with 3 high-confidence regressions detected in the `buildings` layer. Feature count increased by 375 (+9.0%).**

### Key Findings

Ranked by confidence and severity:

```markdown
### Key Findings

1. **92% confidence**: Building footprint area reduced by 73% in layer "buildings"
   (feature 42, geometry regression)

2. **85% confidence**: Property "class" changed from "primary" to "tertiary"
   on 4 road features (attribute regression)

3. **71% confidence**: Feature moved 200+ tile units with property changes
   (mixed regression)
```

### Comparison Summary

| Metric | Value |
|:-------|:------|
| Added features | +412 |
| Removed features | −37 |
| Modified features | ~89 |
| Unchanged features | 4,195 |
| Layers affected | 3 of 5 |

### Regression Candidates

Full list of detected regressions with evidence chains:
- Confidence score
- Regression kind (geometry, attribute, mixed)
- Affected layer and feature
- Specific measurements (area change, distance moved, property diff)

### Recommendations

Prioritized action items:

```markdown
### Recommendations

1. **Investigate buildings layer**: 47 features modified with significant
   area reductions. Likely a simplification threshold change.

2. **Review road classification**: 4 features downgraded from "primary"
   to "tertiary". May be a data source update or processing error.

3. **Verify feature migration**: 1 feature moved >200 tile units.
   Check for coordinate system issues in the pipeline.
```

## Report Formats

### Markdown

Best for:
- Pull request descriptions
- Documentation
- Email to stakeholders
- Version-controlled records

```bash
tileguard report ./v1.pbf ./v2.pbf --format markdown > report.md
```

### HTML

Best for:
- Sharing with non-technical stakeholders
- Browser viewing with styled tables
- Attaching to tickets/issues

```bash
tileguard report ./v1.pbf ./v2.pbf --format html > report.html
```

The HTML report is self-contained. All styles are inlined, no external dependencies.

### JSON

Best for:
- Dashboards and monitoring
- Custom tooling
- CI artifact storage
- Programmatic analysis

```bash
tileguard report ./v1.pbf ./v2.pbf --format json > report.json
```

JSON schema:

```json
{
  "schemaVersion": 2,
  "metadata": {
    "generatedAt": "2026-08-18T10:30:00Z",
    "platform": "linux",
    "nodeVersion": "v22.x.x",
    "files": { "before": "v1.pbf", "after": "v2.pbf" }
  },
  "summary": {
    "added": 412,
    "removed": 37,
    "modified": 89,
    "unchanged": 4195
  },
  "regressions": [...],
  "recommendations": [...]
}
```

## Programmatic API

```typescript
import { createReportEngine } from '@tileguard/reporters';

const reportEngine = createReportEngine();

// Generate from comparison + regression data
const report = reportEngine.generate({
  comparison,        // from @tileguard/analysis
  regression,        // from @tileguard/analysis
  format: 'markdown',
});

console.log(report.content);  // The full report as a string
```

## CI Integration

Generate reports as PR artifacts:

```yaml
- name: Generate quality report
  run: |
    git show main:tiles/city.pbf > /tmp/baseline.pbf
    npx @tileguard/cli report /tmp/baseline.pbf ./tiles/city.pbf --format markdown > quality-report.md

- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: tile-quality-report
    path: quality-report.md
```

### Post Report as PR Comment

```yaml
- name: Post report to PR
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    path: quality-report.md
```

## Inspector Reports

The Inspector can also generate reports directly from the UI:

1. Run a comparison in the **Compare** tab
2. Navigate to the **Reports** tab
3. Select format (Markdown / HTML / JSON)
4. Click **Generate**
5. Download or copy the report

## What Next?

- [**Comparing Tiles ›**](/guides/comparing-tiles)
How to compare tile versions
- [**CI / GitHub Actions ›**](/guides/ci-github-actions)
Automated pipelines
- [**Quick Start ›**](/getting-started/quick-start)
Getting started
