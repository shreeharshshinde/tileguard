# Rules

TileGuard ships with **21 built-in rules** — 12 for vector tile validation and 9 for MapLibre style linting. All rules are independently configurable.

## Configuration

Each rule can be set to `'error'`, `'warning'`, or `'off'`:

```typescript
rules: {
  'tile/self-intersection': 'error',    // fail the build
  'tile/feature-count': 'warning',      // report but don't fail
  'tile/no-empty': 'off',               // skip entirely
}
```

Rules that accept options use a tuple:

```typescript
rules: {
  'tile/required-layers': ['error', { layers: ['water', 'roads', 'buildings'] }],
  'tile/feature-count': ['warning', { max: 100000 }],
}
```

---

## Tile Validation Rules

**Package:** `@tileguard/tile-rules` · 12 rules

### Geometry Rules

These rules validate the geometric integrity of vector tile features.

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| [`tile/self-intersection`](/rules/tile/self-intersection) | error | Polygon edges that cross themselves — causes invalid topology and unpredictable fill rendering |
| [`tile/unclosed-ring`](/rules/tile/unclosed-ring) | error | Polygon rings where the last vertex ≠ first vertex — produces open polygons |
| [`tile/zero-area-ring`](/rules/tile/zero-area-ring) | warning | Degenerate polygon rings with zero or near-zero area — invisible but wasteful |
| [`tile/winding-order`](/rules/tile/winding-order) | error | Rings wound in the wrong direction — convention-aware (auto-detects MVT vs OGC) |
| [`tile/hole-containment`](/rules/tile/hole-containment) | error | Hole rings that extend outside their parent shell — multi-polygon aware |
| [`tile/degenerate-geometry`](/rules/tile/degenerate-geometry) | warning | Lines with < 2 vertices or polygons with < 4 vertices — structurally invalid |
| [`tile/coordinate-range`](/rules/tile/coordinate-range) | error | Vertices outside the valid tile extent (0–4096 by default) |

### Structural Rules

These rules validate tile-level structure and feature metadata.

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| [`tile/required-layers`](/rules/tile/required-layers) | error | Missing expected layers (configurable list) |
| [`tile/required-properties`](/rules/tile/required-properties) | error | Features missing declared properties |
| [`tile/feature-count`](/rules/tile/feature-count) | warning | Total feature count exceeds configured maximum |
| [`tile/layer-feature-count`](/rules/tile/layer-feature-count) | warning | Per-layer feature count exceeds configured maximum |
| [`tile/no-empty`](/rules/tile/no-empty) | warning | Tiles containing zero features |

---

## Style Lint Rules

**Package:** `@tileguard/style-rules` · 9 rules

These rules validate MapLibre Style Specification JSON files.

| Rule | Default | What it catches |
|:-----|:--------|:----------------|
| [`style/valid-json`](/rules/style/valid-json) | error | Style file is not valid JSON — parsing fails entirely |
| [`style/version`](/rules/style/version) | error | Style `version` field is not `8` — only version 8 is supported |
| [`style/sources-present`](/rules/style/sources-present) | error | Missing top-level `sources` object |
| [`style/layers-present`](/rules/style/layers-present) | error | Missing top-level `layers` array |
| [`style/layer-id-required`](/rules/style/layer-id-required) | error | Layers without an `id` field |
| [`style/unique-layer-id`](/rules/style/unique-layer-id) | error | Duplicate layer IDs — causes rendering conflicts |
| [`style/known-source`](/rules/style/known-source) | error | Layers referencing a source not declared in `sources` |
| [`style/zoom-range`](/rules/style/zoom-range) | warning | `minzoom` greater than `maxzoom` — layer can never be visible |
| [`style/no-deprecated-ref`](/rules/style/no-deprecated-ref) | warning | Usage of deprecated `ref` property — removed in modern MapLibre |

---

## Diagnostic Structure

Every rule produces diagnostics in the same format:

```typescript
{
  ruleId: 'tile/self-intersection',
  severity: 'error',
  message: 'Geometry in layer "buildings", feature 42 has intersecting segments 1 and 4.',
  location: {
    layer: 'buildings',
    featureIndex: 42,
    partIndex: 0,
  },
  suggestion: 'Simplify or repair this geometry so non-adjacent segments do not cross.',
  data: {
    segments: [1, 4],
  },
}
```

This structure enables:
- **CLI** — formatted text output with colors and icons
- **CI** — JSON output for automated gates
- **Inspector** — visual overlay on the exact geometry
- **Reports** — aggregation by rule, severity, or layer

---

## Writing Custom Rules

A rule is a plain TypeScript object — no base classes, no decorators:

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'tile/my-check',
  meta: {
    description: 'Validates something specific.',
    defaultSeverity: 'error',
    recommended: true,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    const tile = context.artifact.content;
    // Inspect tile, report findings
    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let i = 0; i < layer.features.length; i++) {
        // Your validation logic here
        context.report({
          message: 'Something is wrong.',
          location: { layer: layerName, featureIndex: i },
          suggestion: 'Fix it by doing X.',
        });
      }
    }
  },
};
```

Register it via a plugin:

```typescript
import type { Plugin } from '@tileguard/core';
import { myRule } from './my-rule';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  rules: [myRule],
};
```

---

## What Next?

- [**Quick Start →**](/getting-started/quick-start) — Run TileGuard in 5 minutes
- [**CI / GitHub Actions →**](/guides/ci-github-actions) — Fail PRs on violations
- [**How It Works →**](/learn/how-it-works) — Architecture overview
