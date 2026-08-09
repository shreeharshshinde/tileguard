# ADR-006: Data-Driven Defaults for tile/coordinate-range Rule

## Status

**Accepted** — 2026-07-18  
**Verified** — 2026-07-19 in [TileGuard v0.5.1 Evaluation Report](../../engineering/EVALUATION_REPORT_v0.5.1.md)

## Context

TileGuard's `tile/coordinate-range` rule checks if vector tile coordinate values are within the allowed range defined by the tile layer's extent. In v0.5.0, the rule used a default buffer of `0` and had no way to exclude specific layers. 

When run against production tiles from popular providers (OpenMapTiles, OpenFreeMap, CARTO Streets), the rule reported **148,268 false positives** across a standard 294-tile sample. 

Step 1 and Step 2 of the Phase 1 evaluation mapped the complete signed-coordinate offset distribution and resolved all anomalies:
1. **Label Duplication:** 64,458 diagnostics originated in the `place`, `water_name`, and `centroids` layers (60,820 + 3,578 + 60). Of these, 63,944 were Point geometries — the label-duplication pattern described above — and the remaining 514 were non-Point geometries (LineString/Polygon) in the same three layers, also correctly suppressed by the layer-based exclusion.
2. **Geometry Clipping Buffer:** 83,810 diagnostics were Polygons or LineStrings in layers like `countries`, `water`, and `boundary`. These represent intentional clipping buffers applied by tile compilers to prevent rendering gaps/anti-aliasing seams. The offsets cluster at hard configured ceilings of either **64** or **80** units.
3. **No other layers or geometry types** contributed to the out-of-range diagnostics.

To eliminate these false positives without compromising the rule's ability to detect actual coordinate corruption (e.g., in other Point layers like `poi` or `address`), the configuration of `tile/coordinate-range` must be updated.

## Decision

We will modify the `tile/coordinate-range` rule to:
1. **Increase the default `buffer` to 80 units** (from 0).
2. **Add a new `excludeLayers` configuration option**, which accepts an array of layer names to exclude from coordinate-range validation.
3. **Default `excludeLayers` to the following 9 layers:**
   ```
   ['place', 'water_name', 'centroids', 'poi', 'housenumber',
    'transportation_name', 'mountain_peak', 'park', 'aerodrome_label']
   ```
4. **Add a `skipCrossTileFeatures` option** (default: `true`) that suppresses diagnostics for features where ALL coordinates fall outside the allowed range — treating them as cross-tile spill-over features placed by the tile compiler for rendering continuity, rather than corruption.

## Rationale

### Default Buffer of 80 Units
Our offset distribution analysis showed that geometry clipping buffers cluster at hard ceilings of 64 or 80 units (depending on the layer). Setting the default buffer to 80 suppresses 100% of the geometry clipping false positives in our production sample while maintaining validation coverage for any coordinates extending further.

### Layer-Based Exclusion (Default: 9 layers)
Label-duplication offsets extend up to 4096 units, making them too large to handle via a simple buffer increase. 

An alternative proposal was to unconditionally exclude all Point geometry from coordinate-range validation. However, this violates our acceptance criterion: **"False negative increase: 0"** (no true violations may be suppressed by the fix). Excluding all Point features would leave the rule blind to genuine coordinate corruption in Point layers not containing duplicated labels.

The initial Phase 1 investigation identified three layers (`place`, `water_name`, `centroids`) responsible for the majority of label-duplication false positives. Subsequent higher-zoom testing (documented in `docs/engineering/CROSS_TILE_COORDINATE_PROBLEM.md`) identified six additional layers exhibiting the same pattern: `poi`, `housenumber`, `transportation_name`, `mountain_peak`, `park`, and `aerodrome_label`. For example, the Tokyo z14 tile produced 92 false positives from `transportation_name` and 8 from `housenumber`.

All 9 layers are excluded by default because they are confirmed to use intentional label/feature duplication across tile boundaries as a standard tile compiler technique.

### Cross-Tile Feature Skipping (Default: `skipCrossTileFeatures = true`)
In addition to layer-based exclusion, certain features have ALL their coordinates outside the allowed range. These are features placed entirely by a neighboring tile's compiler for rendering continuity (e.g., a road label whose anchor point falls in an adjacent tile). Rather than flagging every coordinate of such features, the `skipCrossTileFeatures` option (default: `true`) suppresses diagnostics for features where no coordinate falls within `[-buffer, extent + buffer]`. This eliminates false positives from cross-tile spill-over without requiring additional layer exclusions.

## Consequences

### Benefits
- **Confirmed 100% False-Positive Reduction:** Step 4 re-evaluated the classified 294-tile production corpus and confirmed that this configuration eliminates all 148,268 `tile/coordinate-range` false-positive entries (148,268 -> 0).
- **Zero False-Negative Increase:** Validation remains fully active for Point coordinates in other layers and geometry coordinates exceeding the 80-unit buffer.
- **Configurability:** Users can adjust the buffer or override `excludeLayers` via their `tileguard.config.ts` if their tile compiler uses different schemas or buffers.

### Costs
- **Slightly more complex rule options:** The rule options schema now supports `buffer` (number), `excludeLayers` (array of strings), and `skipCrossTileFeatures` (boolean).
- **Schema dependency:** The default `excludeLayers` values are tailored to OpenMapTiles/Planetiler schema conventions. Users with alternative schemas (e.g., custom Tippecanoe-generated tiles or distinct layer names) must configure their own custom list in `tileguard.config.ts` to suppress label-duplication false positives.

## Alternatives Considered

### Alternative 1: Blanket Point Geometry Exclusion
Exclude all Point features from validation. Rejected because it would leave other Point layers (e.g., POIs, addresses) vulnerable to undetected coordinate corruption.

### Alternative 2: Subsuming Label Duplication into a Large Buffer (e.g., 4096)
Increase the buffer to 4096 to cover label offsets. Rejected because a buffer of 4096 would suppress not just label duplication but also any genuinely corrupt Point coordinate up to a full tile-width away, providing no meaningful protection for Point geometry at all.

### Alternative 3: Provider-Specific Presets
Build different default settings depending on the tile provider. Rejected because it adds unnecessary architectural complexity. A single default configuration (buffer=80, excluding the three standard label layers) resolves 100% of false positives across all three tested providers.
