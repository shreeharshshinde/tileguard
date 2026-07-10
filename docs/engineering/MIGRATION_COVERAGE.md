# TileGuard Legacy to Framework Migration Coverage

**Document status:** Complete  
**Last updated:** 2026-07-07  
**Version:** v0.3.0

---

## Purpose

This document maps every validation check from the legacy JavaScript and Python implementations to their corresponding rules in the new framework architecture. It serves as proof that no validation logic was lost during the migration to v0.3.0.

---

## Tile Validation Coverage

### Legacy: `validate.js` / `validate.py`

| Legacy Error Code | Description | Framework Rule(s) | Status |
|:------------------|:------------|:------------------|:-------|
| `FETCH_ERROR` | Source not accessible (HTTP error, file missing) | `artifact/load-failed` (engine) | ✅ Covered |
| `EMPTY_SOURCE` | Tile source returned 0 bytes | `artifact/load-failed` (engine) | ✅ Covered |
| `DECODE_ERROR` | Failed to decode MVT/PBF protobuf | `artifact/load-failed` (engine) | ✅ Covered |
| `MISSING_LAYER` | Required layer not present in tile | `tile/required-layers` | ✅ Covered |
| `LOW_LAYER_FEATURES` | Layer has fewer features than configured min | `tile/layer-feature-count` | ✅ Covered |
| `HIGH_LAYER_FEATURES` | Layer has more features than configured max | `tile/layer-feature-count` | ✅ Covered |
| `GEOMETRY_INVALID` (coordinate out of range) | Coordinate outside tile extent | `tile/coordinate-range` | ✅ Covered |
| `GEOMETRY_INVALID` (degenerate line) | LineString with <2 unique points | `tile/degenerate-geometry` | ✅ Covered |
| `GEOMETRY_INVALID` (degenerate polygon) | Polygon ring with <3 unique vertices | `tile/degenerate-geometry` | ✅ Covered |
| `GEOMETRY_INVALID` (unclosed ring) | Polygon ring where first ≠ last point | `tile/unclosed-ring` | ✅ Covered |
| `GEOMETRY_INVALID` (zero-area ring) | Polygon ring with signed area = 0 | `tile/zero-area-ring` | ✅ Covered |
| `GEOMETRY_INVALID` (self-intersection) | Non-adjacent segments intersect | `tile/self-intersection` | ✅ Covered |
| `MISSING_PROPERTY` | Feature missing required property | `tile/required-properties` | ✅ Covered |
| `LOW_TOTAL_FEATURES` | Tile total features below configured min | `tile/feature-count` | ✅ Covered |
| `HIGH_TOTAL_FEATURES` | Tile total features above configured max | `tile/feature-count` | ✅ Covered |
| `EMPTY_TILE` | Tile contains zero features | `tile/no-empty` | ✅ Covered |

**Migration note:** The legacy `GEOMETRY_INVALID` code aggregated all geometry issues into a single error with a `details` array. The framework splits these into five independent rules (`coordinate-range`, `degenerate-geometry`, `unclosed-ring`, `zero-area-ring`, `self-intersection`) so users can configure each check independently.

---

## Style Validation Coverage

### Legacy: `style-lint.js`

| Legacy Error Code | Description | Framework Rule(s) | Status |
|:------------------|:------------|:------------------|:-------|
| `INVALID_JSON` | Style file is not valid JSON | `style/valid-json` | ✅ Covered |
| `INVALID_VERSION` | Style version is not 8 | `style/version` | ✅ Covered |
| `MISSING_SOURCES` | Top-level `sources` key missing or not an object | `style/sources-present` | ✅ Covered |
| `MISSING_LAYERS` | Top-level `layers` key missing or not an array | `style/layers-present` | ✅ Covered |
| `MISSING_LAYER_ID` | Layer entry missing `id` field | `style/layer-id-required` | ✅ Covered |
| `DUPLICATE_LAYER_ID` | Multiple layers share the same `id` | `style/unique-layer-id` | ✅ Covered |
| `UNKNOWN_SOURCE` | Layer `source` references undeclared source key | `style/known-source` | ✅ Covered |
| `INVALID_ZOOM_RANGE` | Layer `minzoom` > `maxzoom` | `style/zoom-range` | ✅ Covered |
| `DEPRECATED_REF` | Layer uses deprecated `ref` property | `style/no-deprecated-ref` | ✅ Covered |

**Migration note:** The legacy linter returned a flat `errors` array with code strings. The framework produces structured `Diagnostic` objects with `ruleId`, `severity`, `location`, `suggestion`, and `data` fields. All legacy checks map 1:1 to framework rules.

