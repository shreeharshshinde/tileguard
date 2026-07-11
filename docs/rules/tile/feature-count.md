# `tile/feature-count`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.3.0 · **Default Severity:** `warning`

## Summary

The total number of features across all layers in a vector tile must satisfy configured minimum and maximum bounds.

---

## Details
<!-- TODO: INSERT DIAGRAM 6: Vector Tile Decoder -->

This rule sums the feature count across every layer in the tile and compares the total against `options.min` and `options.max`. Either bound is optional. When neither is configured, the rule is a no-op.

Both `min`/`max` (preferred) and `minFeatures`/`maxFeatures` (legacy alias) are accepted.

Runs only on artifacts of type `vector-tile`.

---

## Diagnostics

**Too few features:**

```
Tile has "<count>" features total, expected at least "<min>".
```

**Suggestion:** Adjust tile generation filters or lower the configured minimum feature count.

**Too many features:**

```
Tile has "<count>" features total, expected at most "<max>".
```

**Suggestion:** Simplify, filter, or split the tile data, or raise the configured maximum feature count.

**Data fields (both diagnostics):**
| Field | Type | Description |
|:------|:-----|:------------|
| `count` | `number` | Actual total feature count |
| `min` | `number?` | Configured minimum (only in under-count diagnostic) |
| `max` | `number?` | Configured maximum (only in over-count diagnostic) |

---

## Examples

### ❌ Failing

Tile has 0 features, config sets `min: 1`:

*Diagnostic:* `Tile has "0" features total, expected at least "1".`

Tile has 10000 features, config sets `max: 5000`:

*Diagnostic:* `Tile has "10000" features total, expected at most "5000".`

### ✅ Passing

Tile has 150 features, config sets `min: 1, max: 1000`: no diagnostic.

---

## Configuration

```jsonc
{
  "rules": {
    "tile/feature-count": ["warning", {
      "min": 1,
      "max": 5000
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `min` | `number` | — | Minimum required total features |
| `max` | `number` | — | Maximum allowed total features |
| `minFeatures` | `number` | — | Alias for `min` (legacy) |
| `maxFeatures` | `number` | — | Alias for `max` (legacy) |

---

## Legacy Mapping

| Legacy code | Framework rule |
|:------------|:---------------|
| `LOW_TOTAL_FEATURES` | `tile/feature-count` |
| `HIGH_TOTAL_FEATURES` | `tile/feature-count` |

---

*Back to [Rule Index](../README.md)*
