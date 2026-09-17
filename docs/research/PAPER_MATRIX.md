# TileGuard — Paper Matrix

**Created:** September 2026  
**Purpose:** Position TileGuard against existing work. Identify what has been done, what gap TileGuard occupies, and where claims of novelty are supportable. No claim here should be made to a professor before reading the actual paper.

**Rule:** Every row is either (a) a paper I have read, or (b) a paper identified as relevant that I have not yet read. The "read" column is honest.

---

## 1. How to Read This Matrix

For each related work, I ask three questions:

1. **What does it do?** — The actual technical approach, not the title.
2. **What does it not do that TileGuard does?** — The specific gap.
3. **What does it do that TileGuard does not?** — Where I am weaker.

The matrix is for finding the honest gap, not for making TileGuard look better than it is.

---

## 2. Research Vision vs. Empirical Scope

These are not the same thing and the distinction matters when talking to a professor.

**Research vision (broad):** Automated quality assurance of tiled geospatial data as a general class of problem. This includes MVT, raster tiles, PMTiles, and any representation where spatial data is partitioned, encoded, and consumed by a renderer. The question at this level is whether meaningful QA abstractions exist that are independent of representation, and where representation-specific validation becomes unavoidable.

**Empirical scope (current):** MVT only. All existing experiments (EXP-001–005) use MVT tiles from three providers, z0–z14. All 12 tile rules operate on decoded MVT geometry. This is the evidence base.

The claim to a professor is not "I have built a general tiled-data QA system." It is: "I used MVT as the first concrete representation to study automated tiled-data QA, and discovered that the key methodological challenge is distinguishing genuine geometry defects from representation-induced artifacts — a distinction that is likely to recur in any tiled format."

**The current provisionally-identified gap (to be refined by literature):**

> Tools for vector tile quality operate either at the encoding level (is the PBF well-formed?) or at the rendering level (does the map look correct?). There is no published system that operates at the geometric content level — checking the correctness of decoded geometry against spatial validity rules, in a CI-native, configurable rule-engine architecture, with explicit treatment of representation-induced artifacts (clipping buffers, integer-grid quantization, cross-tile duplication). The broader question — whether this pattern generalises across tiled geospatial representations — has not, to our current knowledge, been studied.

Both parts of this claim require Category 0 and Category E literature to either confirm or refute. The second part (generalisation) is a framing hypothesis, not an assertion.

---

## 3. Related Work Categories

### Category 0 — Tiled Geospatial Data Quality (General)

**Purpose of this category:** Before searching MVT-specific literature, determine whether there is existing research that treats tile QA as a general problem — across raster tiles, vector tiles, 3D tiles, or any partitioned spatial data format. The purpose is not to immediately expand TileGuard's scope; it is to understand whether there is a generalisable research abstraction underneath the MVT work, and to position TileGuard's contribution accurately.

**Search terms to use (not yet executed):**
- "tiled geospatial data quality"
- "map tile validation" (not MVT-specific)
- "tile generation quality assurance"
- "raster tile quality" AND "validation"
- "geospatial data quality" AND "web map"
- "representation-specific" AND "geospatial quality"
- "spatial data quality" AND "tiling"
- OGC tile standards (WMTS, TileMatrixSet) AND "conformance"

**Venues:** ISPRS, ACM SIGSPATIAL, Transactions in GIS, Computers & Geosciences, FOSS4G proceedings, OGC working group documents.

| Work | What it covers | Relation to TileGuard | Read? |
|:-----|:---------------|:----------------------|:-----:|
| *Not yet found* | General tile QA across representations | Would establish whether our problem is novel at the abstraction level | No |
| *Not yet found* | Raster tile quality / validation | Would establish the raster analogue | No |
| *Not yet found* | OGC conformance testing for tile services | Would establish the standards landscape | No |
| *Not yet found* | Representation-specific encoding artifacts in geospatial data | Would directly address the artifact-vs-defect distinction | No |

**What this category should answer:**  
1. Is "automated QA of tiled geospatial data" a studied research area, or is this an unsearched gap?  
2. If studied, does existing work treat different tile representations separately, or generalise across them?  
3. Does any existing work describe the representation-induced artifact problem (things a generic validator flags that are intentional encoding behaviors)?

**Status: Not searched. Highest priority literature gap.**

---

### Category A — Vector Tile Tooling

These tools directly handle .pbf / MVT files.

