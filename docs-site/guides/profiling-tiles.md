# guides/profiling-tiles

Full guide for using `tileguard profile` and `perf/*` rules to find rendering
bottlenecks before they hit production.

## Why Profile Tiles?

Vector tiles that are too large or too complex degrade rendering performance —
slow pan, stuttery zoom, and high GPU memory usage on mobile devices. Profiling
exposes these problems at development time.

The two tools that help:

- **`tileguard profile`** — inspect a single tile's vertex cost, layer sizes, and
  feature density in a table you can act on
- **`perf/*` rules** — set hard budgets enforced on every `tileguard check` run

---

## Running a Profile

```bash
tileguard profile ./tiles/14/8741/5476.pbf
```

**Output:**

```text
Profile: ./tiles/14/8741/5476.pbf  (88 KB compressed)

  Layer          Features  Vertices   Size (raw)  % of tile
  ─────────────────────────────────────────────────────────
  roads          1,891      98,432     142 KB      48%
  buildings      1,456      41,201      89 KB      30%
  water            312      15,980      32 KB      11%
  landuse          401       8,120      22 KB       7%
  poi              157         157       4 KB       1%

  Total vertices:   163,890
  Vertex budget:    100,000  ⚠ EXCEEDED by 63%

  Recommendation: Simplify "roads" geometry — it accounts for 60% of vertex cost.
```

Every section tells you something actionable:

| Column | What it means |
|:-------|:--------------|
| Features | Number of features in the layer |
| Vertices | Total vertex count — the primary GPU cost |
| Size (raw) | Uncompressed layer byte size |
| % of tile | Which layers dominate |

The `Vertex budget` line shows the limit from your config (if set) or the default
advisory threshold.

---

## Performance Rules

The four `perf/*` rules are **opt-in** — they're `off` by default so they don't
break existing pipelines. Enable the ones that matter for your use case.

### `perf/tile-size`

Fails if the compressed tile exceeds a size budget.

```typescript
rules: {
  'perf/tile-size': ['error', { maxBytes: 500_000 }],  // 500 KB
}
```

::: tip Rule of thumb
Tiles larger than 500 KB will cause noticeable load delays on mobile networks.
Tiles larger than 1 MB are almost always over-complex.
:::

### `perf/vertex-budget`

Fails if total vertex count across all layers exceeds a budget.

```typescript
rules: {
  'perf/vertex-budget': ['warning', { maxVertices: 100_000 }],
}
```

High vertex counts are the primary cause of slow pan/zoom on mobile. MapLibre has
to process every vertex on the GPU every frame.

### `perf/feature-density`

Fails if a single layer has too many features relative to the tile extent.

```typescript
rules: {
  'perf/feature-density': ['warning', { maxFeaturesPerLayer: 5_000 }],
}
```

Dense layers (roads, POIs) are the common culprit. Cluster or simplify at lower
zoom levels.

### `perf/layer-size`

Fails if any individual layer exceeds a byte size budget.

```typescript
rules: {
  'perf/layer-size': ['warning', { maxLayerBytes: 100_000 }],
}
```

Useful for catching "data blob" layers where a few features carry large property
payloads.

---

## A Practical Budget Config

Start with these conservative budgets and tighten them as you measure:

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';
import { stylePlugin } from '@tileguard/style-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin, stylePlugin],
  rules: {
    // Geometry validation (always on)
    'tile/self-intersection': 'error',
    'tile/winding-order': 'error',

    // Performance budgets (opt-in)
    'perf/tile-size':       ['warning', { maxBytes: 500_000 }],
    'perf/vertex-budget':   ['warning', { maxVertices: 100_000 }],
    'perf/feature-density': ['warning', { maxFeaturesPerLayer: 5_000 }],
    'perf/layer-size':      ['warning', { maxLayerBytes: 100_000 }],
  },
};

export default config;
```

::: tip Start with `warning`, not `error`
Enable performance rules as warnings first. After a week of observation you'll
know which thresholds match your real tile characteristics. Then promote the
important ones to `error`.
:::

---

## Profiling in CI

Add `tileguard profile` as an optional informational step — it never fails the
build, but gives you a permanent record of tile sizes per PR:

```yaml
- name: Profile tile sizes
  run: |
    for f in ./tiles/**/*.pbf; do
      npx @tileguard/cli profile "$f"
    done
```

To enforce budgets in CI, use the `perf/*` rules through `tileguard check`:

```yaml
- name: Validate with performance budgets
  run: npx @tileguard/cli check ./tiles/ --reporter json
```

---

## What Next?

- [**Performance Rules Reference →**](/rules/perf/) — all 4 rules with full options
- [**CI / GitHub Actions →**](/guides/ci-github-actions) — enforce budgets on every PR
- [**Quick Start →**](/getting-started/quick-start) — basic usage
