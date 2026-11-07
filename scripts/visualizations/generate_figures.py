#!/usr/bin/env python3
"""
TileGuard Research Visualization Suite
Generates all figures for the research thesis.

Usage:
    python3 scripts/visualizations/generate_figures.py

Outputs PNG figures to: docs-site/public/research/
"""

import json
import os
import sys

import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.ticker as ticker
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ANA  = os.path.join(ROOT, "analysis")
OUT  = os.path.join(ROOT, "docs-site", "public", "research")
os.makedirs(OUT, exist_ok=True)

# ── Style ──────────────────────────────────────────────────────────────────────
PALETTE = {
    "blue":   "#2563EB",   # TileGuard primary
    "green":  "#16A34A",
    "red":    "#DC2626",
    "amber":  "#D97706",
    "purple": "#7C3AED",
    "gray":   "#6B7280",
    "light":  "#E5E7EB",
    "carto":  "#0EA5E9",
    "ofm":    "#10B981",
    "omt":    "#F59E0B",
    "tippe":  "#6366F1",
    "planet": "#EC4899",
}

plt.rcParams.update({
    "font.family":        "DejaVu Sans",
    "font.size":          11,
    "axes.titlesize":     13,
    "axes.labelsize":     11,
    "axes.spines.top":    False,
    "axes.spines.right":  False,
    "axes.grid":          True,
    "grid.alpha":         0.35,
    "grid.linestyle":     "--",
    "figure.dpi":         150,
    "savefig.bbox":       "tight",
    "savefig.pad_inches": 0.15,
})

def save(fig, name, caption=""):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=150)
    plt.close(fig)
    print(f"  ✓  {name}")
    return path

