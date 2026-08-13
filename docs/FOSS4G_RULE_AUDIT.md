# TileGuard Rule & Algorithm Audit — FOSS4G 2026 Prep

## Tile Rules (10)

---

### 1. `tile/coordinate-range`

**Purpose:** Detects vector tile coordinates that fall outside the valid range for a given layer extent + clipping buffer.

**Input assumptions:** VectorTile artifact. Each layer declares an `extent` (default 4096). Coordinates are integer values on the tile grid.

**Algorithm:**
1. For each layer (excluding configurable label layers like `place`, `water_name`, `poi`):
2. For each feature in the layer:
   - If `skipCrossTileFeatures` is true (default) and ALL coordinates are outside `[-buffer, extent+buffer]` → skip (cross-tile duplication)
3. For each coordinate `(x, y)`:
   - If `x < -buffer` or `x > extent + buffer` or same for y → report `OUT_OF_RANGE`

**Key parameters:**
- `buffer` (default: 80) — tolerance in tile units for clipping overflow
- `excludeLayers` — list of layers to skip entirely (label layers)
- `skipCrossTileFeatures` — boolean, skips features entirely outside range

**Edge cases:**
- Coordinate exactly at extent boundary (4096) → valid
- Coordinate at -80 with default buffer → valid (within buffer)
- Coordinate at -81 with default buffer → flagged
- Cross-tile label duplication (entire feature outside) → skipped by default
- Empty geometry → reports `EMPTY_GEOMETRY` instead

**Diagnostic:** `Coordinate "x,y" in layer "L" is outside allowed range [-80, 4176] (extent: 4096, buffer: 80).`

**True positive fixture:** `{x: -200, y: 0}` in roads layer → flagged (beyond any buffer)

**True negative fixture:** `{x: 0, y: 0}, {x: 4096, y: 4096}` → passes (within extent)

---

### 2. `tile/self-intersection`

**Purpose:** Detects geometry (LineString or Polygon) where non-adjacent segments cross each other.

**Input assumptions:** VectorTile with type 2 (LineString) or type 3 (Polygon) features. Point features (type 1) are skipped.

**Algorithm:** O(N²) orientation-based segment-pair comparator with 4 hardening guards:

