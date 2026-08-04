# CI Integration Guide

TileGuard CLI integrates into continuous integration pipelines to catch tile regressions before they reach production.

---

## Quick Start — GitHub Actions

Drop this workflow into `.github/workflows/tileguard.yml`:

```yaml
name: TileGuard Quality Gate

on:
  pull_request:
    paths:
      - 'tiles/**'
      - 'styles/**'

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Needed to access base branch tiles

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # Validate all tiles against rules
      - name: Check tiles
        run: npx tileguard check ./tiles/ --reporter json > check-results.json

      # Compare against baseline (if available)
      - name: Compare tiles
        if: hashFiles('tiles/baseline.pbf') != ''
        run: npx tileguard compare tiles/baseline.pbf tiles/current.pbf --json > comparison.json

      # Full analysis with regression detection
      - name: Analyze regressions
        if: hashFiles('tiles/baseline.pbf') != ''
        run: npx tileguard analyze tiles/baseline.pbf tiles/current.pbf --json > analysis.json

      # Generate engineering report
      - name: Generate report
        if: hashFiles('tiles/baseline.pbf') != ''
        run: npx tileguard report tiles/baseline.pbf tiles/current.pbf --format markdown --output tileguard-report.md

      # Upload artifacts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: tileguard-reports
          path: |
            check-results.json
            comparison.json
            analysis.json
            tileguard-report.md
```

---

## Exit Codes

TileGuard CLI uses deterministic exit codes for CI integration:

| Code | Meaning | CI Behavior |
|------|---------|-------------|
| `0`  | No issues — all checks pass | Pipeline continues |
| `1`  | Warnings or non-critical regressions found | Pipeline may continue (configurable) |
| `2`  | Errors detected — regressions confirmed | Pipeline should fail |
| `3`  | Internal failure (crash, bad config) | Pipeline fails with error |

Use `if: always()` on artifact upload steps to capture reports even when the pipeline fails.

---

## Commands for CI

### `tileguard check`

Validates tiles and styles against configured rules.

```bash
tileguard check ./tiles/ ./styles/ --reporter json
```

### `tileguard compare`

Compares two tile versions and reports structural differences.

```bash
tileguard compare baseline.pbf current.pbf --json
```

### `tileguard analyze`

Runs full pipeline: comparison + regression investigation.

```bash
tileguard analyze baseline.pbf current.pbf --json
```

### `tileguard report`

Generates a shareable engineering report.

```bash
tileguard report baseline.pbf current.pbf --format markdown --output report.md
tileguard report baseline.pbf current.pbf --format html --output report.html
tileguard report baseline.pbf current.pbf --format json --output report.json
```

### `tileguard stats`

Displays tile statistics (useful for monitoring).

```bash
tileguard stats tile.pbf --json
```

### `tileguard doctor`

Health check — verifies the environment is correctly configured.

```bash
tileguard doctor
```

---

## Configuration

Create `tileguard.yml` in your repository root for shared settings:

```yaml
comparison:
  stableProperties:
    - osm_id
    - building_id

regression:
  minConfidence: 0.60

report:
  format: markdown

output:
  directory: reports/
```

The CLI auto-discovers `tileguard.yml`, `tileguard.yaml`, or `.tileguard.yml` in the working directory.

---

## Advanced Workflows

### Pull Request Comment

Post the analysis summary as a PR comment:

```yaml
- name: Post analysis comment
  if: github.event_name == 'pull_request' && hashFiles('analysis.json') != ''
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const analysis = JSON.parse(fs.readFileSync('analysis.json', 'utf8'));
      const body = `## TileGuard Analysis

      | Metric | Value |
      |--------|-------|
      | Features Modified | ${analysis.comparison.features.modified} |
      | Regression Candidates | ${analysis.regression.totalCandidates} |
      | Overall Confidence | ${Math.round(analysis.regression.overallConfidence * 100)}% |
      | Status | ${analysis.regression.isClean ? '✅ Clean' : '⚠️ Regressions Found'} |

      [View full report](./tileguard-report.md)`;

      github.rest.issues.createComment({
        ...context.repo,
        issue_number: context.issue.number,
        body
      });
```

### Matrix Comparison (Multiple Tiles)

```yaml
strategy:
  matrix:
    tile: [roads, buildings, water, terrain]

steps:
  - name: Analyze ${{ matrix.tile }}
    run: |
      tileguard analyze \
        tiles/baseline/${{ matrix.tile }}.pbf \
        tiles/current/${{ matrix.tile }}.pbf \
        --json > ${{ matrix.tile }}-analysis.json
```

### Scheduled Regression Monitoring

```yaml
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM

jobs:
  weekly-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - name: Generate weekly report
        run: |
          tileguard report \
            tiles/last-week.pbf \
            tiles/current.pbf \
            --format html \
            --output reports/weekly-$(date +%Y%m%d).html
      - uses: actions/upload-artifact@v4
        with:
          name: weekly-tileguard-report
          path: reports/
          retention-days: 90
```

---

## Artifact Outputs

The CLI generates these files when using `--output`:

| File | Command | Description |
|------|---------|-------------|
| `comparison.json` | `compare --json` | Raw comparison data |
| `analysis.json` | `analyze --json` | Comparison + regression data |
| `tileguard-report.md` | `report --format markdown` | Human-readable report |
| `tileguard-report.html` | `report --format html` | Self-contained HTML report |
| `tileguard-report.json` | `report --format json` | Machine-readable full report |

---

## Troubleshooting

### `tileguard doctor` in CI

Run `tileguard doctor` as an early step to verify the environment:

```yaml
- name: Verify environment
  run: npx tileguard doctor
```

### Silent failures

Use `--verbose` or `--debug` for detailed logging:

```bash
tileguard analyze baseline.pbf current.pbf --verbose
tileguard analyze baseline.pbf current.pbf --debug
```

### Large tiles

For tiles > 10MB, increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" tileguard analyze large-baseline.pbf large-current.pbf
```

---

## End-to-End Workflow

The complete developer workflow:

```text
Developer changes tile generation pipeline
        ↓
Push to feature branch
        ↓
GitHub Actions triggers on PR
        ↓
tileguard check ./tiles/         → validates rules
tileguard analyze old.pbf new.pbf → detects regressions
tileguard report old.pbf new.pbf  → generates report
        ↓
Report uploaded as artifact
        ↓
PR comment posted with summary
        ↓
Engineer investigates findings
        ↓
Fix or acknowledge → merge
```

This is the same workflow TileGuard demonstrates at **FOSS4G 2026 Hiroshima**.
