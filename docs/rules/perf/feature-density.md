# `perf/feature-density`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.6.0 · **Default Severity:** `warning` · **Recommended:** `false` (opt-in)

## Summary

Per-layer feature counts must not exceed configured render performance budgets.

---

## Details

This is the performance-scoped companion to `tile/layer-feature-count`. While that rule checks arbitrary min/max bounds as a data correctness concern, `perf/feature-density` is purely about render cost: too many features in a single layer produces too many draw calls and too much label collision detection, degrading map rendering performance at 60fps.

A global `maxFeaturesPerLayer` threshold applies to all layers not explicitly listed in the `layers` override map. Per-layer `maxFeatures` values take priority over the global default.

**Opt-out behavior:** A layer entry in the `layers` map without a `maxFeatures` value explicitly opts that layer out of the global default. This lets you exclude known high-density layers (e.g., a raw OSM import layer) without raising the global threshold.

Layers not present in the tile are silently skipped.

---

## Diagnostics

```
Layer "<layer>" has <featureCount> features, exceeding the per-layer render budget of <maxFeatures>.
```

*Location:* `{ layer: "<name>" }`

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | Layer name |
| `featureCount` | `number` | Actual feature count in the layer |
| `maxFeatures` | `number` | Effective budget (override or global default) |

---

## Examples

### ❌ Failing

`poi` layer has 12,000 features, budget is 10,000:

*Diagnostic:* `Layer "poi" has 12,000 features, exceeding the per-layer render budget of 10,000.`

### ✅ Passing

All layers under their respective budgets: no diagnostic.

`roads` has 50,000 features but is listed with no `maxFeatures` (opted out): no diagnostic.

---

## Configuration

```jsonc
{
  "rules": {
    "perf/feature-density": ["warning", {
      "maxFeaturesPerLayer": 10000,
      "layers": {
        "poi": { "maxFeatures": 2000 },
        "transportation": { "maxFeatures": 5000 },
        "raw_import": {}
      }
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `maxFeaturesPerLayer` | `number` | — | Global maximum features per layer. Applied to all layers not listed in `layers`. |
| `layers` | `Record<string, { maxFeatures?: number }>` | — | Per-layer overrides. A layer entry without `maxFeatures` opts out of the global default. |

---

## Relationship to `tile/layer-feature-count`

| Rule | Purpose | Use When |
|:-----|:--------|:---------|
| `tile/layer-feature-count` | Data correctness: min/max bounds per layer | You know the expected range for each layer |
| `perf/feature-density` | Render performance: upper limit per layer | You want a global performance cap with optional per-layer tuning |

---

*Back to [Rule Index](../README.md)*