1. **Guard 1 — Minimum-vertex:** Rings with < 4 vertices are skipped (impossible to have non-adjacent crossings)
2. **Guard 2 — Closed-LineString closure skip:** For closed LineStrings (first==last), skip the (0, segCount-1) pair (they're logically adjacent at the closing point)
3. **Guard 3 — Duplicate-vertex spike skip:** Pre-scan O(N) to find non-closing duplicate vertices (integer-grid quantization artefacts). Segment pairs whose only contact is a duplicate vertex are skipped.
4. **Guard 4 — Bounding-box pre-check:** Reject segment pairs with disjoint AABBs before calling the orientation test. Eliminates ~99.97% of pairs.

**Intersection test:** Uses `orientation(a,b,c)` cross-product (exact integer arithmetic):
- General case: endpoints of AB straddle line CD, and vice versa
- Collinear case: endpoint lies on opposite segment within bounding range

**Edge cases:**
- Bowtie polygon `(0,0)→(10,10)→(0,10)→(10,0)→(0,0)` → diagonals cross at (5,5) ✓
- Figure-8 open LineString → flagged ✓
- Simple convex polygon (triangle) → no non-adjacent pair exists → passes
- Closed boundary loop (first==last LineString) → NOT flagged (Guard 2)
- Quantization spike (duplicate vertex) → NOT flagged (Guard 3)

**Diagnostic:** `Geometry in layer "L", feature "F" has intersecting segments "i" and "j".`

**True positive fixture:** Bowtie `(0,0)→(10,10)→(0,10)→(10,0)→(0,0)` → segments 0 and 2 cross

**True negative fixture:** Simple triangle `(0,0)→(10,0)→(10,10)→(0,0)` → no crossings

**False-positive reduction (Phase 2 corpus):** 449/619 false positives eliminated (72.5%). 170 true positives preserved.

---

### 3. `tile/zero-area-ring`

**Purpose:** Detects polygon rings that enclose zero area (degenerate — collapsed to a line or point).

**Input assumptions:** Polygon features only (type 3). Non-polygon types are skipped.

**Algorithm:**
1. For each ring in a polygon feature:
2. Compute signed area using the shoelace formula:
   `area = Σ(x_i * y_{i+1} - x_{i+1} * y_i) / 2`
3. If `|area| === 0` → report `ZERO_AREA_RING`

**The shoelace formula:** Works on both open and closed ring representations. Positive = counter-clockwise, negative = clockwise, zero = degenerate.

**Edge cases:**
- Collinear points `(0,0)→(10,0)→(20,0)→(0,0)` → zero area (all on y=0 line) → flagged
- Bowtie whose positive and negative halves cancel → `|area| == 0` → flagged
- Non-polygon types (LineString, Point) → not checked

**Diagnostic:** `Polygon ring in layer "L", feature "F" has zero area.`

**True positive fixture:** Collinear ring `(0,0)→(10,0)→(20,0)→(0,0)` → area = 0

**True negative fixture:** Triangle `(0,0)→(10,0)→(10,10)→(0,0)` → area = 50 ≠ 0

---

### 4. `tile/unclosed-ring`

**Purpose:** Detects polygon rings where the first vertex ≠ last vertex.

**Input assumptions:** Polygon features only (type 3).

**Algorithm:**
1. For each ring in a polygon feature:
2. Compare `first = points[0]` and `last = points[points.length - 1]`
3. If `first.x !== last.x || first.y !== last.y` → report `UNCLOSED_RING`

**Edge cases:**
- Single pixel difference between first/last → flagged (integer comparison, no tolerance)
- LineStrings are explicitly NOT checked (they're allowed to be open)
- Empty ring (undefined first/last) → flagged

**Diagnostic:** `Polygon ring in layer "L", feature "F" is not closed.`

**True positive fixture:** Ring `(0,0)→(10,0)→(10,10)→(0,10)` (last ≠ first) → flagged

**True negative fixture:** Ring `(0,0)→(10,0)→(10,10)→(0,0)` (last == first) → passes

---

### 5. `tile/degenerate-geometry`

**Purpose:** Detects geometries with insufficient unique vertices for their type.

**Input assumptions:** VectorTile features of type 2 (LineString) or type 3 (Polygon).

**Algorithm:**
- **LineString (type 2):** If `uniquePointCount(points) < 2` → `DEGENERATE_LINE`
- **Polygon (type 3):** If `points.length < 4` OR `uniquePointCount(points) < 3` → `DEGENERATE_POLYGON`
- Empty geometry (no parts) → `EMPTY_GEOMETRY`

`uniquePointCount` uses a Set of `"x,y"` strings to count distinct coordinates.

**Rationale for thresholds:**
- A line needs at least 2 distinct points to have length
- A polygon ring needs at least 3 distinct vertices (plus a closing point = 4 raw points minimum)

**Edge cases:**
- Line with 2 identical points `(5,5)→(5,5)` → degenerate (1 unique)
- Polygon with 2 unique vertices `(0,0)→(10,0)→(0,0)` → degenerate (< 3 unique)
- Point features (type 1) → never checked

**Diagnostic:** `LineString has fewer than 2 unique points.` or `Polygon ring has fewer than 3 unique vertices.`

**True positive fixture:** LineString `(5,5)→(5,5)` → DEGENERATE_LINE

**True negative fixture:** LineString `(0,0)→(10,10)` → 2 unique points → passes

---

### 6. `tile/required-properties`

**Purpose:** Ensures features in specified layers contain declared required properties.

**Input assumptions:** Configuration provides a map of `{layerName: [propertyName, ...]}`.

**Algorithm:**
1. Normalize options (supports `layers`, `requiredProperties`, or flat object config shapes)
2. For each configured layer:
   - If layer not present in tile → skip silently
   - For each feature in that layer:
     - For each required property:
       - If `!Object.hasOwn(feature.properties, property)` → report

**Edge cases:**
- Layer in config but not in tile → silently skipped (not an error)
- Property exists but with value `null` or `""` → passes (presence check only, not value check)
- Multiple missing properties on one feature → one diagnostic per property

**Diagnostic:** `Feature "F" in layer "L" is missing required property "P".`

**True positive fixture:** roads layer, feature has `{class: "primary"}`, required `["class", "name"]` → reports missing "name"

**True negative fixture:** Feature has all required properties → passes

---

### 7. `tile/required-layers`

**Purpose:** Ensures the tile contains all layers specified in configuration.

**Input assumptions:** Configuration provides `layers: string[]`.

**Algorithm:**
1. If `requiredLayers.length === 0` → return (no-op)
2. For each required layer name:
   - If `tile.layers[layerName] === undefined` → report

**Edge cases:**
- Empty layers config → no diagnostics
- Extra layers beyond required list → silently ignored
- Missing layer generates one diagnostic per missing layer

**Diagnostic:** `Required layer "L" is not present in the tile.`

**True positive fixture:** Config requires `["buildings", "water"]`, tile only has `["roads"]` → 2 diagnostics

**True negative fixture:** Tile has all required layers → passes

---

### 8. `tile/feature-count`

**Purpose:** Enforces total feature count bounds across all layers.

**Input assumptions:** Configuration provides `min` and/or `max` (also accepts `minFeatures`/`maxFeatures` aliases).

**Algorithm:**
1. If neither `min` nor `max` configured → return (no-op)
2. Count total features across all layers
3. If `count < min` → report "too few"
4. If `count > max` → report "too many"

**Edge cases:**
- Both min and max can be configured independently
- No options = no checking (safe default)
- Legacy aliases `minFeatures`/`maxFeatures` supported

**Diagnostic:** `Tile has "N" features total, expected at least "M".` / `...at most "M".`

**True positive fixture:** 1 feature, min: 5 → flagged

**True negative fixture:** 3 features, min: 1, max: 5 → passes

---

### 9. `tile/layer-feature-count`

**Purpose:** Enforces per-layer feature count bounds.

**Input assumptions:** Configuration provides `layers: {layerName: {min?, max?}}`.

**Algorithm:**
1. For each configured layer:
   - If layer not present in tile → skip
   - Count features in that layer
   - If `count < min` → report
   - If `count > max` → report

**Edge cases:**
- Layer in config but absent from tile → skipped (not same as required-layers)
- Legacy `layerConfig` and `minFeatures`/`maxFeatures` aliases supported
- Each layer independently checked

**Diagnostic:** `Layer "L" has "N" features, expected at least "M".`

**True positive fixture:** roads has 1 feature, config min: 5 → flagged

**True negative fixture:** roads has 2 features, config min: 1, max: 10 → passes

---

### 10. `tile/no-empty`

**Purpose:** Flags tiles that contain zero features (likely unintentional empty tiles).

**Input assumptions:** VectorTile. Default severity: warning.

**Algorithm:**
1. If `options.allowEmpty === true` → return (suppressed)
2. Count total features across all layers
3. If `count === 0` → report

**Edge cases:**
- Multiple layers all with 0 features → still just one diagnostic
- `allowEmpty: true` suppresses the check entirely
- Layers present but empty still counts as 0 features

**Diagnostic:** `Tile contains 0 features.`

**True positive fixture:** Tile with `[{name: "roads", features: []}]` → flagged

**True negative fixture:** Tile with at least 1 feature → passes

---

## Style Rules (9)

---

### 1. `style/valid-json`

**Purpose:** Detects style files that are not valid JSON.

**Algorithm:** The style provider attempts JSON.parse(). If it fails, it creates an `InvalidStyleSpecification` artifact. This rule fires only for that artifact type and reports the parse error.

**True positive:** `'{ "version": 8,'` (truncated JSON) → parse error diagnostic

**True negative:** `'{"version": 8, "sources": {}, "layers": []}'` → valid JSON, no diagnostic

---

### 2. `style/version`

**Purpose:** Style must declare version 8 (MapLibre GL style spec).

**Algorithm:** Check `style.version === 8`. If not → report.

**True positive:** `{"version": 7, ...}` → flagged

**True negative:** `{"version": 8, ...}` → passes

---

### 3. `style/sources-present`

**Purpose:** Style must have a top-level `sources` object.

**Algorithm:** Check `isRecord(style.sources)`. If not → report.

**True positive:** `{"version": 8, "layers": []}` (missing sources) → flagged

**True negative:** `{"version": 8, "sources": {}, "layers": []}` → passes

---

### 4. `style/layers-present`

**Purpose:** Style must have a top-level `layers` array.

**Algorithm:** Check `Array.isArray(style.layers)`. If not → report.

**True positive:** `{"version": 8, "sources": {}}` (missing layers) → flagged

**True negative:** `{"version": 8, "sources": {}, "layers": []}` → passes

---

### 5. `style/layer-id-required`

**Purpose:** Every layer in the layers array must have a non-empty `id` string.

**Algorithm:** Iterate layers. If `typeof layer.id !== 'string'` or `layer.id.length === 0` → report.

**True positive:** `{"id": "", ...}` or `{type: "fill"}` (no id) → flagged

**True negative:** `{"id": "roads", ...}` → passes

---

### 6. `style/unique-layer-id`

**Purpose:** No two layers may share the same `id`.

**Algorithm:** Track first-seen index in a Map. On duplicate → report with both indices.

**True positive:** Two layers both with `id: "roads"` → flagged (second occurrence)

**True negative:** All layer ids unique → passes

---

### 7. `style/known-source`

**Purpose:** Layer `source` references must point to keys declared in the top-level `sources` object.

**Algorithm:**
1. Collect all source keys into a Set
2. For each layer with a `source` string property:
   - If `!sourceIds.has(layer.source)` → report

**Edge cases:**
- Background layers without `source` property → silently skipped
- `sources` not present → rule returns early (sources-present catches that)

**True positive:** Layer `source: "missing-source"` but sources only has `{tiles: {...}}` → flagged

**True negative:** Layer `source: "tiles"` and sources has key "tiles" → passes

---

### 8. `style/zoom-range`

**Purpose:** Layer `minzoom` must not exceed `maxzoom`.

**Algorithm:** For each layer with both numeric `minzoom` and `maxzoom`: if `minzoom > maxzoom` → report.

**Edge cases:**
- `minzoom === maxzoom` → valid (single-zoom visibility)
- Only minzoom present (no maxzoom) → skipped
- Only maxzoom present → skipped

**True positive:** `minzoom: 18, maxzoom: 12` → flagged

**True negative:** `minzoom: 5, maxzoom: 15` → passes

---

### 9. `style/no-deprecated-ref`

**Purpose:** Style layers must not use the deprecated `ref` property (removed in modern MapLibre).

**Algorithm:** For each layer: if `Object.hasOwn(layer, 'ref')` → report.

**True positive:** `{"id": "roads-label", "ref": "roads"}` → flagged

**True negative:** `{"id": "roads", "source": "tiles", "type": "line"}` → passes

---

## End-to-End Pipeline Verification (Tokyo Corpus)

### Pipeline stages verified:

| Stage | Input | Output | Status |
|-------|-------|--------|--------|
| PBF decode | `tokyo-clean.pbf` (403KB) | 13 layers, 8233 features | ✅ |
| Rule validation (broken) | `invalid-polygon.pbf` | 2 errors: self-intersection + zero-area-ring | ✅ |
| Rule validation (clean) | `tokyo-clean.pbf` | 1 real self-intersection in transportation layer | ✅ |
| Style validation | `style.json` | 0 diagnostics (all 9 rules pass) | ✅ |
| Comparison | before.pbf → after.pbf | Detects +8189 features, layer changes | ✅ |
| Regression analysis | before → after | 8235 candidates, dominant kind: layer | ✅ |
| JSON reporter | CLI `--reporter json` | Structured JSON with diagnostics array + summary | ✅ |
| Text reporter | CLI (default) | Colored terminal output with locations | ✅ |
| Markdown report | CLI `report --format markdown` | Engineering report with executive summary | ✅ |

### Diagnostic consistency through pipeline:

The `invalid-polygon.pbf` diagnostic remains consistent:
- **Rule output:** ruleId `tile/self-intersection`, layer "buildings", feature 0, part 0, segments [0, 2]
- **JSON reporter:** Same data preserved in `diagnostics[0].data.segments`
- **Text reporter:** Same info formatted as human-readable breadcrumb
- **Report:** Referenced in key findings section

### Real-world finding on production data:

The `tokyo-clean.pbf` (real OpenMapTiles z14 tile) has 1 genuine self-intersection in `transportation` layer, feature 733, part 5 (segments 1 and 4). This demonstrates TileGuard catching real issues in production tile pipelines — the exact scenario we want for FOSS4G.

---

## Technical Defense Notes

### MVT Extent vs Buffer

- **Extent** (default 4096): The coordinate space of the tile grid. Coordinates nominally range [0, extent].
- **Buffer**: Tile compilers extend geometry beyond tile edges to prevent rendering seams at tile boundaries. Typical buffers are 64–80 tile units. TileGuard's default buffer tolerance is 80.
- **Why coordinates legitimately exceed 0–4096:** Clipping buffers extend polygons/lines past the tile edge so renderers can join geometry seamlessly across tiles.

### Why [-16384, 16383] in MapLibre isn't tile-quality validation

MapLibre uses a 15-bit signed integer range for internal vertex storage (rendering pipeline). This is a renderer implementation detail for GPU buffer allocation. TileGuard validates **data quality** at the source (tile compiler output), not renderer capacity. A coordinate at 5000 is a data quality issue (beyond reasonable clipping buffer) even though MapLibre can technically render it.

### Signed Polygon Area & Ring Winding

- **Shoelace formula:** `area = Σ(x_i * y_{i+1} - x_{i+1} * y_i) / 2`
- **Positive → CCW** (counter-clockwise, outer ring in MVT)
- **Negative → CW** (clockwise, inner ring / hole in MVT)
- **Zero → degenerate** (collinear, collapsed to line)
- MVT spec requires outer rings CW, inner rings CCW (opposite of GeoJSON convention)

### Segment Intersection Algorithm

Orientation-based test using exact integer cross-product:
- `orientation(a,b,c)` = sign of `(b.y-a.y)(c.x-b.x) - (b.x-a.x)(c.y-b.y)`
- 0 = collinear, 1 = CW, 2 = CCW
- Two segments cross if endpoints straddle each other's line (opposite orientations)
- No floating-point — exact integer arithmetic on tile coordinates

### Degenerate Geometry

- **Line needs ≥ 2 unique points** (otherwise it's a point, not renderable as a line)
- **Polygon ring needs ≥ 3 unique vertices + 1 closing point = 4 raw points minimum**
- Uniqueness checked via coordinate string deduplication

### Protobuf Varints and Wire Types

MVT uses Protocol Buffers encoding:
- **Varint (wire type 0):** Variable-length integer encoding. Each byte uses 7 bits for data + 1 continuation bit. Supports zigzag encoding for signed integers.
- **Length-delimited (wire type 2):** Used for strings, bytes, embedded messages, and packed repeated fields.
- **MVT structure:** Tile → Layer (repeated) → Feature (repeated) → geometry (packed uint32 varints)
- **Geometry commands:** MoveTo, LineTo, ClosePath encoded as command integers with count
- **String/key/value tables:** Layers have `keys[]` and `values[]` arrays. Feature properties reference into these tables by index (space-efficient deduplication).

### Why MapLibre Rendering Tests and TileGuard Solve Different Problems

| | MapLibre Render Tests | TileGuard |
|--|---|---|
| **What** | Visual pixel comparison | Structural data validation |
| **When** | After rendering | Before rendering |
| **Catches** | Rendering regressions, shader bugs | Data quality issues at source |
| **False positives** | Anti-aliasing differences, GPU variations | Geometry violations, missing data |
| **Position in pipeline** | End of pipeline (output) | Start of pipeline (input) |

### Why TileGuard Should NOT Replace Visual Regression Testing

1. **Different failure modes:** A tile can be structurally valid but render incorrectly (shader bug, z-ordering issue, label collision)
2. **Different signals:** Visual regression catches "it looks wrong"; TileGuard catches "the data is wrong"
3. **Complementary, not competing:** TileGuard catches issues earlier (cheaper to fix), rendering tests catch issues that pass data validation
4. **Analogy:** ESLint doesn't replace browser testing. TileGuard doesn't replace MapLibre's render tests. They work at different abstraction layers.
