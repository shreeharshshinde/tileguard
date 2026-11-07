# Empirical Research & Evidence

TileGuard's design and suppression algorithms are grounded in an empirical study across **2,094 production tiles** from three vector tile compilers (OpenMapTiles/PostGIS, OpenFreeMap/Planetiler, and CARTO Streets) spanning zoom levels **z0 through z14**.

This page highlights the experimental findings, diagnostic taxonomy, and statistical visualizations that validate TileGuard's suppression guards and detection accuracy.

---

## Executive Overview

A generic geometry checker run against production vector tiles produces thousands of false-positive warnings. In our corpus of 294 low-zoom tiles, a naive validator emitted **148,996 diagnostics**.

Our research addresses this core challenge:
> **How can automated quality assurance distinguish genuine geometric corruption from intentional representation artifacts of the Mapbox Vector Tile (MVT) format?**

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig11_summary_panel.png" alt="TileGuard Research Summary" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 11.</strong> TileGuard empirical research overview across 10 experiments and 2,094 audited tiles.</p>
</div>

---

## 1. Corpus Composition & Geometry-Type Disaggregation

Evaluating vector tile geometry requires distinguishing **Polygon rings** from **LineStrings**:
- A self-intersecting polygon breaks Jordan curve planar partitioning and earcut triangulation in WebGL renderers.
- A self-intersecting LineString is standard in road networks (overpasses, bridges, hairpins) and is explicitly valid under OGC Simple Features (ISO 19125-1).

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig01_corpus_overview.png" alt="Corpus Composition" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 1.</strong> Baseline corpus composition (z0–z4) and OGC geometry-type split of the 170 candidates.</p>
</div>

---

## 2. Four-Way Diagnostic Taxonomy

All diagnostics emitted by TileGuard are categorized into four taxonomy classes:

| Class | Definition | Total (z0–z4) | % |
|:---|:---|:---:|:---:|
| **Spec-Permitted Convention** | Encoding choice permitted by MVT v2.1 or standard practice (e.g., 64–80 unit clipping buffers, label duplication). | 148,393 | 99.60% |
| **Checker Error** | Algorithmic flaw in checker (e.g., closed LineString closure vertex comparison). | 288 | 0.19% |
| **Quantization Artifact** | Float-to-integer grid snapping causing consecutive identical vertices ($P_i = P_{i+1}$). | 161 | 0.11% |
| **Genuine Defect** | True topological crossing that corrupts downstream rendering or spatial indexing. | **154** | **0.10%** |

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig02_diagnostic_taxonomy.png" alt="Diagnostic Taxonomy" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 2.</strong> Taxonomy distribution across 148,996 classified diagnostics. Only 1 in 1,000 raw diagnostics is a Genuine Defect.</p>
</div>

---

## 3. Suppression Guard Evolution & Dual-Oracle Ground Truth

To suppress the 99.9% false alarms while retaining 100% recall on Genuine Defects, TileGuard implements a six-stage suppression cascade for `tile/self-intersection`:

- **Guard 1:** Minimum-vertex skip ($N < 4$).
- **Guard 2:** Closed LineString closure pair skip ($seg_0$ vs $seg_{N-1}$).
- **Guard 3:** Duplicate-vertex pre-scan and consecutive zero-length segment skip.
- **Guard 4:** Axis-Aligned Bounding Box (AABB) spatial envelope pre-filter.
- **Guard 5:** Non-adjacent shared vertex tangency skip.
- **Guard 6:** Collinear-endpoint contact skip via integer orientation predicate (`isProperCrossing`).

We evaluated all candidate rings against two independent oracles:
1. **GEOS 3.12 (via Shapely 2.1.2):** Standard C++ geometric predicate engine (`LinearRing.is_simple`).
2. **Exact Integer Oracle:** Standalone arbitrary-precision integer 2D orientation engine ($orient2d$).

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 2rem 0;">
  <div>
    <img src="/research/fig03_guard_evolution.png" alt="Guard Evolution" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
    <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 3.</strong> Precision, Recall, and F1 across guard milestones. Guard 6 achieves 100% precision while maintaining 100% recall.</p>
  </div>
  <div>
    <img src="/research/fig04_oracle_categories.png" alt="Oracle Categories" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
    <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 4.</strong> Resolution of the 131 <code>AGREE_NOPROPER_TOUCH</code> collinear contacts by Guard 6.</p>
  </div>
</div>

---

## 4. Winding Convention Compliance (EXP-010)

Mapbox Vector Tile Specification v2.1 Section 4.3.2.1 specifies that **exterior rings must be Clockwise (CW)** in tile space (where the Y-axis points downwards).

