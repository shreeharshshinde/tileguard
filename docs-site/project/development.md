# Development Setup

## Prerequisites

- **Node.js ≥ 20**
- **pnpm ≥ 9**: `npm install -g pnpm`

## Clone and Install

```bash
git clone https://github.com/shindeshreeharsh/tileguard.git
cd tileguard
pnpm install
```

## Build

```bash
# Build all packages
pnpm build

# Build a specific package
cd packages/core && pnpm build
```

## Test

```bash
# Run all tests (~1,838 tests across 9 packages)
pnpm test

# Run tests for a specific package
cd packages/tile-rules && pnpm test

# Watch mode
cd packages/core && pnpm test:watch
```

All tests use [Vitest](https://vitest.dev/). Every rule has corresponding tests using real `.pbf` fixtures — not mocked objects.

## Inspector (Dev Server)

```bash
cd packages/inspector
pnpm dev
```

Opens a browser with the visual debugging environment. Hot-reloads on source changes.

## Project Structure

```text
tileguard/
├── packages/
│   ├── core/           ← Framework contracts (zero dependencies)
│   ├── shared/         ← Cross-package utilities
│   ├── tile-rules/     ← MVT provider + 12 tile rules
│   ├── style-rules/    ← Style provider + 9 lint rules
│   ├── config/         ← Config discovery and loading
│   ├── reporters/      ← Text, JSON, report engine
│   ├── analysis/       ← Comparison + regression
│   ├── cli/            ← 10 CLI commands
│   └── inspector/      ← Visual debugging (Vite + React)
├── demo/               ← Demo tile fixtures (Tokyo)
├── docs/               ← Internal engineering docs
├── docs-site/          ← Public documentation (VitePress)
└── pnpm-workspace.yaml
```

## Branching Convention

```text
main          ← stable, released
feature/*     ← new features
fix/*         ← bug fixes
docs/*        ← documentation only
```

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(tile-rules): add unclosed-ring detection
fix(cli): handle empty file paths gracefully
docs(readme): update installation instructions
test(reporters): add edge case for empty diagnostics
refactor(core): extract engine orchestration
```

## Linting & Formatting

```bash
# Check code quality
pnpm lint

# Auto-format
pnpm format
```

Uses [Biome](https://biomejs.dev/) for both linting and formatting.

## Package Dependencies

```text
cli → config, core, reporters, tile-rules, style-rules, analysis
tile-rules → core, shared
style-rules → core, shared
config → core
reporters → core
analysis → core
inspector → core, tile-rules, style-rules, analysis, reporters
shared → core
core → (nothing)
```

Dependencies flow strictly inward. Adding a dependency from `core` to any outer package is a build error.

## Useful Commands

| Command | What it does |
|:--------|:-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all source files |
| `cd packages/inspector && pnpm dev` | Start Inspector dev server |
| `cd docs-site && pnpm dev` | Start docs site dev server |
| `cd docs-site && pnpm build` | Build docs site |
