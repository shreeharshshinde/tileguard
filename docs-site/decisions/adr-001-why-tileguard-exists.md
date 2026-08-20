# ADR-001: Why TileGuard Exists

**Status:** Accepted · **Date:** 2026-07-02

## Context

Modern web maps depend on vector tiles — binary-encoded geospatial data rendered client-side. When this data contains geometry errors (self-intersections, incorrect winding, unclosed rings), the result is visual corruption: missing buildings, inverted fills, broken extrusion, or rendering differences between MapLibre and other engines.

Before TileGuard, the geospatial stack had:

- **Rendering tests** (pixel comparison) — detect that something *looks* different, but can't tell you *what* changed in the data or *where* the geometry error is
- **Ad-hoc scripts** — project-specific validators that check one thing, aren't reusable, and produce unstructured output
- **QGIS manual inspection** — requires a human to open a tile, zoom to the problem, and identify the issue visually
- **No CI integration** — tile quality is never gated in pull requests

The gap: **no tool exists that validates vector tile geometry and structure with the same rigour that ESLint validates JavaScript.**

## Decision

Build a dedicated rule-based validation framework for vector tiles and MapLibre style specifications, with:

1. Structured diagnostics (machine-readable, not just print statements)
2. Per-rule configurability (like ESLint's rule system)
3. CI-native execution (exit codes, JSON output)
4. Visual debugging (Inspector shows exact geometry errors on canvas)
5. Plugin architecture (anyone can write custom rules)

## Consequences

**Positive:**
- Tile quality becomes measurable and enforceable
- CI pipelines can gate tile deployments on quality
- Engineers get exact location of geometry errors without manual inspection
- The open-source geospatial community gets a shared vocabulary for tile quality

**Negative:**
- Requires maintaining a rule library that covers real-world tile issues
- Must handle the complexity of MVT's encoding (protobuf, delta coordinates, winding conventions)
- Must avoid false positives on legitimate tile output (Planetiler, OpenMapTiles, Mapbox)

## Alternatives Considered

| Alternative | Why rejected |
|:------------|:------------|
| Extend MapLibre's internal validator | MapLibre validates for rendering, not for data quality; different goals |
| PostGIS `ST_IsValid` checks | Only validates GeoJSON before encoding; can't check encoded tile issues |
| Pixel-diff testing (BackstopJS) | Detects visual changes but can't identify the data-level root cause |
| QGIS validation plugins | Not CI-compatible, not automated, requires GUI |
