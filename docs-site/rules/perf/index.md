# Performance Rules

TileGuard ships with **4 performance rules** in the `perf/*` namespace. These
rules are **opt-in** — they're `off` by default and require explicit configuration
with thresholds.

Enable them when you want to set hard rendering budgets for your tile pipeline.

::: tip Getting started with perf rules
Run `tileguard profile ./tile.pbf` first to understand the baseline numbers for
your tiles, then set thresholds accordingly.
:::

---

## All Performance Rules

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| [`perf/tile-size`](/rules/perf/tile-size) | off | Compressed tile exceeds byte budget |
| [`perf/vertex-budget`](/rules/perf/vertex-budget) | off | Total vertex count exceeds budget |
| [`perf/feature-density`](/rules/perf/feature-density) | off | Layer feature count is too high |
| [`perf/layer-size`](/rules/perf/layer-size) | off | Individual layer byte size too large |

---

## Enabling Performance Rules

All four rules accept a `[severity, options]` tuple in your config:

```typescript
import type { TileGuardConfig } from '@tileguard/core';
import { tilePlugin } from '@tileguard/tile-rules';

const config: TileGuardConfig = {
  plugins: [tilePlugin],
  rules: {
    'perf/tile-size':       ['warning', { maxBytes: 500_000 }],
    'perf/vertex-budget':   ['error',   { maxVertices: 100_000 }],
    'perf/feature-density': ['warning', { maxFeaturesPerLayer: 5_000 }],
    'perf/layer-size':      ['warning', { maxLayerBytes: 100_000 }],
  },
};

export default config;
```

---

## What Next?

- [**Profiling Tiles →**](/guides/profiling-tiles) — use `tileguard profile` to
  understand your numbers before setting budgets
- [**Tile Rules →**](/rules/tile/) — geometry and structural validation
