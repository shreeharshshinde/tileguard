/**
 * @tileguard/inspector — useProfiler hook (Milestone 6 — Step 4)
 *
 * React bridge for PerformanceProfiler. Samples metrics at a configurable
 * interval so the DeveloperOverlay displays live FPS without blocking renders.
 *
 * Usage:
 *   const { fps, frameTimeMs, renderCount } = useProfiler(profiler);
 */

import { useEffect, useState } from 'react';
import type {
  PerformanceMetrics,
  PerformanceProfiler,
} from '../performance/PerformanceProfiler.js';
import { EMPTY_METRICS } from '../performance/PerformanceProfiler.js';

/**
 * Polls the profiler every `intervalMs` milliseconds and returns the latest
 * metrics snapshot.
 *
 * @param profiler    The PerformanceProfiler instance to read from.
 * @param intervalMs  How often to sample (default 500 ms).
 */
export function useProfiler(
  profiler: PerformanceProfiler | null,
  intervalMs = 500,
): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(EMPTY_METRICS);

  useEffect(() => {
    if (profiler === null) {
      setMetrics(EMPTY_METRICS);
      return;
    }

    // Sample immediately
    setMetrics(profiler.getMetrics());

    const id = setInterval(() => {
      setMetrics(profiler.getMetrics());
    }, intervalMs);

    return () => clearInterval(id);
  }, [profiler, intervalMs]);

  return metrics;
}
