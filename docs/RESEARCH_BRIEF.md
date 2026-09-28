# TileGuard Research Brief

## Automated Quality Assurance for Mapbox Vector Tiles

**Shreeharsh Shinde**  
Computer Science, Walchand College of Engineering, Kolhapur, India  
Open-source project · Presented at FOSS4G Hiroshima 2026

**GitHub:** https://github.com/shreeharshshinde/tileguard  
**Documentation:** https://tileguard.dev  
**Presentation:** FOSS4G Hiroshima 2026

---

## 1. Executive Summary

TileGuard is an open-source quality-assurance toolkit for validating Mapbox Vector Tiles (MVT). The project aims to identify structural, geometric, and topological issues in vector-tile data and to make automated validation practical within modern geospatial development and continuous integration (CI) workflows.

**Why MVT matters.** Mapbox Vector Tiles are the dominant encoding for interactive web maps. Every major web-mapping platform — MapLibre GL, Mapbox GL JS, Deck.gl, OpenLayers — renders geographic features from `.pbf` tile files. The global OpenStreetMap dataset, major basemap providers (OpenMapTiles, CARTO, MapTiler), and thousands of enterprise tile pipelines use this format.

**Why QA is difficult.** A source dataset may be geometrically valid before tile generation, yet the transformations involved in producing vector tiles — simplification, quantization, clipping, coordinate projection — can introduce geometric anomalies or alter topological relationships. The MVT encoding also uses a tile-relative integer coordinate grid and a non-standard polygon winding convention that differs from OGC Simple Features. Applying naive validators to MVT tiles produces large volumes of false-positive diagnostics from these intentional encoding behaviors. The problem is not simply "run a geometry validator on tile files" — it requires understanding which diagnostics reflect genuine defects and which reflect encoding artifacts.

