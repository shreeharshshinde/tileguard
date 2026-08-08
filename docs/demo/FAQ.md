# TileGuard — FAQ

Anticipated questions from FOSS4G 2026 and elsewhere.

---

## Architecture

### Why not use MapLibre GL JS directly for validation?

MapLibre is a rendering engine. It silently skips invalid geometry and handles malformed styles gracefully — its job is to render what it can, not to tell you what's broken. TileGuard's job is the opposite: flag every violation, produce structured diagnostics, and exit non-zero in CI. The two concerns are orthogonal.

### Is this a fork of an existing tool?

No. TileGuard is a new framework built from first principles. The architecture is inspired by ESLint's rule engine design, not forked from it. The decoding of MVT files uses a custom PBF decoder (`pbf-decoder.ts` in `@tileguard/tile-rules`) — a purpose-built implementation that provides full control over geometry parsing and validation. All validation logic is original.

### What is a "rule engine"?

A component that: (1) loads an artifact, (2) routes it to each applicable rule, (3) collects all `Diagnostic` objects, (4) passes them to a reporter. The engine itself validates nothing — rules validate. This separation means you can add a rule without touching the engine, and add a reporter without touching any rule. It's the same pattern ESLint, oxlint, and Biome use.

### Why TypeScript?

Type safety at the rule-engine boundary is important. Every rule gets a typed artifact, produces typed diagnostics, and the reporter consumes typed diagnostics. TypeScript catches entire classes of rule-writing bugs at compile time rather than at runtime. The CLI compiles to plain JavaScript — consumers don't need TypeScript.

---

## Performance

### How fast is it?

Validating the 403 KB Tokyo tile (7,000+ features across 8 layers) runs all 10 tile rules in under 80ms on a standard laptop. Style linting (9 rules) runs under 5ms. The benchmark script is at `scripts/benchmark.mjs`.

The self-intersection check is the most expensive rule (O(n²) ring segments) but still runs in under 10ms for real-world tiles.

### Does it hold up on large tiles?

Real-world tiles at zoom 12 are typically under 500 KB. Tiles above 5 MB exist but are generally malformed pipelines — TileGuard would flag them with `tile/feature-count`. The spatial index (`SpatialIndex.ts`) is used for hit-testing in the Inspector UI, not in the validation engine, so engine performance doesn't degrade with UI complexity.

### Can it validate an entire tile pyramid?

The CLI accepts multiple files or glob patterns: `tileguard check './tiles/**/*.pbf'`. Each tile is validated independently; there is no cross-tile analysis in the current release. Cross-tile consistency checking (e.g. feature continuity at tile boundaries) is planned for Milestone 8.

---

## Offline & Deployment

### Does it work offline?

Yes. The CLI has no runtime network dependencies. The Inspector bundles all demo datasets in the `public/` directory. The npm package works from a local install. No external API calls are made during validation.

### How large is the package?

`@tileguard/core`: ~12 KB gzipped.
`@tileguard/tile-rules`: ~25 KB gzipped (includes the MVT decoder).
`@tileguard/style-rules`: ~18 KB gzipped.
`tileguard` CLI: ~60 KB gzipped (all packages bundled + commander).

The Inspector UI is a separate dev-only SPA and is not distributed as an npm package.

### Can I run it in a Docker container?

Yes. The CLI is plain Node.js 18+. A minimal Dockerfile:

```dockerfile
FROM node:20-alpine
RUN npm install -g tileguard
ENTRYPOINT ["tileguard"]
```

---

## Open Source

### What licence?

MIT. Use it, fork it, embed it in commercial tooling. Attribution appreciated but not required.

### Can I contribute rules?

Yes. A rule is a plain TypeScript object under 25 lines. See `CONTRIBUTING.md` for the authoring guide. Rules live in `@tileguard/tile-rules` or `@tileguard/style-rules`, or in a third-party plugin package. The engine plugin interface is stable.

### Is this production-ready?

The core engine, tile rules, style rules, config, reporters, and CLI are stable (131 tests passing). The Inspector UI is a developer tool, not a production web application. Render regression testing is planned but not yet released.

### What is the roadmap?

- **Milestone 8** — Tile–Style Consistency Analysis (validate that tile layers match style source-layers)
- **Milestone 9** — Render Regression Testing (perceptual pixel comparison via headless rendering)
- **Milestone 10** — Plugin registry and third-party rule packages
- **Long term** — Cross-tile boundary consistency, Mapbox Tiling Spec conformance suite

---

## Extensibility

### How do I write a custom rule?

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'my-plugin/my-rule',
  meta: {
    description: 'Flags features with negative elevation.',
    defaultSeverity: 'warning',
    recommended: false,
  },
  artifactTypes: ['VectorTile'],

  create(context) {
    const tile = context.artifact.content;
    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        const elevation = feature.properties.elevation;
        if (typeof elevation === 'number' && elevation < 0) {
          context.report({
            message: `Feature ${i} in layer "${layerName}" has negative elevation: ${elevation}`,
            location: { layer: layerName, featureIndex: i },
            suggestion: 'Verify the elevation data source.',
          });
        }
      }
    }
  },
};
```

Register it via the plugin interface in `tileguard.config.ts`. No changes to the engine required.

### Can I write rules for custom tile schemas?

Yes. Rules receive the raw decoded `VectorTile` object. You can access any layer name, any feature property, and any geometry. The rule engine is domain-agnostic — the tile-rules package itself is just a collection of rules that happen to target the MVT spec.

### Can I disable a rule for a specific file?

Yes. Use `overrides` in your config:

```typescript
overrides: [
  {
    files: ['ocean/*.pbf'],
    rules: {
      'tile/no-empty': 'off', // Ocean tiles are intentionally empty
    },
  },
],
```

---

## Comparison to Existing Tools

### How is this different from tippecanoe's validation?

tippecanoe validates tile encoding correctness during generation. TileGuard validates tile content against configurable rules in CI — it can run long after tiles are generated, on tiles from any source. The concerns don't overlap.

### How is this different from vector-tile-validate?

vector-tile-validate is a small script that checks structural conformance. TileGuard is a rule engine with a plugin architecture, configurable severities, JSON output, an Inspector UI, and a CI integration story. The comparison is similar to `jshint` vs `eslint`.

### Does this replace manual visual inspection?

No. Render regression testing (planned for Milestone 9) closes much of that gap. Manual inspection is still valuable for subjective quality assessment. TileGuard closes the objective, rule-checkable gap — things that have a correct answer independent of visual judgement.
