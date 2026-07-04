# ADR-005: Flat Configuration Over Cascading Config Resolution

## Status

**Accepted** — 2026-07-02

## Context

The configuration system determines how users customize TileGuard's behavior
per-project. The design of this system has outsized impact on user experience:
confusing configuration is the #1 source of ESLint support questions.

Two broad approaches exist:

**Cascading configuration** (ESLint legacy, Stylelint): config files can
exist at any directory level. The tool walks up the directory tree, finds
all config files, and merges them with complex precedence rules. Config
files can "extend" other configs, creating inheritance chains.

**Flat configuration** (ESLint flat config, Biome, Oxlint): a single config
file at the project root. No directory walking, no extends chains, no
implicit inheritance. Path-specific overrides are expressed within the
single file.

## Decision

TileGuard uses **flat configuration**. One config file per project, in the
project root. No directory cascading, no extends mechanism, no implicit
config resolution.

Path-specific configuration differences are handled through an `overrides`
array within the single config file, using glob patterns.

## Rationale

### ESLint's Config Migration Is a Cautionary Tale

ESLint maintained cascading configuration for nearly a decade before
undertaking one of its largest-ever breaking changes (eslint v9, 2023-2024)
to migrate to flat config. The migration was motivated by years of user
confusion:

1. Users didn't know which config file was being applied.
2. Config merging semantics were surprising (array properties replacing
   vs. concatenating, object properties deep-merging vs. shallow).
3. The `extends` mechanism created non-obvious inheritance chains.
4. IDE integrations had to replicate the config resolution algorithm,
   leading to inconsistencies.

Starting a new project with flat config avoids all of these problems. There
is no legacy to maintain, no migration to plan, no documentation to
write about resolution rules.

### Flat Config Is Sufficient for TileGuard's Use Cases

- **Single project:** One config file, straightforward.
- **Monorepo with different rules for different dirs:** Use `overrides`
  with glob patterns.
- **Shared organizational config:** Export a config object from a shared
  npm package and spread it into the local config.

```typescript
// Shared config package
export const orgDefaults = { rules: { 'tile/required-layers': ['error', { ... }] } };

// Project config
import { orgDefaults } from '@myorg/tileguard-config';
export default { ...orgDefaults, rules: { ...orgDefaults.rules, 'tile/no-empty': 'off' } };
```

This covers the same use case as `extends` but with standard JavaScript
object spreading, which is familiar, debuggable, and type-checked.

## Consequences

### Benefits

- **Predictable behavior.** There is exactly one config file. Users always
  know which config is being applied.
- **No resolution algorithm.** The engine does not walk the directory tree.
  It loads one file from a known location.
- **Type-safe config.** TypeScript config files (`tileguard.config.ts`) get
  full type checking and IDE autocomplete.
- **Simpler documentation.** No need to explain merge semantics, precedence
  rules, or inheritance chains.

### Costs

- **No per-directory config.** Projects that want different rules for
  `src/` vs `tests/` must use the `overrides` mechanism. This is
  slightly more verbose than dropping a separate config file in each
  directory.
- **No extends keyword.** Users who expect `extends: ['recommended']`
  will need to use JavaScript spreading instead. This is functionally
  equivalent but syntactically different from what ESLint users know.

### Mitigations

- The `overrides` mechanism handles path-specific configuration.
- Preset objects (exported from domain packages) replace `extends`.
- Documentation will include examples for common configuration patterns.

## Alternatives Considered

### Alternative 1: Cascading configuration
Config files at any directory level, merging with precedence rules.
Rejected because of the complexity documented above.

### Alternative 2: Flat config with extends
A single file with an `extends` keyword that imports other configs by
name. Rejected because `extends` requires a named config resolution
mechanism (where does `extends: ['recommended']` load from?), which
adds complexity. JavaScript imports + object spreading achieve the
same result with standard language features.

### Alternative 3: Convention-only (no config file)
All configuration through CLI flags. Rejected because CI workflows
need persistent configuration that doesn't require long command lines.
