# `perf/tile-size`

> **Package:** `@tileguard/tile-rules` · **Since:** v0.6.0 · **Default Severity:** `warning` · **Recommended:** `true` · **Opt-in thresholds**

## Summary

The raw (uncompressed) and/or gzip-compressed byte size of a vector tile must not exceed configured performance budgets.

---

## Details

Tile byte size is the most direct performance indicator for vector tile rendering:

- **Raw size** controls how long the PBF parser spends decoding the tile before any geometry enters the GPU pipeline. Tiles over ~500 KB can stall the render thread.
- **Gzip size** is what travels over the network. A tile that compresses well may have an acceptable network cost even if its raw size is large, but the CPU still pays the decompression cost.

The provider already populates `artifact.metadata.bytes` (compressed bytes from disk/network) and `artifact.metadata.gzipped` (boolean) on every `VectorTileArtifact`. This rule reads that existing metadata — no extra I/O required.

**Important:** The rule is `recommended: true` but ships with no default thresholds. You must configure `maxBytes` and/or `maxGzipBytes` explicitly. Hard-coded defaults risk false positives on legitimate high-density tiles (e.g., building footprints at z15).

The gzip check is silently skipped when the tile was loaded from an uncompressed source.

---

## Diagnostics

**Raw size exceeded:**

```
Tile raw size is <bytes> bytes, exceeding the <maxBytes>-byte budget.
```

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `bytes` | `number` | Actual raw tile size in bytes |
| `maxBytes` | `number` | Configured maximum raw bytes |

**Gzip size exceeded:**

```
Tile gzip-compressed size is <gzipBytes> bytes, exceeding the <maxGzipBytes>-byte budget.
```

**Data fields:**
| Field | Type | Description |
|:------|:-----|:------------|
| `gzipBytes` | `number` | Actual compressed tile size in bytes |
| `maxGzipBytes` | `number` | Configured maximum gzip bytes |

Both diagnostics include a suggestion to simplify geometries, reduce feature density, or adjust tile generation settings.

---

## Examples

### ❌ Failing

Tile is 620 KB raw, budget is 500 KB:

*Diagnostic:* `Tile raw size is 634,880 bytes, exceeding the 512,000-byte budget.`

### ✅ Passing

Tile is 250 KB raw, budget is 500 KB: no diagnostic.

Tile is uncompressed, `maxGzipBytes` is configured: gzip check silently skipped.

---

## Configuration

```jsonc
{
  "rules": {
    "perf/tile-size": ["warning", {
      "maxBytes": 500000,
      "maxGzipBytes": 150000
    }]
  }
}
```

**Options:**
| Field | Type | Default | Description |
|:------|:-----|:--------|:------------|
| `maxBytes` | `number` | — | Maximum raw (uncompressed) tile size in bytes |
| `maxGzipBytes` | `number` | — | Maximum gzip-compressed tile size in bytes. Only checked when the tile was gzip-compressed. |

---

## Remediation

1. Run `tileguard profile <tile.pbf>` to see a cost breakdown by layer.
2. Identify the dominant layer(s) by vertex share.
3. Apply geometry simplification (e.g., Douglas-Peucker) at the zoom level where the tile exceeds budget.
4. Consider splitting high-density layers into separate tile sets with zoom-range filtering.

---

*Back to [Rule Index](../README.md)*
