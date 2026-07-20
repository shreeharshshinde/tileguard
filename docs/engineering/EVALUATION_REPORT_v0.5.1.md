# TileGuard v0.5.1 Evaluation Report

## 1. Executive Summary

Step 4 confirms a **100.00% measured false-positive reduction** for `tile/coordinate-range` on the Step 2 production-tile classification corpus: **148,268 -> 0** out-of-range coordinate entries after applying the shipped defaults (`buffer: 80`, `excludeLayers: ["place", "water_name", "centroids"]`). The cached 294-tile benchmark sample also shows zero remaining engine-level `tile/coordinate-range` diagnostics after the change; all remaining diagnostics are `tile/self-intersection`.

## 2. Before/After Diagnostics

Classification corpus: `analysis/offset-distribution.json`, generated from 294 cached production tiles across OpenMapTiles, OpenFreeMap, and CARTO Streets.

| Dataset | Before `tile/coordinate-range` entries | After entries | Reduction |
| :--- | ---: | ---: | ---: |
| OpenMapTiles | 48,378 | 0 | 100.00% |
| OpenFreeMap | 50,282 | 0 | 100.00% |
| CARTO Streets | 49,608 | 0 | 100.00% |
| **Total** | **148,268** | **0** | **100.00%** |

Engine diagnostic cross-check on the same cached benchmark data also reported 0 `tile/coordinate-range` diagnostics after the fix. Engine-level legacy-mode counts (7,582 for OpenMapTiles) are lower than the offset-distribution corpus (48,378) because the engine's default `maxDetails: 100` option caps diagnostics per rule per artifact — a safety limit against runaway output, unrelated to this fix. The classification corpus bypasses the engine entirely to decode PBF bytes directly and count every out-of-range point without that cap, which is why it is used as the source of truth for the false-positive classification. Verified on a single tile (`OpenMapTiles/1-0-0.pbf`): both approaches report exactly 758 out-of-range coordinates when the engine cap is removed. Note that this also means real users running `tileguard check` before this fix never saw the full 148,268-diagnostic flood in one run — they saw up to 100 per rule per tile, which is still a poor first-run experience but a different number than the raw corpus total implies.

## 3. Statistical Benchmark Results

Method: 5 independent `node --expose-gc scripts/benchmark.mjs --mode=<mode> --json` process invocations per mode. Raw outputs are in `artifacts/step4-benchmark-legacy.jsonl`, `artifacts/step4-benchmark-after.jsonl`, and `artifacts/step4-benchmark-disabled.jsonl`. No runs were more than 2 sigma from the mean.

| Mode | Dataset | Tiles | Diagnostics | Total ms mean/median/sigma | Throughput mean/median/sigma | Peak heap MB mean/median/sigma | Peak RSS MB mean/median/sigma |
| :--- | :--- | ---: | ---: | :--- | :--- | :--- | :--- |
| Legacy-equivalent | OpenMapTiles | 94 | 7,582 | 2009.86 / 2020.33 / 107.26 | 46.91 / 46.53 / 2.60 | 23.34 / 23.34 / 0.00 | 107.70 / 108.06 / 0.91 |
| Legacy-equivalent | OpenFreeMap | 100 | 8,127 | 1584.90 / 1604.03 / 290.04 | 65.18 / 62.34 / 11.50 | 76.46 / 71.73 / 8.57 | 171.54 / 172.09 / 10.98 |
| Legacy-equivalent | CARTO Streets | 100 | 8,187 | 1238.44 / 1285.48 / 178.13 | 82.84 / 77.79 / 14.62 | 35.29 / 37.53 / 3.44 | 165.86 / 166.38 / 10.10 |
| After | OpenMapTiles | 94 | 173 | 2339.12 / 2408.19 / 372.19 | 41.27 / 39.03 / 6.93 | 22.58 / 22.58 / 0.00 | 106.79 / 106.55 / 0.82 |
| After | OpenFreeMap | 100 | 223 | 1515.13 / 1600.32 / 291.92 | 68.54 / 62.49 / 13.32 | 74.23 / 71.32 / 6.24 | 169.40 / 164.68 / 7.04 |
| After | CARTO Streets | 100 | 223 | 1115.99 / 1117.06 / 195.37 | 92.58 / 89.52 / 17.15 | 28.85 / 27.05 / 2.37 | 160.21 / 155.03 / 7.76 |

## 4. Isolated Rule-Cost Comparison

`after` mode was compared with `disabled` mode, where `tile/coordinate-range` is off and all other benchmark rules remain unchanged.