| Tool / Paper | What it does | What it misses (vs TileGuard) | Where it is stronger | Read? | Source |
|:-------------|:-------------|:------------------------------|:---------------------|:-----:|:-------|
| **tippecanoe** (Mapbox) | Generates MVT tiles from GeoJSON; validates encoding during generation | Post-generation audit; no rule engine; no CI output format; no geometry validity checks after encoding | Operates on source data before tiling; handles projection | No | github.com/felt/tippecanoe |
| **vector-tile-validate** (Mapbox) | Checks MVT structural conformance (layers, features, geometry type codes) | No geometry content validation (winding, self-intersection, area); no configurable rules; no CI integration story | Checks the PBF binary structure | No | github.com/mapbox/vector-tile-validate |
| **mbutil / mb-util** | Unpacks MBTiles; no validation | No validation at all | Handles tile packaging layer | No | github.com/mapbox/mbutil |
| **vt-pbf** | Encodes GeoJSON → PBF | No validation | Encoding reference | No | github.com/nickcoutsos/vt-pbf |
| **vtvalidate** | Validates PBF syntax, checks spec conformance | Limited to spec structural rules; no geometry content rules; no plugin architecture | Lighter weight, faster for structural-only checks | No | github.com/mapbox/vtvalidate |

**Gap identified:** None of the above check decoded geometry for spatial validity (self-intersection, winding order, hole containment, degenerate rings). They operate at the encoding/structural level, not the geometry-content level.

---

### Category B — Geospatial Geometry Validation

These tools validate geometry, but not in the vector tile context.

| Tool / Paper | What it does | What it misses (vs TileGuard) | Where it is stronger | Read? | Source |
|:-------------|:-------------|:------------------------------|:---------------------|:-----:|:-------|
| **PostGIS ST_IsValid / ST_IsValidReason** | OGC geometry validation on PostGIS features | Operates in a database; no CI integration; no tile-level context; no rule engine; no renderer-specific convention awareness (MVT winding vs OGC CCW) | Full OGC topology validation, spatial index, SQL integration | No | postgis.net |
| **GEOS (library)** | C/C++ geometry library; isValid(), buffer(), union() | No tile context; no configurable rules; no diagnostic output format | Underlying library behind PostGIS, Shapely; full topology model | No | libgeos.org |
| **Turf.js kinks()** | Detects self-intersections in GeoJSON LineStrings | GeoJSON only (not MVT); no integration with tile pipeline; no configurable rules | Established library used by many; GeoJSON-native API | No | turfjs.org/docs/kinks |
| **JTS Topology Suite** | Full topological model for Java; isValid(), topology checks | No MVT integration; Java ecosystem; no rule-engine pattern | Most complete OGC topology implementation | No | locationtech.github.io/jts |
| **Shapely (Python)** | Python geometry library wrapping GEOS; is_valid, explain_validity | No MVT; no CI integration | Python ecosystem; quick prototyping | No | shapely.readthedocs.io |

**Gap identified:** These tools operate on generic geometry (GeoJSON, WKB, WKT). None handle MVT-specific conventions: the integer coordinate grid, the tile extent model, the clipping buffer convention, the CW/CCW winding convention that differs from GeoJSON/OGC, or the cross-tile label duplication behavior. TileGuard's Phase 1 and Phase 2 investigations were required precisely because naive application of generic geometry validators to MVT tiles produces overwhelming false positives from these conventions.

---

### Category C — MapLibre / Web Rendering Quality

These address rendering quality but not at the source data level.

| Tool / Paper | What it does | What it misses (vs TileGuard) | Where it is stronger | Read? | Source |
|:-------------|:-------------|:------------------------------|:---------------------|:-----:|:-------|
| **MapLibre GL JS test suite** | Unit and integration tests for the renderer | Tests renderer code correctness, not source data quality | Tests rendering behavior; browser-native | No | github.com/maplibre/maplibre-gl-js |
| **Mapbox GL render tests** | Golden-image pixel comparison for rendering | Tests renderer, not tile content; requires pixel-level setup | Established rendering regression baseline | No | github.com/mapbox/mapbox-gl-js/tree/main/test/render |
| **Storybook + Chromatic (visual regression)** | Component-level visual regression | UI components, not maps; no tile content validation | Mature visual regression tooling | No | chromatic.com |
| **Playwright / Puppeteer screenshot tests** | Browser automation for visual comparison | No semantic knowledge of tile content; pixel-only; brittle | General purpose; many integrations | No | playwright.dev |

**Gap identified:** Rendering tests catch what a rendered map looks like differently, but cannot explain why. They have no knowledge of which tile, which layer, which feature, or which geometry property caused the visual difference. TileGuard targets the explanatory layer: identifying structural or geometric defects in source data that can explain rendering anomalies. The connection between tile diagnostics and rendering anomalies is an open research question (EXP-007, EXP-010).

---

### Category D — Software Quality / Linting Research

These are the conceptual precedents for TileGuard's architecture.

| System | What it does | Relevance to TileGuard |
|:-------|:-------------|:-----------------------|
| **ESLint** (Zakim 2013+) | AST-based rule engine for JavaScript; configurable rules, severity levels, plugins | Direct architectural inspiration. TileGuard applies the same pattern to vector tiles. |
| **Biome / oxlint** | High-performance JavaScript linters | Shows the pattern scales; no geospatial relevance |
| **SonarQube** | Static analysis platform; configurable rules; CI integration | Same pattern at the platform level; no geospatial relevance |
| **Checkstyle / PMD** | Java static analysis tools | Original rule-engine precedents |

