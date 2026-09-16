# TileGuard — Future Scopes

> A layered expansion strategy for TileGuard's evolution from a tile validation tool to a geospatial quality platform.

The core architecture — rule engine, structured diagnostics, reporting, and Inspector — is designed as a **platform** for future capabilities. Each layer below builds on the previous one, and no layer requires fundamental architectural changes.

---

## Long-Term Vision

```text
                         TILEGUARD
                             │
    ┌────────┬───────┬───────┼───────┬────────┬────────┬────────┐
    │        │       │       │       │        │        │        │
Validate  Diagnose Profile Compare Govern  Observe  Assist
    │        │       │       │       │        │        │
  Rules  Inspector Budget  Diff   Schema  Trends    AI
    │        │       │       │       │        │        │
    └────────┴───────┴───────┼───────┴────────┴────────┴────────┘
                             │
              A trustworthy quality and investigation layer
              for geospatial data consumed by modern map applications.
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
            MVT          PMTiles        GeoJSON
              │
              ↓
          MapLibre
```

**Three-dimensional positioning:**

> **Correctness · Performance · Regression**

A tile can be structurally valid, geometrically valid, and stylistically compatible — and still be **terrible for a production map** because it's enormous or geometrically over-complex. TileGuard validates all three dimensions.

**AI sits on top as an investigation assistant** — helping engineers interpret deterministic evidence, not replacing deterministic validation.

---

## Expansion Layers (In Order)

### Layer 1: Deeper Geospatial Quality Rules

**When:** Immediate next step (post-FOSS4G)  
**Why:** Strengthens what TileGuard already does without changing its identity.

#### Geometry Topology
- Overlapping geometries within a layer
- Duplicate features (identical geometry + properties)
- Invalid feature IDs (non-unique, non-integer)
- Tiny/sliver polygons (below configurable area threshold)
- Excessive vertex counts per feature (geometry complexity budget)
- Suspicious coordinate distributions (clustering, quantization artifacts)

#### Property & Schema Validation
- Property type consistency (all features in a layer share the same schema)
- Unexpected property types (number where string expected)
- Property value validation (enum constraints, range checks)
- Missing attributes (beyond current `required-properties` — type-aware)

#### Layer Structure
- Layer-specific feature-count thresholds (already implemented)
- Layer naming conventions (regex/pattern enforcement)
- Expected geometry types per layer (buildings = polygon, roads = linestring)

#### Domain Rule Authoring (YAML/JSON)

Allow teams to define custom quality policies without writing TypeScript:

```yaml
rules:
  roads/max-geometry-complexity:
    severity: warning
    maxVertices: 5000

  buildings/required-properties:
    severity: error
    properties:
      - id
      - height
      - name

  buildings/property-values:
    severity: warning
    property: type
    allowed: [residential, commercial, industrial, public]
```

This transforms TileGuard from a fixed validator into a **geospatial quality policy engine**.

---

### Layer 2: Tile-Set & Cross-Tile Validation

**When:** After rule expansion is mature  
**Why:** Single-tile validation can't catch coverage, continuity, or zoom-level issues.

#### Tile-Set Level Questions

Questions a single-tile validator cannot answer:

| Question | What it catches |
|:---------|:----------------|
| Are there missing tiles? | Coverage gaps in expected regions |
| Are there unexpected gaps? | Sparse areas where data should exist |
| Is layer structure consistent across zooms? | Schema drift between zoom levels |
| Did tile sizes suddenly increase at z14? | Regression in simplification/filtering |
| Did feature counts explode between releases? | Pipeline misconfiguration |
| Is there cross-tile geometry continuity? | Features split incorrectly at boundaries |

#### PMTiles Integration

```text
PMTiles archive
    → TileGuard reads tile index
    → Validates individual tiles
    → Validates set-level properties:
        coverage, zoom range, tile sizes,
        layer consistency, feature density
```

#### Cross-Tile Geometry Consistency

- Features that span tile boundaries should be consistent
- Clipping artifacts at tile edges
- Duplicate geometry at tile boundaries
- Label placement continuity

---

### Layer 3: Broader Artifact Support

**When:** After MVT + MapLibre is the undisputed flagship  
**Why:** The rule engine concept is format-independent; some rules apply universally.

#### Format Roadmap

```text
MVT / PBF          ← current (flagship)
    ↓
GeoJSON            ← widely used, low effort (JSON parsing)
    ↓
PMTiles            ← modern MapLibre ecosystem
    ↓
GeoPackage         ← enterprise/QGIS workflows
    ↓
FlatGeobuf         ← streaming large datasets
    ↓
MBTiles            ← legacy but still common
```

