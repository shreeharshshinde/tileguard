# Programmatic Usage

TileGuard isn't just a CLI — it's a library. Use it in Node.js scripts, Express servers, build pipelines, custom tools, or anywhere you need tile validation in code.

## Install

```bash
npm install @tileguard/core @tileguard/tile-rules @tileguard/style-rules
```

Install only what you need:

```bash
# Tile validation only
npm install @tileguard/core @tileguard/tile-rules

# Style linting only
npm install @tileguard/core @tileguard/style-rules

# Comparison and regression
npm install @tileguard/core @tileguard/tile-rules @tileguard/analysis
```

## Basic Validation

The simplest programmatic usage — validate files and check results:

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
    'style/known-source': 'error',
  },
});

const result = await engine.run(['./tiles/14/8741/5476.pbf']);

console.log(result.summary.pass);      // true | false
console.log(result.summary.errors);    // number of errors
console.log(result.summary.warnings);  // number of warnings
console.log(result.summary.duration);  // milliseconds
console.log(result.diagnostics);       // Diagnostic[]
```

## Inspecting Diagnostics

Each diagnostic is a structured object with location, severity, and suggestion:

```typescript
const result = await engine.run(['./tile.pbf']);

for (const diag of result.diagnostics) {
  console.log(`[${diag.severity}] ${diag.ruleId}`);
  console.log(`  ${diag.message}`);

  if (diag.location) {
    console.log(`  at layer: ${diag.location.layer}, feature: ${diag.location.featureIndex}`);
  }

  if (diag.suggestion) {
    console.log(`  fix: ${diag.suggestion}`);
  }
}
```

### Filtering by severity

```typescript
const errors = result.diagnostics.filter(d => d.severity === 'error');
const warnings = result.diagnostics.filter(d => d.severity === 'warning');

if (errors.length > 0) {
  console.error(`❌ ${errors.length} errors found — failing quality gate`);
  process.exit(1);
}
```

### Grouping by rule

```typescript
const byRule = Object.groupBy(result.diagnostics, d => d.ruleId);

for (const [ruleId, diags] of Object.entries(byRule)) {
  console.log(`${ruleId}: ${diags!.length} finding(s)`);
}
```

## Validate Multiple Sources

Pass directories, globs, or arrays of paths:

```typescript
// Multiple files
const result = await engine.run([
  './tiles/14/8741/5476.pbf',
  './tiles/14/8741/5477.pbf',
  './styles/map.json',
]);

// The engine resolves directories recursively
const result2 = await engine.run(['./tiles/', './styles/']);
```

## Custom Reporter

Reporters receive diagnostics after a run. Create one to format output however you want:

```typescript
import { createEngine } from '@tileguard/core';
import type { Reporter } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

const csvReporter: Reporter = {
  report(diagnostics, summary) {
    console.log('severity,rule,message,layer,feature');
    for (const d of diagnostics) {
      const layer = d.location?.layer ?? '';
      const feature = d.location?.featureIndex ?? '';
      console.log(`${d.severity},${d.ruleId},"${d.message}",${layer},${feature}`);
    }
  },
};

const engine = createEngine({
  plugins: [tilePlugin],
  reporter: csvReporter,
  rules: { 'tile/self-intersection': 'error' },
});

await engine.run(['./tile.pbf']);
```

## Tile Comparison

Compare two tile versions and detect structural differences:

```typescript
import { createComparisonEngine } from '@tileguard/analysis';
import { tilePlugin } from '@tileguard/tile-rules';

const comparison = createComparisonEngine({ plugins: [tilePlugin] });

const diff = await comparison.compare('./v1.pbf', './v2.pbf');

console.log(`Added:     ${diff.added.length} features`);
console.log(`Removed:   ${diff.removed.length} features`);
console.log(`Modified:  ${diff.modified.length} features`);
console.log(`Unchanged: ${diff.unchanged}`);
```

## Regression Detection

After comparing, rank changes by regression confidence:

```typescript
import {
  createComparisonEngine,
  createRegressionEngine,
} from '@tileguard/analysis';
import { tilePlugin } from '@tileguard/tile-rules';

const comparison = createComparisonEngine({ plugins: [tilePlugin] });
const regression = createRegressionEngine();

const diff = await comparison.compare('./v1.pbf', './v2.pbf');
const regressions = regression.analyze(diff);

