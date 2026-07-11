# IMPLEMENTATION_GUIDELINES.md — TileGuard Engineering Conventions

**Document status:** Authoritative  
**Scope:** All code in `packages/`  
**Last updated:** 2026-07-02

---

This document defines the engineering conventions that govern all implementation work in the TileGuard monorepo. Where [CORE_CONTRACTS.md](../architecture/CORE_CONTRACTS.md) specifies *what* the framework is, this document specifies *how* it is built.

These conventions exist for one reason: contributors should be able to read any file in the codebase and feel like it was written by the same person. Consistency is not aesthetic preference — it reduces the cognitive load of code review, makes the project accessible to new contributors, and prevents the class of bugs that arise from surprising local conventions.

Every rule here has a rationale. If a convention seems arbitrary, the rationale explains why it was chosen over the alternatives. If a situation arises that no convention covers, default to the principle behind the nearest related convention.

---

## Table of Contents

1. [File and Folder Naming](#1-file-and-folder-naming)
2. [Package Naming and Structure](#2-package-naming-and-structure)
3. [Import Rules](#3-import-rules)
4. [Error Handling Philosophy](#4-error-handling-philosophy)
5. [Logging Policy](#5-logging-policy)
6. [Testing Strategy](#6-testing-strategy)
7. [Code Review Checklist](#7-code-review-checklist)
8. [Documentation Requirements](#8-documentation-requirements)
9. [Performance Expectations](#9-performance-expectations)
10. [Backward Compatibility Policy](#10-backward-compatibility-policy)
11. [Release Engineering](#11-release-engineering)
12. [Public API Rules](#12-public-api-rules)
13. [Dependency Policy](#13-dependency-policy)
14. [Security Guidelines](#14-security-guidelines)
15. [Performance Measurement Policy](#15-performance-measurement-policy)
16. [Definition of Done](#16-definition-of-done)
17. [Deprecation Timeline](#17-deprecation-timeline)
18. [CI Quality Gates](#18-ci-quality-gates)

---

## 1. File and Folder Naming

### Source Files

All source files use **kebab-case** with `.ts` extension.

```
required-layers.ts        ✓
requiredLayers.ts         ✗
RequiredLayers.ts         ✗
required_layers.ts        ✗
```

The filename should match the primary export of the file. A file named `required-layers.ts` exports `requiredLayersRule` as its primary export. A file named `vector-tile-provider.ts` exports `vectorTileProvider`.

**One primary export per file.** Secondary exports (types, helpers used only by that file's primary export) are acceptable. If a helper grows large enough to warrant its own tests, extract it to its own file.

### Test Files

Test files live alongside source files in a `tests/` subdirectory within each package, not next to the source files.

```
packages/tile-rules/
├── src/
│   └── rules/
│       └── required-layers.ts
└── tests/
    └── rules/
        └── required-layers.test.ts
```

Test files mirror the `src/` structure exactly. A test file for `src/rules/required-layers.ts` lives at `tests/rules/required-layers.test.ts`. This makes it trivial to find the tests for any given file and to verify coverage by directory comparison.

Test files use the `.test.ts` suffix, never `.spec.ts`. The project uses one suffix consistently.

### Fixture Files

Test fixtures live in a `tests/fixtures/` subdirectory within the package that owns them, and in the top-level `fixtures/` directory for fixtures shared across packages.

```
packages/tile-rules/tests/fixtures/
├── valid-tile.pbf
├── missing-buildings-layer.pbf
└── unclosed-ring.pbf

fixtures/                           ← shared render fixtures
├── fill-color/
└── line-width/
```

Fixture files are named after the scenario they represent, not the rule they test. `unclosed-ring.pbf` is correct; `tile-unclosed-ring-test-case-2.pbf` is not.

### Directories

All directory names use **kebab-case**.

```
packages/tile-rules/src/rules/          ✓
packages/tile-rules/src/Rules/          ✗
packages/tile-rules/src/validation/     ✓  (if grouping is needed)
```

Standard directory names used across all packages:

| Directory | Contents |
|:----------|:---------|
| `src/` | All source TypeScript |
| `src/rules/` | Rule implementations (domain packages) |
| `src/utils/` | Internal utilities not exported from the package |
| `tests/` | All test files |
| `tests/fixtures/` | Test fixture files |
| `dist/` | Build output (gitignored) |

### Index Files

Each package has exactly one `src/index.ts` that re-exports the package's public API. Nothing in `src/` is considered public unless it is explicitly re-exported from `index.ts`.

Internal utilities that are not part of the public API live in `src/utils/` and are not exported from `index.ts`. If another package needs something that is currently internal, the correct action is to discuss whether it belongs in `@tileguard/shared`, not to import across package boundaries.

---

## 2. Package Naming and Structure

### npm Package Names

| Package directory | npm name |
|:-----------------|:---------|
| `packages/core` | `@tileguard/core` |
| `packages/shared` | `@tileguard/shared` |
| `packages/tile-rules` | `@tileguard/tile-rules` |
| `packages/style-rules` | `@tileguard/style-rules` |
| `packages/reporters` | `@tileguard/reporters` |
| `packages/config` | `@tileguard/config` |
| `packages/cli` | `tileguard` |

The CLI is unscoped (`tileguard`, not `@tileguard/cli`) so that `npx tileguard check` works without the scope prefix. All other packages are scoped under `@tileguard/`.

Third-party packages that contribute rules should use their own scope: `@myorg/tileguard-rules`, not `@tileguard/myorg-rules`. The `@tileguard/` scope is reserved for first-party packages.

### package.json Conventions

Every package `package.json` must include:

```jsonc
{
  "name": "@tileguard/package-name",
  "version": "0.0.0",           // managed by release tooling, not edited manually
  "description": "One sentence.",
  "type": "module",             // ESM only, always
  "exports": {
    ".": "./dist/index.js"      // points to built output, not src/
  },
  "scripts": {
    "build": "tsc --build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "license": "MIT",
  "engines": { "node": ">=20.0.0" }
}
```

Required fields: `name`, `version`, `description`, `type`, `exports`, `scripts.build`, `scripts.test`, `license`, `engines`.

The `main` field is omitted. The `exports` map is the sole entry point definition. Packages that need to expose multiple entry points add them to the `exports` map, not via additional `main`-style fields.

### Version Numbers

All packages share a single version number during the 0.x phase. Version numbers are managed by the release script and must not be edited manually in `package.json`. The source of truth for the current version is the root `package.json`.

### TypeScript Configuration

Each package extends `../../tsconfig.base.json` and adds only the fields that differ:

```jsonc
// packages/tile-rules/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "references": [
    { "path": "../core" },
    { "path": "../shared" }
  ],
  "include": ["src"]
}
```

`composite: true` is required for all packages. It enables TypeScript project references, which allow `tsc --build` at the root to perform incremental compilation correctly.

The `tsconfig.base.json` settings are not overridden in individual packages except for `rootDir`, `outDir`, and `composite`. Settings like `strict`, `target`, and `module` must remain uniform across all packages.

---

## 3. Import Rules

### ESM Imports Only

All imports use ESM syntax. CommonJS (`require`, `module.exports`) is not used anywhere in the codebase.

```typescript
import { Diagnostic } from '@tileguard/core';    ✓
const { Diagnostic } = require('@tileguard/core'); ✗
```

### File Extensions on Relative Imports

All relative imports must include the `.js` extension, even when importing `.ts` files. This is required by Node.js ESM resolution and by TypeScript's `NodeNext` module resolution mode.

```typescript
import { requiredLayersRule } from './rules/required-layers.js';   ✓
import { requiredLayersRule } from './rules/required-layers';       ✗
import { requiredLayersRule } from './rules/required-layers.ts';    ✗
```

The `.js` extension resolves to the compiled `.js` file at runtime and is understood by TypeScript to refer to the corresponding `.ts` source during development. This is confusing but mandatory under `NodeNext` module resolution.

### Import Ordering

Imports are grouped and ordered as follows, with a blank line between groups:

```typescript
// 1. Node.js built-in modules
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 2. External npm packages (non-workspace)
import { decompressSync } from 'fflate';

// 3. Internal workspace packages
import type { Artifact, ArtifactProvider } from '@tileguard/core';
import { geometryUtils } from '@tileguard/shared';

// 4. Local relative imports
import { decodeMvt } from './utils/pbf-decoder.js';
import type { VectorTileContent } from './types.js';
```

Node built-in imports use the `node:` prefix protocol. `import { readFileSync } from 'fs'` is not used; `import { readFileSync } from 'node:fs'` is.

### Type-Only Imports

Use `import type` for imports that are used only as types and have no runtime value. This is enforced by `verbatimModuleSyntax: true` in `tsconfig.base.json`.

```typescript
import type { Rule, RuleContext } from '@tileguard/core';      ✓  (type-only)
import { createEngine } from '@tileguard/core';                 ✓  (runtime value)
import { type Rule, createEngine } from '@tileguard/core';      ✓  (inline type)
```

### No Cross-Package Boundary Violations

Internal package files must not import from packages outside the allowed dependency graph (Section 2 of `CORE_CONTRACTS.md`). Specifically:

```typescript
// In @tileguard/tile-rules:
import something from '@tileguard/style-rules';    ✗  FORBIDDEN
import something from 'tileguard';                  ✗  FORBIDDEN
import something from '@tileguard/reporters';       ✗  FORBIDDEN

// In @tileguard/core:
import something from '@tileguard/tile-rules';      ✗  FORBIDDEN
import something from '@tileguard/shared';          ✗  FORBIDDEN
```

A CI lint script verifies this automatically. Do not disable the check.

### No Deep Imports

Import from a package's public API (`@tileguard/core`), never from its internal paths (`@tileguard/core/src/diagnostic`). Deep imports bypass the package's encapsulation contract and break when the package reorganizes its internals.

```typescript
import { Diagnostic } from '@tileguard/core';                   ✓
import { Diagnostic } from '@tileguard/core/src/diagnostic.js'; ✗
```

---

## 4. Error Handling Philosophy

### The Two Categories

Every error in TileGuard belongs to one of two categories. Handling strategy is determined by category, not by judgment call at each site.

**Category 1 — Operational failures.** Things that can happen in normal use. A file does not exist. A network request times out. A `.pbf` file contains malformed bytes. A tile is missing an expected layer. These are the entire point of TileGuard: they produce `Diagnostic` values and the run continues.

**Category 2 — Programmer errors.** Things that can only happen due to a bug in TileGuard or in a third-party plugin. A rule's `id` field is `null`. The engine receives a non-array for `sources`. A plugin registers two rules with identical IDs. These throw synchronously and loudly at the earliest possible moment.

The test: *could a user action or environmental condition cause this failure?* If yes, it is operational — handle it as a diagnostic. If only a code bug can cause it, throw.

### Operational Failures → Diagnostics

Operational failures in providers are caught by the engine and converted to diagnostics automatically. Provider implementations should not catch errors themselves unless they can recover meaningfully:

```typescript
// Provider load() — let errors propagate to the engine
async load(source: string): Promise<Artifact> {
  const bytes = await readFile(source);          // throws if not found → engine catches
  const content = decodeMvt(bytes);             // throws if malformed → engine catches
  return { type: 'VectorTile', ref: { type: 'VectorTile', source }, content };
}
```

Operational failures in rules are different: rules must handle them explicitly rather than throwing, because a thrown exception from `rule.create()` produces a low-quality `engine/rule-error` diagnostic rather than a specific, actionable one:

```typescript
// Rule create() — handle expected edge cases explicitly
create(context) {
  const tile = context.artifact as VectorTileArtifact;

  // Don't throw on unexpected data shapes — report and return
  if (!tile.content?.layers) {
    context.report({
      message: 'Tile content has no layers property.',
      suggestion: 'Verify the artifact provider decoded the tile correctly.',
    });
    return;
  }

  for (const [name, layer] of Object.entries(tile.content.layers)) {
    // ... validation logic
  }
}
```

### Programmer Errors → Throw

Throw `Error` (or a subclass) immediately when a programmer contract is violated. The error message must be specific enough to diagnose the bug without running a debugger:

```typescript
// Configuration validation — throw with full context
function validatePlugin(plugin: Plugin): void {
  if (!plugin.id || typeof plugin.id !== 'string') {
    throw new Error(
      `Plugin must have a non-empty string "id" field. ` +
      `Received: ${JSON.stringify(plugin.id)}`
    );
  }
  if (plugin.id.includes('/')) {
    throw new Error(
      `Plugin id "${plugin.id}" must not contain "/". ` +
      `Use kebab-case: "${plugin.id.replace(/\//g, '-')}"`
    );
  }
}
```

### Error Message Quality

Both diagnostic messages and thrown error messages must be:

- **Specific.** Include the value that caused the problem, quoted. `'Rule id "tile/required-layers" is already registered'`, not `'Duplicate rule'`.
- **Actionable.** For thrown errors, include what the caller should do to fix the bug. For diagnostics, use the `suggestion` field for remediation.
- **Present tense.** Describe the current state, not the history. `'Layer "buildings" is not present'`, not `'Layer "buildings" was not found'`.

### No Silent Failures

There is no acceptable case where an error is swallowed without either producing a diagnostic or being thrown. The following patterns are forbidden:

```typescript
try {
  someOperation();
} catch (e) {
  // silently ignored         ✗ FORBIDDEN
}

try {
  someOperation();
} catch (e) {
  console.error(e);           ✗ also forbidden (see Logging Policy)
}
```

If a failure is genuinely unrecoverable and producing a diagnostic would be misleading, rethrow the original error or wrap it with context:

```typescript
try {
  const result = riskyOperation();
} catch (cause) {
  throw new Error(`Failed to initialize rule "${ruleId}": ${(cause as Error).message}`, { cause });
}
```

### No Bare `catch (e)` Without Type Narrowing

TypeScript's `unknown` type for caught errors is correct. Every `catch` block that uses the error value must narrow it:

```typescript
try {
  /* ... */
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  // use message
}
```

---

## 5. Logging Policy

### Rules and Providers Never Log

Rules and providers must not produce any output. No `console.log`, `console.warn`, `console.error`, `process.stdout.write`, or any other output call is acceptable inside `rule.create()` or `provider.load()`. If something is worth reporting to the user, it is worth producing a `Diagnostic` for.

This is not a style preference — it is the architectural contract. Rules are pure functions. Console output is a side effect that makes rules non-deterministic in test environments and breaks output capture in CI.

```typescript
create(context) {
  // FORBIDDEN in rules and providers:
  console.log('Checking layer:', layerName);         ✗
  console.warn('Tile has no features');              ✗
  process.stdout.write('Processing...\n');           ✗

  // CORRECT: produce a diagnostic if something is worth reporting
  context.report({ message: 'Tile contains no features.' });
}
```

### The Engine and CLI May Log — Sparingly

Infrastructure code (the engine, the CLI, config loader) may produce output, but only for:

- **Startup errors:** Configuration problems that prevent the run from starting.
- **Debug mode output:** Verbose information gated behind a `--debug` flag or `DEBUG=tileguard` environment variable, never emitted by default.
- **Progress for long runs:** A single-line progress indicator for runs over 10 seconds is acceptable in the text reporter; it is not acceptable in the engine itself.

The engine must not log during a normal run. A test that captures stdout should see only reporter output, nothing else.

### Debug Logging

When debug output is necessary for diagnosing framework problems, use a structured approach gated on an environment variable:

```typescript
// packages/core/src/debug.ts
const DEBUG = process.env['DEBUG']?.includes('tileguard') ?? false;

export function debug(component: string, message: string, data?: unknown): void {
  if (!DEBUG) return;
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] [tileguard:${component}] ${message}${data != null ? ' ' + JSON.stringify(data) : ''}\n`);
}
```

Debug output goes to `stderr`, never `stdout`. Stdout is reserved for reporter output. This ensures that `tileguard check tile.pbf --reporter json | jq .` always produces valid JSON regardless of debug settings.

### No Third-Party Logging Libraries

`@tileguard/core` has zero runtime dependencies. It must not introduce a logging library. The simple `debug()` utility above is sufficient. More sophisticated logging infrastructure belongs in the CLI package, not in Core or domain packages.

---

## 6. Testing Strategy

### The Testing Pyramid

TileGuard's test suite follows a pyramid structure:

```
         ┌─────────────────────┐
         │  Integration Tests   │  ← Few, slow, CLI-level
         │   (packages/cli)     │
         ├─────────────────────┤
         │  Package Tests       │  ← Medium, engine + plugin level
         │  (each package)      │
         ├─────────────────────┤
         │    Unit Tests        │  ← Many, fast, per-rule / per-function
         │  (all packages)      │
         └─────────────────────┘
```

**Unit tests** cover individual rules, providers, reporters, and utility functions. A unit test for a rule constructs a minimal artifact directly (no file loading, no provider), passes it to the rule, and asserts on the resulting diagnostics. Unit tests are fast (< 10ms each) and must have no I/O dependencies.

**Package tests** cover a domain package end-to-end: create an engine with the package's plugin, run it against real fixture files, assert on the full `RunResult`. These are slower (file I/O, full decode) and test the integration between provider, rules, and engine.

**Integration tests** cover the full CLI stack: spawn `tileguard check` as a subprocess, assert on stdout/stderr and exit code. These run only in CI and in the `packages/cli` test suite.

### Unit Testing Rules

Every rule must have a unit test file. The test must cover:

1. **Happy path:** A valid artifact that should produce zero diagnostics from this rule.
2. **Each reported condition:** One test per `context.report()` call path. If a rule can report three different messages, there are at least three tests.
3. **Edge cases:** Empty artifact, null or undefined values in expected fields, extreme numeric values.
4. **Options variation:** If the rule has configurable options, test at least two different option configurations.

```typescript
// tests/rules/required-layers.test.ts
import { describe, it, expect } from 'vitest';
import { requiredLayersRule } from '../../src/rules/required-layers.js';
import { runRule } from '../helpers/run-rule.js';
import { makeTileArtifact } from '../helpers/fixtures.js';

describe('tile/required-layers', () => {
  it('reports no diagnostics when all required layers are present', () => {
    const artifact = makeTileArtifact({ layers: ['water', 'roads', 'buildings'] });
    const diagnostics = runRule(requiredLayersRule, artifact, { layers: ['water', 'roads'] });
    expect(diagnostics).toHaveLength(0);
  });

  it('reports one diagnostic per missing layer', () => {
    const artifact = makeTileArtifact({ layers: ['water'] });
    const diagnostics = runRule(requiredLayersRule, artifact, { layers: ['water', 'roads', 'buildings'] });
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].ruleId).toBe('tile/required-layers');
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toContain('"roads"');
    expect(diagnostics[1].message).toContain('"buildings"');
  });

  it('includes available layers in diagnostic data', () => {
    const artifact = makeTileArtifact({ layers: ['water'] });
    const [d] = runRule(requiredLayersRule, artifact, { layers: ['roads'] });
    expect(d.data?.availableLayers).toEqual(['water']);
  });

  it('reports no diagnostics when tile has no layers and no layers are required', () => {
    const artifact = makeTileArtifact({ layers: [] });
    const diagnostics = runRule(requiredLayersRule, artifact, { layers: [] });
    expect(diagnostics).toHaveLength(0);
  });
});
```

### Test Helpers

Each package's `tests/` directory should contain a `helpers/` subdirectory with utilities that make test code concise and readable:

```
tests/helpers/
├── run-rule.ts       — Synchronously runs a rule against an artifact, returns Diagnostic[]
├── fixtures.ts       — Factory functions for constructing minimal test artifacts
└── assertions.ts     — Custom expect matchers for diagnostic assertions
```

The `run-rule` helper is the most important. It isolates tests from the engine, letting rule tests be pure function calls:

```typescript
// tests/helpers/run-rule.ts
import type { Rule, Artifact, Diagnostic } from '@tileguard/core';

export function runRule<C>(
  rule: Rule<C>,
  artifact: Artifact,
  options?: C,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const context = {
    artifact,
    options: options as C,
    report(descriptor) {
      diagnostics.push({
        ruleId: rule.id,
        severity: rule.meta.defaultSeverity,
        artifact: artifact.ref,
        ...descriptor,
      });
    },
  };
  const result = rule.create(context as any);
  // Handle sync rules only in unit tests; async rules tested separately
  if (result instanceof Promise) {
    throw new Error(`runRule() does not support async rules. Use runRuleAsync() instead.`);
  }
  return diagnostics;
}
```

### Fixture Files

Fixture files used in tests must be small, purposeful, and named after the scenario they represent.

- A fixture that tests missing layer detection is named `missing-buildings-layer.pbf`, not `test-tile-1.pbf`.
- A fixture should contain the minimum content necessary to trigger (or not trigger) the relevant behavior. Overloaded fixtures that test multiple rules make failures harder to diagnose.
- Fixtures are binary blobs checked into the repository. When a fixture needs to be regenerated, document why and include the generation command in a comment or accompanying README.

### Assertion Style

Prefer specific assertions over general ones. A test that fails with a specific message is easier to diagnose than one that fails with `expected false to be true`.

```typescript
// Specific — preferred
expect(diagnostics).toHaveLength(1);
expect(diagnostics[0].ruleId).toBe('tile/required-layers');
expect(diagnostics[0].message).toContain('"buildings"');
expect(diagnostics[0].location?.layer).toBe('buildings');

// Too broad — avoid
expect(diagnostics.length).toBeGreaterThan(0);
expect(diagnostics[0]).toBeTruthy();
```

### Coverage Expectations

Every rule file must have a corresponding test file. This is enforced by a CI check that compares `src/rules/*.ts` to `tests/rules/*.test.ts`. A PR that adds a rule without tests does not pass CI.

Coverage thresholds are not used (they encourage writing tests to satisfy a number rather than to catch bugs). The requirement is: every `context.report()` call path in every rule has at least one test that exercises it.

### Test Isolation

Tests must not depend on:
- **File system state** outside the package's `tests/fixtures/` directory.
- **Network access.** Tests run offline. Any rule or provider that makes network requests must provide a mock for testing.
- **Environment variables** not explicitly set by the test.
- **Execution order.** Each test must be independently runnable. `beforeEach` and `afterEach` are used for setup and teardown; shared mutable state in `describe` scope is not.

### Snapshot Testing

Snapshot tests (`expect(x).toMatchSnapshot()`) are not used in unit or package tests. They are appropriate only for integration tests that capture CLI output format, and even there they should be used sparingly. The drawback of snapshots is that failures often appear as "snapshot changed" without clearly indicating whether the change is correct or a regression. Explicit assertions communicate intent.

Exception: SARIF reporter output may use snapshots because the SARIF schema is verbose and snapshot diffing is more readable than asserting on every field individually.

---

## 7. Code Review Checklist

This checklist applies to every pull request that touches code in `packages/`. Reviewers are expected to check all items. Authors are expected to self-review against it before requesting review.

### Architecture

- [ ] Dependencies point inward. No new import crosses a forbidden package boundary.
- [ ] Core remains free of domain knowledge. No geospatial type, constant, or algorithm has been added to `@tileguard/core`.
- [ ] New rules are in the correct domain package, not in `@tileguard/core` or `@tileguard/shared`.
- [ ] New shared utilities belong in `@tileguard/shared`, not duplicated across packages.

### Rules (if the PR adds or modifies rules)

- [ ] The rule has a single, clearly stated concern. It does not mix multiple validation checks.
- [ ] The rule ID follows the `category/rule-name` convention and is unique.
- [ ] `meta.description` begins with a verb and is a complete sentence.
- [ ] `meta.recommended` is set intentionally (not left as the default).
- [ ] `meta.defaultSeverity` is appropriate for the severity of the problem.
- [ ] If the rule has options, a `schema` is provided for validation.
- [ ] The rule is pure: no console output, no I/O, no shared mutable state.
- [ ] `context.report()` messages are specific, include quoted values, and are complete sentences.
- [ ] `context.report()` suggestions are actionable (tell the user what to do, not just what is wrong).
- [ ] The rule is exported from the package's `index.ts` as part of the plugin's `rules` array.

### Error Handling

- [ ] Operational failures in providers are allowed to propagate (the engine catches them).
- [ ] Operational edge cases in rules are handled with `context.report()`, not with thrown exceptions.
- [ ] Programmer contract violations throw with a specific, diagnostic-quality message.
- [ ] No `catch` block silently discards an error.
- [ ] No bare `console.error` or `console.log` in `catch` blocks.

### Types

- [ ] No use of `any`. If bypassing the type system is truly necessary, it is done with `as unknown as TargetType` and a comment explaining why.
- [ ] Type-only imports use `import type`.
- [ ] All relative imports include the `.js` extension.
- [ ] No deep imports from workspace packages (`@tileguard/core/src/...`).

### Tests

- [ ] Every new `context.report()` call path has at least one test that exercises it.
- [ ] The happy path (no diagnostics) is tested.
- [ ] Tests use the `runRule` helper or equivalent, not the full engine stack.
- [ ] Tests use specific assertions, not general ones.
- [ ] No test depends on external network access.
- [ ] No test depends on execution order.
- [ ] Fixture files are named after the scenario they represent.

### Documentation

- [ ] New rules have a JSDoc comment on the exported `Rule` object explaining the invariant being validated.
- [ ] New packages have a `README.md` with: purpose, status, planned contents, and dependencies.
- [ ] If a new architectural decision was made, an ADR has been created or an existing one updated.
- [ ] `CORE_CONTRACTS.md` is not changed without a corresponding discussion. Changes to core contracts require explicit sign-off.

### Compatibility

- [ ] No existing `Rule.id` has been changed (breaking for users with that rule in their config).
- [ ] No existing public type has had a required field added or a field removed/renamed.
- [ ] No existing `Diagnostic` field has changed meaning or type.
- [ ] If a breaking change is unavoidable, it is documented in the PR description with migration instructions.

---

## 8. Documentation Requirements

### Every New Rule

A new rule is not complete until it has:

**1. JSDoc on the exported rule object:**

```typescript
/**
 * Validates that polygon rings in vector tile features are closed.
 *
 * A polygon ring is closed when its first vertex equals its last vertex.
 * Unclosed rings are invalid per the MVT specification and produce
 * undefined rendering behavior in MapLibre GL.
 *
 * @example
 * // tileguard.config.ts
 * export default {
 *   rules: { 'tile/unclosed-ring': 'error' },
 * };
 */
export const unclosedRingRule: Rule = {
  id: 'tile/unclosed-ring',
  // ...
};
```

The JSDoc must explain: what the rule checks, why it matters, and a minimal config example.

**2. An entry in the package README's rules table:**

```markdown
| `tile/unclosed-ring` | Polygon rings must be closed (first vertex equals last) | `legacy/js/src/utils/geometry.js` |
```

**3. A docs stub at `docs/rules/{category}/{rule-name}.md`** (created by the contributor, filled in by the docs pass):

```markdown
# tile/unclosed-ring

Validates that polygon rings in vector tile features are closed.

## Rule Details

...

## Options

This rule has no configurable options.

## When to Disable

...
```

The docs stub may be brief during initial migration. It must be present.

### Every New Package

A new package must have a `README.md` that covers:

- **Purpose:** One paragraph explaining what the package does and why it exists.
- **Status:** The current implementation status (pending, in progress, stable).
- **Contents:** What is in the package (rules, providers, utilities).
- **Dependencies:** What other packages this package depends on.
- **Usage:** A minimal code example showing how to use the package.
- **Legacy reference:** For domain packages, a link to the legacy implementation being migrated.

Template:

```markdown
# @tileguard/package-name

One sentence description.

## Status

🔨 In progress / 📋 Planned / ✅ Stable

## Contents

What the package exports and why.

## Dependencies

- `@tileguard/core` — framework contracts

## Usage

\`\`\`typescript
import { ... } from '@tileguard/package-name';
\`\`\`

## Legacy reference

- [`legacy/js/src/...`](../../legacy/js/src/...)
```

### Every New ADR

An Architecture Decision Record is required when:

- A new design pattern is introduced that future contributors might question.
- A trade-off is accepted that has non-obvious consequences.
- A previously documented decision is being revisited or reversed.
- A significant alternative was considered and rejected.

ADRs are short. The purpose is to record the reasoning, not to justify the decision at length. A good ADR takes 15 minutes to write.

ADR filename convention: `NNN-short-title.md` where `NNN` is the next sequential number. See [`docs/architecture/adr/`](../architecture/adr/) for examples.

### CORE_CONTRACTS.md Changes

Changes to `docs/architecture/CORE_CONTRACTS.md` require:

1. A PR description explaining what changed and why.
2. Review by at least one other contributor familiar with the framework design.
3. An ADR if the change represents a significant decision (interface change, new abstraction, removed guarantee).

CORE_CONTRACTS.md is the specification. The implementation follows the specification, not the other way around. If the implementation needs to deviate from the specification, the specification is updated first and the reason for the deviation is documented.

---

## 9. Performance Expectations
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


### Rule Performance Budget

Individual rule execution should complete in under **1ms per artifact** for typical tile sizes (≤ 50 layers, ≤ 10,000 features per layer). Rules that systematically exceed this budget require profiling and optimization before merging.

The budget is a guideline for implementation quality, not a hard gate. A geometry rule that processes complex polygons may legitimately take longer. The key criterion: is the execution time proportional to the artifact's complexity, or is there an avoidable bottleneck?

Rules that exceed the budget must include a comment explaining why:

```typescript
// This rule is O(n²) in feature count because segment intersection detection
// requires comparing all pairs of segments. For typical tiles (< 500 features
// per layer) this is acceptable. The rule should be disabled for tiles with
// extremely high feature density.
create(context) { /* ... */ }
```

### Provider Performance Budget

Artifact loading (provider.load()) should complete in under **100ms** for local files under 1MB, and under **2 seconds** for remote artifacts over a reasonable network connection.

Providers that decompress, decode, and cache artifacts are doing the right thing. Providers that make multiple round-trip network requests for a single artifact need redesign.

### No Performance Regression in Utilities

When porting geometry utilities from `legacy/js/src/utils/geometry.js` to `@tileguard/shared`, the ported TypeScript implementation must not be measurably slower than the original JavaScript. A benchmark comparing the two implementations on the same fixture data should be included in the PR that introduces the port.

### Memory

Rules must not accumulate large data structures during execution. A rule that builds a growing list or map of every feature in the tile is likely to cause memory pressure on large tile sets. Geometry rules that compare all feature pairs must process features in a streaming fashion, not by loading everything into memory first.

The engine runs rules sequentially. After each rule completes, its stack frame and local allocations are eligible for garbage collection. Rules must not hold references to artifact content beyond their `create()` invocation.

### Benchmarks

The `packages/tile-rules` and `packages/style-rules` packages maintain benchmark files in `tests/benchmarks/` that measure the cost of loading and validating a representative set of fixtures. These benchmarks run in CI on every PR and fail if any benchmark regresses by more than 20% relative to the baseline.

Benchmark baseline files are checked into the repository and updated intentionally when performance improves (never automatically).

---

## 10. Backward Compatibility Policy

### Semantic Versioning

TileGuard follows [Semantic Versioning 2.0.0](https://semver.org/). All packages share a single version number.

| Change type | Version bump |
|:------------|:------------|
| Breaking change to any public API | Major (1.x → 2.0.0) |
| New capability, backward-compatible | Minor (1.0.x → 1.1.0) |
| Bug fix, no API change | Patch (1.0.0 → 1.0.1) |

During the 0.x phase, minor version bumps may include breaking changes. This policy takes effect at 1.0.0.

### What Constitutes a Breaking Change

**Breaking changes to `@tileguard/core`:**
- Removing a field from any interface.
- Changing the type of any field.
- Adding a required field to any interface (optional fields are non-breaking).
- Changing the behavior of `createEngine()` in a way that alters `RunResult` structure.
- Removing an exported symbol.

**Breaking changes to domain packages:**
- Changing a `rule.id` (users reference rule IDs in config files).
- Changing a rule's `schema` in a way that invalidates previously valid options.
- Changing a `provider.id`.
- Changing a `plugin.id`.
- Removing a rule from a plugin's `rules` array.
- Changing the `type` discriminant of an artifact.

**Non-breaking changes:**
- Adding a new optional field to an interface.
- Adding a new rule to a plugin (new rules default to `'off'` for non-recommended rules, so they do not change behavior for existing users).
- Adding a new provider to a plugin.
- Adding a new reporter.
- Changing a rule's `meta.description`, `meta.docsUrl`, or `meta.since`.
- Fixing a bug where a rule was producing false positives.
- Improving diagnostic messages (message text is not a stable API).

### Rule ID Stability

Rule IDs are the most user-visible API surface. Once a rule is published with a given ID, that ID must not change. If a rule needs to be renamed (for clarity, consistency, or namespace reorganization), the old ID is kept as a deprecated alias that emits a warning, and the new ID is added alongside it. The alias is removed in the next major version.

```typescript
// Deprecated alias — kept for one major version cycle
export const oldNameRule: Rule = {
  id: 'tile/old-name',
  meta: {
    description: '[Deprecated] Use tile/new-name instead. Will be removed in v2.0.0.',
    defaultSeverity: 'warning',
    recommended: false,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    context.report({
      message: 'Rule "tile/old-name" is deprecated. Rename to "tile/new-name" in your config.',
    });
  },
};
```

### Diagnostic Message Stability

Diagnostic `message` strings are **not** a stable API. They may be improved, clarified, or reformatted in any release. Do not write tests that assert on the exact wording of diagnostic messages — assert on `ruleId`, `severity`, and structured fields like `location` and `data` instead.

```typescript
// Fragile — breaks when message wording improves
expect(d.message).toBe('Required layer "buildings" is not present in the tile.');  ✗

// Stable — tests the semantic content, not the exact wording
expect(d.ruleId).toBe('tile/required-layers');
expect(d.data?.requiredLayer).toBe('buildings');
expect(d.location?.layer).toBe('buildings');                                        ✓
```

### Deprecation Process

Before removing any public API:

1. **Announce** the deprecation in the release notes for the version where the feature is deprecated.
2. **Mark** the deprecated symbol with a JSDoc `@deprecated` tag and a note indicating what to use instead.
3. **Wait** at least one minor version after the deprecation before removing in a major version.
4. **Document** the migration path in `docs/engineering/` before removing.

```typescript
/**
 * @deprecated Use `tile/unclosed-ring` instead. Will be removed in v2.0.0.
 */
export const oldRingCheckRule: Rule = { /* ... */ };
```

### Legacy Code Freeze

The `legacy/` directory is frozen. No new commits should modify files in `legacy/js/` or `legacy/python/` except to add a `FROZEN.md` notice or fix a critical bug that would otherwise block migration work. Legacy code is not governed by this backward compatibility policy — it is reference material, not a maintained API.

---

## Appendix: Quick Reference

### Naming at a Glance

| Thing | Convention | Example |
|:------|:-----------|:--------|
| Source files | kebab-case `.ts` | `required-layers.ts` |
| Test files | same as source, `.test.ts` | `required-layers.test.ts` |
| Directories | kebab-case | `src/rules/`, `tests/fixtures/` |
| Rule IDs | `category/kebab-name` | `tile/required-layers` |
| Provider IDs | kebab-case | `vector-tile` |
| Plugin IDs | kebab-case | `tile-rules` |
| npm packages (scoped) | `@tileguard/kebab-name` | `@tileguard/tile-rules` |
| npm packages (CLI) | unscoped | `tileguard` |
| TypeScript interfaces | PascalCase | `ArtifactProvider` |
| TypeScript type aliases | PascalCase | `Severity` |
| Exported constants | camelCase | `requiredLayersRule`, `tilePlugin` |

### Forbidden Patterns at a Glance

| Pattern | Reason |
|:--------|:-------|
| `console.log` in rules/providers | Rules are pure; use `context.report()` |
| `import x from '@tileguard/style-rules'` in tile-rules | Forbidden cross-package dependency |
| `import x from '@tileguard/core/src/diagnostic'` | Deep import; use public API only |
| `import x from './file'` (no extension) | NodeNext requires `.js` extension |
| `catch (e) { /* nothing */ }` | No silent failures |
| `any` without `as unknown as T` | Use proper type narrowing |
| Snapshot tests for unit assertions | Use explicit assertions |
| Changing a rule ID after publication | Breaking change; use a deprecated alias |
| Asserting on `diagnostic.message` text | Message text is not stable API |
| Runtime dep in `@tileguard/core` without ADR | Core has zero runtime dependencies |
| Caret/tilde ranges in `package.json` deps | Use exact pinned versions |
| `eval()` or `new Function()` on downloaded content | Security: never execute remote code |
| Using source string as file path without normalization | Security: path traversal risk |
| HTTP request without explicit timeout | Security: provider must not hang |
| Logging values from `ProviderOptions.headers` | Security: may contain credentials |
| Merging without all CI gates green | No exceptions, no manual overrides |
| Publishing from a local machine | Releases run in CI only |
| Editing version numbers in `package.json` manually | Use `pnpm version` at workspace root |
| Exporting a symbol not in `src/index.ts` as "internal" | If it's exported, it's public API |
| Optimizing without before/after benchmark data | Evidence-based optimization only |

---

*This document is part of the [TileGuard Engineering documentation](./README.md).*  
*See also: [CORE_CONTRACTS.md](../architecture/CORE_CONTRACTS.md) · [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) · [Architecture Handbook](../architecture/README.md)*

---

## 11. Release Engineering
<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->

**Image Description / Generation Prompt:** A UML Sequence Diagram visualizing the end-to-end execution pipeline of TileGuard. The actors/objects from left to right are: `User/Shell`, `cli.ts (CLI Entrypoint)`, `loadConfig() (@tileguard/config)`, `Engine (@tileguard/core)`, `RulesRunner (Execution Loop)`, and `Reporters (@tileguard/reporters)`. The execution steps flow sequentially:
1. `User/Shell` runs the CLI check command.
2. `cli.ts` invokes `loadConfig()` to find and parse configuration files.
3. `loadConfig()` returns the validated `TileGuardConfig` object to `cli.ts`.
4. `cli.ts` instantiates the `Engine` with the resolved configuration.
5. `cli.ts` calls `engine.run(sources)`.
6. The `Engine` initializes the `RulesRunner` check loop.
7. The `RulesRunner` fetches and decodes tile/style artifacts, executing matching active rules for each.
8. Rules call `context.report()` to append diagnostics back to the engine.
9. The `Engine` collects all diagnostics and invokes `reporters.report(diagnostics)`.
10. `Reporters` format the diagnostic outputs and write them to the terminal or JSON file.
11. `cli.ts` exits with code 1 if errors were found, or code 0 if none.


### Release Philosophy

Releases are deliberate, documented, and reproducible. Every published version represents a stable, tested, fully-documented state of the framework. No release is made from a local machine in an ad-hoc way — the release process runs entirely in CI.

### Release Types

| Type | When used | Example |
|:-----|:----------|:--------|
| **Patch** | Bug fixes, documentation corrections, no API change | `0.3.1` |
| **Minor** | New rules, new providers, new reporters, backward-compatible additions | `0.4.0` |
| **Major** | Breaking changes to any public API or contract | `1.0.0` → `2.0.0` |

During the `0.x` phase, minor versions may include breaking changes. This exception ends at `1.0.0`.

### Step-by-Step Release Process

**1. Pre-release checklist (manual)**
- All planned work for this version is merged to `main`.
- `CHANGELOG.md` is up to date (see below).
- All packages build cleanly: `pnpm build`.
- All tests pass: `pnpm test`.
- No open issues labelled `release-blocker`.
- Architecture documentation is consistent with the implementation.

**2. Version bump**

Version bumps are performed by a single command at the workspace root and must not be done by editing `package.json` files individually:

```bash
# Patch
pnpm version patch --workspaces

# Minor
pnpm version minor --workspaces

# Major
pnpm version major --workspaces
```

This updates all `package.json` files in `packages/` in lockstep. All packages share one version number. Cross-package `workspace:*` dependencies are resolved to the exact version by pnpm during publish.

**3. Changelog update**

`CHANGELOG.md` lives at the repository root. It follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

```markdown
## [0.4.0] — 2026-08-01

### Added
- `tile/coordinate-range` rule: validates coordinates are within tile extent.
- `style/no-deprecated-ref` rule: flags usage of the deprecated `ref` property.

### Changed
- `tile/required-layers` now includes available layer names in `diagnostic.data`.

### Fixed
- `TileProvider` no longer throws on gzip-compressed tiles with no magic bytes.

### Deprecated
- `tile/old-geometry-check`: use `tile/unclosed-ring` and `tile/self-intersection` instead.
```

The changelog is written by humans, not generated. Commit messages inform it but do not replace it. The entry for a version is written before the version is tagged.

**4. Git tag**

Tags follow the format `v{version}` and are annotated (not lightweight):

```bash
git tag -a v0.4.0 -m "Release v0.4.0"
git push origin v0.4.0
```

Annotated tags carry a message and tagger identity. They are the trigger for the CI release workflow.

Tags are never moved or deleted after being pushed. If a release needs to be retracted, the npm package is deprecated rather than the tag being removed.

**5. CI release workflow**

Pushing a `v*` tag triggers `.github/workflows/release.yml`. The workflow:

1. Checks out the tagged commit.
2. Runs the full build and test suite.
3. Publishes all packages to npm in dependency order (core first, then domain packages, then CLI).
4. Creates a GitHub Release with the changelog entry for this version as the body.

Publishing is never done from a local machine. If the CI workflow fails, the release is fixed and re-tagged (incrementing the patch version if necessary — never reusing a tag).

**6. npm publishing**

Packages are published with `pnpm publish --access public`. The npm token is stored as a GitHub Actions secret (`NPM_TOKEN`) and is never committed or logged.

During the `0.x` phase, packages are published with `--tag next` to avoid installing them by default with `npx tileguard`. The `latest` tag is set only at `1.0.0`.

**7. Documentation updates required before a release**

A release must not be made if any of the following is out of date:

- `README.md` describes capabilities that do not yet exist.
- `CORE_CONTRACTS.md` documents an interface that the implementation does not match.
- `CHANGELOG.md` does not have an entry for this version.
- Any package `README.md` still says "📋 Planned" for functionality that is now implemented.

The documentation freeze (all docs consistent with the release) is a hard prerequisite. If documentation cannot be completed in time, the release is delayed.

---

## 12. Public API Rules

### The Contract

**Only symbols exported from `src/index.ts` are public API.** Everything else is an internal implementation detail and may change without notice, without a major version bump, and without a changelog entry.

This rule is absolute. It is not qualified by "unless it is obviously stable" or "except for types that seem fundamental." If it is not in `index.ts`, it is not public.

### What "Public API" Means

A symbol is part of the public API if it is:
- Exported from `src/index.ts` of its package, and
- Either documented in `CORE_CONTRACTS.md` (for `@tileguard/core`) or in the package's `README.md`.

A symbol that is exported from `src/index.ts` but undocumented is still public API for compatibility purposes. The solution is to document it, not to treat it as internal.

### What "Internal" Means

An internal symbol is one that:
- Is not exported from `src/index.ts`, even if it is exported from its own file for use within the package.
- Has the comment `// @internal` in its JSDoc.

Internal symbols may be refactored, renamed, removed, or moved at any time. No user code should ever depend on them, and the framework makes no guarantee about their stability.

### Enforcing the Boundary

`src/index.ts` is audited on every PR that touches it. Adding a new export to `src/index.ts` is a conscious decision that requires:

1. The symbol is defined in `CORE_CONTRACTS.md` (for `@tileguard/core`) or the package README.
2. The PR description explains why the symbol is being made public.
3. A reviewer explicitly approves the export.

Exports are not added speculatively. If a symbol might be needed publicly in the future, it stays internal until there is a concrete use case.

### Barrel Re-exports

`src/index.ts` is a barrel file — it re-exports symbols from other files in `src/`. It contains no logic itself:

```typescript
// packages/core/src/index.ts — re-exports only, no logic
export type { Diagnostic, DiagnosticDescriptor, Severity } from './diagnostic.js';
export type { Artifact, ArtifactRef, ArtifactProvider, ProviderOptions, Location } from './artifact.js';
export type { Rule, RuleMeta, RuleContext } from './rule.js';
export type { Plugin } from './plugin.js';
export type { Reporter, ReporterContext } from './reporter.js';
export type { TileGuardConfig, ResolvedConfig, RuleConfig, Override, GlobalOptions } from './config.js';
export type { Engine, RunResult, RunSummary } from './engine.js';
export { createEngine } from './engine.js';
```

Note: most Core exports are `export type`. Only `createEngine` is a runtime value export. This is intentional — Core's job is to define contracts (types), not provide implementations (values). The engine is the one exception because it is the entry point for programmatic use.

### No Accidental Public Surface

Avoid patterns that accidentally expose internal details:

```typescript
// Exposing an internal interface as the return type of a public function
// forces that interface into the public API even if not in index.ts
export function createEngine(config: TileGuardConfig): InternalEngineState { // ✗
  return { /* internal shape */ };
}

// Correct: return the public interface type
export function createEngine(config: TileGuardConfig): Engine { // ✓
  return new EngineImpl(config);
}
```

If the return type of a public function is an interface that is not exported from `index.ts`, that interface is still effectively public because callers must be able to type it. Either export the type or redesign the API to return a type that is already public.

---

## 13. Dependency Policy

### Core's Zero-Dependency Requirement

`@tileguard/core` has **zero runtime dependencies**. This is not a preference — it is a published guarantee. Users who install `@tileguard/core` install only `@tileguard/core`.

This requirement exists because:
- Core is the foundation of the dependency graph. A dependency in Core is a dependency in every package that uses Core.
- Core's only job is to define types and orchestrate. Types have no runtime cost. Orchestration requires only standard language constructs.
- A zero-dependency Core can be compiled to WASM, used in restricted environments, and bundled trivially.

If a Core implementation need seems to require an external package, the correct responses are, in order:
1. Use Node.js built-ins (`node:fs`, `node:path`, `node:util`).
2. Implement the needed functionality inline (it is likely small).
3. Reconsider whether the functionality belongs in Core at all.

Adding a runtime dependency to `@tileguard/core` requires a formal ADR and explicit maintainer sign-off. It will not be done for convenience.

### Dependency Evaluation Criteria

Every runtime dependency added to any TileGuard package must be justified against these four criteria, documented in the PR description:

**1. Why is it needed?**
State the specific capability the dependency provides. "Needed for gzip decompression" is acceptable. "Convenient utilities" is not.

**2. Why isn't native Node.js enough?**
Node.js 20+ has a substantial built-in library. Check `node:zlib`, `node:crypto`, `node:fs/promises`, `node:stream`, `node:util`, `node:path` before reaching for an npm package. If Node has the capability, use it.

**3. Is the package actively maintained?**
Check: last published version date, open issues response time, GitHub activity in the last 6 months. A package with no commits in 2 years is a maintenance liability. Note: stable, complete packages (e.g., a pure-algorithm library) may legitimately have low activity. Evaluate context.

**4. Is the bundle size acceptable?**
Check the package size on [bundlephobia.com](https://bundlephobia.com). For a framework package, individual dependency size should generally be under 50KB minified. Large dependencies (> 200KB) require explicit justification because they affect `npx tileguard` cold-start time.

### Peer vs. Direct Dependencies

Domain packages that depend on `@tileguard/core` declare it as a **peer dependency**, not a direct dependency. This prevents multiple versions of Core from being installed when a user has both `@tileguard/tile-rules` and `@tileguard/style-rules` installed.

```jsonc
// packages/tile-rules/package.json
{
  "peerDependencies": {
    "@tileguard/core": "^1.0.0"    // peer: one instance in the tree
  },
  "devDependencies": {
    "@tileguard/core": "workspace:*"  // dev: for local development
  }
}
```

The CLI (`tileguard`) declares direct dependencies on all domain packages because it is a leaf consumer that controls the full dependency tree.

### Pinned Versions

All non-workspace dependencies are pinned to exact versions in `package.json`. No caret ranges (`^`), no tilde ranges (`~`). Exact pinning ensures that two developers checking out the same commit get identical dependency trees.

```jsonc
"dependencies": {
  "fflate": "0.8.2"      ✓  exact
  "fflate": "^0.8.0"     ✗  caret range
  "fflate": "~0.8.0"     ✗  tilde range
}
```

pnpm lockfile (`pnpm-lock.yaml`) is committed to the repository. It is the ground truth for dependency resolution. Lockfile changes require the same review attention as `package.json` dependency changes.

### Dependency Audit

Every PR that modifies `package.json` dependencies triggers a dependency review in CI via the existing `.github/workflows/dependency-review.yml` workflow. The review checks for known vulnerabilities (via GitHub's advisory database) and license compatibility.

Permitted licenses: MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD.  
Licenses requiring review: GPL, LGPL, AGPL, SSPL, BUSL.  
Prohibited licenses: any license that restricts commercial use or requires source disclosure of consuming code.

---

## 14. Security Guidelines

### Threat Model

TileGuard processes external inputs: tile files, style files, URLs, and eventually tile archives (MBTiles, PMTiles). These inputs originate from user-controlled file systems, remote servers, and (in CI) from pull request authors. The threat model covers:

- **Malicious artifact content:** Files crafted to exploit parsing vulnerabilities (buffer overflows in decoders, ReDoS in pattern matching, zip bombs in compressed tiles).
- **Path traversal:** Relative paths in source strings that escape the intended working directory.
- **Remote code execution:** URLs or archive entries that, if followed, could cause TileGuard to execute downloaded code.
- **Resource exhaustion:** Artifacts designed to consume unbounded memory or CPU time.
- **Credential exposure:** Configuration files or environment variables that contain secrets being leaked in logs or diagnostic output.

TileGuard never executes downloaded content. It decodes known binary formats using bounded parsers. All external inputs are treated as untrusted data.

### Provider Security Requirements

Every `ArtifactProvider` implementation must comply with:

**1. Never execute downloaded content.**
Providers decode binary formats (PBF, JSON, PNG). They must never `eval()`, `new Function()`, `import()` dynamically from a remote source, or use `vm.runInContext()` on downloaded content. This prohibition is absolute.

**2. Validate source strings before use as file paths.**

```typescript
import { resolve, normalize } from 'node:path';

function safePath(source: string, allowedRoot: string): string {
  const resolved = resolve(allowedRoot, normalize(source));
  if (!resolved.startsWith(resolve(allowedRoot))) {
    throw new Error(
      `Path traversal detected: "${source}" resolves outside allowed root "${allowedRoot}".`
    );
  }
  return resolved;
}
```

Do not use `source` strings directly as file system paths without normalization and bounds checking.

**3. Enforce timeouts on all network requests.**

All HTTP requests made by providers must have an explicit timeout. Use the `timeout` field from `ProviderOptions` (default: 30,000ms). A provider that can hang indefinitely on a slow server blocks the entire run.

```typescript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), options?.timeout ?? 30_000);
try {
  const response = await fetch(source, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timer);
}
```

**4. Enforce maximum input sizes.**

Providers must not load artifacts of unbounded size into memory. Recommended limits:

| Artifact type | Maximum size |
|:-------------|:-------------|
| Vector tile (`.pbf`) | 10 MB decompressed |
| Style specification (`.json`) | 5 MB |
| Render snapshot (`.png`) | 50 MB |
| Tile archives (future) | Configurable, default 2 GB |

If a source exceeds the limit, produce an `artifact/size-exceeded` diagnostic and return without loading the content. Do not throw.

**5. Handle malformed input without crashing.**

Binary decoders (PBF/MVT) must be robust against truncated data, invalid field tags, and deeply nested structures. Use a length-bounded decoder that rejects inputs exceeding a configurable nesting depth or field count. Produce an `artifact/decode-failed` diagnostic on malformed input.

**6. Do not log credential material.**

Configuration may contain API keys, tokens, or bearer credentials in `ProviderOptions.headers`. These values must never appear in diagnostic messages, error messages, log output, or `data` fields. When logging or reporting a failed request, include the URL and status code but not the request headers.

```typescript
// FORBIDDEN — leaks auth header in diagnostic
context.report({
  message: `Request failed: ${JSON.stringify(requestHeaders)}`,  ✗
});

// CORRECT — include only safe metadata
context.report({
  message: `Failed to load artifact from "${source}": HTTP ${statusCode}.`,
  data: { source, statusCode },                                   ✓
});
```

### Rule Security Requirements

Rules inspect artifact content. They do not make network requests, write files, or execute any code derived from artifact content. The purity requirement (Section 11, Design Principle 7 in `CORE_CONTRACTS.md`) is also the security boundary.

Additional rule constraints:

- **No regex on unbounded input without length guards.** If a rule matches a regex against a feature property value, guard the value length before applying the pattern to prevent ReDoS.
- **No unbounded iteration.** Rules that iterate over all feature pairs (e.g., self-intersection checks) must have a maximum iteration count. If the artifact exceeds the limit, produce a diagnostic noting the limit and return.

### Dependency Security

The dependency audit in CI (`.github/workflows/dependency-review.yml`) checks for known CVEs in all dependencies on every PR. A PR that introduces a dependency with a known high-severity CVE does not pass CI. A PR that introduces a new dependency is reviewed for security posture as part of the standard dependency evaluation criteria (Section 13).

Dependencies are audited quarterly against the npm audit database even when `package.json` has not changed, via a scheduled CI workflow.

---

## 15. Performance Measurement Policy

### Evidence-Based Optimization

No performance optimization is merged without measurements. An optimization that is not accompanied by benchmark data showing a meaningful improvement is a speculative change that adds complexity without proven benefit. The canonical format for a performance PR:

```
Before: 47ms median for validate-tile benchmark on fixtures/line-width
After:  31ms median for validate-tile benchmark on fixtures/line-width
Change: -34% (-16ms) median latency. Measured over 1000 runs on Node 20.14 / Linux x64.
Method: Replaced array spread in feature accumulation with direct push.
```

A "meaningful improvement" for TileGuard is defined as:
- ≥ 10% reduction in median wall-clock time, measured over ≥ 500 runs, **or**
- ≥ 20% reduction in peak heap allocation, measured with `--expose-gc` and explicit GC cycles.

Changes below this threshold may still be merged if they also improve readability, but they should not be described as performance improvements.

### How to Benchmark

The benchmark runner is Vitest's built-in bench API (`bench()` from `vitest`). Benchmarks live in `tests/benchmarks/` within each package:

```typescript
// packages/tile-rules/tests/benchmarks/validate-tile.bench.ts
import { bench, describe } from 'vitest';
import { createEngine } from '@tileguard/core';
import { tilePlugin } from '../../src/index.js';

describe('tile validation — line-width fixture', () => {
  const engine = createEngine({ plugins: [tilePlugin] });

  bench('run all tile rules', async () => {
    await engine.run(['../../../fixtures/line-width/style.json']);
  });
});
```

Run benchmarks with:

```bash
pnpm --filter @tileguard/tile-rules bench
```

Benchmark baseline files are stored in `tests/benchmarks/baselines/` as JSON. CI compares each benchmark run against the stored baseline and fails if any benchmark regresses by more than 20%. Baselines are updated explicitly via a dedicated script (`pnpm bench:update-baseline`), never automatically.

### What Must Be Benchmarked

A benchmark is required when:

- A new rule is added that iterates over all features in all layers (geometry rules).
- A provider is added or modified (measures full load pipeline: fetch + decompress + decode).
- A change is made to the engine's core execution loop.
- A utility in `@tileguard/shared` replaces a hot-path algorithm.

A benchmark is not required when:

- Adding a style rule that inspects only the top-level JSON structure.
- Adding a configuration option.
- Changing diagnostic message text.

When in doubt, add one. A benchmark that shows "this is fast" is not wasted effort — it protects the baseline against future regressions.

### Profiling Before Optimizing

Before writing optimization code, profile the actual bottleneck:

```bash
node --prof --prof-process packages/tile-rules/tests/benchmarks/profile-entry.js
```

Do not optimize based on intuition about what is slow. Profiling frequently reveals that the bottleneck is in an unexpected location (usually I/O or allocation, rarely computation). An optimization applied to the wrong location is wasted effort and adds technical debt.

---

## 16. Definition of Done

A feature is not done when the code compiles. A feature is done when every item in this checklist is complete. The definition applies to rules, providers, reporters, and any other significant addition.

### A Rule Is Done When

- [ ] **Implementation:** The rule is implemented in `src/rules/{rule-name}.ts`, conforms to the `Rule<C>` interface, and upholds the purity contract.
- [ ] **Exported:** The rule is included in the parent package's plugin `rules` array and re-exported from `src/index.ts`.
- [ ] **Tests:** A `tests/rules/{rule-name}.test.ts` file exists with tests for the happy path, every `context.report()` call path, and relevant edge cases.
- [ ] **Options schema:** If the rule has configurable options, a `schema` object is present and tests verify that invalid options produce a configuration error.
- [ ] **JSDoc:** The exported rule object has a JSDoc comment explaining what it validates, why it matters, and a config example.
- [ ] **README entry:** The rule appears in the package README's rules table with description and legacy source reference.
- [ ] **Docs stub:** `docs/rules/{category}/{rule-name}.md` exists (may be minimal but must be present).
- [ ] **Migration mapping updated:** If this rule is a migration from legacy code, the corresponding row in `docs/engineering/MIGRATION_PLAN.md`'s legacy inventory table has been updated to reflect that migration is complete.
- [ ] **Benchmark** *(if applicable):* If the rule iterates over all features, a benchmark exists in `tests/benchmarks/`.
- [ ] **CI passes:** Build, typecheck, tests, dependency audit, and (if applicable) benchmark regression check all pass.

### A Provider Is Done When

- [ ] **Implementation:** The provider implements `ArtifactProvider`, handles gzip/decompression where applicable, and produces a fully decoded `Artifact<T, C>`.
- [ ] **Error handling:** Load failures (file not found, network error, malformed bytes, size exceeded) propagate cleanly to the engine and do not throw to the caller.
- [ ] **Security review:** Source strings are validated against path traversal. Network requests have timeouts. Maximum input size is enforced. Credential values are not logged.
- [ ] **Exported:** The provider is included in the parent package's plugin `providers` array.
- [ ] **Tests:** Unit tests cover: successful load, gzip-compressed input (if applicable), malformed input, file-not-found error path.
- [ ] **Benchmark:** A benchmark measures the full load pipeline on a representative fixture.
- [ ] **CI passes:** All checks pass.

### A Package Is Done When

- [ ] **README.md** is complete (purpose, status, contents, dependencies, usage, legacy reference).
- [ ] **package.json** includes all required fields (Section 2).
- [ ] **tsconfig.json** extends `tsconfig.base.json` with correct references.
- [ ] **src/index.ts** exports only the intended public API.
- [ ] **All rules/providers/reporters** in the package individually satisfy their definitions of done.
- [ ] **Dependency evaluation** for all runtime dependencies is documented.
- [ ] **CI passes** for the full package.

### A Release Is Done When

- [ ] **CHANGELOG.md** has an entry for this version.
- [ ] **All documentation** is consistent with the implementation (no "planned" stubs for shipped features).
- [ ] **Git tag** `v{version}` is pushed.
- [ ] **CI release workflow** completes without errors.
- [ ] **npm packages** are published and verifiable with `npm info @tileguard/core@{version}`.
- [ ] **GitHub Release** is created with the changelog entry as its body.

---

## 17. Deprecation Timeline

### Rule and API Lifecycle

Every rule and public API goes through a defined lifecycle. Status transitions are one-way. A feature never moves backward from Deprecated to Stable.

```
  ┌─────────────┐
  │ Experimental │  Not in a "recommended" preset. Opt-in only.
  │  (0.x only)  │  May change or be removed in any minor release.
  └──────┬──────┘
         │  Declared stable by maintainer in a minor release.
         ▼
  ┌─────────────┐
  │   Stable     │  In recommended preset (if applicable).
  │              │  Governed by backward compatibility policy.
  └──────┬──────┘
         │  Deprecation announced in a minor release.
         ▼
  ┌─────────────┐
  │  Deprecated  │  Still works. Emits a warning diagnostic or console notice.
  │              │  @deprecated JSDoc tag present.
  │              │  Changelog entry noting what replaces it.
  └──────┬──────┘
         │  Removed in the next major release.
         ▼
  ┌─────────────┐
  │   Removed    │  No longer exists. Migration guide in docs.
  └─────────────┘
```

### Experimental Status

A rule or API is Experimental when:

- It is shipped in a `0.x` release.
- Its rule ID ends in `-experimental` suffix **or** the release notes explicitly label it as experimental.
- It is excluded from any recommended preset.
- Its `meta.since` documents the version it was introduced.

Experimental features can be changed or removed in any minor release without a major version bump. Users who opt in to experimental features accept this instability.

After `1.0.0`, new rules and APIs enter the lifecycle as **Stable** (not Experimental) unless explicitly marked otherwise.

### Stable Status

A rule or API is Stable when:

- It has been in a `1.x` release without changes to its contract.
- It is governed by the backward compatibility policy in Section 10.
- Any change to its contract requires a major version bump.

### Deprecated Status

Deprecation requires all of the following:

1. A changelog entry in the minor release that introduces the deprecation, naming what replaces the deprecated feature.
2. A `@deprecated` JSDoc tag on the symbol: `@deprecated Use X instead. Will be removed in v{next major}.0.0.`
3. For deprecated rules: the rule continues to execute but emits an additional `info`-severity diagnostic noting the deprecation.
4. A migration guide in `docs/engineering/` if the replacement is not a trivial rename.

Deprecated features must remain functional for **at least one complete minor release cycle** before being removed. The removal happens in the next major release only.

### Removed Status

When a feature is removed in a major release:

1. The symbol is deleted from the source.
2. An entry is added to the CHANGELOG under `### Removed`.
3. The migration guide (written during deprecation) is updated to reference the version where removal occurred.
4. A note is added to the major version's upgrade guide: "Feature X was removed. Use Y instead."

### Status Indicators in Documentation

Package READMEs and rule documentation use consistent emoji status labels:

| Status | Label |
|:-------|:------|
| Experimental | 🧪 Experimental |
| Stable | ✅ Stable |
| Deprecated | ⚠️ Deprecated — use X instead |
| Removed | ❌ Removed in vN.0.0 |

---

## 18. CI Quality Gates

TileGuard uses automated quality gates for its own codebase — the same discipline it brings to geospatial pipelines. A pull request cannot be merged unless all gates pass. There are no exceptions and no manual overrides for failing gates.

### Required Gates (Block Merge)

Every pull request must pass all of the following before merging to `main`:

#### ✅ Build

```
pnpm build
```

All packages must compile without errors. TypeScript `composite` mode means the full project reference graph is built. A compilation error in any package blocks the entire build.

#### ✅ Typecheck

```
pnpm typecheck
```

Runs `tsc --noEmit` across all packages. Build (`tsc --build`) is used for compilation; typecheck is a separate pass to catch issues in non-compiled paths (test files, utility scripts).

#### ✅ Tests

```
pnpm test
```

All tests in all packages must pass. Test failures are never suppressed. `--bail` is not used — all failures are reported to help diagnose cascading issues.

#### ✅ Dependency Boundary Lint

A workspace lint script verifies that no `package.json` in `packages/` declares a dependency that violates the allowed dependency graph (Section 2 of `CORE_CONTRACTS.md`). Specifically:

- `@tileguard/core` has zero runtime `dependencies`.
- `@tileguard/tile-rules` does not depend on `@tileguard/style-rules` or `tileguard`.
- `@tileguard/style-rules` does not depend on `@tileguard/tile-rules` or `tileguard`.
- No package depends on `tileguard` (CLI).

#### ✅ Dependency Vulnerability Review

`.github/workflows/dependency-review.yml` runs on every PR that modifies `pnpm-lock.yaml` or any `package.json`. It checks for high and critical CVEs in new or updated dependencies. A PR that introduces a dependency with a known high-severity vulnerability does not pass.

#### ✅ Missing Test File Detection

A shell script compares `src/rules/*.ts` to `tests/rules/*.test.ts` for each domain package. A rule file without a corresponding test file blocks merge.

```bash
# CI check: every rule has a test
for rule_file in packages/tile-rules/src/rules/*.ts; do
  rule_name=$(basename "$rule_file" .ts)
  test_file="packages/tile-rules/tests/rules/${rule_name}.test.ts"
  if [[ ! -f "$test_file" ]]; then
    echo "MISSING TEST: $test_file"
    exit 1
  fi
done
```

### Conditional Gates (Block Merge When Applicable)

These gates run only when their trigger condition is met:

#### ✅ Benchmark Regression Check

**Trigger:** Changes to `src/rules/*.ts`, `src/provider.ts`, or `src/utils/*.ts` in a domain package, or changes to the engine in `@tileguard/core`.

Runs the benchmark suite and compares results against the stored baseline in `tests/benchmarks/baselines/`. Fails if any benchmark regresses by more than 20% in median latency.

#### ✅ Architecture Documentation Consistency Check

**Trigger:** Changes to any file in `packages/core/src/`.

A reviewer must confirm that `CORE_CONTRACTS.md` reflects any changes to Core's public interfaces. This is a manual gate: the PR template includes a checklist item "I have updated CORE_CONTRACTS.md if Core interfaces changed." A reviewer verifies this is checked and accurate.

#### ✅ Public API Surface Check

**Trigger:** Changes to any `packages/*/src/index.ts`.

Generates the public API surface of the changed package (exported symbol names and types) and compares it to the previous version. Reports any removed or type-changed symbols as breaking changes. The reporter does not block merge automatically — it requires a reviewer to acknowledge the breaking change and confirm that the version bump strategy is appropriate.

### Gate Summary Table

| Gate | Runs on | Blocks merge |
|:-----|:--------|:-------------|
| Build | All PRs | Always |
| Typecheck | All PRs | Always |
| Tests | All PRs | Always |
| Dependency boundary lint | All PRs | Always |
| Dependency vulnerability review | PRs modifying lock/package.json | Always |
| Missing test file detection | PRs modifying `src/rules/` | Always |
| Benchmark regression | PRs modifying hot-path code | Always |
| Architecture doc consistency | PRs modifying `packages/core/src/` | Manual review |
| Public API surface check | PRs modifying `src/index.ts` | Manual review |

### Self-Hosting

TileGuard validates its own configuration and style fixtures using TileGuard. Once the framework reaches feature parity with the legacy CLI, the CI pipeline for the TileGuard repository includes a `tileguard check` step that validates the test fixtures in `fixtures/`. Any rule that produces a false positive on TileGuard's own fixtures is a bug.

---