#### Common Geometry Model

```text
Artifact
    │
    ├── MVT Adapter      → Common Geometry
    ├── GeoJSON Adapter  → Common Geometry
    ├── GeoPackage Adapter → Common Geometry
    └── ...
                           ↓
                      Rule Engine
```

Format-independent rules (self-intersection, winding order, etc.) operate on the common model. Format-specific rules (MVT extent, style version) remain tied to their adapter.

**Architecture principle:** Add adapters without touching existing rules. Add rules without touching adapters.

---

### Layer 4: Cross-Version Regression Intelligence

**When:** After comparison engine is proven in production  
**Why:** The current diff is structural; intelligent regression detection adds signal.

#### Beyond Structural Diff

Current:
```text
Tile A → Tile B → "44 features modified"
```

Future:
```text
Release A → Release B → Regression Analysis
    → "Feature count increased 380%"
    → "Average geometry complexity increased 4.2×"
    → "landuse layer disappeared at zoom 12"
    → "Road feature density dropped significantly"
    → "Regression concentrated in one geographic quadrant"
```

#### Regression Patterns Library

- **Size regression** — tile bytes increased >50%
- **Density regression** — feature count per layer changed dramatically
- **Coverage regression** — tiles that had data now empty (or vice versa)
- **Schema regression** — properties that existed are now missing
- **Geometry regression** — average complexity changed significantly
- **Zoom regression** — data appears/disappears at unexpected zoom levels

#### Confidence Scoring Improvements

- Correlate multiple signals (area reduction + property change = higher confidence)
- Learn from labeled regressions (supervised model on historical data)
- Cluster similar candidates (batch regressions from same pipeline stage)

---

### Layer 5: AI-Assisted Investigation

**When:** After deterministic engine is trusted and widely used  
**Why:** AI interprets deterministic evidence — it doesn't replace it.

**Critical principle:**

> AI should NOT decide "this polygon is invalid."  
> The rule engine decides that.  
> AI explains **why** and **what to do about it.**

#### AI as Investigation Assistant

```text
Deterministic Engine
        │
   ┌────┴────┐
   ↓         ↓
Diagnostics  Statistics
   │         │
   └────┬────┘
        ↓
   AI Assistant
```

Given a diagnostic like:
```text
tile/self-intersection
Layer: buildings, Feature: 1821
```

AI could explain:
> "This looks consistent with a polygon that was simplified after projection and developed a crossing ring. Check the geometry simplification stage in your pipeline."

Or identify patterns:
> "These 43 violations share the same layer and property pattern. They may originate from the same upstream transformation."

#### AI-Powered Report Summaries

Instead of:
> "47 violations detected."

Generate:
> "Quality regression detected: 47 violations across 3 layers. 39 are related to geometry topology and are concentrated in landuse. The highest-severity issue is a self-intersecting polygon affecting feature 1821."
>
> "Suggested investigation: Compare the geometry generation stage between the previous and current tile release."

The underlying numbers still come from TileGuard. AI makes findings **easier to understand**.

#### AI-Assisted Rule Authoring

A developer writes:
> "Every road feature must have a `class` property and its value must be one of motorway, primary, secondary, or residential."

TileGuard generates a rule configuration, reviewed and executed deterministically:
```yaml
rules:
  roads/valid-class:
    severity: error
    property: class
    required: true
    allowed: [motorway, primary, secondary, residential]
```

**AI proposes. TileGuard validates.**

---

### Layer 6: Tile Pipeline Observability

**When:** Long-term (v2.0+)  
**Why:** Moves TileGuard from point-in-time validation to continuous quality assurance.

#### Pipeline Position

```text
PostGIS / Source Data
    ↓
Tippecanoe / Planetiler / Martin
    ↓
TileGuard (quality gate)          ← You are here
    ↓
Object storage / PMTiles / CDN
    ↓
MapLibre / consumers
```

#### Observability Capabilities

- **Quality trends** — violations over time, by rule, by layer
- **Size trends** — tile sizes across releases and zoom levels
- **Feature density trends** — feature counts per tile over time
- **Geometry complexity trends** — average vertices per feature
- **Regression history** — track when regressions were introduced and resolved
- **Release health score** — composite quality metric per release

#### Dashboard

A persistent dashboard (separate from the Inspector) showing:
- Current quality state of the tileset
- Historical trends
- Alerts when quality degrades
- Comparison between releases
- Per-layer health breakdowns

This moves TileGuard toward **geospatial data observability** — a larger product category.

---

