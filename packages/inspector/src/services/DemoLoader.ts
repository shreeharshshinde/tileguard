/**
 * @tileguard/inspector — DemoLoader (Milestone 7.5 — Step C)
 *
 * Fetches demo dataset files from the bundled /demo/ path without
 * triggering an OS file picker. Used by DemoCatalog to enable
 * one-click demo loading.
 *
 * All files are served from the Vite public/ directory, so they are
 * accessible at /demo/... relative to the application's origin.
 *
 * Boundary: fetch() API only. No React, no store, no renderer.
 */

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

export interface DemoDataset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Single-file datasets (tile or style). */
  readonly path?: string;
  /** Two-file comparison/regression datasets. */
  readonly paths?: { readonly before: string; readonly after: string };
  readonly type: 'tile' | 'comparison' | 'style';
  readonly tags: readonly string[];
  readonly defaultZoom?: number;
  readonly defaultCenter?: readonly [number, number];
  readonly expectedDiagnostics?: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
  };
  readonly expectedLayers?: readonly string[];
  readonly demoStep: string;
  readonly speakerNote: string;
}

export interface DemoManifest {
  readonly version: string;
  readonly description: string;
  readonly datasets: readonly DemoDataset[];
}

// ---------------------------------------------------------------------------
// DemoLoadResult
// ---------------------------------------------------------------------------

export type DemoLoadResult =
  | { readonly kind: 'single'; readonly file: File; readonly dataset: DemoDataset }
  | {
      readonly kind: 'comparison';
      readonly fileA: File;
      readonly fileB: File;
      readonly dataset: DemoDataset;
    }
  | { readonly kind: 'error'; readonly message: string };

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const DEMO_BASE = '/demo/';

async function fetchDemoFile(relativePath: string): Promise<File> {
  const url = `${DEMO_BASE}${relativePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch demo file "${url}": ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const fileName = relativePath.split('/').pop() ?? relativePath;
  // Determine MIME type by extension
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const type = ext === 'json' ? 'application/json' : 'application/octet-stream';
  return new File([blob], fileName, { type });
}

// ---------------------------------------------------------------------------
// loadDemoDataset
// ---------------------------------------------------------------------------

/**
 * Fetches the file(s) associated with a demo dataset and returns them as
 * browser File objects, ready to pass to the existing tile-loading pipeline.
 */
export async function loadDemoDataset(dataset: DemoDataset): Promise<DemoLoadResult> {
  try {
    if (dataset.type === 'comparison' && dataset.paths !== undefined) {
      const [fileA, fileB] = await Promise.all([
        fetchDemoFile(dataset.paths.before),
        fetchDemoFile(dataset.paths.after),
      ]);
      return { kind: 'comparison', fileA, fileB, dataset };
    }

    if (dataset.path !== undefined) {
      const file = await fetchDemoFile(dataset.path);
      return { kind: 'single', file, dataset };
    }

    return { kind: 'error', message: `Dataset "${dataset.id}" has no path configured.` };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Unknown error loading demo dataset',
    };
  }
}

// ---------------------------------------------------------------------------
// loadDemoManifest
// ---------------------------------------------------------------------------

let _cachedManifest: DemoManifest | null = null;

export async function loadDemoManifest(): Promise<DemoManifest> {
  if (_cachedManifest !== null) return _cachedManifest;

  const response = await fetch(`${DEMO_BASE}DemoManifest.json`);
  if (!response.ok) {
    throw new Error(`Could not load DemoManifest.json: ${response.status}`);
  }
  _cachedManifest = (await response.json()) as DemoManifest;
  return _cachedManifest;
}

/** Reset cache — for tests. */
export function resetDemoManifestCache(): void {
  _cachedManifest = null;
}
