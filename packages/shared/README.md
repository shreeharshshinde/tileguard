# @tileguard/shared

Shared utilities used across TileGuard domain packages (`@tileguard/tile-rules`, `@tileguard/style-rules`).

> **Package boundary:** `@tileguard/shared` depends only on `@tileguard/core`. Domain packages may depend on `@tileguard/shared`. This package must never depend on any domain package, CLI, or reporter.

---

## Installation

```bash
npm install @tileguard/shared @tileguard/core
```

This package is primarily consumed as an internal dependency of `@tileguard/tile-rules` and `@tileguard/style-rules`. You typically don't install it directly unless you're writing a custom TileGuard plugin that needs shared geometry or utility functions.

---

## Purpose

This package extracts cross-cutting utilities that would otherwise be duplicated between domain packages:

- **Geometry helpers** — coordinate math, ring area calculation (Shoelace algorithm), segment intersection detection (orientation-based), ring validation
- **File format detection** — determining artifact types from file extensions and content signatures
- **Common constants** — shared thresholds and default values

---

## Dependency Graph

```
@tileguard/tile-rules ──┐
                         ├──► @tileguard/shared ──► @tileguard/core
@tileguard/style-rules ──┘
```

---

## Testing

```bash
# From the monorepo root
pnpm --filter @tileguard/shared test

# Or from the package directory
cd packages/shared && pnpm test
```

Uses Node.js built-in test runner (`node --test`).

---

## Building

```bash
pnpm --filter @tileguard/shared build
```

Produces ESM output in `dist/`.

---

## Related Packages

| Package | Relationship |
|:--------|:-------------|
| `@tileguard/core` | Dependency — provides base types |
| `@tileguard/tile-rules` | Consumer — uses geometry helpers |
| `@tileguard/style-rules` | Consumer — uses shared utilities |