**What TileGuard currently does.** TileGuard implements a configurable rule-based validation engine (modeled on ESLint's architecture) with 25 built-in rules across three categories: tile structural/geometric validation (12 rules), performance budgets (4 rules), and MapLibre style specification linting (9 rules). A visual inspection tool, a 12-command CLI, and a CI-native workflow complete the system.

**What has been demonstrated.** Three controlled experiments on a corpus of 294 production vector tiles from three providers have produced quantified results: classification of 148,268 coordinate-range diagnostics into encoding artifacts and genuine errors, classification of 619 self-intersection diagnostics, and verification of decoder fidelity against the Mapbox reference implementation. These experiments yielded evidence-based rule defaults that reduce false positives without suppressing genuine defect detection.

**What remains open.** The relationship between tile-level geometry defects and observable rendering anomalies is not yet empirically established. The defect prevalence at zoom levels z5–z14 is unmeasured. The generalisation of false-positive suppression methodology to the remaining geometry rules has not been tested. Whether the representation-artifact distinction problem is studied in academic literature for tiled geospatial data generally remains an open literature gap.

---

## 2. Problem Background

### 2.1 The Vector Tile Pipeline

Geographic data undergoes substantial transformation on the path from authoritative source databases to rendered web maps:

```
Source Geospatial Data
  (PostGIS, Shapefile, OpenStreetMap PBF)
           ↓
  Coordinate Projection
  (EPSG:4326 → Web Mercator / tile-relative CRS)
           ↓
  Geometry Simplification
  (Douglas-Peucker or equivalent — removes vertices at each zoom level)
           ↓
  Coordinate Quantization
  (Float coordinates → integer grid, typically 4096 × 4096 units per tile)
           ↓
  Geometry Clipping
  (Features clipped to tile bounds, often with an overflow buffer)
           ↓
  Protobuf Encoding
  (Feature geometry packed as draw commands: MoveTo, LineTo, ClosePath)
           ↓
  MVT File (.pbf) → Served by a tile server
           ↓
  Decoded and rendered by MapLibre GL / browser
```

Each transformation introduces potential quality degradation:

- **Simplification** removes vertices. Depending on algorithm and tolerance, this can produce degenerate geometries (polygons with fewer than three distinct vertices), collapse small features, or create self-intersections where previously valid geometries crossed each other after vertex removal.
- **Quantization** snaps float coordinates to an integer grid. Adjacent float coordinates may snap to the same integer position, producing zero-length segments, duplicate adjacent vertices, or collapsed rings.
- **Clipping** cuts features at tile boundaries. Standard tile compilers clip with an overflow buffer (typically 64–80 tile coordinate units) so that features straddling boundaries are not abruptly terminated. This intentionally places coordinates outside the nominal tile extent — a pattern that naive coordinate-range validators flag as errors.
- **Winding convention.** The MVT specification defines clockwise winding for outer rings in screen coordinates (where Y grows downwards). However, major production compilers (Planetiler, OpenMapTiles) emit polygons using OGC/GeoJSON convention (counter-clockwise outer rings in Cartesian coordinates). Renderers (MapLibre GL, Mapbox GL JS) accept both conventions as long as outer and hole rings maintain opposite winding directions within each feature. A validator enforcing rigid spec compliance produces massive false positives on valid OGC-wound tiles; TileGuard addresses this by using **adaptive convention auto-detection** to validate intra-feature topological consistency.

**The core research problem** is that a source dataset may be valid at the source level, while any of the above transformations can introduce defects at the tile level. Conversely, the encoding conventions of MVT make it non-trivial to distinguish genuine geometric defects from intentional encoding behaviors using a naively correct validator.

### 2.2 Why Existing Tooling is Insufficient

The current state of geospatial QA tooling has four concrete failure modes:

1. **Undetected structural defects in tile content.** No standard tooling provides configurable, pluggable validation rules against decoded tile geometry outside of a renderer context.
2. **Undetected semantic errors in style specifications.** Existing JSON Schema validators check structural correctness but cannot express semantic constraints — source references pointing to non-existent sources, zoom range inversions, deprecated property usage.
3. **No CI integration path.** Existing validation tools are either interactive desktop applications or embedding-only libraries with no structured output formats or CI-compatible exit codes.
4. **No shared rule ecosystem.** Every team that needs geospatial validation writes project-specific scripts. There is no plugin model for sharing community-maintained rules across projects.

---

## 3. Existing QA Landscape

The current landscape can be organized into five layers. TileGuard operates at Layer 3 and partially at Layer 4.

### Layer 1 — Source Data Validation

Tools that operate on source geographic data before tile generation.

**PostGIS ST_IsValid / ST_IsValidReason** — Full OGC Simple Features topology validation. Operates in a database context; not applicable post-generation; no CI integration; no tile-specific conventions.

**GEOS / JTS Topology Suite / Shapely** — C/C++, Java, and Python geometry libraries implementing OGC topology models. Powerful for source data; produce high false-positive rates on MVT tiles due to winding convention differences and clipping buffer coordinates.

**Gap:** None of these tools are aware of MVT encoding conventions. Applied directly to decoded tile geometry, they produce false positives on valid tiles.

### Layer 2 — Transformation Validation

**tippecanoe** (Mapbox/Felt) — Generates MVT tiles from GeoJSON; validates encoding during generation. Does not validate tile content post-generation; operates only in the forward direction; no rule engine.

**Gap:** No tooling exists that specifically validates the quality of geometry transformations as a separate step. The relationship between source geometry validity and tile geometry validity is not empirically studied.

### Layer 3 — Tile-Level Validation ← TileGuard operates here

**vector-tile-validate** (Mapbox) — MVT structural conformance (layer presence, feature type codes, protobuf structure). No geometry content validation; no configurable rules; no CI integration.

**vtvalidate** (Mapbox) — PBF syntax and spec conformance. Limited to structural rules; no geometry content rules; no plugin architecture.

**TileGuard** — Configurable rule-based validation of decoded tile geometry and content. Currently the only tool that validates decoded polygon topology (winding, hole containment, self-intersection) in the MVT-specific context with false-positive suppression for encoding artifacts.

**Gap:** The classification of tile-level diagnostics into genuine defects vs. encoding artifacts is not formally studied. TileGuard's Phase 1 and Phase 2 investigations are the first quantified attempt at this classification on production tiles.

### Layer 4 — Cross-Tile Validation ← Partially addressed (experimental)

TileGuard's comparison engine (`@tileguard/analysis`) can compare tile contents across a zoom-level sequence and detect regression when tiles are re-generated. This is experimental and the methodology is not yet formally defined.

**Gap:** Cross-tile geometric continuity (whether features spanning tile boundaries are correctly joined) is not addressed by any available tooling.

### Layer 5 — Rendering/Service Validation

**MapLibre GL render tests / Playwright** — Golden-image pixel comparison or browser screenshot automation. Can detect that a map looks different but cannot identify the source of the difference; no semantic knowledge of tile content.

**Gap:** The relationship between tile-level geometry defects (detected by TileGuard) and observable rendering anomalies (detected by pixel comparison) is not established. Whether a self-intersecting polygon produces a visible rendering error in MapLibre GL is not empirically measured.

---

## 4. TileGuard Architecture

### 4.1 System Overview

TileGuard is implemented as a TypeScript monorepo with nine packages. Dependencies flow strictly inward: the core package has zero runtime dependencies.

```
Artifact (.pbf tile or .json style)
           ↓
    Provider (loads and decodes the artifact; normalises to domain model)
           ↓
    Rule Engine (core)
    ├── tile/required-layers     ├── tile/self-intersection
    ├── tile/winding-order       ├── tile/hole-containment
    ├── perf/tile-size           ├── style/valid-json
    └── ... (25 rules total)
           ↓
    Diagnostics (structured: ruleId, severity, message, location, suggestion)
           ↓
    Reporter (text, JSON, SARIF, Markdown, HTML report)
           ↓
    CI / Automated QA (exit code 0 or 1)
```

**Architectural principle:** Rules never print. Reporters never validate. Adding a rule does not touch reporting code. Adding a reporter does not touch validation code. This separation is deliberately modeled on ESLint's architecture, adapted for the geospatial domain.

### 4.2 Package Structure

| Package | Purpose |
|:--------|:--------|
| `@tileguard/core` | Framework contracts: Diagnostic, Artifact, Rule, Plugin, Reporter, Engine (zero runtime dependencies) |
| `@tileguard/shared` | Monorepo utility package shell (reserved for shared cross-package type contracts) |
| `@tileguard/tile-rules` | MVT provider + 12 tile validation + 4 performance rules |
| `@tileguard/style-rules` | Style provider + 9 MapLibre style lint rules |
| `@tileguard/config` | Config file discovery, preset resolution, and schema validation |
| `@tileguard/reporters` | Text, JSON, SARIF v2.1.0 reporters + HTML report engine |
| `@tileguard/analysis` | Comparison, feature matching, and geometry regression engine (`FeatureMatcher`, `GeometryDiffer`, `PropertyDiffer`) |
| `@tileguard/cli` | 12 operational CLI commands (`analyze`, `check`, `compare`, `doctor`, `hook`, `init`, `profile`, `report`, `rules`, `stats`, `style`, `version`) |
| `@tileguard/inspector` | Visual debugging environment (Vite + React + MapLibre GL) |

### 4.3 Rule Interface

A rule is a plain TypeScript object with no base classes. Any object implementing this interface integrates with the engine, CLI, and all reporters without modification:

```typescript
export const noEmptyRule: Rule = {
  id: 'tile/no-empty',
  meta: {
    description: 'Reports tiles with zero features.',
    defaultSeverity: 'warning',
    recommended: true,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    const tile = context.artifact.content;
    const totalFeatures = Object.values(tile.layers)
      .reduce((sum, layer) => sum + layer.length, 0);
    if (totalFeatures === 0) {
      context.report({ message: 'Tile has no features.' });
    }
  },
};
```

---

## 5. Current Capabilities

### 5.1 Implementation Status

| Category | Rule | What It Detects | Status |
|:---------|:-----|:----------------|:-------|
| **Tile — Structural** | `tile/required-layers` | Missing expected layer names | Implemented |
| | `tile/required-properties` | Features missing declared property fields | Implemented |
| | `tile/no-empty` | Tiles with zero features | Implemented |
| | `tile/feature-count` | Total feature count outside configured bounds | Implemented |
| | `tile/layer-feature-count` | Per-layer feature count outside bounds | Implemented |
| **Tile — Geometry** | `tile/coordinate-range` | Coordinates outside tile extent (configurable buffer) | Implemented |
| | `tile/unclosed-ring` | Polygon rings where first vertex ≠ last vertex | Implemented |
| | `tile/zero-area-ring` | Polygon rings with zero or near-zero computed area | Implemented |
| | `tile/degenerate-geometry` | Lines with < 2 vertices; polygons with < 3 distinct vertices | Implemented |
| | `tile/winding-order` | Polygon ring winding direction (MVT-aware: CW outer, CCW holes) | Implemented |
| | `tile/hole-containment` | Polygon holes geometrically outside their outer ring | Implemented |
| | `tile/self-intersection` | Non-adjacent ring segments that cross each other (4-guard algorithm) | Implemented |
| **Performance** | `perf/tile-size` | Raw and gzip-compressed tile byte size exceeding budget | Implemented |
| | `perf/vertex-budget` | Per-feature or tile-level vertex count exceeding limit | Implemented |
| | `perf/feature-density` | Per-layer feature count exceeding configured maximum | Implemented |
| | `perf/layer-size` | Single layer dominating the tile's vertex budget | Implemented |
| **Style — Structural** | `style/valid-json` | Style file is not valid JSON | Implemented |
| | `style/version` | MapLibre style version field is not `8` | Implemented |
| | `style/sources-present` | Missing top-level `sources` object | Implemented |
| | `style/layers-present` | Missing top-level `layers` array | Implemented |
| **Style — Semantic** | `style/layer-id-required` | Layers without an `id` field | Implemented |
| | `style/unique-layer-id` | Duplicate layer IDs | Implemented |
| | `style/known-source` | Layers referencing sources not declared in `sources` | Implemented |
| | `style/zoom-range` | `minzoom` greater than `maxzoom` | Implemented |
| | `style/no-deprecated-ref` | Usage of deprecated `ref` property | Implemented |
| **Cross-tile continuity** | — | Features spanning tile boundaries | **Not addressed** |
| **Source → Tile degradation** | — | Geometry quality change during tile generation | **Not addressed** |
| **Render correlation** | — | Whether detected defects produce rendering anomalies | **Not addressed (open research)** |

### 5.2 CLI Workflows & CI Integration

TileGuard provides a 12-command CLI interface built for both local developer debugging and automated continuous integration pipelines:

- **`tileguard check <tiles...>`** — Runs configured rules against vector tiles or directories, exiting with code `0` on clean builds or `1` on error-level diagnostics.
- **`tileguard profile <tiles...>`** — Generates detailed performance metrics, vertex density breakdowns, and raw vs. gzip tile size budgets across layers.
- **`tileguard hook <install|status|uninstall>`** — Installs native Git pre-commit or pre-push hooks to catch invalid vector tiles or style specifications before code is committed.
- **`tileguard style <style.json>`** — Lints MapLibre GL JSON style specifications against structural and semantic rules.
- **`tileguard compare <tileA> <tileB>`** — Compares geometric and property differences between tile versions using `@tileguard/analysis`.
- **SARIF v2.1.0 Integration** — Generates Static Analysis Results Interchange Format (SARIF) reports via `tileguard check --reporter sarif`, enabling direct upload to GitHub Code Scanning to render vector-tile quality findings natively inside GitHub Pull Requests.

### 5.3 Visual Debugging Suite (`@tileguard/inspector`)

TileGuard includes a browser-based visual debugging application containing 10 interactive inspection modules:

- **Feature & Layer Explorer** — Renders raw MVT command stacks, integer grid coordinates, and property key-value maps.
- **Diagnostics Overlay** — Maps detected geometric and topological errors directly onto an interactive MapLibre map surface.
- **Performance Heatmaps & Vertex Profiler** — Visualizes vertex density distribution and per-layer byte sizes to spot bloated tiles.
- **Tile Version Comparison Engine** — Graphically compares tile revisions, highlighting added, deleted, or shifted geometries.
- **Style Explorer** — Interactively browses MapLibre JSON style layers and flags broken source references or zoom range inversions.
- **Presentation Mode (FOSS4G)** — Dedicated interactive view designed for live demonstration of vector-tile validation findings.

### 5.4 Explicit Limitations

- **No cross-tile boundary validation.** TileGuard validates individual tiles independently. Geometric consistency at tile seams is not checked.
- **No source-level comparison.** TileGuard has no mechanism to compare a source geometry against its tile-encoded form to quantify transformation-introduced degradation.
- **No render correlation.** TileGuard identifies defects in tile data but does not determine whether those defects produce visible rendering anomalies.
- **No semantic feature-attribute validation.** TileGuard does not validate that the *values* of feature properties are semantically correct for a given schema.

---

## 6. Experimental Evidence

Three controlled experiments have been conducted on production tile data. The experiment log (`docs/research/EXPERIMENT_LOG.md`) contains full methodology, raw data references, and conclusions.

### EXP-001 — Decoder Cross-Validation

**Question:** Does TileGuard's PBF decoder produce identical results to the Mapbox reference implementation?

**Dataset:** 562 features across 13 layers from production tiles (OpenMapTiles, OpenFreeMap, CARTO Streets).

**Method:** Decoded the same tiles with both TileGuard's internal decoder and `@mapbox/vector-tile` (Mapbox reference library). Compared five dimensions per feature: x, y, type, vertex count, properties.

| Metric | Result |
|:-------|:-------|
| Features compared | 562 |
| Dimensions per feature | 5 |
| Divergences | **0** |

**Conclusion:** Decoder artifacts are eliminated as a source of downstream diagnostic variance. All subsequent experiments operate on decoder-verified data.

---

### EXP-002 — Coordinate-Range False-Positive Classification

**Question:** Are coordinate-range diagnostics on production z0–z4 tiles genuine data errors or encoding artifacts?

**Dataset:** 294 cached production tiles, z0–z4 (OpenMapTiles: 94; OpenFreeMap: 100; CARTO Streets: 100).

**Starting state:** `tile/coordinate-range` with default parameters → 148,268 diagnostics across 294 tiles.

**Method:** Extracted all flagged coordinate offsets; computed magnitude distributions and direction histograms; performed cross-provider identity verification on 28,679 features appearing in ≥2 providers; tested three hypotheses.

| Hypothesis | Status | Evidence |
|:-----------|:-------|:---------|
| Geometry clipping buffer (intentional) | **Confirmed** | Bimodal offset distribution; p95 = 80 units; consistent with two known tile compiler buffer values (64 and 80) |
| Coordinate wrap-around | Rejected | Offset direction balance symmetric; no concentration at modulus boundary |
| Decoder bug | Eliminated | EXP-001 — 0 divergences |

**Classification result:**

| Category | Count | % | Geometry Types |
|:---------|------:|--:|:---------------|
| Geometry clipping buffer artifacts | 84,324 | 56.9% | Polygon, LineString |
| Cross-tile label duplication artifacts | 63,944 | 43.1% | Point only |
| **Total** | **148,268** | **100%** | |

**Post-fix result:** After implementing evidence-based defaults (buffer=80; excluded label layers), `tile/coordinate-range` produced **0 diagnostics** on the full 294-tile corpus. No genuine defects were found for this rule in the z0–z4 corpus.

**Implication:** A naively configured coordinate-range validator would produce 148,268 false-positive alerts on this corpus. Understanding the clipping buffer convention and label duplication behavior is a prerequisite for useful coordinate-range validation.

---

### EXP-003 — Self-Intersection False-Positive Classification

**Question:** Which self-intersection diagnostics on production z0–z4 tiles are genuine topological crossings, and which are algorithmic artifacts?

**Dataset:** Same 294-tile corpus. Starting diagnostic count (self-intersection only): 619.

**Method:** Extracted all 619 flagged ring geometries; classified by visual and algorithmic inspection; designed four algorithmic suppression guards; re-ran benchmark.

**Classification result (4-Way Diagnostic Taxonomy):**

| Category | Cause / Description | Count | % | Classification |
|:---------|:--------------------|------:|--:|:---------------|
| **Cat B2** | Closed LineString closure skip: Naïve checker compared $P_0$ and $P_{N-1}$ at closure point | 282 | 45.6% | **Checker implementation error** |
| **Cat A** | Duplicate-vertex quantization spike: Integer grid snapping ($P_i = P_{i+1}$) | 161 | 26.0% | **Quantization artifact** |
| **Cat B1** | Genuine topological crossing: Non-adjacent segment crossing in tile geometry | 170 | 27.5% | **Genuine defect** |
| **Cat C** | Collinear overlap at closing pair | 6 | 1.0% | **Checker implementation error** |
| **Total** | | **619** | **100%** | |

**Diagnostic breakdown:**
- **46.5% Checker Errors (288 diagnostics):** Resolved by Guard 2 (skip closure pair on closed loops).
- **26.0% Quantization Artifacts (161 diagnostics):** Resolved by Guard 3 (duplicate-vertex pre-scan skip).
- **27.5% Genuine Defects (170 diagnostics):** Preserved 100% without false suppression across the 294-tile corpus.

**Methodological hardening (EXP-003b — Planned):**
To eliminate circular ground-truth labeling bias (where manual/algorithmic trace inspection by the author was used as oracle), all 619 extracted ring geometries will be evaluated against **GEOS / JTS / Shapely as an automated, independent external oracle** to quantify exact algorithm-to-oracle agreement.

**Key observation (EXP-004):** A z14 Tokyo tile was confirmed by TileGuard to contain one genuine self-intersection in the `transportation` layer. The tile renders correctly in MapLibre at all tested zoom levels. This is the central open empirical question: whether detected geometric defects produce observable rendering anomalies.

---

## 7. FOSS4G Hiroshima 2026

TileGuard was presented at FOSS4G 2026 in Hiroshima, Japan — the primary international conference for open-source geospatial software (established 1995; held annually by OSGeo) — in August 2026.

**What was demonstrated:** A live demo of the TileGuard Inspector web application: tile loading and visualization (Feature Explorer), diagnostic display with geographic overlay (Diagnostics tab), and the CLI producing structured JSON output, with a GitHub Actions workflow snippet showing CI integration.

**Framing used:** *"Map tile bugs are silent. They survive code review and surface when users report them. TileGuard is ESLint for vector tiles."*

**What the presentation established:** External technical exposure to the geospatial practitioner community, including tile pipeline engineers, open-source data providers, and GIS software developers. The conference context provided access to practitioners with direct knowledge of production tile pipeline challenges.

**Technical questions raised:** Practitioners asked about support for raster tiles, PMTiles format compatibility, integration with Planetiler (a high-performance MVT generator), and whether TileGuard's validation methodology could extend to 3D tiles (Cesium 3D Tiles format). These questions indicate the scope boundaries and potential generalization directions.

**What the presentation demonstrated about the problem:** Audience recognition of the problem was immediate. The "ESLint for vector tiles" framing resonated because the absence of configurable automated QA tooling for the geospatial stack is broadly recognized as a gap by practitioners. This provides qualitative evidence for the problem's practical significance.

---

## 8. Literature Survey (Preliminary)

The following is a preliminary mapping of the existing tool and paper landscape, organized by layer. A formal literature search on academic databases (ACM DL, IEEE Xplore, ISPRS Archives, MDPI IJGI) has not yet been completed. The table below reflects tool-level knowledge from practitioner sources.

### 8.1 Vector Tile Tooling

| Tool | What It Does | Gap vs. TileGuard |
|:-----|:------------|:------------------|
| tippecanoe (Mapbox/Felt) | Generates MVT from GeoJSON; validates encoding during generation | Post-generation audit; no geometry content validation after encoding |
| vector-tile-validate (Mapbox) | MVT structural conformance (layers, feature type codes) | No geometry content rules; no configurable severity; no CI integration |
| vtvalidate (Mapbox) | PBF syntax and spec conformance | Same as above |
| mbutil, vt-pbf | Tile packaging/encoding utilities | No validation component |

**Identified gap:** None of the above tools validate decoded geometry for spatial validity (self-intersection, winding order, hole containment, degenerate rings). They operate at the encoding/structural level, not the geometry-content level.

### 8.2 Geospatial Geometry Validation

| Tool | What It Does | Gap vs. TileGuard |
|:-----|:------------|:------------------|
| PostGIS ST_IsValid | OGC topology validation in database | Database context; wrong winding convention for MVT |
| GEOS / JTS / Shapely | Geometry libraries implementing OGC topology | Same winding convention issue; GeoJSON/WKB input, not MVT |
| Turf.js kinks() | Self-intersection detection for GeoJSON LineStrings | GeoJSON only; no MVT encoding awareness |

**Identified gap:** These tools apply OGC Simple Features conventions. Applied to MVT tiles, they produce false positives from the winding convention difference and clipping buffer coordinates. This is empirically confirmed by EXP-002 (148,268 coordinate-range false positives) and EXP-003 (72.5% self-intersection false-positive rate before suppression guards).

### 8.3 Rendering-Level QA

| Tool | What It Does | Gap vs. TileGuard |
|:-----|:------------|:------------------|
| MapLibre GL render tests | Golden-image pixel comparison for rendering | Tests rendered output; cannot explain which tile/feature/geometry caused a visual difference |
| Playwright / Puppeteer | Browser automation screenshot comparison | No semantic knowledge of tile content; brittle; expensive |

**Identified gap:** Rendering tests can detect that a map looks different but cannot identify the source of the difference. TileGuard targets the explanatory layer. The empirical connection between TileGuard diagnostic and rendering anomaly is an open research question.

### 8.4 Software Quality / Linting Architecture

TileGuard's rule-engine architecture draws directly from the software quality tooling tradition:

| System | Relevance |
|:-------|:----------|
| ESLint | Direct architectural model: isolated rules, configurable severity, plugin system, structured diagnostics |
| Biome / oxlint | Shows the rule-engine pattern scales to high-performance implementations |
| SonarQube | Rule-engine pattern at the platform level |

### 8.5 Prior Art & What Is NOT Claimed as a Contribution

To maintain strict scientific integrity, the following areas are recognized as **established prior art and explicitly disclaimed as novel contributions**:

- **Single-geometry spatial validity** (self-intersection, ring closure, hole containment): Standardized by OGC Simple Features Access (SFA) and ISO 19107; maturely implemented in GEOS, JTS, and PostGIS (`ST_IsValid`).
- **Cross-feature topological relationships** (overlaps, adjacency, disjointness): Formalized by the DE-9IM model (Clementini et al. 1993).
- **Polygon repair algorithms and ambiguity**: Studied extensively by van Oosterom et al. (2005) and Ledoux et al. (2014), demonstrating that automated geometry repair tools frequently disagree on topological resolutions.
- **Numerical robustness of geometric predicates**: Solved by Shewchuk (1996/1997) adaptive precision arithmetic and robust integer DE-9IM predicate frameworks (Romanschek et al. 2021).
- **Rule-engine architecture for vector data QA**: Software implementations exist (1Integrate, GeoLint, oxigdal-qc); rule-engine architecture itself is an engineering pattern, not a theoretical contribution.

---

## 9. Defensible Research Scope

### 9.1 Plausibly Novel Contribution Boundary

Across preliminary searches, no peer-reviewed literature has addressed:
1. **An empirical, quantified classification of geometry-validator diagnostics on production Mapbox Vector Tiles into representation-induced encoding artifacts versus genuine defects.**
2. **The empirical relationship between tile-level geometric defects and observable web rendering anomalies in MapLibre GL.**

### 9.2 The Gap Register (Self-Audit Summary)

| ID | Category | Gap Description | Severity | Remediating Action |
|:---|:---------|:----------------|:---------|:-------------------|
| **A1** | Novelty | Rule-engine architecture claimed as unaddressed gap | **High** | Restrict novelty strictly to MVT empirical diagnostic classification |
| **A3** | Scope | Broad question ("tiled geospatial data generally") | **High** | Narrow scope specifically to MVT vector geometry diagnostics |
| **B1** | Technical | Winding order described as non-standard | **High** | Document as MVT Spec (Screen CW) vs. Production Compiler Practice (OGC CCW) |
| **C1** | Method | "72.5% FP" conflated multiple distinct causes | **High** | Adopt 4-way taxonomy: (1) Checker error, (2) Quantization artifact, (3) Spec-permitted convention, (4) Genuine defect |
| **C2** | Method | Circular ground truth (author trace inspection) | **High** | Run **GEOS / Shapely / JTS** as an automated, independent external oracle (EXP-003b) |
| **C3** | Method | No recall measurement (only FP counted) | **High** | Execute synthetic defect injection experiment (EXP-009) to measure precision and recall |
| **D1** | Corpus | "Format-wide" generalization claim from z0–z4 | **High** | Re-frame to "three production pipelines at low zoom" until higher zooms are sampled |

---

## 10. Proposed Research Direction

### 10.1 Overarching Research Question (Narrowed & Defensible)

> *For Mapbox Vector Tiles produced by production pipelines, what fraction of geometry-validator diagnostics are encoding artifacts versus genuine data defects, what transformation mechanisms produce them, and to what extent do genuine defects produce observable rendering anomalies in web map engines?*

### 10.2 Supporting Research Questions

**RQ1 — Diagnostic Taxonomy & Mechanisms**
> What proportion of geometry diagnostics on production vector tiles represent implementation errors of naïve validators, quantization artifacts, spec-permitted encoding conventions, or genuine topological defects?

**RQ2 — Independent Oracle Verification**
> What is the exact agreement rate between TileGuard's MVT-hardened suppression guards and standard OGC Simple Features validation oracles (GEOS / Shapely)?

**RQ3 — Source-to-Render Relationship**
> Do genuine geometry defects confirmed at the tile level produce observable rendering anomalies in MapLibre GL JS, and under what conditions does rendering remain visually artifact-free?

**RQ4 — Zoom Level Generalization**
> How do defect prevalence and diagnostic classification ratios change across zoom levels (z0–z4 vs. z5–z14)?

### 10.3 8-Week Research Execution Plan

```
Phase 1: Correct & Re-Frame (Weeks 1–2)
├── Verify compiler provenance (Tippecanoe, Planetiler, CARTO)
├── Re-frame winding order (MVT Spec vs. Compiler Practice)
└── Update research dossier & proposal claims [COMPLETED]

Phase 2: Methodological Strengthening (Weeks 2–4)
├── EXP-003b: Run GEOS / Shapely independent oracle on all 619 extracted rings
├── Formalize 4-way diagnostic taxonomy reporting
├── EXP-009: Synthetic defect injection to evaluate Guard Precision & Recall
└── EXP-006: Apply diagnostic classification to remaining 10 tile rules

Phase 3: Extended Corpus & Rendering Experiments (Weeks 4–6)
├── EXP-008: Extend tile corpus to z5–z14 tiles (city/neighborhood scale)
├── Trace genuine defects back to source OSM features
└── EXP-007: Headless MapLibre GL rendering experiment on confirmed defect tiles

Phase 4: Academic Packaging (Weeks 6–8)
├── Conduct formal systematic database search (ACM DL, IEEE Xplore, ISPRS, MDPI)
├── Finalize 2–3 page research proposal
└── Initiate contact with university geospatial research laboratories
```

---

## 11. About the Author

**Shreeharsh Shinde**  
Computer Science graduate, Walchand College of Engineering, Kolhapur, India.

Interests: geospatial computing, spatial data quality, automated validation, open-source software, and research-oriented software engineering.

**Open-source contributions:**
- **TileGuard** — creator and primary contributor (this project)
- **MapLibre GL JS** — contributions to the primary open-source web mapping renderer
- **Astropy** — contributions to the Python astronomy package
- **Kubeflow Pipelines** — contributions to the ML workflow platform

**Conference:** Presented TileGuard at FOSS4G Hiroshima 2026, the primary international conference for open-source geospatial software (est. 1995; held annually by OSGeo).

**GitHub:** https://github.com/shreeharshshinde  
**Project:** https://github.com/shreeharshshinde/tileguard

---

## Appendix A — Evidence Inventory

| Evidence Item | Type | Status | Location |
|:-------------|:-----|:-------|:---------|
| EXP-001: Decoder cross-validation | Quantitative benchmark | Complete | `analysis/phase1-coordinate-range/decoder-crosscheck.json` |
| EXP-002: Coordinate-range classification | Diagnostic classification | Complete | `analysis/phase1-coordinate-range/` |
| EXP-003: Self-intersection classification | Diagnostic classification | Complete | `analysis/phase2-self-intersection/` |
| EXP-003b: GEOS independent oracle validation | Methodological hardening | Planned | `analysis/phase2-self-intersection/` |
| EXP-004: Tokyo z14 self-intersection | Case study | Complete | `docs/foss4g/REAL_WORLD_FINDING.md` |
| EXP-005: Benchmark baseline (5-run) | Performance measurement | Complete | `analysis/phase2-self-intersection/step5-benchmark-after.jsonl` |
| EXP-006: Remaining rules on 294-tile corpus | Planned | **Not yet run** | — |
| EXP-007: Headless render correlation | Planned | **Not yet run** | — |
| EXP-008: z5–z14 corpus extension | Planned | **Not yet run** | — |
| EXP-009: Synthetic known-defect injection | Precision/Recall benchmark | Planned | `fixtures/synthetic/` |
| Academic literature search | Systematic query | Planned | — |

---

## Appendix B — Key Metrics (Current)

| Metric | Value | Source |
|:-------|:------|:-------|
| Rules implemented | 25 | `packages/tile-rules`, `packages/style-rules` |
| CLI commands | 12 | `packages/cli` |
| Unit & integration test cases | 899 | `pnpm test` (vitest pass) |
| Production tiles analyzed | 294 | `docs/research/EXPERIMENT_LOG.md` |
| Providers sampled | 3 (OpenMapTiles, OpenFreeMap/Planetiler, CARTO Streets) | EXP-002 |
| Zoom levels covered | z0–z4 | EXP-002, EXP-003 |
| Initial coordinate-range diagnostics | 148,268 | EXP-002 |
| Post-fix coordinate-range diagnostics | 0 | EXP-002 |
| Initial self-intersection diagnostics | 619 | EXP-003 |
| Checker implementation errors suppressed | 288 (46.5%) | EXP-003 (Cat B2 + C) |
| Quantization artifacts suppressed | 161 (26.0%) | EXP-003 (Cat A) |
| Genuine self-intersections confirmed | 170 (27.5%) | EXP-003 (Cat B1) |

---

## 13. Living Research Progression & Audit Log

This section records the chronological progression, self-audits, and methodological updates of the TileGuard research project.

### Audit Entry 001 — Pre-Research Gap Assessment (September 2026)

- **Audit Trigger:** Comprehensive review of initial research framing and experimental claims prior to academic outreach.
- **Key Vulnerabilities Identified:**
  1. *Circular Ground Truth:* EXP-003 ring classification relied on manual/algorithmic trace inspection by the author rather than an independent external oracle.
  2. *Conflated Diagnostic Causes:* The initial "72.5% false positive" statistic grouped naive validator errors (closure pair comparison) together with quantization artifacts and encoding conventions.
  3. *Overbroad Novelty Claim:* Claiming rule-engine architecture as an unaddressed gap ignored existing vector quality tools (GeoLint, 1Integrate).
  4. *Winding Order Framing:* Framed winding order as an MVT-vs-OGC violation without acknowledging that production compilers (Planetiler, OpenMapTiles) intentionally emit OGC convention and renderers accept it.
- **Corrective Actions Integrated into Research Dossier:**
  - Narrowed overarching research question strictly to MVT geometry diagnostic classification and rendering impact.
  - Adopted the **4-Way Diagnostic Taxonomy** (Checker Error, Quantization Artifact, Spec-Permitted Convention, Genuine Defect).
  - Commissioned **EXP-003b** (GEOS/Shapely independent oracle validation) and **EXP-009** (Synthetic defect injection for Precision/Recall).
  - Adopted the 8-Week Research Execution Plan.

---

*Document version: September 2026 (Living Research Brief)*  
*Technical documentation: https://tileguard.dev*  
*Source code and experiments: https://github.com/shreeharshshinde/tileguard*
