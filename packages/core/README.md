# @tileguard/core

**Framework contracts for the TileGuard quality analysis engine.**

[![npm](https://img.shields.io/npm/v/@tileguard/core)](https://www.npmjs.com/package/@tileguard/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/shreeharshshinde/tileguard/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

This package defines every interface and type that TileGuard's runtime is built on: Diagnostic, Artifact, Rule, Plugin, Reporter, Engine. It has **zero runtime dependencies** and serves as the stable kernel that all other TileGuard packages depend on.

---

## When to install this package

- **You're writing a custom rule** and need the `Rule`, `RuleContext`, and `DiagnosticDescriptor` types.
- **You're building a custom reporter** and need the `Reporter` and `Diagnostic` interfaces.
- **You're using TileGuard programmatically** via `createEngine()`.
- **You're building a tool** that consumes TileGuard diagnostics.

> If you just want to validate tiles or styles from the CLI, install [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) instead — it includes everything.

---

## Installation

```bash
npm install @tileguard/core
```

---

## Quick Start

```typescript
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const engine = createEngine({
  plugins: [tilePlugin, stylePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
    'style/known-source': 'error',
  },
});

const result = await engine.run(['./tile.pbf', './style.json']);

if (!result.summary.pass) {
  for (const d of result.diagnostics) {
    console.log(`[${d.severity}] ${d.ruleId}: ${d.message}`);
  }
}
// Output:
// [error] tile/required-layers: Required layer "roads" is not present in the tile.
// [error] style/known-source: Layer "buildings" references unknown source "composite".
```

---

## What's in this package

| Export | Purpose |
|:-------|:--------|
| `createEngine()` | Creates a configured validation engine |
| `Diagnostic` | The universal output format — every finding is a Diagnostic |
| `Rule`, `RuleContext` | Contracts for writing custom rules |
| `Artifact`, `ArtifactProvider` | Contracts for custom format loaders |
| `Plugin` | Bundles providers + rules for registration |
| `Reporter`, `ReporterContext` | Contracts for custom output formatters |
| `TileGuardConfig` | The user-facing configuration shape |
| `Engine`, `RunResult`, `RunSummary` | Engine execution contracts |

---

## Writing a custom rule

A rule is a plain object — no base classes, no decorators:

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'custom/my-check',
  meta: {
    description: 'Validates something specific to your pipeline.',
    defaultSeverity: 'error',
    recommended: true,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    const tile = context.artifact.content;
    // Inspect content, call context.report() for each finding
    context.report({
      message: 'Something is wrong.',
      location: { layer: 'buildings', featureIndex: 0 },
      suggestion: 'Fix it by doing X.',
    });
  },
};
```

---

## API design principles

- **Rules never print.** They emit diagnostics via `context.report()`.
- **Reporters never validate.** They format diagnostics for output.
- **The engine never throws** during normal operation. Load failures and rule crashes become diagnostics.
- **All results are typed.** `RunResult` contains `diagnostics` and `summary` — no parsing required.
- **Configuration errors are caught early.** Invalid configs throw before I/O begins.

---

## Part of the TileGuard ecosystem

| Package | Purpose |
|:--------|:--------|
| **@tileguard/core** | Framework contracts (this package) |
| [`@tileguard/cli`](https://www.npmjs.com/package/@tileguard/cli) | CLI with 10 commands |
| [`@tileguard/tile-rules`](https://www.npmjs.com/package/@tileguard/tile-rules) | 10 vector tile validation rules |
| [`@tileguard/style-rules`](https://www.npmjs.com/package/@tileguard/style-rules) | 9 MapLibre style lint rules |
| [`@tileguard/config`](https://www.npmjs.com/package/@tileguard/config) | Config file discovery + validation |
| [`@tileguard/reporters`](https://www.npmjs.com/package/@tileguard/reporters) | Text, JSON reporters + report engine |
| [`@tileguard/analysis`](https://www.npmjs.com/package/@tileguard/analysis) | Tile comparison + regression detection |

---

## Documentation

- [Full API Reference](https://github.com/shreeharshshinde/tileguard/tree/main/docs/api) — Generated TypeDoc
- [Architecture Handbook](https://github.com/shreeharshshinde/tileguard/tree/main/docs/architecture) — System design + ADRs
- [Rule Authoring Guide](https://github.com/shreeharshshinde/tileguard/blob/main/CONTRIBUTING.md)

---

## License

[MIT](https://github.com/shreeharshshinde/tileguard/blob/main/LICENSE) · Created by [Shreeharsh Shinde](https://github.com/shreeharshshinde)