### Layer 7: MapLibre Ecosystem Integration

**When:** Ongoing (parallel to other layers)  
**Why:** MapLibre is the primary consumer; tighter integration adds unique value.

#### Style-to-Tile Compatibility

```text
MapLibre Style
    +
Vector Tiles
    ↓
TileGuard
    ↓
Compatibility Report
```

- Source references in style match available tile layers
- Property references in expressions exist in tile features
- Zoom ranges in style align with tile availability
- Filter expressions reference valid property values

#### Development-Time Diagnostics

- MapLibre dev plugin that runs TileGuard rules on loaded tiles
- Inline warnings in the map viewport when geometry errors are detected
- Style editor integration (flag style errors as you type)

#### Expression Validation

- Validate `["get", "class"]` references exist in the tile
- Validate filter expressions against actual property values
- Detect expressions that will always evaluate to null

---

## Priority Matrix

| Priority | Expansion | Impact | Effort | Dependencies |
|:---------|:----------|:-------|:-------|:-------------|
| **P0** | More geospatial rules | High — strengthens core value | Low–Medium | None |
| **P1** | Domain rule authoring (YAML) | High — democratizes quality policies | Medium | Layer 1 rules |
| **P2** | PMTiles support | High — modern ecosystem | Medium | None |
| **P3** | Cross-version regression intelligence | High — unique capability | Medium | Comparison engine |
| **P4** | GeoJSON validation | Medium — broad applicability | Low | Common geometry model |
| **P5** | AI investigation assistant | High — differentiation | Medium | Stable diagnostics |
| **P6** | Tile-set validation | High — new capability class | High | PMTiles support |
| **P7** | Pipeline observability | Very High — new product category | High | All above |

---

## High-Potential Real-World Additions

These solve problems observed in real geospatial workflows that TileGuard is uniquely positioned to address.

### A. SARIF Export (GitHub Code Scanning Integration)

**Why:** GitHub Code Scanning accepts SARIF. If TileGuard outputs SARIF, every PR automatically shows tile validation findings **inline on the changed files tab** — exactly like ESLint or CodeQL findings. No custom bot needed.

```yaml
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

**Effort:** Low. SARIF is a JSON format. TileGuard already has all required fields. ~200 lines for a new reporter.

---

### B. Watch Mode for Tile Pipelines

**Why:** Tile generation pipelines iterate continuously. Engineers tweak simplification thresholds and re-generate. Currently they manually re-run `tileguard check` each time.

```bash
tileguard watch ./output-tiles/ --on-change "notify"
```

Monitors a directory, re-validates on change (debounced), shows live diagnostic count. Turns TileGuard into a **development-time companion** with instant feedback.

**Effort:** Medium. `fs.watch` + debounce + existing single-file validation.

---

### C. Tile Size Budget & Performance Rules

**Why:** The #1 production issue with vector tiles isn't geometry errors — it's **oversized tiles** causing slow loads and dropped frames at 60fps. This affects every production tileset.

```yaml
rules:
  tile/max-size:
    severity: error
    maxBytes: 500000         # 500KB uncompressed
    maxGzipBytes: 150000     # 150KB compressed

  tile/vertex-budget:
    severity: warning
    maxVerticesPerFeature: 2000
    maxVerticesPerLayer: 50000
```

Prevents the most common production performance issue without requiring render testing.

**Effort:** Low. File size is trivial. Vertex counting already happens during traversal.

---

### D. Diff-Aware CI (Only Validate Changed Tiles)

**Why:** Large tilesets have millions of tiles. Full validation on every PR is impractical. But most PRs regenerate a small subset.

```bash
# Only validate tiles that changed in this PR
git diff --name-only main -- 'tiles/*.pbf' | tileguard check --stdin
```

Makes TileGuard viable for **large production tilesets** where full validation takes hours but incremental takes seconds.

**Effort:** Medium. Needs file-list input mode. Engine already validates individual files.

---

### E. Shared Configuration Presets (`extends`)

**Why:** Teams using OpenMapTiles, Shortbread, or custom schemas share the same expected layers and quality thresholds. Today every project configures from scratch.

```typescript
import { openmaptiles } from '@tileguard/preset-openmaptiles';

