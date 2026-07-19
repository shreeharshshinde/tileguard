# TileGuard Benchmark Report

Generated at: `2026-07-18T05:00:26.244Z`

## Executive Summary
This report presents the execution performance, memory overhead, and diagnostic metrics of the TileGuard validation pipeline on cached production-grade vector tiles. By running on local cached files, the metrics represent pure processing time independent of internet latency.

### Performance Results Table

| Dataset | Tiles Processed | Total Time (ms) | Avg Time/Tile (ms) | Heap Memory Diff (MB) | Throughput (tiles/sec) | Diagnostics Found |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **OpenMapTiles** | 94 | 1992.19 | 21.19 | -2.42 | 47.18 | 173 |
| **OpenFreeMap** | 100 | 2021.88 | 20.22 | -7.12 | 49.46 | 223 |
| **CARTO Streets** | 100 | 1478.13 | 14.78 | 6.73 | 67.65 | 223 |

---

## Profiling & Hotspot Analysis

Based on execution times and geometry structure:
1. **Self-Intersection Bottleneck:** The `tile/self-intersection` rule is the most computationally expensive part of the pipeline. On dense tiles (like CARTO Streets), polygon coordinates can exceed thousands of vertices, making the $O(N^2)$ segment intersection search the dominant runtime component.
2. **Memory Retention:** The heap delta remains relatively low when processing cached files directly. However, for huge tile pools, compiling diagnostics into memory before reporting will lead to significant garbage collection overhead.