We computed raw Shoelace signed areas independently across 4,775 polygon features:
- **OpenMapTiles:** 99.85% MVT-compliant CW exterior rings (0.15% OGC-style).
- **OpenFreeMap:** 100.0% MVT-compliant CW exterior rings.
- **CARTO Streets:** 100.0% MVT-compliant CW exterior rings.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig05_winding_compliance.png" alt="Winding Compliance" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 5.</strong> Exterior ring winding compliance per provider under MVT v2.1.</p>
</div>

---

## 5. Defect Density Across Zoom Levels (EXP-008)

To determine how defect frequency varies with map scale, we extended the corpus with **1,800 production tiles** over the Tokyo metropolitan region at zoom levels **z8, z12, and z14**:

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig06_defect_density_vs_zoom.png" alt="Defect Density vs Zoom" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 6.</strong> Defect density (Genuine Defects per tile) across zoom levels z0–z14.</p>
</div>

**Key Findings:**
1. **Unimodal Peak at z8:** Defect density peaks at **18.1 GD/tile** for CARTO and **17.6 GD/tile** for OpenFreeMap at z8 (a 220× increase over z0–z4). This corresponds to aggressive geometric line simplification on regional road networks.
2. **Compiler Divergence at z14:** At high zoom (z14), Planetiler (OpenFreeMap) produces 1.22 GD/tile versus CARTO's 0.12 GD/tile on identical regional data.

---

## 6. Rendering Impact Verification (EXP-007)

Do TileGuard findings cause actual visual bugs? Using headless Chromium (Playwright) and MapLibre GL JS 4.7.1 ($2048 \times 2048$ canvas), we performed differential pixel analysis on $256 \times 256$ crops centered on verified defects:

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig07_render_impact.png" alt="Render Impact" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 7.</strong> Percentage of altered pixels in localized defect crops.</p>
</div>

- **Production Planetiler tiles** showed **70.1% to 84.6% pixel corruption** in local road geometry.
- **Synthetic butterfly and hourglass polygons** produced **51.8% and 46.2% pixel corruption** due to earcut triangulation inversion.
- **4 of 5 cases** exhibited *significant* rendering failure ($\ge 5\%$ of crop altered).

---

## 7. Controlled Pipeline Attribution (EXP-011)

To isolate whether defects originate in source data or compiler algorithms, we performed a One-Factor-At-A-Time (OFAT) experiment compiling 2,357 verified valid Monaco polygons with **Tippecanoe v2.82.0** and **Planetiler v0.8.4**:

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig08_compiler_attribution.png" alt="Compiler Attribution" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 8.</strong> Compiler attribution under controlled source data (Monaco polygons).</p>
</div>

- **Tippecanoe** introduced **0 defects** across all 8 configurations.
- **Planetiler** introduced **5 Genuine Defects** exclusively at zoom level z14, isolating high-zoom integer coordinate quantization as an attributable compiler defect generator.

---

## 8. Generalization to Unseen Data (EXP-003e)

To verify that Guard 6 was not overfitted to the training corpus, we evaluated all 1,800 higher-zoom tiles (unseen during guard development):
- **4,200 raw flagged occurrences** (2,535 unique rings).
- **0 Polygon false positives** were detected.
- All 2,535 flagged LineString rings were confirmed genuine self-intersections by both independent oracles (100% agreement).

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig10_heldout_generalization.png" alt="Held-out Generalization" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 10.</strong> Generalization performance on the 1,800-tile held-out dataset.</p>
</div>

---

## 9. Performance & Latency Benchmark

TileGuard's six-stage suppression architecture maintains high validation throughput:
- **CARTO Streets:** 67.65 tiles/sec (14.78 ms/tile).
- **OpenFreeMap:** 49.46 tiles/sec (20.22 ms/tile).
- **OpenMapTiles:** 47.18 tiles/sec (21.19 ms/tile).

<div style="text-align: center; margin: 2rem 0;">
  <img src="/research/fig09_throughput.png" alt="Benchmark Throughput" style="border-radius: 8px; border: 1px solid var(--vp-c-divider);" />
  <p style="font-size: 0.85rem; color: var(--vp-c-text-2); margin-top: 0.5rem;"><strong>Figure 9.</strong> Throughput and average per-tile processing latency with all 25 rules active.</p>
</div>

---

## Learn More

- For full experimental methodologies and raw data links, read [`docs/research/EXPERIMENT_LOG.md`](https://github.com/shreeharshshinde/tileguard/blob/main/docs/research/EXPERIMENT_LOG.md).
- For complete high-resolution figure captions and statistical proofs, see [`docs/research/FIGURES.md`](https://github.com/shreeharshshinde/tileguard/blob/main/docs/research/FIGURES.md).