export default {
  extends: [openmaptiles],
  rules: {
    'tile/feature-count': ['warning', { max: 200000 }],
  },
};
```

Creates a **community ecosystem** — the same growth pattern that made ESLint dominant.

**Effort:** Medium. Config resolution already supports composition. Need `extends` field + preset package structure.

---

### F. Tile Profiler (Performance Analysis)

**Why:** Validation tells you what's *wrong*. Profiling tells you what's *slow*. Both matter. Currently no tool profiles vector tiles.

```bash
tileguard profile ./tile.pbf
```

```text
  Layer Breakdown (by size):
    transportation   234 KB  (48%)  ████████████████████
    building         128 KB  (26%)  ███████████
    landcover         67 KB  (14%)  ██████

  Geometry Complexity:
    Max vertices/feature:  3,891 (transportation #412)
    Features > 1000 verts: 7

  ⚠ transportation is 48% of tile — consider simplification
  ⚠ Feature #412 has 3,891 vertices — exceeds recommended budget
```

Answers **"why is my map slow?"** — a question every MapLibre developer asks.

**Effort:** Low–Medium. Tile decoding already provides all the data. New command = formatted statistics + heuristic recommendations.

---

### G. Pre-Commit Hook Integration

**Why:** Catch tile quality issues **before** pushing, not after CI fails 5 minutes later.

```bash
npx tileguard hook install
# Adds to .husky/pre-commit or .git/hooks/pre-commit
```

Adds TileGuard to the **inner loop** — the fastest possible feedback cycle.

**Effort:** Very low. Already works with exit codes. Just documentation + ergonomic `hook` command.

---

### H. MapLibre Expression Validator (Cross-Reference Style ↔ Tile)

**Why:** MapLibre expressions reference tile properties. If the tile doesn't have the property, expressions silently return `null`. This is the most common silent failure in production MapLibre deployments.

```text
⚠ style/expression-dead-branch
  Expression in layer "landuse-fill" matches on value "commercial",
  but no features in source layer have this value.
  ℹ This branch will never be reached.
```

**Genuinely novel capability** — no other tool cross-validates style expressions against tile content.

**Effort:** High. Requires cross-referencing style expressions against tile features. But both data sources are already parsed by TileGuard.

---

### I. Tile Accessibility Rules (Map Labels)

**Why:** Map accessibility is an emerging requirement. Label content in vector tiles determines what screen readers announce. No tool validates this.

```yaml
rules:
  labels/min-text-length:
    severity: warning
    minLength: 2              # Catch truncated labels

  labels/required-language:
    severity: warning
    languages: [name, name:en]  # Ensure multilingual labels
```

Positions TileGuard at the intersection of **geospatial + accessibility** — unoccupied territory.

**Effort:** Low. Labels are feature properties. Rules check string content.

---

### J. Schema/Version Governance

**Why:** Tile schemas evolve. A new pipeline version might drop a property, rename a layer, or change geometry types. Without explicit governance, these changes are invisible until a style breaks in production.

```bash
tileguard schema diff ./schema-v1.yml ./schema-v2.yml
```

```text
Breaking changes:
  ✗ Layer "roads" property "ref" removed (used by 3 style layers)
  ✗ Layer "buildings" geometry type changed: polygon → multi-polygon

Compatible changes:
  ✓ Layer "poi" property "category" added
  ✓ Layer "transit" added (no existing style references)
```

Enables:
- Explicit compatibility contracts for layers, properties, geometry types
- Schema drift detection between releases
- Breaking change warnings before deployment
- Style/tile contract verification

**Effort:** Medium. Needs a schema definition format + diff algorithm. Complements existing property validation and regression work.

---

### K. Reproducible Validation / Provenance

**Why:** A CI failure must be reproducible months later. "It passed on my machine" is unacceptable for quality gates. If you can't reproduce the exact validation environment, you can't trust the results.

Record in every report:
- TileGuard version + rule-set version
- Full configuration (resolved, not just file path)
- Input artifact content hash (SHA-256)
- Generator metadata (Tippecanoe version, Planetiler version — where available from tile metadata)
- Validation environment (OS, Node version, locale)
- Timestamp + report ID (already done)

```json
{
  "provenance": {
    "tileguard": "0.5.0",
    "ruleSet": "tile-rules@0.5.0 + style-rules@0.5.0",
    "config": { "hash": "abc123", "rules": { ... } },
    "artifact": { "hash": "sha256:def456", "generator": "planetiler/0.8.0" },
    "environment": { "os": "linux", "node": "22.x", "locale": "en-US" }
  }
}
```

Makes every report a **self-contained reproducibility record**. Essential for audit trails in regulated industries.

**Effort:** Low–Medium. Most fields already exist in `ReportMetadata`. Need to compute artifact hash and extract generator metadata from tile metadata keys.

---

### L. Artifact Caching & Parallel Validation

**Why:** Before TileGuard can operate on millions of tiles, it needs to not re-validate unchanged tiles and to use all available CPU cores.

```bash
tileguard check ./tiles/ --cache --parallel 8
```

- **Content-hash cache:** Store `{ hash → diagnostics }`. If a tile's SHA-256 hasn't changed, skip re-validation. Massively reduces CI time for large tilesets where most tiles don't change.
- **Parallel execution:** Validate N tiles concurrently using Node worker threads. Tiles are independent — no shared state between validations.
- **Cache invalidation:** Rule-set version change → full revalidation. Config change → full revalidation. Otherwise → use cache.

Fits naturally with diff-aware CI (D) — diff-aware identifies *which* tiles changed; caching skips the ones that didn't.

**Effort:** Medium–High. Worker thread pool + content-addressable cache store (filesystem-based, like turborepo).

---

### M. Developer/IDE Integration (VS Code Extension)

**Why:** Structured diagnostics already contain everything a VS Code extension needs: rule ID, severity, location, message, suggestion. TileGuard could surface tile/style quality findings directly in the editor.

For **style files** (`.json`):
- Inline diagnostics (squiggly underlines on `"source": "compsite"`)
- Quick fixes ("Did you mean `composite`?")
- Hover info on layer/source references

For **tile files** (`.pbf`):
- Sidebar panel showing diagnostics for the active tile
- Click-to-open-in-Inspector links
- Rule documentation on hover

Could implement via Language Server Protocol (LSP) for maximum editor compatibility (VS Code, Neovim, JetBrains).

**Effort:** High. LSP server + VS Code extension packaging. But the diagnostic data model is already perfectly structured for this.

---

### N. Quality-Policy Sharing / Community Ecosystem

**Why:** Beyond presets (E), this is the broader ecosystem vision — a community registry where organizations publish and share quality policies.

```text
@tileguard/preset-openmaptiles     ← OpenMapTiles schema validation
@tileguard/preset-shortbread       ← Shortbread tile schema
@tileguard/preset-humanitarian     ← HOT/OSMF humanitarian mapping standards
@tileguard/preset-transportation   ← Transport-focused quality rules
@myorg/tileguard-preset-internal   ← Organization-specific policies
```

Domain packs go beyond layer/property schemas:
- **Transportation:** Road network connectivity, one-way consistency, speed limit ranges
- **Buildings:** Height plausibility, footprint area bounds, required classification
- **Humanitarian:** Completeness metrics, last-edit freshness, tag consistency

This is the **community flywheel** — more presets → more users → more contributions → more presets.

**Effort:** Medium (infrastructure). The plugin architecture already supports this. Needs: registry/discovery, documentation standards, compatibility versioning.

---

## Tile Performance as a First-Class Pillar

Performance deserves elevation from "future rule" to a **core pillar** alongside correctness and regression:

```text
TileGuard Quality Dimensions
├── 1. Correctness     ← geometry valid, schema correct, style compatible
├── 2. Performance     ← tile size, vertex complexity, decode time
└── 3. Regression      ← what changed, is it intentional, is it suspicious
```

### Why Performance Is Different

A tile can pass every correctness rule and still be **unusable** in production:
- 2MB uncompressed → network timeout on 3G
- 50,000 vertices in one feature → dropped frames during pan
- 80,000 features in one layer → memory pressure, GC stalls

These aren't "wrong" — they're "too expensive." Performance rules have different semantics than correctness rules (budget thresholds vs binary pass/fail), and they deserve dedicated profiling tooling (the `profile` command).

### Performance Rule Categories

| Rule | What it enforces |
|:-----|:-----------------|
| `perf/tile-size` | Max tile size (raw + gzip) |
| `perf/layer-size` | Max per-layer contribution |
| `perf/vertex-budget` | Max vertices per feature / per layer |
| `perf/feature-density` | Max features per layer at a given zoom |
| `perf/geometry-complexity` | Avg/max rings per polygon |
| `perf/decode-time` | Estimated decode time budget |

---

## TileGuard Quality Score (Future — v2.0+)

Not an arbitrary AI score. A **transparent, explainable composite** built from measurable signals:

```text
Tile Quality Score: 82/100
├── Structural health:    100/100  (all layers present, properties complete)
├── Geometry health:       85/100  (−15: 3 self-intersections)
├── Style compatibility:  100/100  (all sources valid, no dead expressions)
├── Performance:           70/100  (−20: tile 1.2MB, −10: 2 features >3000 verts)
├── Regression:            90/100  (−10: 5% area reduction in buildings)
└── Coverage:              95/100  (−5: 2 expected tiles empty)
```

Every deduction is explainable:
> **82/100** — −8 geometry complexity, −5 tile-size regression, −5 missing properties

Useful for:
- Release dashboards ("this release is 82 vs last release's 91")
- CI gates ("fail if score drops below 75")
- Trend tracking ("quality has been declining for 3 releases")
- Team communication ("the buildings layer is dragging score down")

**Implementation constraint:** Only implement after the underlying measurements are individually trusted. The score is a **view** of existing diagnostics, not a new validation mechanism.

---

### Updated Priority Matrix (Full)

| Priority | Feature | Impact | Effort | Real-World Need |
|:---------|:--------|:-------|:-------|:----------------|
| **P0** | Tile size/performance rules (C) | Very High | Low | Every production tileset |
| **P0** | SARIF export (A) | High | Low | Every GitHub-using team |
| **P0** | Reproducible validation (K) | High | Low | Audit trails, CI trust |
| **P1** | Pre-commit hooks (G) | High | Very Low | Developer inner loop |
| **P1** | Diff-aware CI (D) | High | Medium | Large tilesets |
| **P1** | More geospatial rules | High | Medium | Core value |
| **P1** | Schema governance (J) | High | Medium | Schema drift prevention |
| **P2** | Shared presets (E) | High | Medium | Community growth |
| **P2** | Tile profiler (F) | High | Low–Medium | Performance debugging |
| **P2** | Watch mode (B) | Medium | Medium | Pipeline iteration |
| **P2** | Community ecosystem (N) | High | Medium | Flywheel growth |
| **P3** | Expression validator (H) | Very High | High | MapLibre ecosystem |
| **P3** | PMTiles support | High | Medium | Modern ecosystem |
| **P3** | Parallel validation / caching (L) | High | Medium–High | Scale to millions |
| **P4** | IDE/VS Code extension (M) | High | High | Developer experience |
| **P4** | Accessibility rules (I) | Medium | Low | Emerging requirement |
| **P5** | AI investigation | High | Medium | Differentiation |
| **P5** | Quality Score (v2.0+) | Very High | Medium | Release dashboards |
| **P6** | Pipeline observability | Very High | High | Product category |

---

## What NOT to Do

1. **Don't chase AI before the deterministic engine is trusted.** The strongest FOSS4G story is that TileGuard produces trustworthy, repeatable evidence. AI is an interpretation layer on top, not the foundation.

2. **Don't expand to many formats simultaneously.** MVT + MapLibre should remain the flagship. Add one format at a time, prove it works, then add the next.

3. **Don't build observability before single-tile validation is excellent.** Quality trends are meaningless if the underlying validation isn't trusted.

4. **Don't add rules that produce false positives.** Every false positive erodes trust. A rule that's 95% accurate is worse than no rule — engineers will disable it and stop trusting the tool.

5. **Don't turn the Inspector into a GIS.** The Inspector's job is to help you understand findings. It's not QGIS. It doesn't edit geometry. It doesn't reproject data. It shows you what's wrong and helps you investigate.

---

## Foundation Already Built

The work completed for v0.5.0 already supports almost all future directions:

| Current Capability | Enables Future |
|:-------------------|:---------------|
| Rule interface + Plugin system | Custom rules, YAML rules, community packages |
| Artifact/Provider abstraction | New format adapters without core changes |
| Structured Diagnostics | AI interpretation, trend analysis, IDE integration |
| Comparison Engine | Regression intelligence, release comparison |
| Report Engine (JSON/MD/HTML) | AI summaries, dashboard integration |
| Inspector + Overlay system | Visual investigation for any future rule |
| CI-native design | Pipeline observability, quality gates |
| Convention-aware validation | Multi-format support (different formats have different conventions) |

The architecture is already a platform. Future expansion is additive, not transformative.

---

## Timeline Alignment

```text
v0.5.0 (Aug 2026)    ← FOSS4G release (current)
                        Validate + Diagnose + Compare + Report

v0.6.0 (Q4 2026)     ← Performance pillar + SARIF + pre-commit hooks
                        Tile size rules, vertex budgets, profiler command
                        SARIF reporter for GitHub Code Scanning
                        Reproducible validation / provenance in reports

v0.7.0 (Q4 2026)     ← More rules + schema governance
                        Deeper topology/property rules
                        YAML policy engine (domain rule authoring)
                        Schema drift detection between releases

v0.8.0 (Q1 2027)     ← Scale + ecosystem
                        Diff-aware CI, parallel validation, caching
                        Shared presets (@tileguard/preset-openmaptiles)
                        Watch mode for pipeline iteration
                        PMTiles support

v0.9.0 (Q1 2027)     ← Integration + intelligence
                        MapLibre expression validator (style ↔ tile)
                        VS Code extension (LSP diagnostics)
                        Regression intelligence improvements

v1.0.0 (Q2 2027)     ← Stable release
                        API guarantees (no breaking changes)
                        Quality Score (transparent composite)
                        Community ecosystem (registry, domain packs)
                        Python SDK

v1.x   (2027+)       ← Platform expansion
                        AI investigation assistant
                        Pipeline observability + dashboards
                        GeoJSON/GeoPackage/FlatGeobuf adapters
                        Tile-set validation (coverage, continuity)
                        Accessibility rules
```

**Evolution model:**

```text
v0.5  Validate → Diagnose
v0.6  Validate → Diagnose → Profile
v0.7  Validate → Diagnose → Profile → Govern
v0.8  Validate → Diagnose → Profile → Compare → Govern
v0.9  Validate → Diagnose → Profile → Compare → Govern (+ IDE)
v1.0  Validate → Diagnose → Profile → Compare → Govern → Score
v1.x  Validate → Diagnose → Profile → Compare → Govern → Observe → Assist
```

---

---

## PMTiles Support & Production-Scale Architecture

> **Origin:** This section captures an architectural discussion that arose from a question at FOSS4G 2026 Hiroshima — *"Can TileGuard validate all tiles in a PMTiles file, or even all tiles in the world?"*

---

### The PMTiles Problem Statement

A full global `planet.pmtiles` at zoom 14 contains approximately **268 million tiles**. At TileGuard's best measured throughput of 187 tiles/second (CARTO Streets, v0.5.2), exhaustive validation would take **~16.5 days** of continuous processing. Exhaustive validation is therefore the wrong goal.

The right goal: **statistically sound, zoom-tiered validation with streaming output.**

---

### Layer O: PMTiles Provider

**When:** v0.8.0 (Q1 2027)
**Why:** PMTiles is the modern cloud-optimized tile archive format. Supporting it as an input source opens TileGuard to the full MapLibre + Protomaps ecosystem.

#### What This Means

Instead of validating individual `.pbf` files:

```bash
tileguard validate ./tiles/14-12345-67890.pbf
```

You pass a PMTiles archive directly:

```bash
tileguard validate --pmtiles planet.pmtiles --max-zoom 8
```

#### Implementation

A new `PMTilesProvider` implementing the existing `ArtifactProvider` interface:

```typescript
// New provider — no changes to the rule engine or diagnostic model
export class PMTilesProvider implements ArtifactProvider {
  async *tiles(options: PMTilesOptions): AsyncIterable<VectorTileArtifact> {
    const source = new PMTiles(options.path);
    for await (const tile of source.iterateTiles({ maxZoom: options.maxZoom })) {
      yield decodeTile(tile);
    }
  }
}
```

**Architecture principle:** The rule engine, all rules, and all reporters are completely unaware that input came from a PMTiles archive. Only the provider changes.

---

### Layer P: Tiered Zoom Validation

**When:** v0.8.0 (alongside PMTiles support)
**Why:** Not all zoom levels deserve equal scrutiny. Global/regional tiles (z0–z6) have the highest impact per tile. Leaf tiles (z13+) have too many tiles and diminishing returns per individual tile.

#### Validation Tiers

| Zoom Level | Strategy | Rationale |
|:-----------|:---------|:----------|
| **z0 – z6** | Validate 100% | Few tiles (~4K), highest impact if broken |
| **z7 – z10** | 10% random sample | Statistically representative of pipeline behavior |
| **z11 – z12** | 1% random sample | Systematic error detection only |
| **z13+** | Skip by default | 268M tiles at z14 — impractical, low marginal value |

```bash
# Explicit control via CLI flags
tileguard validate \
  --pmtiles planet.pmtiles \
  --max-zoom 10 \
  --sample-rate 0.1 \
  --reporter jsonl \
  --output results.jsonl
```

This reduces the problem from 268M tiles to **~100K meaningful checks**, completable in under 15 minutes.

---

### Layer Q: Streaming Reporter (Required for Scale)

**When:** v0.8.0 (prerequisite for any scale work)
**Why:** The current reporter accumulates all diagnostics in RAM before writing output. On large corpora (10,000+ tiles), this causes significant GC pressure and memory exhaustion. This was explicitly identified in [BENCHMARK_ASSESSMENT.md](docs/engineering/phase1/BENCHMARK_ASSESSMENT.md).

#### Architecture Change

```text
Current:
  validate all tiles → hold ALL diagnostics in RAM → flush to reporter at end

Streaming:
  validate tile → emit diagnostic immediately → discard → next tile
```

#### Interface Change

The `Reporter` interface gains a streaming `write()` method alongside the existing `flush()`:

```typescript
interface Reporter {
  write(diagnostic: Diagnostic): Promise<void>;  // NEW — called per diagnostic
  flush(): Promise<void>;                          // existing — end-of-run summary
}
```

**Output:** A `.jsonl` file with one diagnostic per line — appendable, resumable, and readable while validation is still running. Memory usage stays flat regardless of corpus size.

---

### Layer R: Stateless CLI — External Work Distribution

**When:** v0.8.0 (design principle, no code change required)
**Why:** Worker threads inside Node.js buy parallelism on one machine only. The moment you need multi-machine scale, you have two competing parallelism systems. The correct answer is to keep TileGuard stateless and let external infrastructure handle distribution.

#### Core Design Principle

> **TileGuard is a fast, stateless, single-process CLI tool. Work distribution is entirely the caller's problem.**

This is the Unix philosophy: `grep` doesn't manage its own thread pool. TileGuard shouldn't either.

#### What TileGuard Exposes (Required for External Orchestration)

Two CLI capabilities that enable any external orchestration strategy:

**1. Batch input mode** — accept a list of tile paths or coordinate ranges:

```bash
# Via file list
cat tile-batch-001.txt | tileguard validate --stdin

# Via explicit range (for PMTiles)
tileguard validate --pmtiles planet.pmtiles --zoom 8 --x-range 0-127 --y-range 0-63
```

**2. Clean exit codes + JSONL streaming output:**

```bash
tileguard validate batch-001/ --reporter jsonl >> results.jsonl
echo $?  # 0 = clean, 1 = errors found, 2 = tool failure
```

#### What External Orchestration Can Then Be

| Orchestration Tool | Use Case |
|:-------------------|:---------|
| `GNU parallel` / `xargs -P` | Single developer machine, no infrastructure |
| **BullMQ + Redis** | Multi-machine, same data centre |
| **AWS SQS + ECS Tasks** | Cloud horizontal scale |
| **Kubernetes Jobs** | Self-healing, quota-managed, any cloud |
| **GitHub Actions matrix** | CI/CD parallel validation across runners |

**None of these require any changes inside TileGuard.** You run `tileguard validate <batch>` as the worker command in each case.

#### Simplest Proof It Works Today (No Code Changes)

```bash
# Split 10,000 tiles into batches of 1,000, validate 8 in parallel
ls tiles/ | split -l 1000 - batch-
ls batch-* | parallel -j 8 \
  'tileguard validate $(cat {}) --reporter jsonl >> results-$(basename {}).jsonl'

# Merge results
cat results-*.jsonl > all-results.jsonl
```

Scale to N machines by pointing those workers at a shared queue instead of a local file list — zero TileGuard changes required.

#### Effective Throughput at Scale

| Configuration | Throughput |
|:--------------|:-----------|
| Single process (current) | 187 tiles/sec |
| 8 parallel processes (one machine) | ~1,500 tiles/sec |
| 100 pods (Kubernetes) | ~18,700 tiles/sec |
| 100 pods — 10,000 tiles | **< 1 second** |

---

### Delta Validation for CI/CD Pipelines

For production tile pipeline CI — validating every tile on every push is impractical for large tilesets. The practical version: **only validate what changed between releases.**

```bash
tileguard validate \
  --pmtiles planet-v2.pmtiles \
  --diff-against planet-v1.pmtiles \
  --max-zoom 10 \
  --reporter jsonl \
  --output delta-results.jsonl
```

This combines with the stateless design: the diff is computed externally (two PMTiles archives), producing a list of changed tile coordinates, which is then fed to a tileguard batch run. Fast feedback on every release — not a 16-day full re-scan.

---

### Summary: What Needs to Change in TileGuard

| Change | Effort | Enables |
|:-------|:------:|:--------|
| Streaming JSONL reporter | Low | Flat memory on any corpus size |
| `PMTilesProvider` | Medium | Archive-based input |
| `--max-zoom` + `--sample-rate` CLI flags | Low | Tiered validation |
| Batch/stdin input mode | Low | External orchestration |
| `--diff-against` for PMTiles | Medium | Delta CI/CD validation |

Everything else (parallelism, distribution, scheduling, result aggregation) is handled by existing infrastructure tools — deliberately outside TileGuard's scope.

---

*Last updated: August 2026 · Aligned with FOSS4G 2026 presentation and v0.5.0 release.*