for (const r of regressions.candidates) {
  console.log(`${r.confidence}% — ${r.category}: ${r.summary}`);
}
```

## Integration with Express/Fastify

Use TileGuard as a validation middleware in your tile server:

```typescript
import express from 'express';
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const app = express();
const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/unclosed-ring': 'error',
    'tile/winding-order': 'error',
  },
});

app.post('/api/validate', express.raw({ limit: '10mb' }), async (req, res) => {
  // Write buffer to temp file for engine processing
  const tmpPath = join(tmpdir(), `tile-${Date.now()}.pbf`);
  writeFileSync(tmpPath, req.body);

  try {
    const result = await engine.run([tmpPath]);
    res.json({
      pass: result.summary.pass,
      errors: result.summary.errors,
      warnings: result.summary.warnings,
      diagnostics: result.diagnostics,
      duration: result.summary.duration,
    });
  } finally {
    unlinkSync(tmpPath);
  }
});

app.listen(3000);
```

## Build Pipeline Integration

Validate tiles as a post-processing step in your tile generation pipeline:

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { glob } from 'fast-glob';

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/winding-order': 'error',
    'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
    'tile/feature-count': ['warning', { max: 50000 }],
  },
});

async function validateBuild(outputDir: string): Promise<boolean> {
  const tiles = await glob(`${outputDir}/**/*.pbf`);
  console.log(`Validating ${tiles.length} tiles...`);

  const result = await engine.run(tiles);

  console.log(`  Errors:   ${result.summary.errors}`);
  console.log(`  Warnings: ${result.summary.warnings}`);
  console.log(`  Duration: ${result.summary.duration}ms`);

  return result.summary.pass;
}

// Usage in your build script
const passed = await validateBuild('./output/tiles');
if (!passed) {
  console.error('Quality gate failed — fix errors before deploying.');
  process.exit(1);
}
```

## Writing a Custom Rule

Rules are plain objects. No base classes, no decorators:

```typescript
import type { Rule } from '@tileguard/core';

export const maxVerticesRule: Rule = {
  id: 'custom/max-vertices',
  meta: {
    description: 'Features must not exceed a vertex count threshold.',
    defaultSeverity: 'warning',
    recommended: false,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    const tile = context.artifact.content;
    const maxVertices = context.options?.max ?? 10000;

    for (const layer of tile.layers) {
      for (let i = 0; i < layer.features.length; i++) {
        const feature = layer.features[i];
        const vertexCount = countVertices(feature.geometry);

        if (vertexCount > maxVertices) {
          context.report({
            message: `Feature has ${vertexCount} vertices (max: ${maxVertices}).`,
            location: { layer: layer.name, featureIndex: i },
            suggestion: `Simplify this geometry to reduce vertex count.`,
          });
        }
      }
    }
  },
};

function countVertices(geometry: unknown): number {
  // Your counting logic here
  return 0;
}
```

### Register as a plugin

```typescript
import type { Plugin } from '@tileguard/core';
import { maxVerticesRule } from './rules/max-vertices.js';

export const customPlugin: Plugin = {
  name: 'custom-rules',
  rules: [maxVerticesRule],
  providers: [],  // no custom providers needed
};
```

### Use it

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { customPlugin } from './my-plugin.js';

const engine = createEngine({
  plugins: [tilePlugin, customPlugin],
  rules: {
    'tile/self-intersection': 'error',
    'custom/max-vertices': ['warning', { max: 5000 }],
  },
});
```

## Silent Validation (no reporter)

For batch processing where you only need the result object:

```typescript
const silentReporter = { report() {} };

const engine = createEngine({
  plugins: [tilePlugin],
  reporter: silentReporter,
  rules: { 'tile/self-intersection': 'error' },
});

// No output — just returns the result
const result = await engine.run(['./tile.pbf']);
```

## TypeScript Types

All types are exported for full type safety:

```typescript
import type {
  Engine,
  EngineOptions,
  RunResult,
  RunSummary,
  Diagnostic,
  Severity,
  Rule,
  RuleMeta,
  RuleContext,
  Plugin,
  Reporter,
  Artifact,
  ArtifactProvider,
  TileGuardConfig,
} from '@tileguard/core';
```

## What Next?

- [Configuring Rules](/guides/configuring-rules) — All configuration patterns
- [API Reference: Core](/api/core) — Full type documentation
- [API Reference: Analysis](/api/analysis) — Comparison & regression APIs
- [CI / GitHub Actions](/guides/ci-github-actions) — Automate quality gates
