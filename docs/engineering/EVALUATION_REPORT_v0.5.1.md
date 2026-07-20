# TileGuard v0.5.1 Evaluation Report

## 1. Executive Summary

Step 4 confirms a **100.00% reduction of coordinate-range diagnostics previously classified as intentional behavior across the evaluated production datasets**. By applying the empirically derived default configurations (`buffer: 80`, `excludeLayers: ["place", "water_name", "centroids"]`), the number of false-positive diagnostics in the Step 2 classification corpus was reduced from **148,268 to 0**.

The classification corpus contained zero remaining classified false positives after applying the new defaults. Separate engine-level benchmark runs reported zero coordinate-range diagnostics, with all remaining engine diagnostics isolated to intentionally retained validation scenarios (specifically, `tile/self-intersection`).

---

## 2. Before/After Diagnostics

Classification corpus: `analysis/offset-distribution.json`, generated from 294 cached production tiles across OpenMapTiles, OpenFreeMap, and CARTO Streets.

| Dataset | Before `tile/coordinate-range` entries | After entries | Reduction |
| :--- | ---: | ---: | ---: |
| OpenMapTiles | 48,378 | 0 | 100.00% |
| OpenFreeMap | 50,282 | 0 | 100.00% |
| CARTO Streets | 49,608 | 0 | 100.00% |
| **Total** | **148,268** | **0** | **100.00%** |

Engine-level legacy-mode counts (7,582 for OpenMapTiles) are lower than the offset-distribution corpus (48,378) because the engine's default `maxDetails: 100` option caps diagnostics per rule per artifact — a safety limit against runaway output, unrelated to this fix. The classification corpus bypasses the engine entirely to decode PBF bytes directly and count every out-of-range point without that cap, which is why it is used as the source of truth for the false-positive classification. Therefore, the classification corpus and engine benchmark intentionally measure different quantities.

Verified on a single tile (`OpenMapTiles/1-0-0.pbf`): both approaches report exactly 758 out-of-range coordinates when the engine cap is removed. Note that this also means real users running `tileguard check` before this fix never saw the full 148,268-diagnostic flood in one run — they saw up to 100 per rule per tile, which is still a poor first-run experience but a different number than the raw corpus total implies.

---

## 3. Discrepancy Investigations & Safety Cap Resolutions

During the evaluation, two key numerical discrepancies were analyzed and successfully resolved:

### 3.1. The 63,944 vs. 64,458 Label Duplication Count
* **The Discrepancy:** The initial classification report listed `63,944` label-duplication entries, whereas summing the raw database counts for the affected layers in `offset-distribution.csv` (`place: 60,820`, `water_name: 3,578`, `centroids: 60`) yields `64,458`.
* **The Explanation:** The number `63,944` represents the count of coordinate entries that were specifically of the `Point` geometry type. The remaining `514` entries in these three layers belonged to `LineString` or `Polygon` features that also extended outside the standard bounds (e.g. centroid approximations or bounds clipping).
* **The Resolution:** All `64,458` entries in these three layers are suppressed by the layer-based exclusion (`excludeLayers`), meaning the non-Point features in these layers are also resolved. Documentation in ADR-006, `DIAGNOSTIC_CLASSIFICATION.md`, and the coordinate-range rules was updated to reflect this distinction.

### 3.2. The 48,378 vs. 7,582 Engine Diagnostic Gap
* **The Discrepancy:** Running the validation engine in legacy mode (`buffer: 0`, `excludeLayers: []`) against the OpenMapTiles dataset reported only `7,582` diagnostics, compared to `48,378` recorded in the classification corpus.
* **The Explanation:** The core TileGuard validation engine implements a global safety cap via `GlobalOptions.maxDetails`, which defaults to `100` diagnostics per rule per artifact (tile) to prevent runaway terminal output. The classification script bypassed the engine, decoding the PBF bytes directly to count every raw out-of-range point.
* **The Verification:** An apples-to-apples run was conducted on a single tile (`OpenMapTiles/1-0-0.pbf`). When the engine's `maxDetails` cap was removed, both the engine and the raw decoder reported **exactly 758** out-of-range coordinates.
* **User Impact Note:** This confirms that real users running the pre-fix CLI did not see a 148,268-diagnostic terminal flood, but were instead capped at 100 diagnostics per rule per tile.

---

## 4. Statistical Benchmark Results

Five independent benchmark runs were collected for each configuration using `node --expose-gc scripts/benchmark.mjs --mode=<mode> --json`. No statistically obvious outliers (>2 standard deviations from the mean) were observed. Raw outputs are in `artifacts/step4-benchmark-legacy.jsonl`, `artifacts/step4-benchmark-after.jsonl`, and `artifacts/step4-benchmark-disabled.jsonl`.