---

## Render Validation Coverage

### Legacy: `render-compare.js`

The render comparison logic (Playwright + pixelmatch) was prototyped in the legacy codebase but is **deferred to post-v0.3.0**. This functionality will be implemented as `@tileguard/render-rules` in a future release (planned for v0.6.0).

| Legacy Function | Framework Equivalent | Status |
|:----------------|:---------------------|:-------|
| `renderStyle()` | (not yet implemented) | ⏳ Planned v0.6.0 |
| `compareImages()` | (not yet implemented) | ⏳ Planned v0.6.0 |

---

## Configuration Mapping

### Legacy Config Shape → Framework Config

| Legacy Field | Framework Field | Notes |
|:-------------|:----------------|:------|
| `requiredLayers` | `rules['tile/required-layers'][1].layers` | Array of layer names |
| `minFeatures` | `rules['tile/feature-count'][1].min` | Global tile feature count lower bound |
| `maxFeatures` | `rules['tile/feature-count'][1].max` | Global tile feature count upper bound |
| `layerConfig[layerName].minFeatures` | `rules['tile/layer-feature-count'][1].layers[layerName].min` | Per-layer lower bound |
| `layerConfig[layerName].maxFeatures` | `rules['tile/layer-feature-count'][1].layers[layerName].max` | Per-layer upper bound |
| `requiredProperties[layerName]` | `rules['tile/required-properties'][1].layers[layerName]` | Array of required property keys per layer |
| `checkGeometry` (boolean flag) | Enable/disable geometry rules individually | Framework allows per-rule control (`tile/coordinate-range`, `tile/self-intersection`, etc.) |
| `allowEmpty` | `rules['tile/no-empty'][1].allowEmpty` | Suppress empty tile warnings |
| `timeout` | `options.timeout` | HTTP request timeout (ms) |
| `maxDetails` | `options.maxDetails` | Max diagnostics per rule per artifact |

**Example migration:**

```javascript
// Legacy config
{
  requiredLayers: ['roads', 'water'],
  minFeatures: 1,
  layerConfig: { roads: { minFeatures: 5 } },
  requiredProperties: { roads: ['class', 'name'] },
  checkGeometry: false
}

// Framework config
{
  plugins: [tilePlugin],
  rules: {
    'tile/required-layers': ['error', { layers: ['roads', 'water'] }],
    'tile/feature-count': ['warning', { min: 1 }],
    'tile/layer-feature-count': ['warning', { layers: { roads: { min: 5 } } }],
    'tile/required-properties': ['error', { layers: { roads: ['class', 'name'] } }],
    'tile/coordinate-range': 'off',
    'tile/degenerate-geometry': 'off',
    'tile/unclosed-ring': 'off',
    'tile/zero-area-ring': 'off',
    'tile/self-intersection': 'off',
  }
}
```

---

## Coverage Summary

| Domain | Legacy Checks | Framework Rules | Coverage |
|:-------|:--------------|:----------------|:---------|
| **Tile Validation** | 16 error codes | 10 rules | ✅ 100% |
| **Style Validation** | 9 error codes | 9 rules | ✅ 100% |
| **Render Validation** | 2 functions | 0 rules | ⏳ Deferred to v0.6.0 |

**Total:** 25 legacy checks → 19 framework rules → **100% coverage** for tile and style validation as of v0.3.0.

---

## Testing Verification

All mappings have been verified through:

1. **Integration tests** — `packages/tile-rules/tests/tile-rules.test.ts` and `packages/style-rules/tests/style-rules.test.ts` reproduce legacy test cases against the framework engine.
2. **Per-rule unit tests** — Each of the 19 rules has dedicated pass/fail/edge test coverage (total: 82 tests).
3. **Fixture parity** — `fixtures/good/` and `fixtures/bad/` contain canonical passing and failing artifacts that exercise every rule.

Run verification:

```bash
cd packages/tile-rules && npm test    # 49 tests
cd packages/style-rules && npm test   # 33 tests
```

---

## Next Steps

For post-v0.3.0 development:

- **v0.6.0:** Implement render rules (`@tileguard/render-rules`) to restore pixel-diff comparison from the legacy prototype.
- **v0.7.0:** Add archive providers for PMTiles and MBTiles.
- **v1.0.0:** Freeze the Plugin API and begin accepting community-contributed rule packs.

---

*Document version: 1.0 · Last verified: 2026-07-07 · Maintainer: TileGuard Core Team*
