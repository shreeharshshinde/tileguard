# Real-World Finding: Self-Intersection in Tokyo Production Tile

**Discovered:** 2026-08-08  
**Tile source:** OpenMapTiles (central Tokyo, z14)  
**File:** `fixtures/real-tiles/tokyo.pbf` (403 KB)  
**Rule:** `tile/self-intersection`

---

## The Finding

TileGuard detected a genuine geometry defect in a production vector tile downloaded from OpenMapTiles — a tile that renders correctly in MapLibre GL and passes all visual inspection.

```json
{
  "ruleId": "tile/self-intersection",
  "severity": "error",
  "message": "Geometry in layer \"transportation\", feature \"733\" has intersecting segments \"1\" and \"4\".",
  "location": {
    "layer": "transportation",
    "featureIndex": 733,
    "partIndex": 5
  },
  "suggestion": "Simplify or repair this geometry so non-adjacent segments do not cross."
}
```

---

## What This Means

- **Layer:** `transportation` — roads, railways, and paths
- **Feature 733:** A specific road/path geometry in central Tokyo
- **Part 5:** The 6th linestring within the multi-geometry
- **Segments 1 and 4:** Line segment connecting vertices 1→2 physically crosses the segment connecting vertices 4→5

The geometry forms a "bowtie" or "figure-8" at the coordinate level — two non-adjacent segments of the same linestring cross each other. This is an OGC Simple Features geometry validity violation.

---

## Why This Matters

1. **Invisible to humans.** The tile renders correctly. No visual inspection would catch this.
2. **Silent data quality issue.** At the integer grid level (extent: 4096), the crossing may be sub-pixel, but it indicates the tile generator's line simplification algorithm produced a degenerate result.
3. **Potential downstream impact:**
   - Incorrect area calculations if the line is used as a polygon boundary
   - Rendering artifacts in strict-mode renderers
   - Topology validation failures in GIS processing pipelines that consume this tile

---

## How TileGuard Found It

```bash
$ tileguard check fixtures/real-tiles/tokyo.pbf

fixtures/real-tiles/tokyo.pbf
  ✗ tile/self-intersection
    Geometry in layer "transportation", feature "733" has intersecting segments "1" and "4".
    at fixtures/real-tiles/tokyo.pbf → layer: transportation, feature: 733, part: 5
    ℹ Simplify or repair this geometry so non-adjacent segments do not cross.

────────────────────────────────────────
  1 error in 1 source
```

**Time to detect:** <50ms on a standard laptop.

---

## The Broader Point

This single finding demonstrates the core value proposition of TileGuard:

- A 403 KB production tile with thousands of features and hundreds of thousands of coordinate pairs
- One subtle geometry defect that no manual review process would ever catch
- Detected automatically in milliseconds by a configurable rule
- Structured diagnostic output ready for CI integration

**This is what automated quality gates do.** The same principle ESLint applies to JavaScript — catching what humans miss, consistently, on every commit.

---

## Presentation Context

Use this finding during the FOSS4G 2026 demo to show:

1. Run `tileguard check` against the real Tokyo tile (live)
2. Show the single diagnostic — explain what a self-intersection means geometrically
3. Switch to the Inspector to visualize the crossing (camera animates to feature 733)
4. Make the point: "This tile is in production today. It renders fine. Nobody reported it. TileGuard found it in 50 milliseconds."
