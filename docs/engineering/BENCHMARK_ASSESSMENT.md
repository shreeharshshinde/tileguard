# TileGuard Benchmark Assessment

This document outlines the design, execution methodology, and validation correctness of the TileGuard benchmark suite. It serves as an engineering and academic reference for evaluating validation engine throughput, memory behavior, and runtime profiling.

---

## 1. Benchmark Environment Specifications

The benchmark results depend on the local execution environment. Ensure all environment parameters are fully documented when presenting metrics:

| Attribute | Specification |
| :--- | :--- |
| **CPU** | Intel Core i7 / AMD Ryzen 7 Series (or equivalent vCPU count) |
| **RAM** | 16 GB DDR4 / DDR5 |
| **OS** | Linux (Ubuntu 22.04 LTS / Debian 12 / Fedora 40) |
| **Node.js** | v22.x or later (Run with `--expose-gc` flag) |
| **TileGuard** | v0.5.0 |
| **Filesystem** | NVMe SSD |

---

## 2. Benchmark Methodology

To guarantee reproducibility and eliminate network-based distortion, the TileGuard benchmark follows these strict design principles:

### A. Pure Offline Processing
* **Method:** The suite caches vector tiles locally in the `fixtures/benchmark-cache/` directory during a pre-pass.
* **Timing Isolation:** The timed loop only measures filesystem reads (`fs.promises.readFile`), MVT decoding, and engine/rule validation execution. It completely excludes HTTP connection overhead and network download latency.

### B. V8 JIT Warmup
* **Why it matters:** V8 compiles hot Javascript functions at runtime. Invocations on the first few tiles suffer from compilation and optimization latency, which skews average execution times on small datasets.
* **Warmup Implementation:** The harness executes 5 full, discarded warm-up runs of `engine.run()` on a valid tile before starting high-resolution performance timers.

### C. Hard Assertions
* **Failed Fetch Logging:** Any failure during tile downloads logs a warning: `FAILED: <url> — <error_message>`.
* **Sample Size Assertion:** If fewer than **90%** of the requested tiles cache successfully (having a file size > 0 bytes), the script crashes loudly using `throw new Error(...)` rather than proceeding with a degraded sample size.
* **Load Failure Verification:** If the engine returns a load-failure diagnostic (`artifact/load-failed` or `artifact/no-provider`) for any tile inside the benchmark loop, it halts execution immediately to prevent load failures from falsely inflating throughput.

### D. Memory Measurement & GC Sweep
* **GC Expose:** The benchmark must be invoked with Node's garbage collector exposed: `node --expose-gc scripts/benchmark.mjs`.
* **GC Sweep:** Before tracking the starting heap size, `global.gc()` is run twice to clear all memory generations. A final double-sweep is performed after the processing loop completes before recording the ending heap size. This mitigates transient memory allocation noise and JIT allocations.

---

## 3. Performance Results & Metrics

Below is a snapshot of the benchmark metrics measured on the baseline cache of 100 tiles per dataset:

| Dataset | Tiles Processed | Total Time (ms) | Avg Time/Tile (ms) | Throughput (tiles/sec) | Diagnostics Found |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **OpenMapTiles** | 94 | 1777.51 | 18.91 | 52.88 | 5628 |
| **OpenFreeMap** | 100 | 1217.25 | 12.17 | 82.15 | 6644 |
| **CARTO Streets** | 100 | 860.60 | 8.61 | 116.20 | 6785 |

### OpenMapTiles 94/100 Discrepancy
The MapLibre Demo OpenMapTiles endpoint only hosts global datasets up to Zoom 3. Zoom 4 tiles for coordinate locations outside the limited regional extent of the demo return HTTP 404. As a result, 6 benchmark fixtures were unavailable and intentionally excluded from evaluation, which is safely above the 90% threshold assertion.

---

## 4. Profiling & Hotspot Hypotheses

* **Self-Intersection Complexity:** Based on the current codebase, the `tile/self-intersection` rule is expected to dominate runtime on dense geometries because it performs pairwise segment intersection checks ($O(N^2)$ time complexity). This hypothesis should be confirmed through dedicated CPU profiling in future optimization sprints.
* **Diagnostics Retention:** Memory metrics show that the heap delta remains low (~0.1MB) during validation of 100 tiles. However, because the engine compiles all diagnostics in memory before triggering reporters, validation of massive tile pools (10,000+ tiles) will result in significant Garbage Collection overhead. Moving to a streaming reporter interface would mitigate this.

---

## 5. Peer-Review Audit Guidelines

To validate this benchmark for academic publication or presentation at industry conferences (e.g., FOSS4G), verify the harness against the following peer-review audit:

> **Review the benchmark harness for methodological correctness. Verify that the benchmark measures only validation overhead (excluding download latency), that JIT warmup, file I/O, provider decoding, rule execution, and reporter behavior are handled appropriately, and identify any sources of measurement bias (filesystem cache, garbage collection, asynchronous scheduling, V8 optimization, timer resolution, etc.). Recommend improvements to make the benchmark reproducible, statistically sound, and suitable for publication in engineering documentation or an academic paper.**
