# Releases

TileGuard follows [Semantic Versioning](https://semver.org/). This page documents notable releases.

---

## Unreleased

### Fixed

- **tile/winding-order** — No longer produces false positives on tiles using the OGC/GeoJSON winding convention (outer=CCW, holes=CW). Auto-detects convention from the first ring and only flags inconsistencies.
- **tile/hole-containment** — No longer produces false positives on multi-polygon features. Groups rings into logical polygons using convention-aware winding detection before checking containment.
- **Inspector diagnostics** — Browser tile validation now runs actual rules instead of passing a hardcoded empty array.

### Added

- `detectWindingConvention()` — Determines MVT vs OGC convention from the first ring
- `groupRingsIntoPolygons()` — Splits flat ring arrays into logical polygons (outer + holes)
- `runBrowserDiagnostics()` — Executes browser-safe tile rules in the Inspector

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
