/**
 * @tileguard/inspector — Snapshot Tests
 *
 * Golden-snapshot tests for the full CanvasRenderer pipeline.
 *
 * Because the Inspector test suite runs in the Vitest Node environment
 * (no real browser canvas), pixel-level image snapshots are not available.
 * Instead, these tests capture the ordered sequence of Canvas 2D API calls
 * emitted by each fixture and compare them against a stored snapshot.
 *
 * This gives the same regression guarantee as pixel snapshots for
 * deterministic rendering: any change to traversal order, coordinate
 * transform, drawing helpers, or the dispatch pipeline will change the
 * snapshot and fail the test.
 *
 * Fixtures covered
 * ────────────────
 *   1. Single Point
 *   2. Single LineString
 *   3. Single Polygon (no holes)
 *   4. Polygon-with-hole (exterior + 1 interior ring)
 *   5. MultiPolygon (two rings dispatched as one onPolygon call)
 *   6. Diagnostic Overlay — point-marker over a Point feature
 *   7. Mixed-layer tile (buildings + roads + places)
 *
 * Updating snapshots
 * ──────────────────
 *   npx vitest run --update-snapshots packages/inspector/tests/snapshots.test.ts
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { CanvasRenderer } from '../src/renderer/canvas-renderer';
import type { OverlayDescriptor } from '../src/overlay/overlay-adapter';
import type { VectorTileArtifact, VectorTileFeature, VectorTileLayer } from '@tileguard/tile-rules';
import { createViewport } from '../src/viewport/viewport';

// ---------------------------------------------------------------------------
// Deterministic recording canvas mock
// ---------------------------------------------------------------------------

/** A recorded Canvas 2D API call with method name and arguments. */
interface DrawCall {
  method: string;
  args: unknown[];
}

