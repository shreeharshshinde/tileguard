# The Cross-Tile Coordinate Problem: An Open Question

**Status:** Active research question for FOSS4G 2026 community discussion  
**Rule:** `tile/coordinate-range`  
**Core tension:** Distinguishing intentional cross-tile feature duplication from genuine coordinate corruption — without hardcoding tile provider layer names.

---

## The Problem

Vector tile generators (Planetiler, OpenMapTiles, Tippecanoe, etc.) intentionally place features **outside** the tile extent for cross-tile rendering. This is correct behavior — but it creates false positives for coordinate range validation.

### Why tiles have out-of-range coordinates

When a renderer draws tile boundaries, labels and geometries at the edge get clipped. To prevent this:

1. **Label duplication** — Point features (POIs, place names, house numbers) are duplicated into adjacent tiles, often hundreds of coordinate units outside the extent
2. **Geometry continuation** — LineStrings (road names, ridgelines, boundaries) extend past the tile to allow text-along-path rendering
3. **Clipping buffer** — Polygon/Line geometry is clipped with a small buffer (~8-80 units) beyond the extent to prevent seams

### The three categories

| Category | Geometry type | Typical offset | Example |
|----------|--------------|----------------|---------|
| **Label duplication** | Point | 200–5000+ units | POI at `(-640, 2709)` for label rendering |
| **Geometry continuation** | LineString | 100–1600 units | Road name path extending across tile boundary |
| **Clipping buffer overflow** | Polygon/Line | 1–80 units | Polygon edge just past the tile extent |

Only category 3 is a genuine violation when it exceeds the expected buffer. Categories 1 and 2 are intentional.

---

## What TileGuard Does Today (v0.5.0)

We use a **two-layer approach**:

### Layer 1: Algorithmic detection (`skipCrossTileFeatures`)

If **every single coordinate** in a feature is outside the allowed range (extent + buffer), the feature is entirely duplicated from an adjacent tile. Skip it automatically.

```typescript
// Feature with ALL vertices outside → cross-tile duplication → skip
// Feature with SOME inside, SOME outside → needs further analysis
function isEntirelyOutsideTile(feature, extent, buffer): boolean
```

This handles **all Point-type label duplication** regardless of layer name (every tile provider, every naming convention).

### Layer 2: Named layer exclusion (`excludeLayers`)

For features that have vertices **both inside and outside** the tile (geometry continuation), we maintain a default exclusion list:

```typescript
const DEFAULT_EXCLUDE_LAYERS = [
  'place', 'water_name', 'centroids',
  'poi', 'housenumber', 'transportation_name',
  'mountain_peak', 'park', 'aerodrome_label',
];
```

Users can override: `{ excludeLayers: [] }` checks everything. `{ excludeLayers: ['my-layer'] }` adds custom exclusions.

---

## The Unsolved Problem

The named layer list is **fragile**:
- Every tile provider uses different layer names
- We can't enumerate all possible label/name layers across all providers
- New layers require updating the default list (maintenance burden)

The algorithmic check (`isEntirelyOutsideTile`) doesn't catch the "geometry continuation" case because these features legitimately have vertices inside the tile — they just also extend past the buffer.

---

## Candidate Solutions (For Community Discussion)

### Option A: Percentage threshold

Instead of "ALL outside" or "ANY inside," use a percentage:

```
If >80% of a feature's vertices are outside the allowed range → skip
```

**Pro:** Handles geometry continuation (ridgelines with 90% outside, 10% inside).  
**Con:** Arbitrary threshold. What percentage is "too much"? Different geometry types have different expectations.

### Option B: Entry/exit detection

If a LineString has vertices that **enter the tile** from outside (the first vertex is outside, then it crosses into the range), it's geometry continuation. If it starts inside and goes outside, it's clipping overflow.

```
Outside → Inside → Outside = continuation (skip)
Inside → Outside = clipping overflow (report)
```

**Pro:** No layer names needed. Detects the geometric pattern directly.  
**Con:** Complex implementation. Multi-part geometries need careful handling.

### Option C: Buffer-relative scoring

Different distance thresholds for different geometry types:
- Points: report if within 2× buffer (label duplication is always far outside)
- Lines: report only if the feature's centroid is inside the tile (it belongs here, just overflows)
- Polygons: always report (polygon vertices should be clipped at the buffer)

**Pro:** Geometry-type-aware, handles each case correctly.  
**Con:** More parameters to tune. Centroid calculation adds complexity.

### Option D: Provider profiles

Instead of layer names, define tile provider profiles:

```typescript
rules: {
  'tile/coordinate-range': ['error', { provider: 'openmaptiles' }]
}
```

Each profile knows which layers use duplication for that specific provider.

**Pro:** Accurate per-provider behavior.  
**Con:** Maintenance burden shifts to maintaining profiles. New providers need new profiles.

### Option E: Accept the hybrid (current approach)

Keep algorithmic detection for the clear case (entirely outside) and maintain a curated default list for the ambiguous case (partially outside). Document it clearly. Let users override.

**Pro:** Works today. Handles 95%+ of production tiles correctly.  
**Con:** Layer names are fragile. Not a "pure" algorithmic solution.

---

## Empirical Evidence

### Production tiles tested

| Tile | Provider | Result (with current approach) |
|------|----------|------|
| Tokyo (403 KB, z14) | OpenMapTiles | ✔ 1 true positive (self-intersection) |
| Manhattan (3.4 KB, z6) | OpenMapTiles | ✔ 0 issues (clean pass) |
| Ocean (77 B) | OpenMapTiles | ✔ 0 issues (clean pass) |

### Without any suppression (raw algorithm)

| Tile | Total diagnostics | Breakdown |
|------|:-:|---|
| Tokyo | 101 | 92 transportation_name + 8 housenumber + 1 self-intersection |
| Manhattan | 100 | 83 mountain_peak + 17 transportation_name |

All false positives are either label duplication (Points entirely outside) or geometry continuation (Lines passing through the tile boundary).

---

## The Question for FOSS4G

> **"How should geospatial validation frameworks handle intentional cross-tile coordinate overflow?"**

Sub-questions:
1. Is there a standard or convention for how far outside the extent label features should be placed?
2. Should the MVT spec formalize a "label buffer" distinct from "geometry clipping buffer"?
3. Do other tile validation tools (Mapchete, tilesets-cli, mbutil) face the same problem?
4. Is there interest in a community-maintained registry of tile provider layer semantics?

---

## Configuration for Users Today

```typescript
// Trust the defaults (works with OpenMapTiles, Planetiler, CARTO)
rules: { 'tile/coordinate-range': 'error' }

// Strict mode — report everything, no exceptions
rules: { 'tile/coordinate-range': ['error', { excludeLayers: [], skipCrossTileFeatures: false }] }

// Custom provider with different layer names
rules: { 'tile/coordinate-range': ['error', { excludeLayers: ['my_labels', 'my_pois'] }] }

// Relaxed buffer for tiles with aggressive clipping
rules: { 'tile/coordinate-range': ['error', { buffer: 256 }] }
```
