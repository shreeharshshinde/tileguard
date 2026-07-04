# ADR-001: TypeScript as the Single Reference Implementation

## Status

**Accepted** — 2026-07-02

## Context

The current TileGuard codebase maintains parallel implementations in JavaScript
(packages/js) and Python (packages/python). Both implement the tile validator,
PBF decoder, geometry validation, CLI, and reporter. The Python implementation
lacks the style linter and render comparison module.

Maintaining two parallel implementations of the same framework creates several
problems:

1. **Feature parity burden.** Every new rule must be implemented twice with
   identical semantics. The Python style linter is already an empty stub,
   demonstrating how parity falls behind under time pressure.

2. **Bug duplication.** A bug found in one language must be investigated and
   fixed in both. Subtle behavioral differences between languages (floating
   point handling, string encoding, error semantics) mean the "same" fix
   may not work identically.

3. **Double testing burden.** Every test must exist in both test suites.
   Test coverage gaps can hide in one implementation while the other passes.

4. **Architectural divergence.** As the framework introduces concepts like
   rules, diagnostics, and the engine, maintaining identical abstractions
   across two type systems (TypeScript interfaces vs. Python protocols/ABCs)
   doubles the design surface area.

## Decision

TileGuard adopts **TypeScript as the single reference implementation** for the
framework. The entire framework — Core, domain packages, CLI — is implemented
in TypeScript and runs on Node.js.

Python support will be introduced later through one of these approaches:
- A Python SDK that shells out to the TypeScript CLI
- A WASM-compiled version of the engine callable from Python
- A Python language server that communicates with the TypeScript engine

## Consequences

### Benefits

- **Single source of truth.** Every validation rule exists in one place. There
  is no ambiguity about which implementation is correct.
- **TypeScript's type system.** Interfaces, generics, and discriminated unions
  express the framework's contracts more precisely than dynamic typing.
- **Halved maintenance.** One test suite, one CI matrix row per concern, one
  set of dependencies to manage.
- **Faster iteration.** New rules ship immediately instead of waiting for
  parallel implementation.

### Costs

- **Python ecosystem gap.** The geospatial Python ecosystem (GeoPandas, Fiona,
  Shapely, Rasterio) is enormous. Not having a native Python API limits
  adoption in Python-centric workflows.
- **Loss of existing Python code.** The working Python validator, decoder, and
  geometry module will not be actively maintained. The code is preserved in
  `packages/legacy/python/` for reference.

### Mitigations

- Python bindings are on the future roadmap (post-1.0).
- The JSON reporter output is language-agnostic — Python scripts can consume
  TileGuard output by parsing JSON.
- The CLI can be invoked from Python via `subprocess`.

## Alternatives Considered

### Alternative 1: Maintain both implementations
Continue developing in both JavaScript and Python. Rejected because the
maintenance cost scales linearly with the number of rules and framework
features, and parity has already fallen behind.

### Alternative 2: Python-only implementation
Implement the framework in Python. Rejected because:
- The geospatial web ecosystem (MapLibre, vector tiles, style specs) is
  JavaScript-native.
- Node.js has better tooling for CLI applications (npm distribution, npx).
- The existing JavaScript codebase is more complete than the Python one.

### Alternative 3: Rust core with language bindings
Implement the core engine in Rust, with TypeScript and Python bindings via
WASM and PyO3. Rejected as over-engineering for the current project stage.
This may become viable in the future if performance demands increase.