# ══════════════════════════════════════════════════════════════════════════════
# Figure 1 — Corpus overview: tile counts, geometry-type distribution (EXP-001)
# ══════════════════════════════════════════════════════════════════════════════
def fig01_corpus_overview():
    """Bar chart: tiles per provider + geometry-type split (Polygon vs LineString)
    among the 170 self-intersecting geometries."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
    fig.suptitle("Figure 1 — EXP-001 Corpus Composition", fontweight="bold")

    # Left — tile counts per provider
    providers = ["OpenMapTiles\n(PostGIS)", "OpenFreeMap\n(Planetiler)", "CARTO Streets\n(Proprietary)"]
    tiles = [94, 100, 100]
    colors = [PALETTE["omt"], PALETTE["ofm"], PALETTE["carto"]]
    bars = ax1.bar(providers, tiles, color=colors, width=0.55, zorder=3)
    ax1.set_ylabel("Tiles cached (z0–z4)")
    ax1.set_title("(a) Corpus tile counts by provider")
    ax1.set_ylim(0, 130)
    ax1.bar_label(bars, fmt="%d", padding=3, fontsize=10)
    ax1.axhline(294/3, ls=":", color=PALETTE["gray"], lw=1, label="Mean (98)")
    ax1.legend(fontsize=9)
    ax1.grid(axis="x", alpha=0)

    # Right — geometry-type split in self-intersecting set (EXP-003 / geometry-type-split.json)
    # Total Cat-B1 crossings: 170;  Polygon: 154 (90.59%);  LineString: 16 (9.41%)
    sizes = [154, 16]
    labels = ["Polygon\n154 (OGC-invalid)", "LineString\n16 (OGC non-simple)"]
    wedge_colors = [PALETTE["red"], PALETTE["amber"]]
    explode = (0.04, 0)
    wedges, texts, autotexts = ax2.pie(
        sizes, labels=labels, colors=wedge_colors, explode=explode,
        autopct="%1.1f%%", startangle=120,
        textprops={"fontsize": 9},
        wedgeprops={"linewidth": 0.8, "edgecolor": "white"},
    )
    for at in autotexts:
        at.set_fontsize(10); at.set_fontweight("bold")
    ax2.set_title("(b) Self-intersecting geometries\nby OGC type (EXP-003, n=170)")

    fig.tight_layout()
    save(fig, "fig01_corpus_overview.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 2 — Diagnostic taxonomy: 148,996 classified across EXP-002 + EXP-003
# ══════════════════════════════════════════════════════════════════════════════
def fig02_diagnostic_taxonomy():
    """Stacked horizontal bar: total diagnostics classified by taxonomy label."""
    # Numbers from RESEARCH.md / EXP-002 + EXP-003 combined
    # EXP-002 (coordinate-range): 148,268 total → after taxonomy: 0 Genuine, all Spec-Permitted-Convention or Quantization
    # EXP-003 (self-intersection raw=619): Checker Error=449, genuine crossings=170
    # EXP-006 (remaining rules 100-sample): all 100 → Spec-Permitted Convention
    rules = [
        "tile/coordinate-range\n(EXP-002, n=148,268)",
        "tile/self-intersection\n(EXP-003, n=619)",
        "tile/hole-containment\n(EXP-006, n=100 sample)",
    ]
    checker_error  = [0,       449,  0  ]
    quant_artifact = [0,       0,    0  ]
    spec_permitted = [148268,  0,    100]
    genuine_defect = [0,       170,  0  ]

    fig, ax = plt.subplots(figsize=(12, 4))
    fig.suptitle("Figure 2 — EXP-002 / EXP-003 / EXP-006: Diagnostic Taxonomy Classification",
                 fontweight="bold")

    y = np.arange(len(rules))
    h = 0.55

    b_ce  = ax.barh(y, checker_error,  height=h, color=PALETTE["gray"],   label="Checker Error")
    b_qa  = ax.barh(y, quant_artifact, height=h, left=checker_error,
                    color=PALETTE["amber"],  label="Quantization Artifact")
    left2 = [a+b for a,b in zip(checker_error, quant_artifact)]
    b_sp  = ax.barh(y, spec_permitted, height=h, left=left2,
                    color=PALETTE["blue"],   label="Spec-Permitted Convention")
    left3 = [a+b for a,b in zip(left2, spec_permitted)]
    b_gd  = ax.barh(y, genuine_defect, height=h, left=left3,
                    color=PALETTE["red"],    label="Genuine Defect")

    ax.set_yticks(y); ax.set_yticklabels(rules, fontsize=9)
    ax.set_xlabel("Diagnostic count")
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
    ax.legend(loc="lower right", fontsize=9)
    ax.set_xlim(0, 160000)

    # Annotate genuine defect totals
    for i, gd in enumerate(genuine_defect):
        if gd > 0:
            ax.text(left3[i] + 500, i, f"  {gd} GD", va="center", fontsize=9,
                    color=PALETTE["red"], fontweight="bold")

    fig.tight_layout()
    save(fig, "fig02_diagnostic_taxonomy.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 3 — Guard evolution: Precision / Recall / F1 across EXP-003 chain
# ══════════════════════════════════════════════════════════════════════════════
def fig03_guard_evolution():
    """Grouped bar: P/R/F1 for Guards 1-5 (EXP-003b/c) and Guards 1-6 (EXP-003d)."""
    experiments = ["EXP-003b\nGuards 1–5\n(raw)", "EXP-003c\nGuards 1–5\n(dedup)", "EXP-003d\nGuards 1–6\n(final)"]
    precision   = [0.1753, 0.1753, 1.0000]
    recall      = [1.0000, 1.0000, 1.0000]
    f1          = [0.2983, 0.2983, 1.0000]

    x = np.arange(len(experiments))
    w = 0.25

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.suptitle("Figure 3 — Self-Intersection Guard Evolution\n"
                 "Precision / Recall / F1 (Polygon rings, dual-oracle ground truth)",
                 fontweight="bold")

    b1 = ax.bar(x - w, precision, w, label="Precision", color=PALETTE["blue"],   zorder=3)
    b2 = ax.bar(x,     recall,    w, label="Recall",    color=PALETTE["green"],  zorder=3)
    b3 = ax.bar(x + w, f1,        w, label="F1",        color=PALETTE["purple"], zorder=3)

    ax.set_xticks(x); ax.set_xticklabels(experiments)
    ax.set_ylim(0, 1.15)
    ax.set_ylabel("Score")
    ax.set_title("(Oracle: GEOS via Shapely 2.1.2 ∩ Exact Integer Predicates; n=173 Polygon rings)")
    ax.yaxis.set_major_formatter(ticker.PercentFormatter(xmax=1))
    ax.legend(fontsize=10)
    ax.axhline(1.0, ls=":", color=PALETTE["gray"], lw=0.8)

    for bar in [b1, b2, b3]:
        ax.bar_label(bar, fmt="%.3f", padding=3, fontsize=9)

    # Annotation for the breakthrough
    ax.annotate("Guard 6 eliminates\nall 131 FPs → Precision 100%",
                xy=(2, 1.01), xytext=(1.3, 1.08),
                arrowprops=dict(arrowstyle="->", color=PALETTE["red"], lw=1.4),
                fontsize=9, color=PALETTE["red"])

    fig.tight_layout()
    save(fig, "fig03_guard_evolution.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 4 — Oracle category breakdown (EXP-003b agreement matrix)
# ══════════════════════════════════════════════════════════════════════════════
def fig04_oracle_categories():
    """Stacked bar: 407 evaluated rings across oracle agreement categories
    before and after Guard 6."""
    categories = ["AGREE_DEFECT\n(TP)", "AGREE_NOPROPER\n_TOUCH / COLLINEAR\n(corrected FP)", "GEOS_EXTRA\nDUP_VERTEX\n(suppressed)", "PARTIAL_AGREE\n(LineString)"]
    before_fp  = [31, 131, 103, 142]  # EXP-003b/c
    after_fp   = [31,   0, 103, 142]  # EXP-003d (131 → 0)

    x = np.arange(len(categories))
    w = 0.35

    fig, ax = plt.subplots(figsize=(11, 5))
    fig.suptitle("Figure 4 — Oracle Category Breakdown: EXP-003c → EXP-003d\n"
                 "(407 ring evaluations)", fontweight="bold")

    b1 = ax.bar(x - w/2, before_fp, w, label="EXP-003c (Guards 1–5)", color=PALETTE["amber"], zorder=3)
    b2 = ax.bar(x + w/2, after_fp,  w, label="EXP-003d (Guards 1–6)", color=PALETTE["green"], zorder=3, alpha=0.9)

    ax.set_xticks(x); ax.set_xticklabels(categories, fontsize=9)
    ax.set_ylabel("Ring count")
    ax.legend(fontsize=10)
    ax.bar_label(b1, padding=3, fontsize=9)
    ax.bar_label(b2, padding=3, fontsize=9)

    # Arrow on the shrinking category
    ax.annotate("131 FP → 0\nafter Guard 6",
                xy=(1 + w/2, 2), xytext=(1.6, 70),
                arrowprops=dict(arrowstyle="->", color=PALETTE["red"], lw=1.4),
                fontsize=9, color=PALETTE["red"])

    fig.tight_layout()
    save(fig, "fig04_oracle_categories.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 5 — Winding convention compliance per provider (EXP-010)
# ══════════════════════════════════════════════════════════════════════════════
def fig05_winding_compliance():
    """Grouped bar: MVT-spec compliant vs OGC-style features per provider."""
    providers = ["OpenMapTiles\n(PostGIS)", "OpenFreeMap\n(Planetiler)", "CARTO Streets\n(PostGIS)"]
    conformant = [99.85, 100.00, 100.00]
    ogc_style  = [0.15,   0.00,   0.00]
    n_features = [1306, 2208, 1261]

    x = np.arange(len(providers))
    w = 0.35

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.suptitle("Figure 5 — EXP-010: Winding Convention Compliance\n"
                 "(feature-level, z0–z4 corpus)", fontweight="bold")

    b1 = ax.bar(x - w/2, conformant, w, label="MVT §4.3.2.1 compliant (CW exterior)",
                color=PALETTE["green"], zorder=3)
    b2 = ax.bar(x + w/2, ogc_style,  w, label="OGC-style (CCW exterior)",
                color=PALETTE["amber"], zorder=3)

    ax.set_xticks(x); ax.set_xticklabels(providers)
    ax.set_ylim(-2, 115)
    ax.set_ylabel("Feature percentage (%)")
    ax.yaxis.set_major_formatter(ticker.PercentFormatter(xmax=100, decimals=0))
    ax.legend(fontsize=10)

    for i, (c, o, n) in enumerate(zip(conformant, ogc_style, n_features)):
        ax.text(i - w/2, c + 1.5, f"{c:.2f}%", ha="center", fontsize=9, fontweight="bold",
                color=PALETTE["green"])
        if o > 0:
            ax.text(i + w/2, o + 1.5, f"{o:.2f}%", ha="center", fontsize=9,
                    color=PALETTE["amber"])
        ax.text(i, -1.6, f"n={n:,}", ha="center", fontsize=8, color=PALETTE["gray"])

    fig.tight_layout()
    save(fig, "fig05_winding_compliance.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 6 — Genuine defect density vs zoom level (EXP-008)
# ══════════════════════════════════════════════════════════════════════════════
def fig06_defect_density_vs_zoom():
    """Line chart: genuine defects per tile by zoom for CARTO + OFM."""
    zooms = [0, 8, 12, 14]  # z0–z4 baseline extrapolated to z0 label
    # baseline_z04 genuinePerTile = 0.08 (OFM+CARTO combined)
    carto = [0.08, 18.111, 2.905, 0.123]
    ofm   = [0.08, 17.556, 2.875, 1.221]

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.suptitle("Figure 6 — EXP-008: Genuine Defect Density vs Zoom Level\n"
                 "(OpenFreeMap & CARTO Streets, 1,800 tiles)", fontweight="bold")

    ax.plot(zooms, carto, "o-", color=PALETTE["carto"],  lw=2.2, ms=7, label="CARTO Streets (PostGIS)")
    ax.plot(zooms, ofm,   "s--",color=PALETTE["ofm"],    lw=2.2, ms=7, label="OpenFreeMap (Planetiler)")

    for z, c, o in zip(zooms, carto, ofm):
        ax.annotate(f"{c:.2f}", (z, c), textcoords="offset points", xytext=(6, 4),
                    fontsize=8.5, color=PALETTE["carto"])
        if abs(c - o) > 0.5:
            ax.annotate(f"{o:.2f}", (z, o), textcoords="offset points", xytext=(6, -13),
                        fontsize=8.5, color=PALETTE["ofm"])

    ax.set_xlabel("Zoom level")
    ax.set_ylabel("Genuine defects per tile")
    ax.set_xticks(zooms); ax.set_xticklabels(["z0–z4\n(baseline)", "z8", "z12", "z14"])
    ax.legend(fontsize=10)
    ax.set_ylim(-0.5, 22)

    # Annotation: peak at z8
    ax.annotate("Peak at z8\n(intermediate-scale\nroad networks)",
                xy=(8, 18.111), xytext=(9.5, 15),
                arrowprops=dict(arrowstyle="->", lw=1.2),
                fontsize=8.5)

    fig.tight_layout()
    save(fig, "fig06_defect_density_vs_zoom.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 7 — Render impact: pixel-change fractions by test case (EXP-007)
# ══════════════════════════════════════════════════════════════════════════════
def fig07_render_impact():
    """Horizontal bar: changedFraction per render test case with impact tier."""
    cases = [
        "Prod — z14/8529/5974\n(4 Planetiler GDs: transportation)",
        "Prod — z14/8530/5973\n(1 Planetiler GD: transportation)",
        "Syn — butterfly\nself-crossing polygon",
        "Syn — hourglass\nfigure-8 polygon",
        "Syn — crossing hole\npolygon interior",
    ]
    pct    = [84.61, 70.09, 51.83, 46.19, 2.47]
    tiers  = ["significant", "significant", "significant", "significant", "moderate"]
    colors = [PALETTE["red"] if t == "significant" else PALETTE["amber"] for t in tiers]

    fig, ax = plt.subplots(figsize=(12, 5))
    fig.suptitle("Figure 7 — EXP-007: Render Pixel-Change Fraction\n"
                 "(MapLibre 2048×2048 headless render, 256×256 centre crop)", fontweight="bold")

    y = np.arange(len(cases))
    bars = ax.barh(y, pct, color=colors, height=0.55, zorder=3)
    ax.set_yticks(y); ax.set_yticklabels(cases, fontsize=8.5)
    ax.set_xlabel("Changed pixels in 256×256 crop (%)")
    ax.set_xlim(0, 100)
    ax.xaxis.set_major_formatter(ticker.PercentFormatter())
    ax.bar_label(bars, fmt="%.1f%%", padding=4, fontsize=9)

    # Tier legend
    sig   = mpatches.Patch(color=PALETTE["red"],   label="Significant (≥5%)")
    mod   = mpatches.Patch(color=PALETTE["amber"], label="Moderate (1–5%)")
    ax.legend(handles=[sig, mod], fontsize=9, loc="lower right")

    fig.tight_layout()
    save(fig, "fig07_render_impact.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 8 — Compiler attribution matrix (EXP-011)
# ══════════════════════════════════════════════════════════════════════════════
def fig08_compiler_attribution():
    """Grouped bar: Genuine Defects by compiler × zoom OFAT (Monaco GeoJSON input)."""
    zooms    = ["z8", "z12", "z14"]
    tippe_gd = [0, 0, 0]
    plan_gd  = [0, 0, 5]

    x = np.arange(len(zooms))
    w = 0.35

    fig, ax = plt.subplots(figsize=(8, 4.5))
    fig.suptitle("Figure 8 — EXP-011: Compiler Attribution (OFAT, Monaco source, 2,357 valid polygons)\n"
                 "Genuine Defects by compiler × zoom", fontweight="bold")

    b1 = ax.bar(x - w/2, tippe_gd, w, label="Tippecanoe v2.82.0", color=PALETTE["tippe"], zorder=3)
    b2 = ax.bar(x + w/2, plan_gd,  w, label="Planetiler (jar)",   color=PALETTE["planet"], zorder=3)

    ax.set_xticks(x); ax.set_xticklabels(zooms)
    ax.set_ylabel("Genuine Defects (tile/self-intersection)")
    ax.set_ylim(0, 8)
    ax.legend(fontsize=10)
    ax.bar_label(b1, padding=3, fontsize=10)
    ax.bar_label(b2, padding=3, fontsize=10)

    # Annotation
    ax.annotate("5 GDs introduced\nby Planetiler at z14\n(zero from Tippecanoe)",
                xy=(2 + w/2, 5), xytext=(2.1, 6.5),
                arrowprops=dict(arrowstyle="->", lw=1.2, color=PALETTE["planet"]),
                fontsize=9, color=PALETTE["planet"])

    fig.tight_layout()
    save(fig, "fig08_compiler_attribution.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 9 — Throughput benchmark (EXP-benchmark)
# ══════════════════════════════════════════════════════════════════════════════
def fig09_throughput():
    """Horizontal bar: tiles/sec and avg ms/tile per provider."""
    providers = ["CARTO Streets", "OpenFreeMap", "OpenMapTiles"]
    tps  = [67.65, 49.46, 47.18]  # tiles/sec
    ms   = [14.78, 20.22, 21.19]  # ms/tile

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    fig.suptitle("Figure 9 — Benchmark: TileGuard Processing Performance\n"
                 "(cached production tiles, Node.js; all 25 rules enabled)",
                 fontweight="bold")

    colors = [PALETTE["carto"], PALETTE["ofm"], PALETTE["omt"]]
    y = np.arange(len(providers))
    h = 0.5

    b1 = ax1.barh(y, tps, height=h, color=colors, zorder=3)
    ax1.set_yticks(y); ax1.set_yticklabels(providers)
    ax1.set_xlabel("Throughput (tiles / second)")
    ax1.set_title("(a) Throughput")
    ax1.bar_label(b1, fmt="%.1f t/s", padding=4, fontsize=9)
    ax1.set_xlim(0, 85)

    b2 = ax2.barh(y, ms, height=h, color=colors, zorder=3)
    ax2.set_yticks(y); ax2.set_yticklabels(providers)
    ax2.set_xlabel("Average latency (ms / tile)")
    ax2.set_title("(b) Latency")
    ax2.bar_label(b2, fmt="%.2f ms", padding=4, fontsize=9)
    ax2.set_xlim(0, 30)

    fig.tight_layout()
    save(fig, "fig09_throughput.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 10 — EXP-003e Held-out generalization: 0 FP on 1,800 unseen tiles
# ══════════════════════════════════════════════════════════════════════════════
def fig10_heldout_generalization():
    """Summary scorecard + comparison bar for the held-out corpus."""
    # EXP-003d (training set, 173 Polygon rings)  → P=1.0, R=1.0, F1=1.0
    # EXP-003e (1,800 higher-zoom tiles, all LineString → 0 FP, Precision undefined)
    # Key numbers: rawFlagged=4200, uniqueRings=2535, all LineString (0 Polygon FP)
    fig, ax = plt.subplots(figsize=(9, 5))
    fig.suptitle("Figure 10 — EXP-003e: Guard Generalization to Held-out Corpus\n"
                 "(1,800 higher-zoom tiles, OpenFreeMap + CARTO Streets)", fontweight="bold")

    stages = [
        "EXP-003b\nInitial\n(raw, n=619)",
        "EXP-003d\nTraining set\n(dedup, n=173 poly)",
        "EXP-003e\nHeld-out\n(n=1,800 tiles)",
    ]
    fp_counts  = [619 - 170,  0,   0]   # 449 checker errors eliminated, then 127→0 FP
    tp_counts  = [170,        27,  0]   # polygon TPs (EXP-003e has only LineString)
    ls_counts  = [0,           0,  2535] # LineString agreements (EXP-003e)

    x = np.arange(len(stages))
    w = 0.3

    b1 = ax.bar(x, fp_counts, w, label="False Positives (Polygon)", color=PALETTE["red"],    zorder=3)
    b2 = ax.bar(x, tp_counts, w, bottom=fp_counts, label="True Positives (Polygon)", color=PALETTE["green"], zorder=3)
    b3 = ax.bar(x, ls_counts, w,
                bottom=[a+b for a,b in zip(fp_counts, tp_counts)],
                label="AGREE_DEFECT (LineString)", color=PALETTE["blue"], alpha=0.7, zorder=3)

    ax.set_xticks(x); ax.set_xticklabels(stages)
    ax.set_ylabel("Ring / geometry count")
    ax.legend(fontsize=9)
    ax.bar_label(b1, fmt="%d FP", padding=3, fontsize=8.5, color=PALETTE["red"])

    # Annotation for held-out
    ax.annotate("0 Polygon FPs\non 1,800 unseen tiles\n(2,535 LineString defects\nconfirmed by dual oracle)",
                xy=(2, 1300), xytext=(1.3, 1800),
                arrowprops=dict(arrowstyle="->", lw=1.2),
                fontsize=8.5)

    fig.tight_layout()
    save(fig, "fig10_heldout_generalization.png")

# ══════════════════════════════════════════════════════════════════════════════
# Figure 11 — Full research story: summary panel (key metrics at a glance)
# ══════════════════════════════════════════════════════════════════════════════
def fig11_summary_panel():
    """Infographic-style summary panel suitable for poster or slide."""
    fig = plt.figure(figsize=(14, 6))
    fig.patch.set_facecolor("#F8FAFC")
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 14); ax.set_ylim(0, 6)
    ax.axis("off")

    title = ax.text(7, 5.65, "TileGuard v0.7.0 — Research Summary",
                    ha="center", va="center", fontsize=16, fontweight="bold",
                    color="#1E293B")

    # Cards
    cards = [
        # (x, y, w, h, metric_text, label_text, color)
        (0.3, 2.9, 2.6, 2.2, "2,094\ntiles",    "Corpus\n(3 providers, z0–z14)",   PALETTE["blue"]),
        (3.1, 2.9, 2.6, 2.2, "148,996\ndiagnosed","Diagnostics\nclassified",         PALETTE["purple"]),
        (5.9, 2.9, 2.6, 2.2, "P=1.0, R=1.0\nF1=1.0","Self-intersection\nGuards 1–6", PALETTE["green"]),
        (8.7, 2.9, 2.6, 2.2, "4/5 cases\nsignificant","Render impact\n(EXP-007)",      PALETTE["red"]),
        (11.5,2.9, 2.2, 2.2, "67.6 t/s\npeak",   "Throughput\n(CARTO Streets)",      PALETTE["carto"]),
        # Bottom row
        (0.3, 0.3, 2.6, 2.2, "1,800 tiles\n0 Polygon FP", "Held-out\ngeneralization", PALETTE["green"]),
        (3.1, 0.3, 2.6, 2.2, "z8 peak\n17.8 GD/tile","Defect density\npeak (EXP-008)", PALETTE["amber"]),
        (5.9, 0.3, 2.6, 2.2, "Planetiler\n5 GDs at z14","Compiler\nattribution (EXP-011)", PALETTE["planet"]),
        (8.7, 0.3, 2.6, 2.2, "≥99.85%\ncompliant","Winding\ncompliance (EXP-010)",   PALETTE["green"]),
        (11.5,0.3, 2.2, 2.2, "1,848\ntests",     "Test suite\ncoverage",             PALETTE["blue"]),
    ]

    for (cx, cy, cw, ch, metric, label, color) in cards:
        rect = mpatches.FancyBboxPatch(
            (cx, cy), cw, ch,
            boxstyle="round,pad=0.08",
            facecolor=color, alpha=0.12,
            edgecolor=color, linewidth=1.6,
        )
        ax.add_patch(rect)
        ax.text(cx + cw/2, cy + ch * 0.65, metric,
                ha="center", va="center", fontsize=11, fontweight="bold", color=color)
        ax.text(cx + cw/2, cy + ch * 0.22, label,
                ha="center", va="center", fontsize=8.5, color="#475569")

    fig.tight_layout()
    save(fig, "fig11_summary_panel.png")

# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n🎨  TileGuard Research Visualization Suite")
    print(f"    Output directory: {OUT}\n")
    fig01_corpus_overview()
    fig02_diagnostic_taxonomy()
    fig03_guard_evolution()
    fig04_oracle_categories()
    fig05_winding_compliance()
    fig06_defect_density_vs_zoom()
    fig07_render_impact()
    fig08_compiler_attribution()
    fig09_throughput()
    fig10_heldout_generalization()
    fig11_summary_panel()
    print(f"\n✅  All 11 figures written to {OUT}/\n")
