# `tile/layer-feature-count`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `warning`

## Summary

Each named vector tile layer must satisfy independently configured minimum and maximum feature count bounds.

---

## Details

Unlike `tile/feature-count` (which operates on the total across all layers), this rule checks bounds on a **per-layer** basis. Each layer can have its own `min` and `max`. Layers not listed in `options.layers` are skipped. Layers listed but absent from the tile are also skipped (use `tile/required-layers` to enforce presence).

Both `layers` (preferred) and `layerConfig` (legacy alias) are accepted.
Within each layer config, `min`/`max` and `minFeatures`/`maxFeatures` are both accepted.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostics

**Too few features in a layer:**

```
Layer "<layerName>" has "<count>" features, expected at least "<min>".
```

**Suggestion:** Adjust tile generation for layer `"<layerName>"`, or lower its configured minimum feature count.

**Too many features in a layer:**

```
Layer "<layerName>" has "<count>" features, expected at most "<max>".
```

**Suggestion:** Simplify or filter layer `"<layerName>"`, or raise its configured maximum feature count.

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `layer` | `string` | The layer name |
| `count` | `number` | Actual feature count in the layer |
| `min` | `number?` | Configured minimum |
| `max` | `number?` | Configured maximum |

---

## Examples

### ❌ Failing

Layer `roads` has 2 features, config sets `roads: { min: 5 }`:

*Diagnostic:* `Layer "roads" has "2" features, expected at least "5".`

### ✅ Passing

Layer `roads` has 10 features, config sets `roads: { min: 5, max: 100 }`: no diagnostic.

---

## Configuration

```jsonc
{
  "rules": {
    "tile/layer-feature-count": ["warning", {
      "layers": {
        "roads": { "min": 5, "max": 500 },
        "water": { "min": 1 },
        "buildings": { "max": 200 }
      }
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `layers` | `Record<string, LayerBounds>` | `{}` | Per-layer bounds |
| `layerConfig` | `Record<string, LayerBounds>` | `{}` | Alias for `layers` (legacy) |

**`LayerBounds`:**
| Field | Type | Description |
|:------|:-----|:------------|
| `min` / `minFeatures` | `number` | Minimum required features |
| `max` / `maxFeatures` | `number` | Maximum allowed features |

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `LOW_LAYER_FEATURES` | `tile/layer-feature-count` |
| `HIGH_LAYER_FEATURES` | `tile/layer-feature-count` |

---

*Back to [Rule Index](../README.md)*
