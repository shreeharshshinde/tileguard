# Contributing to TileGuard

Thank you for your interest in contributing to TileGuard! This document explains how to get started, what we expect from contributions, and how the development workflow works.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/shreeharshshinde/tileguard.git
cd tileguard

# Install dependencies (requires pnpm >= 9, Node.js >= 20)
pnpm install

# Build all packages
pnpm build

# Run all tests (1,635 tests across 8 packages)
pnpm test

# Start the Inspector dev server
cd packages/inspector && pnpm dev
```

---

## Project Structure

TileGuard is a pnpm monorepo. Each package has a focused responsibility:

| Package | Path | Purpose |
|---------|------|---------|
| `@tileguard/core` | `packages/core` | Framework contracts (Diagnostic, Artifact, Rule, Plugin, Reporter, Engine) |
| `@tileguard/shared` | `packages/shared` | Shared utilities across packages |
| `@tileguard/tile-rules` | `packages/tile-rules` | Vector tile provider + 10 validation rules |
| `@tileguard/style-rules` | `packages/style-rules` | Style provider + 9 lint rules |
| `@tileguard/config` | `packages/config` | Configuration discovery, loading, validation |
| `@tileguard/reporters` | `packages/reporters` | Text, JSON, Markdown, HTML report renderers |
| `@tileguard/analysis` | `packages/analysis` | Comparison and regression analysis engine |
| `@tileguard/cli` | `packages/cli` | Command-line interface |
| `@tileguard/inspector` | `packages/inspector` | Visual debugging environment (browser) |

---

## Writing a Rule

The most common contribution is a new validation rule. A rule is a plain TypeScript object — no base classes, no decorators:

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'tile/my-check',
  meta: {
    description: 'Validates something specific about the tile.',
    defaultSeverity: 'warning',
    recommended: true,
  },
  artifactTypes: ['VectorTile'],

  create(context) {
    // Access the decoded tile
    const content = context.artifact.content;
    
    // Report issues
    context.report({
      message: 'Something is wrong here.',
      location: { jsonPath: 'layers.buildings' },
      suggestion: 'Fix it by doing X.',
    });
  },
};
```

### Rule checklist

- [ ] Rule ID follows the `domain/name` convention (e.g., `tile/required-layers`)
- [ ] Rule has a `meta.description` (one sentence)
- [ ] Rule has a `meta.defaultSeverity`
- [ ] Rule is registered in the plugin's rule array
- [ ] Rule has at least 3 test cases (pass, fail, edge)
- [ ] Tests use real fixture files, not mocked artifacts
- [ ] Rule is documented in `docs/rules/`

---

## Development Workflow

### Branching

```
main          ← stable, released
feature/*     ← new features
fix/*         ← bug fixes
docs/*        ← documentation only
```

### Commits

We use conventional commits:

```
feat(tile-rules): add unclosed-ring detection
fix(cli): handle empty file paths gracefully
docs(readme): update installation instructions
test(reporters): add edge case for empty diagnostics
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/tile-rules && pnpm test

# Watch mode
cd packages/core && pnpm test:watch
```

Every rule must have corresponding tests. Every test should use real fixture files from `fixtures/` — not mocked objects.

### Linting

```bash
# Check code quality
pnpm lint

# Auto-format
pnpm format
```

We use [Biome](https://biomejs.dev/) for linting and formatting.

### Building

```bash
# Build all packages (TypeScript compilation)
pnpm build

# Clean all build artifacts
pnpm clean
```

---

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Write your code. Include tests.
3. Run `pnpm build && pnpm test && pnpm lint` — all must pass.
4. Write a clear PR description explaining what and why.
5. Request review.

### PR title format

```
feat(package): short description
fix(package): short description
docs: short description
```

### What makes a good PR

- Focused: one concern per PR
- Tested: new tests for new behavior
- Documented: update docs if behavior changes
- Small: prefer multiple small PRs over one large PR

---

## Architecture Guidelines

- **Dependencies flow inward.** Core depends on nothing. Domain packages depend only on Core.
- **Rules are pure functions.** No I/O, no side effects, no shared state.
- **Diagnostics are the universal currency.** Every rule produces them; every reporter consumes them.
- **Composition over inheritance.** Plain objects, not class hierarchies.
- **Explicit over clever.** Clear error messages, no implicit behavior.

See [docs/architecture/](docs/architecture/) for the full architecture handbook.

---

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/shreeharshshinde/tileguard/labels/good%20first%20issue). These are selected to be approachable for newcomers:

- Adding a new validation rule
- Improving error messages
- Adding test fixtures
- Documentation improvements
- Improving CLI help text

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming, inclusive environment.

---

## License

By contributing to TileGuard, you agree that your contributions will be licensed under the [MIT License](LICENSE).