/** Creates a CanvasRenderingContext2D mock that records all draw calls. */
function makeRecordingCtx(): { ctx: CanvasRenderingContext2D; calls: DrawCall[] } {
  const calls: DrawCall[] = [];

  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
    };

  const props: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    globalAlpha: 1,
  };

  const ctx = new Proxy(props, {
    get(target, key: string) {
      if (key in target) return target[key];
      // Return a recording function for any method not in props
      return record(key);
    },
    set(target, key: string, value: unknown) {
      target[key] = value;
      calls.push({ method: `set:${key}`, args: [value] });
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return { ctx, calls };
}

/** Creates an HTMLCanvasElement mock with the recording context. */
function makeRecordingCanvas(
  width = 800,
  height = 600,
): { canvas: HTMLCanvasElement; calls: DrawCall[] } {
  const { ctx, calls } = makeRecordingCtx();
  const canvas = {
    width,
    height,
    getContext: (_type: string) => ctx,
  } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeLayer(
  name: string,
  features: VectorTileFeature[],
  extent = 4096,
): VectorTileLayer {
  return { name, version: 2, extent, keys: [], values: [], features };
}

function makeArtifact(layers: VectorTileLayer[]): VectorTileArtifact {
  const map: Record<string, VectorTileLayer> = {};
  for (const l of layers) map[l.name] = l;
  return { type: 'VectorTile', ref: { type: 'VectorTile', source: 'test.pbf' }, content: { layers: map } };
}

// ---------------------------------------------------------------------------
// Deterministic viewport (fixed zoom + pan so snapshots are stable)
// ---------------------------------------------------------------------------

const SNAPSHOT_VP_OPTS = {
  width: 400,
  height: 400,
  zoom: 0.08,   // tile extent 4096 * 0.08 = 327.68px — fits in 400px canvas
  panX: 36.16,  // centres the tile: (400 - 4096*0.08) / 2
  panY: 36.16,
} as const;

// ---------------------------------------------------------------------------
// Render helper: returns ordered draw calls as a serialisable list
// ---------------------------------------------------------------------------

function renderAndCapture(
  artifact: VectorTileArtifact,
  overlays: OverlayDescriptor[] = [],
  showVertices = false,
): DrawCall[] {
  const vp = createViewport(SNAPSHOT_VP_OPTS);
  const renderer = new CanvasRenderer({ viewport: vp, showVertices });
  const { canvas, calls } = makeRecordingCanvas(SNAPSHOT_VP_OPTS.width, SNAPSHOT_VP_OPTS.height);
  renderer.attachCanvas(canvas);
  renderer.render(artifact, overlays);
  return calls;
}

// ---------------------------------------------------------------------------
// Geometry fixtures
// ---------------------------------------------------------------------------

const POINT_FEATURE: VectorTileFeature = {
  id: 1, type: 1, geometryType: 'Point', properties: {},
  geometry: [{ x: 2048, y: 2048 }], // tile centre
};

const LINE_FEATURE: VectorTileFeature = {
  id: 2, type: 2, geometryType: 'LineString', properties: {},
  geometry: [[
    { x: 0, y: 0 },
    { x: 1024, y: 2048 },
    { x: 2048, y: 0 },
    { x: 4096, y: 4096 },
  ]],
};

const POLYGON_FEATURE: VectorTileFeature = {
  id: 3, type: 3, geometryType: 'Polygon', properties: {},
  geometry: [[
    { x: 512, y: 512 },
    { x: 3584, y: 512 },
    { x: 3584, y: 3584 },
    { x: 512, y: 3584 },
    { x: 512, y: 512 },
  ]],
};

const POLYGON_WITH_HOLE: VectorTileFeature = {
  id: 4, type: 3, geometryType: 'Polygon', properties: {},
  geometry: [
    // exterior
    [
      { x: 200, y: 200 },
      { x: 3896, y: 200 },
      { x: 3896, y: 3896 },
      { x: 200, y: 3896 },
      { x: 200, y: 200 },
    ],
    // hole
    [
      { x: 800, y: 800 },
      { x: 3296, y: 800 },
      { x: 3296, y: 3296 },
      { x: 800, y: 3296 },
      { x: 800, y: 800 },
    ],
  ],
};

const MULTIPOLYGON_FEATURE: VectorTileFeature = {
  id: 5, type: 3, geometryType: 'Polygon', properties: {},
  geometry: [
    [
      { x: 100, y: 100 }, { x: 1000, y: 100 },
      { x: 1000, y: 1000 }, { x: 100, y: 1000 }, { x: 100, y: 100 },
    ],
    [
      { x: 2000, y: 2000 }, { x: 3000, y: 2000 },
      { x: 3000, y: 3000 }, { x: 2000, y: 3000 }, { x: 2000, y: 2000 },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Snapshot tests
// ---------------------------------------------------------------------------

describe('CanvasRenderer snapshots — single geometry types', () => {
  it('Point fixture draw-call sequence matches snapshot', () => {
    const calls = renderAndCapture(makeArtifact([makeLayer('places', [POINT_FEATURE])]));
    expect(calls).toMatchSnapshot();
  });

  it('LineString fixture draw-call sequence matches snapshot', () => {
    const calls = renderAndCapture(makeArtifact([makeLayer('roads', [LINE_FEATURE])]));
    expect(calls).toMatchSnapshot();
  });

  it('Polygon (no holes) fixture draw-call sequence matches snapshot', () => {
    const calls = renderAndCapture(makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]));
    expect(calls).toMatchSnapshot();
  });

  it('Polygon-with-hole fixture draw-call sequence matches snapshot', () => {
    const calls = renderAndCapture(makeArtifact([makeLayer('buildings', [POLYGON_WITH_HOLE])]));
    expect(calls).toMatchSnapshot();
  });

  it('MultiPolygon fixture draw-call sequence matches snapshot', () => {
    const calls = renderAndCapture(makeArtifact([makeLayer('buildings', [MULTIPOLYGON_FEATURE])]));
    expect(calls).toMatchSnapshot();
  });
});

describe('CanvasRenderer snapshots — Diagnostic Overlay', () => {
  it('point-marker overlay fixture matches snapshot', () => {
    const overlay: OverlayDescriptor = {
      type: 'point-marker',
      layerName: 'places',
      featureIndex: 0,
      target: 0,
      severity: 'error',
    };
    const calls = renderAndCapture(
      makeArtifact([makeLayer('places', [POINT_FEATURE])]),
      [overlay],
    );
    expect(calls).toMatchSnapshot();
  });

  it('bbox-fill overlay fixture matches snapshot', () => {
    const overlay: OverlayDescriptor = {
      type: 'bbox-fill',
      layerName: 'buildings',
      featureIndex: 0,
      target: 0,
      severity: 'warning',
    };
    const calls = renderAndCapture(
      makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]),
      [overlay],
    );
    expect(calls).toMatchSnapshot();
  });

  it('ring-highlight overlay fixture matches snapshot', () => {
    const overlay: OverlayDescriptor = {
      type: 'ring-highlight',
      layerName: 'buildings',
      featureIndex: 0,
      target: 0,
      severity: 'warning',
    };
    const calls = renderAndCapture(
      makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]),
      [overlay],
    );
    expect(calls).toMatchSnapshot();
  });
});

describe('CanvasRenderer snapshots — mixed-layer tile', () => {
  it('mixed tile (buildings + roads + places) matches snapshot', () => {
    const calls = renderAndCapture(
      makeArtifact([
        makeLayer('buildings', [POLYGON_FEATURE]),
        makeLayer('roads', [LINE_FEATURE]),
        makeLayer('places', [POINT_FEATURE]),
      ]),
    );
    expect(calls).toMatchSnapshot();
  });
});

describe('CanvasRenderer snapshots — vertex markers enabled', () => {
  it('Polygon with showVertices=true matches snapshot', () => {
    const calls = renderAndCapture(
      makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]),
      [],
      true, // showVertices
    );
    expect(calls).toMatchSnapshot();
  });
});

describe('CanvasRenderer snapshots — empty tile', () => {
  it('artifact with no layers produces only boundary draw calls', () => {
    const calls = renderAndCapture(makeArtifact([]));
    expect(calls).toMatchSnapshot();
  });
});
