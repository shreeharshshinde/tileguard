# Releases

TileGuard follows [Semantic Versioning](https://semver.org/). This page documents notable releases.

---

## Unreleased

### Added

- **`--stdin` Flag on `check`** — Reads artifact source paths from standard input, one path per line. Enables integration with `find`, `git diff` (Diff-Aware CI), and `GNU parallel` without hitting command-line argument length (`ARG_MAX`) limits.
- **JSONL Streaming Reporter** (`--reporter jsonl`) — Produces newline-delimited JSON (one JSON line per diagnostic plus a trailing `{"_type":"summary",...}` line). Ensures flat memory consumption on arbitrary corpus sizes.

### Changed

- Aligned monorepo package versions and CLI runtime output to `v0.7.0`.

---

## 0.7.0 — 2026-10-04

### Highlights

Self-intersection precision milestone: `tile/self-intersection` achieves **100% precision at 100% recall** on both the 407-ring dual-oracle tuning corpus (EXP-003d) and an independent held-out set of 1,800 higher-zoom tiles (EXP-003e). **1,848 tests passing** across 9 packages.

### Fixed

- **`tile/self-intersection`** — Eliminated false positives caused by collinear-endpoint contact (Guard 6). Rings where a segment endpoint lies exactly on a non-adjacent segment's line — a quantization artifact of the `countries` Polygon layer at z0–z4 — were previously flagged as self-intersecting. The fix introduces `isProperCrossing()`, which requires all four `orient2d` values to be nonzero before a crossing is reported. Result: 27 true positives retained, 0 false positives, precision 100%, recall 100%, F1 100% (EXP-003d, 407-ring dual-oracle corpus). Validated on an independent held-out set of 2,535 unique rings from 1,800 higher-zoom tiles with zero false positives (EXP-003e).
- **`tile/winding-order`** — No longer produces false positives on tiles using the OGC/GeoJSON winding convention (outer=CCW, holes=CW). The rule now auto-detects the convention from the first ring and only flags rings that are inconsistent with the detected pattern. Previously, all OGC-convention tiles (including OpenMapTiles/Planetiler output) were incorrectly flagged.
- **`tile/hole-containment`** — No longer produces false positives on multi-polygon features. The rule now groups rings into logical polygons using convention-aware winding detection before checking containment.
- **Inspector Diagnostics** — Browser tile validation now executes actual rules against decoded artifacts instead of passing a hardcoded empty array.

### Added

- `isProperCrossing(ax, ay, bx, by, cx, cy, dx, dy)` — Exact-integer proper-crossing predicate exported from `@tileguard/tile-rules`. Returns `true` only when two segments share an interior point with all four `orient2d` values nonzero.
- `detectWindingConvention()` — Determines whether a tile uses MVT (CW=outer) or OGC (CCW=outer) convention based on the first ring's winding direction.
- `groupRingsIntoPolygons()` — Splits a flat array of polygon rings into logical polygons (outer + holes) based on winding sign changes under the detected convention.
- `runBrowserDiagnostics()` service in Inspector — executes all browser-safe tile rules against decoded artifacts.

#### Pillar 1 — Performance & Profiling

- **Performance Rules (`@tileguard/tile-rules`)**:
  - `perf/tile-size` — Validates raw and/or gzip-compressed tile byte size against configurable budgets. Reads existing `metadata.bytes` / `metadata.gzipped` fields with zero extra I/O.
  - `perf/vertex-budget` — Validates per-feature vertex counts and total tile vertex count. Each oversized feature emits an individual diagnostic.
  - `perf/feature-density` — Validates per-layer feature count with global default and per-layer overrides.
  - `perf/layer-size` — Flags layers whose vertex share exceeds a configured fraction of total tile vertices.
- **SARIF Reporter (`@tileguard/reporters`)**:
  - `createSarifReporter()` / `sarifReporter` — Produces an OASIS SARIF 2.1.0 JSON file compatible with GitHub Code Scanning (`--reporter sarif`).
- **CLI Commands**:
  - `tileguard profile <file>` — Read-only tile profiler displaying compressed/raw sizes, vertex count, and per-layer breakdown. Supports `--json` and `--top-n <n>`.
  - `tileguard hook install|uninstall|status` — Manages a `pre-commit` git hook that automatically runs `tileguard check` on staged `.pbf` files.

---

## 0.5.0-rc.1 — 2026-08-07

**First release candidate.** The complete framework is functional and tested. ~1,838 tests passing across 9 packages.

### Highlights

- **Visual Inspector** — Browser-based debugging with canvas geometry rendering, diagnostic overlays, and investigation workflows
- **Engineering Reports** — Markdown, HTML, JSON with executive summary, key findings, and prioritized recommendations
- **Compare Workflow** — Structural tile diff with regression analysis and evidence panel
- **10 CLI Commands** — `check`, `init`, `compare`, `analyze`, `report`, `stats`, `doctor`, `style`, `rules`, `version`

### Added

- Command Palette (`Ctrl+K`) — VS Code-style command access
- Global Search (`Ctrl+/`) — search across features, layers, diagnostics
- Engineering Console (`Ctrl+\``) — logs, diagnostics, timeline, performance
- Presentation Mode (`Ctrl+Shift+P`) — conference-optimized display
- Demo datasets — 6 bundled Tokyo demo tiles
- Keyboard shortcuts — full `Ctrl+1`–`7` workspace navigation
- Breadcrumb navigation — context-aware path
- Tabbed Feature Inspector — Summary, Properties, Geometry, Coordinates, JSON
- JSON Schema v2 for reports — versioned, stable API
- Investigation metadata in reports — platform, Node version, file hashes

### Changed

- All packages bumped to 0.5.0-rc.1
- Package exports include `types` condition for TypeScript consumers
- All packages include `files`, `engines`, `publishConfig`, `sideEffects`

---

## 0.4.0 — 2026-07-20

### Added

- **tile/winding-order** rule — validates polygon ring winding direction
- **tile/hole-containment** rule — validates holes within parent shells
- Geometry algorithms: `signedArea()`, `isClockwise()`, `pointInPolygon()` (ray-casting)
- Convention detection for MVT vs OGC/GeoJSON winding

---

## 0.3.0 — 2026-07-07

**Rule Parity release.** All validation logic migrated to the rule-based architecture.

### Added

- 10 tile validation rules (required-layers, required-properties, coordinate-range, feature-count, layer-feature-count, unclosed-ring, zero-area-ring, self-intersection, degenerate-geometry, no-empty)
- 9 style lint rules (valid-json, version, sources-present, layers-present, layer-id-required, unique-layer-id, known-source, zoom-range, no-deprecated-ref)
- Text and JSON reporters
- CLI commands: `check`, `init`, `rules`
- Config file discovery and loading
- Plugin architecture

---

## 0.2.0 — 2026-07-04

### Added

- `@tileguard/core` package — Engine, Diagnostic, Rule, Plugin, Artifact, Provider interfaces
- `@tileguard/shared` — cross-package utilities
- Engine orchestration: plugin resolution, artifact routing, diagnostic collection

---

## 0.1.0 — 2026-07-02

### Added

- Architecture Handbook — system design, interface specs, ADRs
- Monorepo structure with pnpm workspaces
- Core contracts defined (frozen before implementation)