**Literature to review:**  
- "Pluggable Checking and Abstraction Interpretation" — original lint rule-engine paper  
- ESLint architecture documentation (not a paper, but a documented design artifact)

---

### Category E — Academic Literature on MVT / Vector Tile Quality

MVT-specific academic literature. Separate from Category 0 (general tile QA) — this searches for work specifically on vector tile defects, geometry quality, or pipeline validation.

| Paper / Author | Topic | Status | Notes |
|:---------------|:------|:-------|:------|
| *Not yet identified* | Production defect rates in MVT tiles | Not searched | Key gap for RQ1 |
| *Not yet identified* | Relationship between source geometry quality and rendering fidelity | Not searched | RQ3 viability |
| *Not yet identified* | OGC Simple Features conformance in web mapping contexts | Not searched | Specification grounding |
| *Not yet identified* | Tile pipeline quality engineering (industry technical reports) | Not searched | OSM, Mapbox, Esri blogs/reports |

**Search terms (not yet executed):**

- "vector tile" AND ("quality" OR "validation" OR "geometry" OR "defect" OR "rendering")
- "Mapbox Vector Tile" AND ("error" OR "invalid" OR "artifact")
- "self-intersection" AND "geospatial" AND "production"
- "MVT" AND ("conformance" OR "validation")

**Venues:** Same as Category 0, plus:
- Mapbox engineering blog (2014–present)
- OpenStreetMap wiki / SOTM proceedings
- MapLibre project technical documentation

---

## 4. Where TileGuard is Weaker Than Existing Tools

Honest accounting of what TileGuard does NOT do that existing tools do:

| Limitation | What covers it instead |
|:-----------|:-----------------------|
| No full OGC topology validation (ring self-tangency, invalid polygon nesting) | PostGIS ST_IsValid / GEOS |
| No source-data repair or correction | tippecanoe, QGIS Geometry Fixer |
| No cross-tile boundary analysis | Not covered by any tool found |
| No pixel-level rendering regression | Mapbox render tests, Playwright screenshots |
| No projection or coordinate system validation | tippecanoe, GDAL |
| No style expression semantics validation | Maputnik, MapLibre style spec validator |
| No native Python or Java API | GEOS, JTS, Shapely |
| MVT only — no raster, no 3D tiles, no PMTiles | Out of empirical scope for now; relevant to broader RQ0 |
| Limited to z0–z4 production evidence | Needs EXP-008 (z5–z14) |

---

## 5. Provisional Novelty Claims (unconfirmed pending Categories 0 and E search)

These are working hypotheses, not assertions. Each one requires literature to survive or collapse.

**Claim 1 — Representation-induced artifact characterisation.**  
The methodology of systematically classifying false positives from geometry validation rules into "genuine defect" vs. "encoding artifact" categories — and deriving evidence-based suppression from that classification — may be novel in the tiled geospatial context. Evidence: 148,268 false positives in Phase 1; 449/619 in Phase 2 eliminated without suppressing any true positives. Whether this methodology has been applied to other tiled representations (raster, 3D) is unknown.  
*Requires: Category 0 and E search.*

**Claim 2 — MVT-aware geometry validation.**  
Explicit handling of the MVT integer grid, clipping buffer conventions, CW/CCW winding (differing from OGC/GeoJSON), and cross-tile label duplication — as opposed to applying generic geometry validators to MVT — may be novel. The necessity of these adaptations is empirically grounded (without them: 148,268 false positives).  
*Requires: Category E search.*

**Claim 3 — Rule-engine architecture for tile validation.**  
A configurable, plugin-based rule engine for post-generation tile validation (as opposed to fixed validation checklists or generation-time checks) may be architecturally novel in the geospatial domain.  
*Requires: Category 0 and E search.*

**Claim 4 — Source-to-render relationship (open empirical question).**  
Whether automated structural diagnostics at the source level can identify or explain rendering anomalies in a web mapping renderer (MapLibre) is an open empirical question. Not a novelty claim — a research question to be investigated (EXP-007, EXP-010).  
*Status: Requires experiment, not literature.*

---

## 6. Status

| Category | Status |
|:---------|:-------|
| **Category 0 — General tiled QA** | **Not searched. Highest priority.** |
| Category A — MVT tooling | Tools identified; not deeply read |
| Category B — Geometry validation | Tools identified; gaps documented; not deeply read |
| Category C — Rendering quality | Tools identified; architectural gap documented |
| Category D — Linting architecture | Conceptual precedents noted; not rigorous citations |
| **Category E — Academic MVT literature** | **Not searched.** |
| Novelty claims | Provisional hypotheses only |

**Next action:** Execute Category 0 and Category E literature searches. Until both are done, no novelty claim should be stated to a professor or in any written submission.
