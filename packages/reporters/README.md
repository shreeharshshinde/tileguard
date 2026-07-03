# @tileguard/reporters

Built-in output reporters for TileGuard.

## Status

📋 **Pending implementation.** See [`docs/engineering/MIGRATION_PLAN.md`](../../docs/engineering/MIGRATION_PLAN.md).

## Planned reporters

| Reporter | Flag | Description |
|:---------|:-----|:------------|
| `textReporter` | `--reporter text` (default) | Human-readable terminal output with colour coding |
| `jsonReporter` | `--reporter json` | Structured JSON for CI pipelines and tooling |
| `sarifReporter` | `--reporter sarif` | SARIF 2.1.0 for GitHub Code Scanning and IDE integration |

## Legacy reference

- [`legacy/js/src/reporter.js`](../../legacy/js/src/reporter.js) — text and JSON output logic
- [`legacy/python/tileguard/reporter.py`](../../legacy/python/tileguard/reporter.py) — Python reporter reference