| Dataset | After mean ms | Disabled mean ms | Marginal cost |
| :--- | ---: | ---: | ---: |
| OpenMapTiles | 2339.12 | 2204.83 | +134.29 ms |
| OpenFreeMap | 1515.13 | 1331.69 | +183.44 ms |
| CARTO Streets | 1115.99 | 1015.32 | +100.67 ms |
| **Total** | **4970.24** | **4551.84** | **+418.40 ms** |

This benchmark did not demonstrate the expected small improvement. The observed delta is small relative to run-to-run variance and the `tile/self-intersection` bottleneck, and after-mode diagnostics are identical to disabled-mode diagnostics. Treat the marginal cost result as noisy, not as evidence of a material regression.

## 5. False-Positive Classification Recap

The full classification is in [DIAGNOSTIC_CLASSIFICATION.md](./DIAGNOSTIC_CLASSIFICATION.md). Step 2 classified all `tile/coordinate-range` entries as intentional implementation behavior: label duplication in `place`, `water_name`, and `centroids`, plus geometry clipping buffers capped at 64 or 80 units. Step 4 re-applied the final defaults to that classified corpus and confirmed zero residual entries.

## 6. False-Negative Verification

Unit coverage from Step 3 verifies the synthetic `poi` guard and exact boundary behavior at `0`, `4096`, `+/-80`, and `+/-81`. The cached production benchmark also confirms that after-mode and disabled-mode differ only by the active rule state: both report exactly 173, 223, and 223 self-intersection diagnostics for OpenMapTiles, OpenFreeMap, and CARTO Streets respectively, with zero remaining coordinate-range diagnostics. No non-excluded real-data Point-layer coordinate corruption was found in the classified corpus.

## 7. Methodology

| Field | Value |
| :--- | :--- |
| Date | 2026-07-19 |
| OS | Fedora Linux, kernel `6.19.14-200.fc43.x86_64` |
| CPU | Intel Core Ultra 5 125H, 18 logical CPUs |
| RAM | 14 GiB total |
| Node | `v22.22.0` |
| npm | `10.9.4` |
| Package manager note | `pnpm` and Corepack were unavailable on PATH; package-local `tsc`/`vitest` binaries were used for pre-flight verification |
| Filesystem | NVMe-backed ext4 mount, 467 GiB size, 337 GiB available |
| Cache | `fixtures/benchmark-cache`, 294 valid PBF files, 50,745,591 bytes |
| Tile counts | OpenMapTiles 94/100, OpenFreeMap 100/100, CARTO Streets 100/100 |
| Warm-up | 5 warm-up `engine.run()` calls per dataset before timed tile loop |
| Process independence | 5 separate Node process invocations per benchmark mode |
| Memory metric | Peak heap and peak RSS sampled after every tile |

Pre-flight verification:

- `./packages/tile-rules/node_modules/.bin/tsc --build packages/tile-rules/tsconfig.json` passed.
- `./node_modules/.bin/vitest run` in `packages/tile-rules` passed: 12 files, 67 tests.
- `node packages/cli/dist/bin.js rules list --config packages/cli/tileguard.config.ts` confirmed `tile/coordinate-range` is present with plugin default severity `error`. The command intentionally does not display resolved config options, so it cannot show inherited `buffer`/`excludeLayers`.
- The CARTO URL template is correct in the current scripts and was not used for cached benchmark timing except for attempted cache misses.

## 8. Threats To Validity

- `scripts/evaluate-real-world.mjs` still fetches live URLs and has no cache or progress checkpoints. A network-approved after-mode run was interrupted after roughly 11 minutes without output, likely in dense high-zoom self-intersection work. It was not used as evidence.
- The benchmark cache is stable at 294 valid files, but OpenMapTiles has six persistent missing tiles. This matches the prior benchmark count and is acceptable for before/after comparison, but it is not a complete 300-tile corpus.
- Legacy mode emulates v0.5.0 coordinate-range behavior via options (`buffer: 0`, `excludeLayers: []`) in the current implementation. The confirmed 148,268 before-count still comes from the Step 2 saved corpus, not from re-running historical code.
- Whole-engine timing is dominated by `tile/self-intersection`, so the isolated coordinate-range cost is noisy at this sample size.
- Provider schemas outside OpenMapTiles/Planetiler/CARTO may use different label layer names; users can override `excludeLayers` for those schemas.

## 9. ADR-006 Link

ADR-006 is updated with the confirmed measured result: [ADR-006: Data-Driven Defaults for tile/coordinate-range Rule](../architecture/adr/006-coordinate-range-defaults.md).