| Mode | Dataset | Tiles | Diagnostics | Total ms mean/median/sigma | Throughput mean/median/sigma | Peak heap MB mean/median/sigma | Peak RSS MB mean/median/sigma |
| :--- | :--- | ---: | ---: | :--- | :--- | :--- | :--- |
| Legacy-equivalent | OpenMapTiles | 94 | 7,582 | 2009.86 / 2020.33 / 107.26 | 46.91 / 46.53 / 2.60 | 23.34 / 23.34 / 0.00 | 107.70 / 108.06 / 0.91 |
| Legacy-equivalent | OpenFreeMap | 100 | 8,127 | 1584.90 / 1604.03 / 290.04 | 65.18 / 62.34 / 11.50 | 76.46 / 71.73 / 8.57 | 171.54 / 172.09 / 10.98 |
| Legacy-equivalent | CARTO Streets | 100 | 8,187 | 1238.44 / 1285.48 / 178.13 | 82.84 / 77.79 / 14.62 | 35.29 / 37.53 / 3.44 | 165.86 / 166.38 / 10.10 |
| After | OpenMapTiles | 94 | 173 | 2339.12 / 2408.19 / 372.19 | 41.27 / 39.03 / 6.93 | 22.58 / 22.58 / 0.00 | 106.79 / 106.55 / 0.82 |
| After | OpenFreeMap | 100 | 223 | 1515.13 / 1600.32 / 291.92 | 68.54 / 62.49 / 13.32 | 74.23 / 71.32 / 6.24 | 169.40 / 164.68 / 7.04 |
| After | CARTO Streets | 100 | 223 | 1115.99 / 1117.06 / 195.37 | 92.58 / 89.52 / 17.15 | 28.85 / 27.05 / 2.37 | 160.21 / 155.03 / 7.76 |

---

## 5. Isolated Rule-Cost Comparison

`after` mode was compared with `disabled` mode, where `tile/coordinate-range` is off and all other benchmark rules remain unchanged.

| Dataset | After mean ms | Disabled mean ms | Marginal cost (Total) | Cost / Tile (ms) | % Overhead |
| :--- | ---: | ---: | ---: | ---: | ---: |
| OpenMapTiles | 2339.12 | 2204.83 | +134.29 ms | +1.43 ms | +6.09% |
| OpenFreeMap | 1515.13 | 1331.69 | +183.44 ms | +1.83 ms | +13.78% |
| CARTO Streets | 1115.99 | 1015.32 | +100.67 ms | +1.01 ms | +9.92% |
| **Total / Avg** | **4970.24** | **4551.84** | **+418.40 ms** | **+1.42 ms** | **+9.19%** |

This benchmark did not demonstrate the expected performance improvement when deactivating the rule. The observed delta is small relative to run-to-run variance and the `tile/self-intersection` bottleneck, and after-mode diagnostics are identical to disabled-mode diagnostics. Treat the marginal cost result as noisy, not as evidence of a material regression.

---

## 6. False-Positive Classification Recap

The full classification is in [DIAGNOSTIC_CLASSIFICATION.md](./DIAGNOSTIC_CLASSIFICATION.md). Step 2 classified all `tile/coordinate-range` entries as intentional implementation behavior: label duplication in `place`, `water_name`, and `centroids` (64,458 entries; 63,944 Points + 514 non-Points), plus geometry clipping buffers capped at 64 or 80 units (83,810 entries). Step 4 re-applied the final defaults to that classified corpus and confirmed zero residual entries.

---

## 7. False-Negative Verification

Unit coverage from Step 3 verifies the synthetic `poi` guard and exact boundary behavior at `0`, `4096`, `+/-80`, and `+/-81`. The cached production benchmark also confirms that after-mode and disabled-mode differ only by the active rule state: both report exactly 173, 223, and 223 self-intersection diagnostics for OpenMapTiles, OpenFreeMap, and CARTO Streets respectively, with zero remaining coordinate-range diagnostics. No non-excluded real-data Point-layer coordinate corruption was found in the classified corpus.

---

## 8. Detailed Methodology

| Field | Value |
| :--- | :--- |
| Date | 2026-07-20 |
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

---

## 9. Threats to Validity

* **Scope of Datasets:** This evaluation was performed on 294 cached production tiles from three widely used vector-tile distributions (OpenMapTiles, OpenFreeMap, and CARTO Streets). Although these datasets represent diverse real-world implementations, the recommended defaults may not be optimal for tile schemas that use different layer names or clipping conventions. The rule therefore remains configurable through the `buffer` and `excludeLayers` options.
* **Network Latency:** `scripts/evaluate-real-world.mjs` still fetches live URLs and has no cache or progress checkpoints. A network-approved after-mode run was interrupted after roughly 11 minutes without output, likely in dense high-zoom self-intersection work. It was not used as evidence.
* **Cache Completeness:** The benchmark cache is stable at 294 valid files, but OpenMapTiles has six persistent missing tiles. This matches the prior benchmark count and is acceptable for before/after comparison, but it is not a complete 300-tile corpus.
* **Legacy Mode Emulation:** Legacy mode emulates v0.5.0 coordinate-range behavior via options (`buffer: 0`, `excludeLayers: []`) in the current implementation. The confirmed 148,268 before-count still comes from the Step 2 saved corpus, not from re-running historical code.
* **Overhead Measurement Noise:** Whole-engine timing is dominated by `tile/self-intersection`, so the isolated coordinate-range cost is noisy at this sample size.

---

## 10. ADR-006 Link

ADR-006 is updated with the confirmed measured result: [ADR-006: Data-Driven Defaults for tile/coordinate-range Rule](../architecture/adr/006-coordinate-range-defaults.md).
