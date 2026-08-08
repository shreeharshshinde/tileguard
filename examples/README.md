# Examples

This directory contains worked examples demonstrating TileGuard integration patterns.

## Available Examples

| File | Description |
|:-----|:------------|
| `reporters-demo.js` | Demonstrates the report engine: generates Markdown, HTML, and JSON reports from diagnostics |

## Planned Examples

| Directory | Description |
|:----------|:------------|
| `basic-tile-validation/` | Validate a `.pbf` file with the default rule set |
| `style-linting/` | Lint a MapLibre `style.json` |
| `ci-integration/` | Annotated GitHub Actions workflow |
| `custom-rule/` | Writing and registering a custom validation rule |
| `render-regression/` | Setting up render regression tests with reference images |

## Running the Examples

```bash
# From the repository root (ensure packages are built):
pnpm build
node examples/reporters-demo.js
```
