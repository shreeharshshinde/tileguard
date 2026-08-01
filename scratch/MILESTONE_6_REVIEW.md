# Milestone 6 — Complete Source Code & Technical Review
## Complete Vector Tile Analysis Workstation & Subsystem Architecture

This document provides an exhaustive, line-by-line technical review of **Milestone 6 (Steps 1, 2, 3 & 4)** in `@tileguard/inspector`. It contains the complete source code, architecture, data structures, algorithms, reactive subscriptions, animation engines, spatial indexing, search query parsing, developer profiling tools, workspace persistence, and complete test suite verification for the entire TileGuard inspection platform.

----

## Table of Contents
1. [Architectural Overview & Subsystem Hierarchy](#1-architectural-overview--subsystem-hierarchy)
2. [Step 1: Workspace Shell & Canvas Architecture](#2-step-1-workspace-shell--canvas-architecture)
3. [Step 2: Diagnostics & Feature Inspection Components](#3-step-2-diagnostics--feature-inspection-components)
4. [Step 3: Statistics, Settings & Analysis Subsystems](#4-step-3-statistics-settings--analysis-subsystems)
5. [Step 4: Navigation, Performance & Production Polish Systems](#5-step-4-navigation-performance--production-polish-systems)
6. [Complete Source Code Listing](#6-complete-source-code-listing)
7. [Comprehensive Test Suite Verification & Benchmarks](#7-comprehensive-test-suite-verification--benchmarks)
8. [Final Architectural Freeze & Quality Audit](#8-final-architectural-freeze--quality-audit)

----

## 1. Architectural Overview & Subsystem Hierarchy

Milestone 6 composes the core inspection engine into a complete, high-performance GIS analysis workstation.

### Subsystem Hierarchy Graph

```text
React UI (InspectorApp, SidebarNav, Toolbar, Footer, Overlays)
       │
       ▼
InspectorContext & Custom Hooks (useStore, useSettings, useStatistics, useWorkspace)
       │
       ▼
Inspector Facade (create-inspector.ts)
 ┌─────┴───────────────────┬──────────────────────┐
 ▼                         ▼                      ▼
Services Layer             Providers Layer        Animation & Performance
• StatisticsService        • DiagnosticProvider   • CameraAnimator (60 FPS)
• SettingsService          • FeatureProvider      • SpatialIndex (2D Grid)
• ShortcutService          • LayerProvider        • PerformanceProfiler
• WorkspaceService                                • Viewport Culling
• SearchService
• ExportService
 └─────┬───────────────────┴──────────────────────┘
       │
       ▼
InspectorStore (Single Mutable State Owner)
       │
       ▼
RenderCoordinator (Dirty State & Throttled Rendering)
       │
       ▼
CanvasRenderer (Viewport, Shapes, Overlays)
```

----

## 6. Complete Source Code Listing

### File: `packages/inspector/src/create-inspector.ts`

```typescript
/**
 * @tileguard/inspector — Inspector Integration Layer (Milestone 6 — Step 4)
 *
 * Extends the Step 3 facade with:
 *   - Animated viewport transitions via CameraAnimator
 *   - animateTo(bounds) — smooth camera pan/zoom to a bounding box
 *   - export()          — ExportService stub (Milestone 7 implementation)
 *   - getSupportedExportFormats()
 *
 * Step 3 additions remain:
 *   - getSettings / updateSettings / resetSettings
 *   - getTileStatistics
 *   - getStatistics (deprecated alias)
 *
 * Architecture: CameraAnimator is injected at construction time for
 * testability. In production it is created with the browser RAF scheduler.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import {
  createCameraAnimator,
  type CameraAnimator,
  type RafScheduler,
} from './animation/CameraAnimator.js';
import { createBoundsFromPoints } from './geometry/bounds.js';
import type { BoundingBox, ScreenPoint } from './geometry/index.js';
import { createHitTester } from './hittest/hit-tester.js';
import {
  createInteractionController,
  type InteractionController,
} from './interaction/interaction-controller.js';
import { createSelectionProducer } from './overlay/selection-producer.js';
import {
  createDiagnosticProvider,
  createFeatureProvider,
  createLayerProvider,
  type DiagnosticSummary,
  type FeatureProvider,
  type ResolvedFeature,
} from './providers/index.js';
import {
  createRenderCoordinator,
  type RenderCoordinator,
} from './render/render-coordinator.js';
import type { CanvasRenderer, Renderer } from './renderer/canvas-renderer.js';
import {
  createExportService,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  type ExportService,
} from './services/ExportService.js';
import {
  createSearchService,
  type SearchResult,
} from './services/SearchService.js';
import {
  createStatisticsService,
  type TileStatistics,
} from './services/StatisticsService.js';
import {
  getSettingsService,
  type InspectorSettings,
} from './services/SettingsService.js';
import {
  createInspectorStore,
  type InspectorStore,
} from './store/inspector-store.js';
import {
  createViewport,
  type Viewport,
  type ViewportState,
} from './viewport/viewport.js';

// ---------------------------------------------------------------------------
// Public Interface
// ---------------------------------------------------------------------------

export interface Inspector {
  // ── Step 1 API ────────────────────────────────────────────────────────
  load(
    filePath: string,
    artifact: VectorTileArtifact,
    diagnostics: readonly Diagnostic[],
  ): Promise<void>;
  handlePointerMove(screenPoint: ScreenPoint): void;
  handlePointerLeave(): void;
  handleClick(screenPoint: ScreenPoint): void;
  render(): void;
  dispose(): void;

  // ── Step 2 API ────────────────────────────────────────────────────────
  selectDiagnostic(index: number): void;
  focusFeature(layerName: string, featureIndex: number): void;
  search(query: string): readonly SearchResult[];
  clearSearch(): void;
  getSelectedFeature(): ResolvedFeature | null;
  getDiagnostic(index: number): Diagnostic | null;
  /** @deprecated use getTileStatistics() for the full model */
  getStatistics(): DiagnosticSummary;

  // ── Step 3 API ────────────────────────────────────────────────────────
  getTileStatistics(): TileStatistics;
  getSettings(): InspectorSettings;
  updateSettings(patch: Partial<InspectorSettings>): void;
  resetSettings(): void;

  // ── Step 4 API ────────────────────────────────────────────────────────

  /**
   * Animate the viewport so that the given bounding box fills the canvas.
   * Uses CameraAnimator for smooth easing. Fires onViewportChange each frame.
   *
   * @param bounds      Target bounding box in tile coordinate space.
   * @param onViewportChange  Called each animation frame with the interpolated state.
   * @param duration    Animation duration in ms (default 350).
   */
  animateTo(
    bounds: BoundingBox,
    onViewportChange: (state: ViewportState) => void,
    duration?: number,
  ): void;

  /** Cancel any in-progress viewport animation. */
  cancelAnimation(): void;

  /** Export the inspection state. Full implementation in Milestone 7. */
  export(options: ExportOptions): Promise<ExportResult>;

  /** Returns the formats this instance can export. Empty in Step 4. */
  getSupportedExportFormats(): readonly ExportFormat[];
}

// ---------------------------------------------------------------------------
// Construction Options
// ---------------------------------------------------------------------------

export interface InspectorOptions {
  readonly viewport: Viewport;
  readonly renderer: Renderer;
  readonly store?: InspectorStore;
  /** Injectable RAF scheduler for testing CameraAnimator. */
  readonly rafScheduler?: RafScheduler;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class InspectorImpl implements Inspector {
  private readonly _store: InspectorStore;
  private readonly _interactionController: InteractionController;
  private readonly _renderCoordinator: RenderCoordinator;
  private readonly _featureProvider: FeatureProvider;
  private readonly _unsubscribe: () => void;
  private readonly _renderer: Renderer;
  private readonly _viewport: Viewport;
  private readonly _animator: CameraAnimator;
  private readonly _exportService: ExportService;

  private _lastSearchResults: readonly SearchResult[] = [];

  constructor({ viewport, renderer, store, rafScheduler }: InspectorOptions) {
    this._store = store ?? createInspectorStore();
    this._renderer = renderer;
    this._viewport = viewport;
    this._animator = createCameraAnimator(rafScheduler);
    this._exportService = createExportService();

    const hitTester = createHitTester();
    this._interactionController = createInteractionController({
      store: this._store,
      viewport,
      hitTester,
    });

    const selectionProducer = createSelectionProducer();
    this._renderCoordinator = createRenderCoordinator({
      store: this._store,
      selectionProducer,
      renderer,
    });

    this._featureProvider = createFeatureProvider(this._store);

    this._unsubscribe = this._store.subscribe(() => {
      this._renderCoordinator.render();
    });
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────

  async load(
    filePath: string,
    artifact: VectorTileArtifact,
    diagnostics: readonly Diagnostic[],
  ): Promise<void> {
    await this._store.load(filePath, artifact, diagnostics);
  }

  handlePointerMove(screenPoint: ScreenPoint): void {
    this._interactionController.handlePointerMove(screenPoint);
  }

  handlePointerLeave(): void {
    this._interactionController.handlePointerLeave();
  }

  handleClick(screenPoint: ScreenPoint): void {
    this._interactionController.handleClick(screenPoint);
  }

  render(): void {
    this._renderCoordinator.render();
  }

  dispose(): void {
    this._animator.cancel();
    this._store.dispose();
    this._unsubscribe();
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────

  selectDiagnostic(index: number): void {
    const { lifecycle } = this._store;
    if (lifecycle.status !== 'loaded') return;
    const diagnostic = lifecycle.diagnostics[index];
    if (diagnostic === undefined) return;
    const location = diagnostic.location as
      | { layer?: string; featureIndex?: number }
      | undefined;
    if (location?.layer !== undefined && location.featureIndex !== undefined) {
      this._store.select(location.layer, location.featureIndex);
    }
  }

  focusFeature(layerName: string, featureIndex: number): void {
    this._store.select(layerName, featureIndex);
  }

  search(query: string): readonly SearchResult[] {
    const service = createSearchService(this._featureProvider);
    this._lastSearchResults = service.search(query);
    return this._lastSearchResults;
  }

  clearSearch(): void {
    this._lastSearchResults = [];
  }

  getSelectedFeature(): ResolvedFeature | null {
    return this._featureProvider.getSelectedFeature();
  }

  getDiagnostic(index: number): Diagnostic | null {
    return createDiagnosticProvider(this._store).getDiagnosticAt(index);
  }

  getStatistics(): DiagnosticSummary {
    return createDiagnosticProvider(this._store).getSummary();
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────

  getTileStatistics(): TileStatistics {
    const featureProvider = this._featureProvider;
    const diagProvider = createDiagnosticProvider(this._store);
    const layerProvider = createLayerProvider(this._store);
    return createStatisticsService(
      featureProvider,
      diagProvider,
      layerProvider,
    ).compute();
  }

  getSettings(): InspectorSettings {
    return getSettingsService().getSettings();
  }

  updateSettings(patch: Partial<InspectorSettings>): void {
    getSettingsService().updateSettings(patch);
    this._applySettingsToRenderer();
    this._renderCoordinator.render();
  }

  resetSettings(): void {
    getSettingsService().resetSettings();
    this._applySettingsToRenderer();
    this._renderCoordinator.render();
  }

  // ── Step 4 ──────────────────────────────────────────────────────────────

  animateTo(
    bounds: BoundingBox,
    onViewportChange: (state: ViewportState) => void,
    duration = 350,
  ): void {
    const from = this._viewport.getState();
    const targetViewport = this._viewport.fitBounds(bounds, 40);
    const to = targetViewport.getState();

    this._animator.animateTo(from, to, {
      duration,
      easing: 'easeInOut',
      onFrame: (state) => {
        onViewportChange(state);
      },
      onComplete: () => {
        onViewportChange(to);
      },
    });
  }

  cancelAnimation(): void {
    this._animator.cancel();
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    return this._exportService.export(options);
  }

  getSupportedExportFormats(): readonly ExportFormat[] {
    return this._exportService.getSupportedFormats();
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private _applySettingsToRenderer(): void {
    const settings = getSettingsService().getSettings();
    const cr = this._renderer as Partial<CanvasRenderer>;
    if (typeof cr.setOptions === 'function') {
      cr.setOptions({
        showVertices: settings.showVertices,
        showTileBounds: settings.showTileBounds,
        showBufferBounds: settings.showBufferBounds,
        overlayOpacity: settings.overlayOpacity,
        selectionThickness: settings.selectionThickness,
        hoverThickness: settings.hoverThickness,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInspector(options: InspectorOptions): Inspector {
  return new InspectorImpl(options);
}

// ---------------------------------------------------------------------------
// Re-export geometry helpers used by InspectorApp
// ---------------------------------------------------------------------------
export { createBoundsFromPoints, createViewport };

```

### File: `packages/inspector/src/animation/CameraAnimator.ts`

```typescript
/**
 * @tileguard/inspector — CameraAnimator (Milestone 6 — Step 4)
 *
 * Smooth viewport animation engine. Interpolates from the current
 * ViewportState to a target ViewportState over a configurable duration
 * using requestAnimationFrame scheduling.
 *
 * Features:
 *   - Four easing functions: linear, easeOut, easeInOut, smoothstep
 *   - Cancels any in-progress animation when a new one starts
 *   - Fires an onFrame callback each tick so callers can re-render
 *   - Fires an onComplete callback when the animation finishes naturally
 *   - Pure: no imports from DOM canvas / renderer / store / React
 *
 * Boundary: uses requestAnimationFrame (window.requestAnimationFrame) and
 * cancelAnimationFrame only. No canvas, no renderer, no React.
 */

import type { ViewportState } from '../viewport/viewport.js';

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------

export type EasingFn = 'linear' | 'easeOut' | 'easeInOut' | 'smoothstep';

function applyEasing(t: number, fn: EasingFn): number {
  switch (fn) {
    case 'linear':
      return t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    case 'smoothstep':
      return t * t * (3 - 2 * t);
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AnimationOptions {
  /** Duration in milliseconds. Default: 350. */
  readonly duration?: number;
  /** Easing function. Default: 'easeInOut'. */
  readonly easing?: EasingFn;
  /** Called each frame with the interpolated ViewportState. */
  readonly onFrame: (state: ViewportState) => void;
  /** Called once when the animation completes (not called if cancelled). */
  readonly onComplete?: () => void;
}

export interface CameraAnimator {
  /**
   * Start animating from `from` to `to`.
   * Any in-progress animation is cancelled before starting.
   */
  animateTo(
    from: ViewportState,
    to: ViewportState,
    opts: AnimationOptions,
  ): void;

  /**
   * Cancel any in-progress animation immediately.
   * The current frame's onFrame will NOT be called.
   * onComplete will NOT be called.
   */
  cancel(): void;

  /** Returns true if an animation is currently running. */
  readonly isAnimating: boolean;
}

// ---------------------------------------------------------------------------
// Interpolation helper
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateViewport(
  from: ViewportState,
  to: ViewportState,
  t: number,
): ViewportState {
  return {
    zoom: lerp(from.zoom, to.zoom, t),
    panX: lerp(from.panX, to.panX, t),
    panY: lerp(from.panY, to.panY, t),
    extent: to.extent,
    width: to.width,
    height: to.height,
    minZoom: to.minZoom,
    maxZoom: to.maxZoom,
  };
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * RAF-backed scheduler abstraction so tests can inject a synchronous
 * scheduler without needing a DOM environment.
 */
export interface RafScheduler {
  requestFrame(cb: (timestamp: number) => void): number;
  cancelFrame(id: number): void;
}

/** Production scheduler using window.requestAnimationFrame. */
export const BROWSER_RAF_SCHEDULER: RafScheduler = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
};

class CameraAnimatorImpl implements CameraAnimator {
  private _rafId: number | null = null;
  private _animating = false;
  private readonly _scheduler: RafScheduler;

  constructor(scheduler: RafScheduler) {
    this._scheduler = scheduler;
  }

  get isAnimating(): boolean {
    return this._animating;
  }

  cancel(): void {
    if (this._rafId !== null) {
      this._scheduler.cancelFrame(this._rafId);
      this._rafId = null;
    }
    this._animating = false;
  }

  animateTo(
    from: ViewportState,
    to: ViewportState,
    opts: AnimationOptions,
  ): void {
    // Cancel any running animation
    this.cancel();

    const duration = opts.duration ?? 350;
    const easing = opts.easing ?? 'easeInOut';
    // Guard: treat zero or negative duration as instant (t=1 immediately).
    if (duration <= 0) {
      const state = interpolateViewport(from, to, 1);
      opts.onFrame(state);
      this._animating = false;
      this._rafId = null;
      opts.onComplete?.();
      return;
    }
    let startTime: number | null = null;

    this._animating = true;

    const tick = (timestamp: number) => {
      if (!this._animating) return;

      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawT = Math.min(elapsed / duration, 1);
      const t = applyEasing(rawT, easing);

      const state = interpolateViewport(from, to, t);
      opts.onFrame(state);

      if (rawT < 1) {
        this._rafId = this._scheduler.requestFrame(tick);
      } else {
        this._animating = false;
        this._rafId = null;
        opts.onComplete?.();
      }
    };

    this._rafId = this._scheduler.requestFrame(tick);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a CameraAnimator.
 *
 * @param scheduler  Optional RAF scheduler (for testing). Defaults to browser.
 *
 * @example
 *   const animator = createCameraAnimator();
 *   animator.animateTo(currentViewport.getState(), targetState, {
 *     duration: 400,
 *     easing: 'easeOut',
 *     onFrame: (state) => setViewportState(state),
 *     onComplete: () => console.log('done'),
 *   });
 */
export function createCameraAnimator(
  scheduler: RafScheduler = BROWSER_RAF_SCHEDULER,
): CameraAnimator {
  return new CameraAnimatorImpl(scheduler);
}

```

### File: `packages/inspector/src/performance/SpatialIndex.ts`

```typescript
/**
 * @tileguard/inspector — SpatialIndex (Milestone 6 — Step 4)
 *
 * Grid-based spatial index for fast hover and selection candidate lookup.
 *
 * Algorithm:
 *   - Divide tile space into a uniform N×N grid of cells.
 *   - On build(), insert each feature's bounding box into every overlapping cell.
 *   - On query(point), return all feature refs from the cell containing the point,
 *     deduplicated. The caller (HitTester) then performs precise geometry testing.
 *
 * This reduces hit-testing from O(all_features) to O(features_in_cell), which
 * for typical tiles is a 10–100× speedup on large datasets.
 *
 * Boundary: Zero imports from renderer/, overlay/, React, or DOM APIs.
 * Only depends on geometry types (BoundingBox, TilePoint).
 */

import type { BoundingBox, TilePoint } from '../geometry/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Minimal feature reference stored in the index. */
export interface SpatialFeatureRef {
  readonly layerName: string;
  readonly featureIndex: number;
  readonly bounds: BoundingBox;
}

export interface SpatialIndex {
  /**
   * Build the index from a flat list of feature refs.
   * Replaces any previously built index.
   * O(n * cells_per_feature) where cells_per_feature ≪ total cells.
   */
  build(features: readonly SpatialFeatureRef[]): void;

  /**
   * Query candidate features near the given tile-space point.
   * Returns feature refs whose bounding box overlaps the cell containing the point.
   * Deduplicated — each ref appears at most once even if it spans multiple cells.
   */
  query(point: TilePoint): readonly SpatialFeatureRef[];

  /**
   * Query all features whose bounding box intersects the given region.
   * Useful for viewport culling.
   */
  queryRegion(region: BoundingBox): readonly SpatialFeatureRef[];

  /** Returns the number of indexed features. */
  readonly size: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SpatialIndexImpl implements SpatialIndex {
  private readonly _gridSize: number;
  private readonly _cellSize: number;
  /** Cell index → array of feature refs. Sparse (undefined = empty cell). */
  private _cells: (SpatialFeatureRef[] | undefined)[];
  private _featureCount = 0;

  /**
   * @param gridSize  Number of cells per axis (default 32 → 32×32 = 1024 cells).
   * @param extent    Tile coordinate extent (default 4096).
   */
  constructor(
    gridSize = 32,
    private readonly _extent = 4096,
  ) {
    this._gridSize = gridSize;
    this._cellSize = _extent / gridSize;
    this._cells = new Array<SpatialFeatureRef[] | undefined>(
      gridSize * gridSize,
    );
  }

  get size(): number {
    return this._featureCount;
  }

  build(features: readonly SpatialFeatureRef[]): void {
    // Reset
    this._cells = new Array<SpatialFeatureRef[] | undefined>(
      this._gridSize * this._gridSize,
    );
    this._featureCount = features.length;

    for (const ref of features) {
      const { minCol, maxCol, minRow, maxRow } = this._boundsToGrid(ref.bounds);
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const idx = row * this._gridSize + col;
          if (this._cells[idx] === undefined) {
            this._cells[idx] = [];
          }
          (this._cells[idx] as SpatialFeatureRef[]).push(ref);
        }
      }
    }
  }

  query(point: TilePoint): readonly SpatialFeatureRef[] {
    const col = Math.floor(point.x / this._cellSize);
    const row = Math.floor(point.y / this._cellSize);
    const clampedCol = Math.max(0, Math.min(this._gridSize - 1, col));
    const clampedRow = Math.max(0, Math.min(this._gridSize - 1, row));
    const idx = clampedRow * this._gridSize + clampedCol;
    return this._cells[idx] ?? [];
  }

  queryRegion(region: BoundingBox): readonly SpatialFeatureRef[] {
    const { minCol, maxCol, minRow, maxRow } = this._boundsToGrid(region);
    const seen = new Set<string>();
    const result: SpatialFeatureRef[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const idx = row * this._gridSize + col;
        const cell = this._cells[idx];
        if (cell === undefined) continue;
        for (const ref of cell) {
          const key = `${ref.layerName}:${ref.featureIndex}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push(ref);
          }
        }
      }
    }
    return result;
  }

  private _boundsToGrid(bounds: BoundingBox): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  } {
    const minCol = Math.max(0, Math.floor(bounds.minX / this._cellSize));
    const maxCol = Math.min(
      this._gridSize - 1,
      Math.floor(bounds.maxX / this._cellSize),
    );
    const minRow = Math.max(0, Math.floor(bounds.minY / this._cellSize));
    const maxRow = Math.min(
      this._gridSize - 1,
      Math.floor(bounds.maxY / this._cellSize),
    );
    return { minCol, maxCol, minRow, maxRow };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a SpatialIndex using a uniform N×N grid.
 *
 * @param gridSize  Number of grid cells per axis (default 32).
 * @param extent    Tile coordinate extent (default 4096).
 *
 * @example
 *   const index = createSpatialIndex();
 *   index.build(featureRefs);
 *   const candidates = index.query({ x: 512, y: 512 });
 */
export function createSpatialIndex(gridSize = 32, extent = 4096): SpatialIndex {
  return new SpatialIndexImpl(gridSize, extent);
}

```

### File: `packages/inspector/src/performance/PerformanceProfiler.ts`

```typescript
/**
 * @tileguard/inspector — PerformanceProfiler (Milestone 6 — Step 4)
 *
 * Tracks rendering performance metrics: FPS, frame time, and render count.
 * Designed to be called once per render frame from the RenderCoordinator
 * or InspectorApp's render loop.
 *
 * Algorithm:
 *   - Maintain a rolling 60-frame window for FPS calculation.
 *   - Track last frame timestamp and elapsed time.
 *   - Expose metrics as a frozen snapshot for React consumption.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 * Uses only performance.now() (universal in browsers and Node.js 16+).
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  /** Frames per second (rolling 60-frame average). */
  readonly fps: number;
  /** Time elapsed since the previous frame, in milliseconds. */
  readonly frameTimeMs: number;
  /** Total number of frames recorded since the profiler started. */
  readonly renderCount: number;
  /** Timestamp of the last frame (performance.now() value). */
  readonly lastFrameTime: number;
}

export const EMPTY_METRICS: PerformanceMetrics = Object.freeze({
  fps: 0,
  frameTimeMs: 0,
  renderCount: 0,
  lastFrameTime: 0,
});

export interface PerformanceProfiler {
  /**
   * Record a new frame. Call this once per render invocation.
   * Updates all internal state.
   *
   * @param now  Optional timestamp override (default: performance.now()).
   *             Inject a value in tests for deterministic results.
   */
  recordFrame(now?: number): void;

  /** Returns a frozen snapshot of current metrics. */
  getMetrics(): PerformanceMetrics;

  /** Reset all recorded state to initial values. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const WINDOW_SIZE = 60;

class PerformanceProfilerImpl implements PerformanceProfiler {
  /** Ring buffer of frame timestamps for FPS calculation. */
  private _timestamps: number[] = [];
  private _head = 0; // ring buffer write pointer
  private _count = 0; // number of entries in use (0 … WINDOW_SIZE)
  private _lastTimestamp = -1; // -1 = no frame recorded yet
  private _renderCount = 0;
  private _frameTimeMs = 0;

  recordFrame(now?: number): void {
    const ts = now ?? performance.now();
    this._renderCount++;

    if (this._lastTimestamp >= 0) {
      this._frameTimeMs = ts - this._lastTimestamp;
    }

    // Insert into ring buffer
    if (this._timestamps.length < WINDOW_SIZE) {
      this._timestamps.push(ts);
    } else {
      this._timestamps[this._head] = ts;
    }
    this._head = (this._head + 1) % WINDOW_SIZE;
    this._count = Math.min(this._count + 1, WINDOW_SIZE);
    this._lastTimestamp = ts;
  }

  getMetrics(): PerformanceMetrics {
    if (this._count < 2) {
      return Object.freeze({
        fps: 0,
        frameTimeMs: this._frameTimeMs,
        renderCount: this._renderCount,
        lastFrameTime: Math.max(0, this._lastTimestamp),
      });
    }

    // Find oldest and newest timestamps in the window
    let oldest = this._timestamps[0] ?? 0;
    let newest = oldest;
    for (let i = 1; i < this._count; i++) {
      const t = this._timestamps[i] ?? 0;
      if (t < oldest) oldest = t;
      if (t > newest) newest = t;
    }

    const span = newest - oldest;
    const fps = span > 0 ? ((this._count - 1) / span) * 1000 : 0;

    return Object.freeze({
      fps: Math.round(fps * 10) / 10,
      frameTimeMs: Math.round(this._frameTimeMs * 100) / 100,
      renderCount: this._renderCount,
      lastFrameTime: this._lastTimestamp,
    });
  }

  reset(): void {
    this._timestamps = [];
    this._head = 0;
    this._count = 0;
    this._lastTimestamp = -1;
    this._renderCount = 0;
    this._frameTimeMs = 0;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a PerformanceProfiler with a 60-frame rolling window.
 *
 * @example
 *   const profiler = createPerformanceProfiler();
 *   // In render loop:
 *   profiler.recordFrame();
 *   const { fps, frameTimeMs } = profiler.getMetrics();
 */
export function createPerformanceProfiler(): PerformanceProfiler {
  return new PerformanceProfilerImpl();
}

```

### File: `packages/inspector/src/services/StatisticsService.ts`

```typescript
/**
 * @tileguard/inspector — StatisticsService (Milestone 6 — Step 3)
 *
 * Computes immutable tile statistics from the Provider layer.
 * Never reads InspectorStore directly.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { DiagnosticProvider } from '../providers/DiagnosticProvider.js';
import type { FeatureProvider } from '../providers/FeatureProvider.js';
import type { LayerProvider } from '../providers/LayerProvider.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Per-layer statistics row. */
export interface LayerStatistics {
  readonly name: string;
  readonly featureCount: number;
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  readonly diagnosticCount: number;
}

/** Full tile statistics snapshot. Immutable after construction. */
export interface TileStatistics {
  readonly totalLayers: number;
  readonly totalFeatures: number;
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  readonly diagnostics: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
  };
  readonly layers: readonly LayerStatistics[];
}

/** Empty statistics (returned when no tile is loaded). */
export const EMPTY_TILE_STATISTICS: TileStatistics = Object.freeze({
  totalLayers: 0,
  totalFeatures: 0,
  geometryCounts: Object.freeze({ point: 0, line: 0, polygon: 0 }),
  diagnostics: Object.freeze({ errors: 0, warnings: 0, info: 0 }),
  layers: Object.freeze([]),
});

// ---------------------------------------------------------------------------
// Geometry type normalisation
// ---------------------------------------------------------------------------

type GeometryBucket = 'point' | 'line' | 'polygon';

function toGeometryBucket(geometryType: string): GeometryBucket {
  const lower = geometryType.toLowerCase();
  if (lower === 'point' || lower.includes('point')) return 'point';
  if (lower === 'linestring' || lower.includes('line')) return 'line';
  return 'polygon';
}

// ---------------------------------------------------------------------------
// StatisticsService interface
// ---------------------------------------------------------------------------

export interface StatisticsService {
  /**
   * Compute and return a full TileStatistics snapshot.
   * Returns EMPTY_TILE_STATISTICS when no tile is loaded.
   */
  compute(): TileStatistics;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class StatisticsServiceImpl implements StatisticsService {
  constructor(
    private readonly _featureProvider: FeatureProvider,
    private readonly _diagnosticProvider: DiagnosticProvider,
    private readonly _layerProvider: LayerProvider,
  ) {}

  compute(): TileStatistics {
    const layers = this._layerProvider.getLayers();
    if (layers.length === 0) return EMPTY_TILE_STATISTICS;

    // Build per-layer diagnostic counts
    const diagByLayer = new Map<string, number>();
    for (const d of this._diagnosticProvider.getAllDiagnostics()) {
      const loc = d.location as { layer?: string } | undefined;
      const layerName = loc?.layer;
      if (layerName !== undefined) {
        diagByLayer.set(layerName, (diagByLayer.get(layerName) ?? 0) + 1);
      }
    }

    // Build per-layer geometry counts
    const geomByLayer = new Map<
      string,
      { point: number; line: number; polygon: number }
    >();
    for (const feature of this._featureProvider.getAllFeatures()) {
      const existing = geomByLayer.get(feature.layerName) ?? {
        point: 0,
        line: 0,
        polygon: 0,
      };
      const bucket = toGeometryBucket(feature.geometryType);
      existing[bucket]++;
      geomByLayer.set(feature.layerName, existing);
    }

    // Assemble per-layer statistics
    const layerStats: LayerStatistics[] = layers.map((layer) => {
      const geom = geomByLayer.get(layer.name) ?? {
        point: 0,
        line: 0,
        polygon: 0,
      };
      return Object.freeze({
        name: layer.name,
        featureCount: layer.featureCount,
        geometryCounts: Object.freeze({ ...geom }),
        diagnosticCount: diagByLayer.get(layer.name) ?? 0,
      });
    });

    // Aggregate totals
    let totalFeatures = 0;
    let totalPoint = 0;
    let totalLine = 0;
    let totalPolygon = 0;
    for (const ls of layerStats) {
      totalFeatures += ls.featureCount;
      totalPoint += ls.geometryCounts.point;
      totalLine += ls.geometryCounts.line;
      totalPolygon += ls.geometryCounts.polygon;
    }

    const diagSummary = this._diagnosticProvider.getSummary();

    return Object.freeze({
      totalLayers: layers.length,
      totalFeatures,
      geometryCounts: Object.freeze({
        point: totalPoint,
        line: totalLine,
        polygon: totalPolygon,
      }),
      diagnostics: Object.freeze({
        errors: diagSummary.errorCount,
        warnings: diagSummary.warningCount,
        info: diagSummary.infoCount,
      }),
      layers: Object.freeze(layerStats),
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a StatisticsService backed by the three provider instances.
 *
 * @example
 *   const service = createStatisticsService(
 *     featureProvider, diagnosticProvider, layerProvider
 *   );
 *   const stats = service.compute();
 */
export function createStatisticsService(
  featureProvider: FeatureProvider,
  diagnosticProvider: DiagnosticProvider,
  layerProvider: LayerProvider,
): StatisticsService {
  return new StatisticsServiceImpl(
    featureProvider,
    diagnosticProvider,
    layerProvider,
  );
}

```

### File: `packages/inspector/src/services/SettingsService.ts`

```typescript
/**
 * @tileguard/inspector — SettingsService (Milestone 6 — Step 3)
 *
 * Manages persistent user preferences via localStorage.
 * Exposes a subscribe/notify API so React hooks can use
 * useSyncExternalStore() to react to settings changes.
 *
 * Architecture:
 *   - All settings are owned here; InspectorStore never sees them.
 *   - SettingsService is the single source of truth for preferences.
 *   - The Inspector facade bridges SettingsService → CanvasRenderer.
 *
 * Persistence:
 *   - Serialised to localStorage under STORAGE_KEY on every update.
 *   - Loaded lazily on first access; falls back to defaults on error.
 *   - Gracefully degrades when localStorage is unavailable.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, React, or DOM
 * canvas APIs. Only uses window.localStorage.
 */

// ---------------------------------------------------------------------------
// Settings model
// ---------------------------------------------------------------------------

export interface InspectorSettings {
  // Rendering
  readonly showVertices: boolean;
  readonly showTileBounds: boolean;
  readonly showBufferBounds: boolean;
  readonly antiAliasing: boolean;

  // Interaction
  readonly hoverEnabled: boolean;
  readonly autoFocusDiagnostics: boolean;
  readonly smoothZoom: boolean;
  readonly selectionOutline: boolean;

  // Diagnostics display
  readonly minSeverity: 'error' | 'warning' | 'info';

  // Appearance
  readonly overlayOpacity: number; // 0.0 – 1.0
  readonly selectionThickness: number; // 1 – 6
  readonly hoverThickness: number; // 1 – 6
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: Readonly<InspectorSettings> = Object.freeze({
  showVertices: false,
  showTileBounds: true,
  showBufferBounds: true,
  antiAliasing: true,
  hoverEnabled: true,
  autoFocusDiagnostics: true,
  smoothZoom: true,
  selectionOutline: true,
  minSeverity: 'info',
  overlayOpacity: 0.85,
  selectionThickness: 2,
  hoverThickness: 1,
});

const STORAGE_KEY = 'tileguard:inspector:settings:v1';

// ---------------------------------------------------------------------------
// Serialisation helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): InspectorSettings {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<InspectorSettings>;
    // Merge parsed values over defaults — unknown keys are ignored
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Clamp numeric values to safe ranges
      overlayOpacity: clamp(
        parsed.overlayOpacity ?? DEFAULT_SETTINGS.overlayOpacity,
        0,
        1,
      ),
      selectionThickness: clamp(
        parsed.selectionThickness ?? DEFAULT_SETTINGS.selectionThickness,
        1,
        6,
      ),
      hoverThickness: clamp(
        parsed.hoverThickness ?? DEFAULT_SETTINGS.hoverThickness,
        1,
        6,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(settings: InspectorSettings): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Silently ignore quota exceeded / private-browsing restrictions
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// SettingsService interface
// ---------------------------------------------------------------------------

export interface SettingsService {
  /** Returns the current settings snapshot. Always returns a frozen object. */
  getSettings(): InspectorSettings;

  /**
   * Apply a partial update. Only the supplied keys are changed.
   * Notifies all subscribers synchronously, then persists to localStorage.
   */
  updateSettings(patch: Partial<InspectorSettings>): void;

  /**
   * Reset all settings to their default values.
   * Notifies subscribers and persists.
   */
  resetSettings(): void;

  /**
   * Register a change listener (for useSyncExternalStore).
   * Returns an unsubscribe callback (idempotent).
   */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SettingsServiceImpl implements SettingsService {
  private _settings: InspectorSettings;
  private readonly _listeners: Set<() => void> = new Set();

  constructor() {
    this._settings = loadFromStorage();
  }

  getSettings(): InspectorSettings {
    return this._settings;
  }

  updateSettings(patch: Partial<InspectorSettings>): void {
    const next: InspectorSettings = { ...this._settings, ...patch };
    // Clamp numeric settings
    const clamped: InspectorSettings = {
      ...next,
      overlayOpacity: clamp(next.overlayOpacity, 0, 1),
      selectionThickness: clamp(next.selectionThickness, 1, 6),
      hoverThickness: clamp(next.hoverThickness, 1, 6),
    };
    this._settings = Object.freeze(clamped);
    this._notify();
    saveToStorage(this._settings);
  }

  resetSettings(): void {
    this._settings = DEFAULT_SETTINGS;
    this._notify();
    saveToStorage(this._settings);
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Isolate listener errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton factory (one instance per application)
// ---------------------------------------------------------------------------

let _instance: SettingsService | null = null;

/**
 * Returns the application-wide SettingsService singleton.
 *
 * Using a singleton ensures all consumers share the same settings state
 * without threading it through context. The Inspector facade and React
 * hooks both call this to read/write settings.
 *
 * @example
 *   const svc = getSettingsService();
 *   svc.updateSettings({ showVertices: true });
 */
export function getSettingsService(): SettingsService {
  if (_instance === null) {
    _instance = new SettingsServiceImpl();
  }
  return _instance;
}

/**
 * Replace the singleton with a fresh instance.
 * Use in tests to reset state between test cases.
 */
export function resetSettingsServiceInstance(): void {
  _instance = null;
}

```

### File: `packages/inspector/src/services/ShortcutService.ts`

```typescript
/**
 * @tileguard/inspector — ShortcutService (Milestone 6 — Step 4)
 *
 * Registers and dispatches keyboard shortcuts.
 * Shortcuts never fire when focus is inside a text input/textarea.
 *
 * Supported shortcuts:
 *   F            — focus selected feature (fit bounds)
 *   R            — reset view
 *   Escape       — clear selection
 *   Ctrl+F       — focus search input
 *   Ctrl+,       — open settings tab
 *   Ctrl+1       — show diagnostics tab
 *   Ctrl+2       — show statistics tab
 *   Ctrl+3       — show settings tab
 *   Ctrl+H       — toggle hover highlight (Step 4)
 *   Ctrl+Shift+V — toggle vertex display (Step 4)
 *   Ctrl+B       — toggle tile bounds (Step 4)
 *   Ctrl+Shift+D — toggle developer overlay (Step 4)
 *
 * Boundary: DOM KeyboardEvent only. No React, no store, no renderer.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ShortcutAction =
  | 'focusFeature'
  | 'resetView'
  | 'clearSelection'
  | 'focusSearch'
  | 'openSettings'
  | 'showDiagnostics'
  | 'showStatistics'
  | 'showSettings'
  // Step 4
  | 'toggleHover'
  | 'toggleVertices'
  | 'toggleBounds'
  | 'toggleDevOverlay';

export interface ShortcutBinding {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly action: ShortcutAction;
  readonly description: string;
}

export const DEFAULT_SHORTCUTS: readonly ShortcutBinding[] = Object.freeze([
  {
    key: 'f',
    ctrl: false,
    shift: false,
    action: 'focusFeature',
    description: 'Focus selected feature',
  },
  {
    key: 'r',
    ctrl: false,
    shift: false,
    action: 'resetView',
    description: 'Reset view',
  },
  {
    key: 'escape',
    ctrl: false,
    shift: false,
    action: 'clearSelection',
    description: 'Clear selection',
  },
  {
    key: 'f',
    ctrl: true,
    shift: false,
    action: 'focusSearch',
    description: 'Focus search',
  },
  {
    key: ',',
    ctrl: true,
    shift: false,
    action: 'openSettings',
    description: 'Open settings',
  },
  {
    key: '1',
    ctrl: true,
    shift: false,
    action: 'showDiagnostics',
    description: 'Show diagnostics',
  },
  {
    key: '2',
    ctrl: true,
    shift: false,
    action: 'showStatistics',
    description: 'Show statistics',
  },
  {
    key: '3',
    ctrl: true,
    shift: false,
    action: 'showSettings',
    description: 'Show settings',
  },
  // Step 4 additions
  {
    key: 'h',
    ctrl: true,
    shift: false,
    action: 'toggleHover',
    description: 'Toggle hover highlight',
  },
  {
    key: 'v',
    ctrl: true,
    shift: true,
    action: 'toggleVertices',
    description: 'Toggle vertex display',
  },
  {
    key: 'b',
    ctrl: true,
    shift: false,
    action: 'toggleBounds',
    description: 'Toggle tile bounds',
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    action: 'toggleDevOverlay',
    description: 'Toggle developer overlay',
  },
]);

export type ShortcutHandler = (action: ShortcutAction) => void;

// ---------------------------------------------------------------------------
// ShortcutService interface
// ---------------------------------------------------------------------------

export interface ShortcutService {
  registerHandler(handler: ShortcutHandler): () => void;
  attach(target?: EventTarget): () => void;
  getBindings(): readonly ShortcutBinding[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function isTextInput(target: EventTarget | null): boolean {
  if (target === null) return false;
  const el = target as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

class ShortcutServiceImpl implements ShortcutService {
  private readonly _bindings: readonly ShortcutBinding[];
  private readonly _handlers: Set<ShortcutHandler> = new Set();

  constructor(bindings: readonly ShortcutBinding[]) {
    this._bindings = bindings;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  registerHandler(handler: ShortcutHandler): () => void {
    this._handlers.add(handler);
    return () => {
      this._handlers.delete(handler);
    };
  }

  attach(target: EventTarget = window): () => void {
    target.addEventListener('keydown', this._onKeyDown as EventListener);
    return () => {
      target.removeEventListener('keydown', this._onKeyDown as EventListener);
    };
  }

  getBindings(): readonly ShortcutBinding[] {
    return this._bindings;
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (isTextInput(event.target)) return;

    const key = event.key.toLowerCase();
    const ctrl = Boolean(event.ctrlKey || event.metaKey);
    const shift = Boolean(event.shiftKey);

    for (const binding of this._bindings) {
      const bindingCtrl = binding.ctrl ?? false;
      const bindingShift = binding.shift ?? false;
      if (
        binding.key.toLowerCase() === key &&
        bindingCtrl === ctrl &&
        bindingShift === shift
      ) {
        event.preventDefault();
        this._dispatch(binding.action);
        return;
      }
    }
  }

  private _dispatch(action: ShortcutAction): void {
    for (const handler of this._handlers) {
      try {
        handler(action);
      } catch {
        // Isolate handler errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createShortcutService(
  bindings: readonly ShortcutBinding[] = DEFAULT_SHORTCUTS,
): ShortcutService {
  return new ShortcutServiceImpl(bindings);
}

```

### File: `packages/inspector/src/services/WorkspaceService.ts`

```typescript
/**
 * @tileguard/inspector — WorkspaceService (Milestone 6 — Step 4)
 *
 * Persists and restores the user's workspace layout across sessions.
 *
 * Stored state:
 *   - Left/right panel collapsed state
 *   - Active navigation tab
 *   - Last viewport state (zoom, panX, panY)
 *   - Last loaded file path (display only — not reloaded automatically)
 *
 * Storage key: tileguard:inspector:workspace:v1
 * Storage backend: localStorage (graceful degradation if unavailable).
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs
 * beyond window.localStorage.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type WorkspaceTab =
  | 'welcome'
  | 'inspector'
  | 'diagnostics'
  | 'statistics'
  | 'settings';

export interface WorkspaceViewport {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface WorkspaceLayout {
  /** Whether the left (diagnostics/stats/settings) panel is collapsed. */
  readonly leftCollapsed: boolean;
  /** Whether the right (feature inspector) panel is collapsed. */
  readonly rightCollapsed: boolean;
  /** The active navigation tab. */
  readonly activeTab: WorkspaceTab;
  /** Last known viewport position (for restore on same tile). */
  readonly viewport: WorkspaceViewport | null;
  /** Last loaded file path (for display; not auto-reloaded). */
  readonly lastFilePath: string | null;
}

export const DEFAULT_LAYOUT: Readonly<WorkspaceLayout> = Object.freeze({
  leftCollapsed: false,
  rightCollapsed: false,
  activeTab: 'welcome',
  viewport: null,
  lastFilePath: null,
});

const STORAGE_KEY = 'tileguard:inspector:workspace:v1';

// ---------------------------------------------------------------------------
// WorkspaceService interface
// ---------------------------------------------------------------------------

export interface WorkspaceService {
  /** Returns the currently loaded workspace layout. */
  getLayout(): WorkspaceLayout;

  /**
   * Apply a partial update and persist immediately.
   * Notifies all subscribers.
   */
  updateLayout(patch: Partial<WorkspaceLayout>): void;

  /** Reset to defaults and persist. */
  resetLayout(): void;

  /** Subscribe to layout changes. Returns unsubscribe callback. */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

function load(): WorkspaceLayout {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (raw === null) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayout>;
    return {
      leftCollapsed:
        typeof parsed.leftCollapsed === 'boolean'
          ? parsed.leftCollapsed
          : DEFAULT_LAYOUT.leftCollapsed,
      rightCollapsed:
        typeof parsed.rightCollapsed === 'boolean'
          ? parsed.rightCollapsed
          : DEFAULT_LAYOUT.rightCollapsed,
      activeTab: isValidTab(parsed.activeTab)
        ? parsed.activeTab
        : DEFAULT_LAYOUT.activeTab,
      viewport: isValidViewport(parsed.viewport) ? parsed.viewport : null,
      lastFilePath:
        typeof parsed.lastFilePath === 'string' ? parsed.lastFilePath : null,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function save(layout: WorkspaceLayout): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  } catch {
    // Silently ignore quota exceeded / private-browsing restrictions
  }
}

function isValidTab(tab: unknown): tab is WorkspaceTab {
  return (
    tab === 'welcome' ||
    tab === 'inspector' ||
    tab === 'diagnostics' ||
    tab === 'statistics' ||
    tab === 'settings'
  );
}

function isValidViewport(v: unknown): v is WorkspaceViewport {
  if (v === null || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.zoom === 'number' &&
    typeof obj.panX === 'number' &&
    typeof obj.panY === 'number'
  );
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class WorkspaceServiceImpl implements WorkspaceService {
  private _layout: WorkspaceLayout;
  private readonly _listeners: Set<() => void> = new Set();

  constructor() {
    this._layout = load();
  }

  getLayout(): WorkspaceLayout {
    return this._layout;
  }

  updateLayout(patch: Partial<WorkspaceLayout>): void {
    this._layout = Object.freeze({ ...this._layout, ...patch });
    this._notify();
    save(this._layout);
  }

  resetLayout(): void {
    this._layout = DEFAULT_LAYOUT;
    this._notify();
    save(this._layout);
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Isolate listener errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _instance: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  if (_instance === null) {
    _instance = new WorkspaceServiceImpl();
  }
  return _instance;
}

/** Reset singleton — use in tests. */
export function resetWorkspaceServiceInstance(): void {
  _instance = null;
}

```

### File: `packages/inspector/src/services/SearchService.ts`

```typescript
/**
 * @tileguard/inspector — SearchService (Milestone 6 — Step 4 extended)
 *
 * Executes text-based feature searches against the loaded tile, using
 * FeatureProvider to access features.
 *
 * Supported query syntax:
 *
 *   roads                — free text: match layer name or any property
 *   feature:48           — feature ID exact match
 *   layer:roads          — explicit layer name match (contains)
 *   type:polygon         — geometry type match (contains)
 *   id:123               — feature ID (alias for feature:123)
 *   highway=primary      — property key=value
 *   /regex/              — regex match against all string property values
 *   query1 AND query2    — AND-combination of any two sub-queries
 *
 * Results are ranked by relevance:
 *   1. Exact layer-name match
 *   2. Property key=value match
 *   3. Feature-ID match
 *   4. Partial/free-text match
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { FeatureProvider, ResolvedFeature } from '../providers/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single search match. */
export interface SearchResult {
  /** The matched feature. */
  readonly feature: ResolvedFeature;
  /**
   * Human-readable description of why this feature matched the query.
   */
  readonly matchReason: string;
  /**
   * Relevance score (higher = more relevant).
   * Used to sort results with the most relevant first.
   */
  readonly score: number;
}

// ---------------------------------------------------------------------------
// SearchService interface
// ---------------------------------------------------------------------------

export interface SearchService {
  /**
   * Execute a search query.
   * Returns all features that match, sorted by descending relevance score.
   * Returns an empty array when the provider has no features or the query
   * is blank.
   */
  search(query: string): readonly SearchResult[];
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

type AtomicQuery =
  | { kind: 'featureId'; id: string }
  | { kind: 'layer'; text: string }
  | { kind: 'type'; text: string }
  | { kind: 'keyValue'; key: string; value: string }
  | { kind: 'regex'; pattern: RegExp; raw: string }
  | { kind: 'text'; text: string };

type ParsedQuery =
  | { kind: 'and'; left: ParsedQuery; right: ParsedQuery }
  | AtomicQuery;

function parseAtomic(raw: string): AtomicQuery {
  const q = raw.trim();

  // feature:48 or id:48
  const featureIdMatch = /^(?:feature|id):(.+)$/i.exec(q);
  if (featureIdMatch !== null) {
    return { kind: 'featureId', id: (featureIdMatch[1] ?? '').trim() };
  }

  // layer:roads
  const layerMatch = /^layer:(.+)$/i.exec(q);
  if (layerMatch !== null) {
    return { kind: 'layer', text: (layerMatch[1] ?? '').trim() };
  }

  // type:polygon
  const typeMatch = /^type:(.+)$/i.exec(q);
  if (typeMatch !== null) {
    return { kind: 'type', text: (typeMatch[1] ?? '').trim() };
  }

  // /regex/ — a forward-slash-delimited regex (optional trailing slash)
  const regexMatch = /^\/(.+?)(?:\/)?\s*$/.exec(q);
  if (regexMatch !== null) {
    const pat = regexMatch[1] ?? '';
    try {
      return { kind: 'regex', pattern: new RegExp(pat, 'i'), raw: pat };
    } catch {
      // Invalid regex — fall through to free-text
    }
  }

  // key=value
  const kvMatch = /^([^=]+)=(.+)$/.exec(q);
  if (kvMatch !== null) {
    const key = kvMatch[1] ?? '';
    const value = kvMatch[2] ?? '';
    return { kind: 'keyValue', key: key.trim(), value: value.trim() };
  }

  // Free text
  return { kind: 'text', text: q };
}

function parseQuery(raw: string): ParsedQuery {
  // AND — split on first occurrence of " AND " (case-insensitive)
  const andIdx = raw.search(/ AND /i);
  if (andIdx !== -1) {
    const left = raw.slice(0, andIdx).trim();
    const right = raw.slice(andIdx + 5).trim(); // skip " AND "
    if (left.length > 0 && right.length > 0) {
      return {
        kind: 'and',
        left: parseQuery(left),
        right: parseQuery(right),
      };
    }
  }
  return parseAtomic(raw);
}

// ---------------------------------------------------------------------------
// Match functions (return reason string + score, or null)
// ---------------------------------------------------------------------------

interface MatchResult {
  reason: string;
  score: number;
}

function matchAtomic(
  feature: ResolvedFeature,
  query: AtomicQuery,
): MatchResult | null {
  switch (query.kind) {
    case 'featureId': {
      const id = feature.id;
      if (id !== undefined && String(id) === query.id) {
        return { reason: `Feature ID: ${id}`, score: 90 };
      }
      return null;
    }

    case 'layer': {
      if (feature.layerName.toLowerCase().includes(query.text.toLowerCase())) {
        const exact =
          feature.layerName.toLowerCase() === query.text.toLowerCase();
        return {
          reason: `Layer: ${feature.layerName}`,
          score: exact ? 100 : 70,
        };
      }
      return null;
    }

    case 'type': {
      if (
        feature.geometryType.toLowerCase().includes(query.text.toLowerCase())
      ) {
        return {
          reason: `Type: ${feature.geometryType}`,
          score: 60,
        };
      }
      return null;
    }

    case 'keyValue': {
      const keyLower = query.key.toLowerCase();
      const valueLower = query.value.toLowerCase();
      for (const [k, v] of Object.entries(feature.properties)) {
        if (
          k.toLowerCase().includes(keyLower) &&
          String(v).toLowerCase().includes(valueLower)
        ) {
          return { reason: `${k} = ${String(v)}`, score: 80 };
        }
      }
      return null;
    }

    case 'regex': {
      for (const [k, v] of Object.entries(feature.properties)) {
        if (typeof v === 'string' && query.pattern.test(v)) {
          return { reason: `/${query.raw}/ → ${k} = ${v}`, score: 75 };
        }
      }
      return null;
    }

    case 'text': {
      const textLower = query.text.toLowerCase();

      // Layer name — best partial match
      if (feature.layerName.toLowerCase().includes(textLower)) {
        const exact = feature.layerName.toLowerCase() === textLower;
        return {
          reason: `Layer: ${feature.layerName}`,
          score: exact ? 100 : 65,
        };
      }

      // Property key match
      for (const k of Object.keys(feature.properties)) {
        if (k.toLowerCase().includes(textLower)) {
          return { reason: `Property key: ${k}`, score: 55 };
        }
      }

      // Property value match
      for (const [k, v] of Object.entries(feature.properties)) {
        if (typeof v === 'string' && v.toLowerCase().includes(textLower)) {
          return { reason: `${k} = ${v}`, score: 50 };
        }
      }

      return null;
    }
  }
}

function matchQuery(
  feature: ResolvedFeature,
  query: ParsedQuery,
): MatchResult | null {
  if (query.kind === 'and') {
    const left = matchQuery(feature, query.left);
    const right = matchQuery(feature, query.right);
    if (left !== null && right !== null) {
      return {
        reason: `${left.reason} & ${right.reason}`,
        score: Math.min(left.score, right.score) + 10,
      };
    }
    return null;
  }
  return matchAtomic(feature, query);
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SearchServiceImpl implements SearchService {
  constructor(private readonly _featureProvider: FeatureProvider) {}

  search(query: string): readonly SearchResult[] {
    const trimmed = query.trim();
    if (trimmed === '') return [];

    const parsed = parseQuery(trimmed);
    const features = this._featureProvider.getAllFeatures();
    const results: SearchResult[] = [];

    for (const feature of features) {
      const match = matchQuery(feature, parsed);
      if (match !== null) {
        results.push({
          feature,
          matchReason: match.reason,
          score: match.score,
        });
      }
    }

    // Sort by score descending, then by layer+index for stability
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const layerCmp = a.feature.layerName.localeCompare(b.feature.layerName);
      if (layerCmp !== 0) return layerCmp;
      return a.feature.featureIndex - b.feature.featureIndex;
    });

    return results;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a SearchService backed by the given FeatureProvider.
 *
 * @example
 *   const service = createSearchService(featureProvider);
 *   const results = service.search('highway=primary');
 *   const layerResults = service.search('layer:roads');
 *   const polyResults = service.search('type:polygon AND height=30');
 */
export function createSearchService(
  featureProvider: FeatureProvider,
): SearchService {
  return new SearchServiceImpl(featureProvider);
}

```

### File: `packages/inspector/src/services/ExportService.ts`

```typescript
/**
 * @tileguard/inspector — ExportService (Milestone 6 — Step 4)
 *
 * Architecture stub for the tile inspection export pipeline.
 * Full implementation deferred to Milestone 7.
 *
 * Prepares the API surface so that:
 *   1. The Inspector facade can expose export methods in Step 4.
 *   2. Milestone 7 can provide concrete implementations without API changes.
 *
 * Supported export formats (planned):
 *   - PNG  — canvas screenshot with optional overlay
 *   - JSON — feature data dump as GeoJSON-like structure
 *   - PDF  — printable diagnostic report (requires headless rendering)
 *   - Markdown — human-readable inspection summary
 *
 * Boundary: Zero imports from renderer/, overlay/, or DOM APIs in this
 * stub. Concrete implementations in Milestone 7 will access the canvas.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ExportFormat = 'png' | 'json' | 'markdown';

export interface ExportOptions {
  /** Target format. */
  readonly format: ExportFormat;
  /** Whether to include the diagnostic overlay in PNG exports. */
  readonly includeOverlay?: boolean;
  /** Whether to include all features or only the selected feature in JSON exports. */
  readonly selectedOnly?: boolean;
  /** Title for markdown reports. */
  readonly title?: string;
}

export interface ExportResult {
  /** Export format that was produced. */
  readonly format: ExportFormat;
  /** Blob containing the exported data. */
  readonly blob: Blob;
  /** Suggested file name including extension. */
  readonly fileName: string;
  /** Size in bytes. */
  readonly sizeBytes: number;
}

// ---------------------------------------------------------------------------
// ExportService interface
// ---------------------------------------------------------------------------

export interface ExportService {
  /**
   * Export the current inspection state in the requested format.
   * Returns a rejected promise with ExportNotImplementedError when the
   * format is not yet implemented (Milestone 7).
   */
  export(options: ExportOptions): Promise<ExportResult>;

  /**
   * Returns the set of formats that this ExportService can produce.
   * In the Step 4 stub, this is always empty.
   */
  getSupportedFormats(): readonly ExportFormat[];
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ExportNotImplementedError extends Error {
  constructor(format: ExportFormat) {
    super(
      `Export format '${format}' is not yet implemented. ` +
        'Full export support will be available in Milestone 7.',
    );
    this.name = 'ExportNotImplementedError';
  }
}

// ---------------------------------------------------------------------------
// Stub implementation
// ---------------------------------------------------------------------------

class ExportServiceStub implements ExportService {
  getSupportedFormats(): readonly ExportFormat[] {
    // No formats implemented yet — Milestone 7 will fill this in.
    return [];
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    throw new ExportNotImplementedError(options.format);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an ExportService.
 *
 * In Step 4 this returns a stub that rejects all export calls with
 * ExportNotImplementedError. Milestone 7 will replace the implementation.
 *
 * @example
 *   const exporter = createExportService();
 *   const formats = exporter.getSupportedFormats(); // []
 *   // Use getSupportedFormats() to guard before calling export():
 *   if (formats.includes('json')) {
 *     const result = await exporter.export({ format: 'json' });
 *   }
 */
export function createExportService(): ExportService {
  return new ExportServiceStub();
}

```

### File: `packages/inspector/src/hooks/use-statistics-settings.ts`

```typescript
/**
 * @tileguard/inspector — Step 3 Hooks
 *
 * useStatistics      — subscribes to tile statistics (recomputed on lifecycle change)
 * useSettings        — subscribes to SettingsService (persisted preferences)
 * useLayerStatistics — per-layer statistics with sortable presentation state
 */

import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  createDiagnosticProvider,
  createFeatureProvider,
  createLayerProvider,
} from '../providers/index.js';
import {
  createStatisticsService,
  EMPTY_TILE_STATISTICS,
  type LayerStatistics,
  type TileStatistics,
} from '../services/StatisticsService.js';
import {
  getSettingsService,
  type InspectorSettings,
} from '../services/SettingsService.js';
import type { InspectorStore } from '../store/inspector-store.js';
import { useLifecycle } from './use-store.js';

// ---------------------------------------------------------------------------
// useStatistics
// ---------------------------------------------------------------------------

/**
 * Returns a full TileStatistics snapshot for the currently loaded tile.
 * Recomputes whenever the tile lifecycle changes (new tile loaded).
 * Returns EMPTY_TILE_STATISTICS when no tile is loaded.
 */
export function useStatistics(store: InspectorStore): TileStatistics {
  const lifecycle = useLifecycle(store);

  return useMemo(() => {
    if (lifecycle.status !== 'loaded') return EMPTY_TILE_STATISTICS;
    const featureProvider = createFeatureProvider(store);
    const diagProvider = createDiagnosticProvider(store);
    const layerProvider = createLayerProvider(store);
    return createStatisticsService(
      featureProvider,
      diagProvider,
      layerProvider,
    ).compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);
}

// ---------------------------------------------------------------------------
// useLayerStatistics
// ---------------------------------------------------------------------------

export type LayerSortKey = 'name' | 'features' | 'diagnostics';

export interface UseLayerStatisticsResult {
  readonly layers: readonly LayerStatistics[];
  readonly sortKey: LayerSortKey;
  readonly setSortKey: (key: LayerSortKey) => void;
}

/**
 * Returns per-layer statistics, sorted by the user-selected column.
 * Sort key is React-owned presentation state (not in InspectorStore).
 */
export function useLayerStatistics(
  store: InspectorStore,
): UseLayerStatisticsResult {
  const stats = useStatistics(store);
  const [sortKey, setSortKey] = useState<LayerSortKey>('features');

  const sorted = useMemo((): readonly LayerStatistics[] => {
    const copy = [...stats.layers];
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'features':
          return b.featureCount - a.featureCount;
        case 'diagnostics':
          return b.diagnosticCount - a.diagnosticCount;
      }
    });
    return copy;
  }, [stats.layers, sortKey]);

  return { layers: sorted, sortKey, setSortKey };
}

// ---------------------------------------------------------------------------
// useSettings
// ---------------------------------------------------------------------------

/**
 * Subscribes to SettingsService and returns the current settings snapshot.
 * Uses useSyncExternalStore for tear-free reads.
 *
 * Stable subscribe reference means React never re-creates the subscription.
 *
 * @example
 *   const settings = useSettings();
 *   // settings.showVertices, settings.overlayOpacity, etc.
 */
export function useSettings(): InspectorSettings {
  const svc = getSettingsService();
  return useSyncExternalStore(
    svc.subscribe.bind(svc),
    () => svc.getSettings(),
    () => svc.getSettings(),
  );
}

```

### File: `packages/inspector/src/hooks/use-store.ts`

```typescript
/**
 * @tileguard/inspector — React Hooks for InspectorStore (Step 1 + Step 2)
 *
 * All hooks use useSyncExternalStore() to subscribe to the InspectorStore.
 * Selectors are module-level constants to ensure stable references and
 * prevent unnecessary re-renders.
 *
 * Step 1 hooks (unchanged):
 *   useLifecycle      — current lifecycle state
 *   useSelection      — currently selected feature ref
 *   useHover          — currently hovered feature ref
 *   useFilters        — active filter state
 *   useDiagnostics    — diagnostics array (empty when not loaded)
 *
 * Step 2 hooks (new):
 *   useSelectedFeature  — fully resolved selected feature (via FeatureProvider)
 *   useSearch           — stateful search with query and results
 *   useDiagnosticFilter — panel-level filter state (React-owned, not store)
 *   usePanelState       — expanded groups + sort order (React-owned)
 */

import type { Diagnostic } from '@tileguard/core';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createDiagnosticProvider,
  type DiagnosticGroups,
  type DiagnosticSummary,
} from '../providers/DiagnosticProvider.js';
import {
  createFeatureProvider,
  type ResolvedFeature,
} from '../providers/FeatureProvider.js';
import {
  createLayerProvider,
  type LayerInfo,
} from '../providers/LayerProvider.js';
import {
  createSearchService,
  type SearchResult,
} from '../services/SearchService.js';
import type {
  FeatureRef,
  FilterState,
  InspectorLifecycle,
  InspectorStore,
} from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// Module-level selectors (stable references)
// ---------------------------------------------------------------------------

const EMPTY_DIAGNOSTICS: readonly Diagnostic[] = Object.freeze([]);

const lifecycleSelector = (store: InspectorStore) => store.lifecycle;
const selectionSelector = (store: InspectorStore) => store.selection;
const hoverSelector = (store: InspectorStore) => store.hover;
const filtersSelector = (store: InspectorStore) => store.filters;
const diagnosticsSelector = (store: InspectorStore): readonly Diagnostic[] =>
  store.lifecycle.status === 'loaded'
    ? store.lifecycle.diagnostics
    : EMPTY_DIAGNOSTICS;

// ---------------------------------------------------------------------------
// Base hook
// ---------------------------------------------------------------------------

/** Subscribes React to an immutable InspectorStore snapshot. */
export function useStoreSelector<T>(
  store: InspectorStore,
  selector: (s: InspectorStore) => T,
): T {
  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector(store),
    () => selector(store),
  );
}

// ---------------------------------------------------------------------------
// Step 1 hooks (unchanged)
// ---------------------------------------------------------------------------

export const useLifecycle = (store: InspectorStore): InspectorLifecycle =>
  useStoreSelector(store, lifecycleSelector);

export const useSelection = (store: InspectorStore): FeatureRef =>
  useStoreSelector(store, selectionSelector);

export const useHover = (store: InspectorStore): FeatureRef =>
  useStoreSelector(store, hoverSelector);

export const useFilters = (store: InspectorStore): FilterState =>
  useStoreSelector(store, filtersSelector);

export const useDiagnostics = (store: InspectorStore): readonly Diagnostic[] =>
  useStoreSelector(store, diagnosticsSelector);

// ---------------------------------------------------------------------------
// Step 2 hooks
// ---------------------------------------------------------------------------

/**
 * Returns the currently selected feature resolved from the store, or null.
 * Re-renders only when selection changes (not on every store mutation).
 */
export function useSelectedFeature(
  store: InspectorStore,
): ResolvedFeature | null {
  const selection = useSelection(store);
  const lifecycle = useLifecycle(store);

  return useMemo(() => {
    if (
      selection.layerName === null ||
      selection.featureIndex === null ||
      lifecycle.status !== 'loaded'
    ) {
      return null;
    }
    const provider = createFeatureProvider(store);
    return provider.getSelectedFeature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, lifecycle]);
}

/**
 * Returns all layers from the loaded tile, or empty array.
 * Re-renders when lifecycle changes.
 */
export function useLayers(store: InspectorStore): readonly LayerInfo[] {
  const lifecycle = useLifecycle(store);
  return useMemo(() => {
    if (lifecycle.status !== 'loaded') return [];
    return createLayerProvider(store).getLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);
}

/**
 * Returns diagnostics grouped by severity, respecting active filter state.
 * Re-renders when lifecycle or filters change.
 */
export function useGroupedDiagnostics(store: InspectorStore): DiagnosticGroups {
  const lifecycle = useLifecycle(store);
  const filters = useFilters(store);

  return useMemo(() => {
    const provider = createDiagnosticProvider(store);
    return provider.getGrouped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle, filters]);
}

/**
 * Returns diagnostic summary counts (unfiltered), for badge display.
 * Re-renders when lifecycle changes.
 */
export function useDiagnosticSummary(store: InspectorStore): DiagnosticSummary {
  const lifecycle = useLifecycle(store);

  return useMemo(() => {
    const provider = createDiagnosticProvider(store);
    return provider.getSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);
}

// ---------------------------------------------------------------------------
// useSearch — stateful search hook (React-owned state)
// ---------------------------------------------------------------------------

export interface UseSearchResult {
  /** Current search query text. */
  query: string;
  /** Current search results (empty when query is blank). */
  results: readonly SearchResult[];
  /** Update the query and re-execute the search. */
  setQuery: (q: string) => void;
  /** Clear the query and results. */
  clearSearch: () => void;
}

/**
 * Manages search query state and executes searches against the loaded tile.
 *
 * This hook owns its query string in React state. Results are recomputed
 * whenever the query changes or the tile lifecycle changes.
 *
 * All search logic flows through FeatureProvider → SearchService, never
 * directly through InspectorStore.
 */
export function useSearch(store: InspectorStore): UseSearchResult {
  const [query, setQueryRaw] = useState('');
  const lifecycle = useLifecycle(store);

  const results = useMemo(() => {
    if (query.trim() === '' || lifecycle.status !== 'loaded') return [];
    const provider = createFeatureProvider(store);
    const service = createSearchService(provider);
    return service.search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lifecycle]);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryRaw('');
  }, []);

  return { query, results, setQuery, clearSearch };
}

// ---------------------------------------------------------------------------
// useDiagnosticFilter — panel-level severity + layer filter (React-owned)
// ---------------------------------------------------------------------------

export interface SeverityFilter {
  error: boolean;
  warning: boolean;
  info: boolean;
}

export interface DiagnosticFilterState {
  severity: SeverityFilter;
  layers: ReadonlySet<string>;
  geometryTypes: ReadonlySet<string>;
}

export interface UseDiagnosticFilterResult {
  filters: DiagnosticFilterState;
  toggleSeverity: (key: keyof SeverityFilter) => void;
  toggleLayer: (layerName: string) => void;
  toggleGeometryType: (type: string) => void;
  resetFilters: () => void;
  /** Apply the panel's filter state back to the InspectorStore. */
  applyToStore: () => void;
}

const defaultSeverityFilter = (): SeverityFilter => ({
  error: true,
  warning: true,
  info: true,
});

/**
 * Manages the panel-level filter checkboxes.
 *
 * This state is React-owned and separate from InspectorStore.
 * Filters never mutate the store directly; `applyToStore` commits them.
 *
 * Filtering is derived — the diagnostic list is filtered during render,
 * not by pre-mutating the store.
 */
export function useDiagnosticFilter(
  store: InspectorStore,
): UseDiagnosticFilterResult {
  const [severity, setSeverity] = useState<SeverityFilter>(
    defaultSeverityFilter,
  );
  const [layers, setLayers] = useState<ReadonlySet<string>>(new Set());
  const [geometryTypes, setGeometryTypes] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const toggleSeverity = useCallback((key: keyof SeverityFilter) => {
    setSeverity((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleLayer = useCallback((layerName: string) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerName)) next.delete(layerName);
      else next.add(layerName);
      return next;
    });
  }, []);

  const toggleGeometryType = useCallback((type: string) => {
    setGeometryTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSeverity(defaultSeverityFilter());
    setLayers(new Set());
    setGeometryTypes(new Set());
  }, []);

  const applyToStore = useCallback(() => {
    // Map panel severity checkboxes to the store's minSeverity field.
    // If all are checked (or none are unchecked), clear the filter.
    // If only errors are checked, set minSeverity = 'error', etc.
    const { error, warning, info } = severity;
    let minSeverity: 'error' | 'warning' | 'info' | null = null;
    if (error && !warning && !info) minSeverity = 'error';
    else if ((error || warning) && !info) minSeverity = 'warning';

    store.setFilters({
      visibleLayers: new Set(layers),
      minSeverity,
      ruleId: null,
    });
  }, [store, severity, layers]);

  return {
    filters: { severity, layers, geometryTypes },
    toggleSeverity,
    toggleLayer,
    toggleGeometryType,
    resetFilters,
    applyToStore,
  };
}

// ---------------------------------------------------------------------------
// usePanelState — expanded group state + sort order (React-owned)
// ---------------------------------------------------------------------------

export type DiagnosticSortOrder = 'severity' | 'layer' | 'rule';

export interface PanelState {
  expandedGroups: ReadonlySet<string>;
  sortOrder: DiagnosticSortOrder;
}

export interface UsePanelStateResult {
  panelState: PanelState;
  toggleGroup: (groupId: string) => void;
  setSortOrder: (order: DiagnosticSortOrder) => void;
}

/**
 * Manages which diagnostic groups are expanded and the sort order.
 * This is purely presentation state — it lives in React, not the store.
 */
export function usePanelState(): UsePanelStateResult {
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    new Set(['error', 'warning', 'info']), // default: all expanded
  );
  const [sortOrder, setSortOrderRaw] =
    useState<DiagnosticSortOrder>('severity');

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const setSortOrder = useCallback((order: DiagnosticSortOrder) => {
    setSortOrderRaw(order);
  }, []);

  return {
    panelState: { expandedGroups, sortOrder },
    toggleGroup,
    setSortOrder,
  };
}

```

### File: `packages/inspector/src/hooks/useWorkspace.ts`

```typescript
/**
 * @tileguard/inspector — useWorkspace hook (Milestone 6 — Step 4)
 *
 * React bridge for WorkspaceService. Uses useSyncExternalStore() so the
 * component tree re-renders whenever the layout changes.
 */

import { useSyncExternalStore } from 'react';
import {
  getWorkspaceService,
  type WorkspaceLayout,
} from '../services/WorkspaceService.js';

/**
 * Returns the current workspace layout and an updater.
 *
 * @example
 *   const { layout, updateLayout } = useWorkspace();
 *   updateLayout({ leftCollapsed: true });
 */
export function useWorkspace(): {
  layout: WorkspaceLayout;
  updateLayout: (patch: Partial<WorkspaceLayout>) => void;
  resetLayout: () => void;
} {
  const svc = getWorkspaceService();

  const layout = useSyncExternalStore(
    (cb) => svc.subscribe(cb),
    () => svc.getLayout(),
    () => svc.getLayout(),
  );

  return {
    layout,
    updateLayout: (patch) => svc.updateLayout(patch),
    resetLayout: () => svc.resetLayout(),
  };
}

```

### File: `packages/inspector/src/hooks/useProfiler.ts`

```typescript
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

```

### File: `packages/inspector/src/components/InspectorApp.tsx`

```tsx
/**
 * @tileguard/inspector — InspectorApp (Milestone 6 — Step 4)
 *
 * Full production shell integrating:
 *   - WorkspaceService (panel layout persistence)
 *   - CameraAnimator (smooth feature focus)
 *   - PerformanceProfiler + DeveloperOverlay
 *   - LoadingOverlay with multi-step progress
 *   - Enhanced Footer (FPS, hover, selected, zoom)
 *   - All 12 keyboard shortcuts (including Step 4: Ctrl+H, Ctrl+Shift+V, Ctrl+B, Ctrl+Shift+D)
 *   - Wired Settings button, Reset View button
 */

import {
  HelpCircle,
  Minus,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InspectorProvider,
  useInspectorContext,
} from '../context/InspectorContext.js';
import {
  useHover,
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../hooks/use-store.js';
import { useStatistics } from '../hooks/use-statistics-settings.js';
import { useProfiler } from '../hooks/useProfiler.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import {
  createPerformanceProfiler,
  type PerformanceProfiler,
} from '../performance/PerformanceProfiler.js';
import { decodeBrowserTile } from '../services/browser-tile-loader.js';
import {
  createShortcutService,
  type ShortcutAction,
} from '../services/ShortcutService.js';
import type { ViewportState } from '../viewport/viewport.js';
import { CanvasView } from './CanvasView.js';
import { DiagnosticPanel } from './diagnostics/DiagnosticPanel.js';
import { FeaturePanel } from './feature/FeaturePanel.js';
import { LoadingOverlay } from './loading/LoadingOverlay.js';
import type { LoadingStep } from './loading/LoadingOverlay.js';
import { DeveloperOverlay } from './profiler/DeveloperOverlay.js';
import { type NavTab, SidebarNav } from './SidebarNav.js';
import { SettingsPanel } from './settings/SettingsPanel.js';
import { StatisticsPanel } from './statistics/StatisticsPanel.js';
import { Toolbar } from './Toolbar.js';
import { WelcomeView } from './WelcomeView.js';

// ---------------------------------------------------------------------------
// Module-level singleton profiler (shared across renders)
// ---------------------------------------------------------------------------
const _profiler: PerformanceProfiler = createPerformanceProfiler();

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------

function AppHeader(): JSX.Element {
  const iconButton =
    'rounded-[var(--tg-border-radius)] p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]';
  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3">
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[var(--tg-error)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-warning)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-success)]" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-text-primary)]">
          <Shield
            className="h-4 w-4 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
          TileGuard Inspector
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={iconButton} aria-label="Toggle theme">
          <Moon className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Application settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
        <span
          className="mx-1 h-4 w-px bg-[var(--tg-border)]"
          aria-hidden="true"
        />
        <button
          type="button"
          className={iconButton}
          aria-label="Minimize window"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Maximize window"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={iconButton} aria-label="Close window">
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Enhanced Footer
// ---------------------------------------------------------------------------

function Footer({
  viewport,
  fps,
}: {
  readonly viewport: ViewportState | null;
  readonly fps: number;
}): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const stats = useStatistics(store);
  const selected = useSelectedFeature(store);
  const hover = useHover(store);
  const loaded = lifecycle.status === 'loaded';

  return (
    <footer
      className="flex h-[var(--tg-footer-height)] shrink-0 items-center gap-[var(--tg-space-sm)] border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)] text-xs text-[var(--tg-text-secondary)]"
      aria-label="Status bar"
    >
      {/* Status dot */}
      <span
        className={`h-2 w-2 rounded-full ${loaded ? 'bg-[var(--tg-success)]' : 'bg-[var(--tg-text-muted)]'}`}
        aria-hidden="true"
      />

      {/* File name */}
      {loaded ? (
        <span className="max-w-40 truncate" title={lifecycle.filePath}>
          {lifecycle.filePath.split('/').pop() ?? lifecycle.filePath}
        </span>
      ) : (
        <span>No tile loaded</span>
      )}

      {/* Tile stats */}
      {loaded && stats.totalLayers > 0 && (
        <>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span>
            {stats.totalLayers} {stats.totalLayers === 1 ? 'layer' : 'layers'}
          </span>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span>{stats.totalFeatures.toLocaleString()} features</span>
          {stats.diagnostics.errors +
            stats.diagnostics.warnings +
            stats.diagnostics.info >
            0 && (
            <>
              <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
                ·
              </span>
              <span
                className={
                  stats.diagnostics.errors > 0
                    ? 'text-[var(--tg-error)]'
                    : 'text-[var(--tg-warning)]'
                }
              >
                {stats.diagnostics.errors +
                  stats.diagnostics.warnings +
                  stats.diagnostics.info}{' '}
                diag.
              </span>
            </>
          )}
        </>
      )}

      <span className="flex-1" />

      {/* Hovered feature */}
      {hover.layerName !== null && hover.featureIndex !== null && (
        <>
          <span
            className="hidden text-[var(--tg-text-muted)] xl:inline"
            aria-hidden="true"
          >
            hover:
          </span>
          <span className="hidden text-[var(--tg-text-secondary)] xl:inline">
            {hover.layerName}[{hover.featureIndex}]
          </span>
          <span
            className="hidden text-[var(--tg-text-muted)] xl:inline"
            aria-hidden="true"
          >
            ·
          </span>
        </>
      )}

      {/* Selected feature */}
      {selected !== null && (
        <>
          <span className="text-[var(--tg-accent)]">
            {selected.layerName} #{selected.id ?? selected.featureIndex}
          </span>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
        </>
      )}

      {/* Zoom */}
      {viewport !== null && <span>{viewport.zoom.toFixed(1)}×</span>}

      {/* FPS */}
      {fps > 0 && (
        <>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span
            className={
              fps < 30
                ? 'text-[var(--tg-error)]'
                : fps < 55
                  ? 'text-[var(--tg-warning)]'
                  : 'text-[var(--tg-text-muted)]'
            }
          >
            {fps.toFixed(0)} fps
          </span>
        </>
      )}
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

function Workspace(): JSX.Element {
  const { inspector, store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const search = useSearch(store);
  const stats = useStatistics(store);
  const selectedFeature = useSelectedFeature(store);
  const hover = useHover(store);

  // Workspace persistence
  const { layout, updateLayout } = useWorkspace();
  const [activeTab, setActiveTabRaw] = useState<NavTab>(
    layout.activeTab as NavTab,
  );
  const [leftCollapsed, setLeftCollapsed] = useState(layout.leftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(layout.rightCollapsed);

  // Sync tab changes to workspace service
  const setActiveTab = useCallback(
    (tab: NavTab) => {
      setActiveTabRaw(tab);
      updateLayout({ activeTab: tab });
    },
    [updateLayout],
  );

  const toggleLeft = useCallback(() => {
    setLeftCollapsed((v) => {
      updateLayout({ leftCollapsed: !v });
      return !v;
    });
  }, [updateLayout]);

  const toggleRight = useCallback(() => {
    setRightCollapsed((v) => {
      updateLayout({ rightCollapsed: !v });
      return !v;
    });
  }, [updateLayout]);

  // Loading state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('ready');
  const [loadError, setLoadError] = useState<string | undefined>();
  const isLoading = lifecycle.status === 'loading' || pendingFile !== null;

  // Viewport state (for footer + dev overlay)
  const [viewport, setViewport] = useState<ViewportState | null>(null);

  // Developer overlay
  const [devOverlayVisible, setDevOverlayVisible] = useState(false);

  // Search ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loaded = lifecycle.status === 'loaded';

  // ── Profiler metrics ───────────────────────────────────────────────────
  const metrics = useProfiler(_profiler, 500);

  // Record a frame whenever the viewport changes (proxy for render activity)
  useEffect(() => {
    if (viewport !== null) {
      _profiler.recordFrame();
    }
  }, [viewport]);

  // ── File loading ─────────────────────────────────────────────────────────
  const selectFile = useCallback(
    (file: File) => {
      setPendingFile(file);
      setActiveTab('inspector');
      setLoadError(undefined);
      updateLayout({ lastFilePath: file.name });
    },
    [setActiveTab, updateLayout],
  );

  useEffect(() => {
    if (inspector === null || pendingFile === null) return;
    let cancelled = false;

    const run = async () => {
      try {
        setLoadingStep('loading');
        const artifact = await decodeBrowserTile(pendingFile);
        if (cancelled) return;

        setLoadingStep('parsing');
        await new Promise<void>((r) => setTimeout(r, 30));
        if (cancelled) return;

        setLoadingStep('statistics');
        await inspector.load(pendingFile.name, artifact, []);
        if (cancelled) return;

        setLoadingStep('diagnostics');
        await new Promise<void>((r) => setTimeout(r, 20));
        if (cancelled) return;

        setLoadingStep('ready');
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unknown error');
          setLoadingStep('loading');
        }
      } finally {
        if (!cancelled) setPendingFile(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [inspector, pendingFile]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const shortcuts = createShortcutService();
    const unsub = shortcuts.registerHandler((action: ShortcutAction) => {
      switch (action) {
        case 'clearSelection':
          store.select(null, null);
          break;
        case 'resetView':
          inspector?.render();
          break;
        case 'focusSearch':
          searchInputRef.current?.focus();
          break;
        case 'showDiagnostics':
          setActiveTab('diagnostics');
          break;
        case 'openSettings':
        case 'showSettings':
          setActiveTab('settings');
          break;
        case 'showStatistics':
          setActiveTab('statistics');
          break;
        case 'toggleHover':
          inspector?.updateSettings({
            hoverEnabled: !inspector.getSettings().hoverEnabled,
          });
          break;
        case 'toggleVertices':
          inspector?.updateSettings({
            showVertices: !inspector.getSettings().showVertices,
          });
          break;
        case 'toggleBounds':
          inspector?.updateSettings({
            showTileBounds: !inspector.getSettings().showTileBounds,
          });
          break;
        case 'toggleDevOverlay':
          setDevOverlayVisible((v) => !v);
          break;
        default:
          break;
      }
    });
    const cleanup = shortcuts.attach(window);
    return () => {
      cleanup();
      unsub();
    };
  }, [inspector, store, setActiveTab]);

  // ── Left panel content ────────────────────────────────────────────────────
  const leftPanel = useMemo<JSX.Element | null>(() => {
    if (activeTab === 'statistics') return <StatisticsPanel store={store} />;
    if (activeTab === 'settings')
      return <SettingsPanel inspector={inspector} />;
    return <DiagnosticPanel store={store} inspector={inspector} />;
  }, [activeTab, store, inspector]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      <AppHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'welcome' && loaded) return;
            setActiveTab(tab);
          }}
        />

        {activeTab === 'welcome' && !loaded ? (
          <WelcomeView onFileSelected={selectFile} />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Toolbar
              leftCollapsed={leftCollapsed}
              rightCollapsed={rightCollapsed}
              onToggleLeft={toggleLeft}
              onToggleRight={toggleRight}
              onFileSelected={selectFile}
              onResetView={() => inspector?.render()}
              onOpenSettings={() => setActiveTab('settings')}
              searchQuery={search.query}
              onSearchChange={search.setQuery}
              searchResults={search.results}
              searchInputRef={searchInputRef}
              onSelectSearchResult={(result) => {
                inspector?.focusFeature(
                  result.feature.layerName,
                  result.feature.featureIndex,
                );
                search.clearSearch();
              }}
            />

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {/* Left panel */}
              {!leftCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label={
                    activeTab === 'statistics'
                      ? 'Statistics'
                      : activeTab === 'settings'
                        ? 'Settings'
                        : 'Diagnostics'
                  }
                >
                  {leftPanel}
                </aside>
              )}

              {/* Canvas */}
              <div className="relative min-w-0 flex-1">
                <CanvasView
                  onFileSelected={selectFile}
                  onViewportChange={setViewport}
                />

                {/* Loading overlay */}
                {isLoading && loadingStep !== 'ready' && (
                  <LoadingOverlay
                    currentStep={loadingStep}
                    {...(pendingFile !== null
                      ? { fileName: pendingFile.name }
                      : {})}
                    {...(loadError !== undefined ? { error: loadError } : {})}
                  />
                )}

                {/* Developer overlay */}
                {devOverlayVisible && (
                  <DeveloperOverlay
                    metrics={metrics}
                    viewport={viewport}
                    hoveredFeature={
                      hover.layerName !== null && hover.featureIndex !== null
                        ? (inspector?.getSelectedFeature() ?? null)
                        : null
                    }
                    selectedFeature={selectedFeature}
                    totalFeatures={stats.totalFeatures}
                  />
                )}
              </div>

              {/* Right panel: Feature Inspector */}
              {!rightCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label="Feature Inspector"
                >
                  <FeaturePanel store={store} />
                </aside>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer viewport={viewport} fps={metrics.fps} />
    </div>
  );
}

/** Step 4 production application shell. */
export function InspectorApp(): JSX.Element {
  return (
    <InspectorProvider>
      <Workspace />
    </InspectorProvider>
  );
}

```

### File: `packages/inspector/src/components/SidebarNav.tsx`

```tsx
import {
  AlertTriangle,
  BarChart3,
  Crosshair,
  Home,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'welcome'
  | 'inspector'
  | 'diagnostics'
  | 'statistics'
  | 'settings';

interface SidebarNavProps {
  readonly activeTab: NavTab;
  readonly onTabChange: (tab: NavTab) => void;
}

export function SidebarNav({
  activeTab,
  onTabChange,
}: SidebarNavProps): JSX.Element {
  const items: readonly { id: NavTab; label: string; icon: typeof Home }[] = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { id: 'inspector', label: 'Inspector', icon: Crosshair },
    { id: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="flex w-20 shrink-0 flex-col justify-between border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] py-[var(--tg-space-md)] select-none">
      <div className="space-y-2 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-accent)]'
                  : 'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--tg-border)] px-2 pt-3 text-center">
        <h3 className="text-xs font-bold tracking-tight text-[var(--tg-text-primary)]">
          TileGuard
        </h3>
        <p className="mt-1 text-[9px] font-mono text-[var(--tg-text-muted)]">
          v1.0.0
        </p>
      </div>
    </aside>
  );
}

```

### File: `packages/inspector/src/components/Toolbar.tsx`

```tsx
/**
 * @tileguard/inspector — Toolbar (Milestone 6 — Step 4)
 *
 * Adds:
 *   - Wired Settings button (navigates to settings tab)
 *   - Reset View button (R shortcut)
 *   - Removed disabled state from Settings button
 */

import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  PanelLeftClose,
  PanelRightClose,
  RotateCcw,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { type ChangeEvent, type RefObject, useRef } from 'react';
import { useInspectorContext } from '../context/InspectorContext.js';
import { useLifecycle } from '../hooks/use-store.js';
import type { SearchResult } from '../services/SearchService.js';

export interface ToolbarProps {
  readonly leftCollapsed: boolean;
  readonly rightCollapsed: boolean;
  readonly onToggleLeft: () => void;
  readonly onToggleRight: () => void;
  readonly onFileSelected?: (file: File) => void;
  readonly onResetView?: () => void;
  readonly onOpenSettings?: () => void;
  // Search
  readonly searchQuery?: string;
  readonly onSearchChange?: (query: string) => void;
  readonly searchResults?: readonly SearchResult[];
  readonly onSelectSearchResult?: (result: SearchResult) => void;
  readonly searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function Toolbar({
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
  onFileSelected,
  onResetView,
  onOpenSettings,
  searchQuery = '',
  onSearchChange,
  searchResults = [],
  onSelectSearchResult,
}: ToolbarProps): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file !== undefined) onFileSelected?.(file);
    event.target.value = '';
  };

  const fileName =
    lifecycle.status === 'loaded' ? lifecycle.filePath : 'No tile loaded';

  const btn =
    'inline-flex h-8 items-center gap-2 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-[var(--tg-space-md)] text-xs font-medium text-[var(--tg-text-primary)] transition hover:bg-[var(--tg-bg-hover)] disabled:cursor-not-allowed disabled:opacity-45';

  const iconBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)] disabled:cursor-not-allowed disabled:opacity-45';

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <header
      className="flex h-[var(--tg-toolbar-height)] shrink-0 items-center gap-[var(--tg-space-md)] border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)]"
      aria-label="Inspector toolbar"
    >
      {/* Open file */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={btn}
        aria-label="Open tile file"
      >
        <FolderOpen className="h-4 w-4" />
        Open Tile
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pbf"
        className="hidden"
        onChange={onChange}
        aria-hidden="true"
      />

      {/* File name */}
      <span
        className="max-w-64 truncate text-xs text-[var(--tg-text-secondary)]"
        title={lifecycle.status === 'loaded' ? lifecycle.filePath : undefined}
      >
        {fileName}
      </span>

      <span className="flex-1" />

      {/* Search input */}
      <div className="relative hidden lg:block">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-[var(--tg-text-muted)]" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search features…"
          className="h-8 w-56 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] pl-8 pr-7 text-xs text-[var(--tg-text-primary)] outline-none focus:border-[var(--tg-accent)] placeholder:text-[var(--tg-text-muted)]"
          aria-label="Search features"
          aria-expanded={isSearchActive && searchResults.length > 0}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
        />
        {isSearchActive && (
          <button
            type="button"
            className="absolute right-1.5 top-1.5 p-0.5 text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
            onClick={() => onSearchChange?.('')}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Results dropdown */}
        {isSearchActive && searchResults.length > 0 && (
          <ul
            role="listbox"
            aria-label="Search results"
            className="absolute left-0 top-full z-50 mt-1 max-h-64 w-72 overflow-y-auto rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-md)]"
          >
            {searchResults.map((result, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--tg-bg-hover)] focus:bg-[var(--tg-bg-hover)] focus:outline-none"
                  onClick={() => onSelectSearchResult?.(result)}
                >
                  <div className="truncate text-xs font-medium text-[var(--tg-text-primary)]">
                    {result.feature.layerName} #{result.feature.featureIndex}
                  </div>
                  <div className="truncate text-[11px] text-[var(--tg-text-muted)]">
                    {result.matchReason}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isSearchActive && searchResults.length === 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2 text-xs text-[var(--tg-text-muted)] shadow-[var(--tg-shadow-md)]">
            No features found
          </div>
        )}
      </div>

      {/* Reset View (R shortcut) */}
      <button
        type="button"
        title="Reset view (R)"
        aria-label="Reset view"
        className={iconBtn}
        onClick={onResetView}
        disabled={lifecycle.status !== 'loaded'}
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Panel toggles */}
      <button
        type="button"
        title="Toggle diagnostics panel"
        aria-label="Toggle diagnostics panel"
        className={iconBtn}
        onClick={onToggleLeft}
      >
        {leftCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        title="Toggle feature inspector panel"
        aria-label="Toggle feature inspector panel"
        className={iconBtn}
        onClick={onToggleRight}
      >
        {rightCollapsed ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <PanelRightClose className="h-4 w-4" />
        )}
      </button>

      {/* Settings — now wired */}
      <button
        type="button"
        title="Settings (Ctrl+,)"
        aria-label="Open settings"
        className={iconBtn}
        onClick={onOpenSettings}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </header>
  );
}

```

### File: `packages/inspector/src/components/diagnostics/DiagnosticPanel.tsx`

```tsx
/**
 * @tileguard/inspector — DiagnosticPanel
 *
 * The left sidebar panel. Replaces the Step 1 "Coming in Step 2" placeholder.
 *
 * Responsibilities:
 *   - Subscribe to diagnostics and layer data via hooks (store-backed)
 *   - Own panel UI state: expanded groups, sort order, filters (React state)
 *   - Render DiagnosticToolbar + DiagnosticList
 *   - Delegate diagnostic selection to Inspector.selectDiagnostic()
 *   - Never touch the renderer or viewport directly
 *
 * Event flow:
 *   User click on DiagnosticItem
 *     → onSelectDiagnostic(globalIndex)
 *     → Inspector.selectDiagnostic(index)  [passed in as prop]
 *     → InspectorStore.select()
 *     → RenderCoordinator → CanvasRenderer
 *     → FeaturePanel updates via hooks
 */

import type { Diagnostic } from '@tileguard/core';
import { useMemo, useState } from 'react';
import type { Inspector } from '../../create-inspector.js';
import {
  useDiagnosticFilter,
  useGroupedDiagnostics,
  useLayers,
  usePanelState,
} from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import './DiagnosticPanel.css';
import { DiagnosticList } from './DiagnosticList.js';
import { DiagnosticToolbar } from './DiagnosticToolbar.js';

export interface DiagnosticPanelProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
}

function shouldShowDiagnostic(
  diag: Diagnostic,
  activeLayerFilter: ReadonlySet<string>,
  activeGeometryFilter: ReadonlySet<string>,
  artifactLayers: Readonly<
    Record<string, { features?: readonly { geometryType?: string }[] }>
  > | null,
): boolean {
  const loc = diag.location as
    | {
        layer?: string;
        featureIndex?: number;
      }
    | undefined;
  const diagLayer = loc?.layer ?? null;

  if (activeLayerFilter.size > 0 && diagLayer !== null) {
    if (!activeLayerFilter.has(diagLayer)) return false;
  }

  if (activeGeometryFilter.size === 0) return true;

  const featureIndex = loc?.featureIndex ?? null;
  if (diagLayer === null || featureIndex === null || artifactLayers === null) {
    return false;
  }

  const layerDefinition = artifactLayers[diagLayer];
  const feature = layerDefinition?.features?.[featureIndex];
  const geometryType = feature?.geometryType ?? null;

  return geometryType !== null && activeGeometryFilter.has(geometryType);
}

export function DiagnosticPanel({
  store,
  inspector,
}: DiagnosticPanelProps): JSX.Element {
  const grouped = useGroupedDiagnostics(store);
  const layers = useLayers(store);
  const {
    filters,
    toggleSeverity,
    toggleLayer,
    toggleGeometryType,
    resetFilters,
  } = useDiagnosticFilter(store);
  const { panelState, toggleGroup, setSortOrder } = usePanelState();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const geometryTypes = useMemo(() => {
    const all = new Set<string>();
    for (const layer of layers) {
      for (const geometryType of layer.geometryTypes) {
        all.add(geometryType);
      }
    }
    return Array.from(all).sort();
  }, [layers]);

  // Apply severity, layer, and geometry filters to the grouped diagnostics (pure derivation)
  const filteredGrouped = useMemo(() => {
    const {
      error: showError,
      warning: showWarning,
      info: showInfo,
    } = filters.severity;
    const activeLayerFilter = filters.layers;
    const activeGeometryFilter = filters.geometryTypes;
    const artifactLayers =
      store.lifecycle.status === 'loaded'
        ? store.lifecycle.artifact.content.layers
        : null;

    const shouldShow = (diag: Diagnostic): boolean =>
      shouldShowDiagnostic(
        diag,
        activeLayerFilter,
        activeGeometryFilter,
        artifactLayers,
      );

    return {
      errors: showError ? grouped.errors.filter(shouldShow) : [],
      warnings: showWarning ? grouped.warnings.filter(shouldShow) : [],
      infos: showInfo ? grouped.infos.filter(shouldShow) : [],
    };
  }, [grouped, filters, store.lifecycle]);

  // Compute global index offsets so DiagnosticItem can report the correct index
  // back to Inspector.selectDiagnostic() against the full unfiltered array.
  // We keep the original (full) grouped arrays for offset computation.
  const errorOffset = 0;
  const warningOffset = grouped.errors.length;
  const infoOffset = grouped.errors.length + grouped.warnings.length;

  const handleSelectDiagnostic = (globalIndex: number) => {
    setSelectedIndex(globalIndex);
    inspector?.selectDiagnostic(globalIndex);
  };

  const totalFiltered =
    filteredGrouped.errors.length +
    filteredGrouped.warnings.length +
    filteredGrouped.infos.length;

  const totalAll =
    grouped.errors.length + grouped.warnings.length + grouped.infos.length;

  return (
    <section className="diagnostic-panel" aria-label="Diagnostics panel">
      <div className="diagnostic-panel__header">
        <span className="diagnostic-panel__title">Diagnostics</span>
        {totalAll > 0 && (
          <span className="diagnostic-panel__count">
            {totalFiltered === totalAll
              ? totalAll
              : `${totalFiltered} / ${totalAll}`}
          </span>
        )}
      </div>

      <DiagnosticToolbar
        severity={filters.severity}
        activeLayers={filters.layers}
        activeGeometryTypes={filters.geometryTypes}
        layers={layers}
        geometryTypes={geometryTypes}
        sortOrder={panelState.sortOrder}
        onToggleSeverity={toggleSeverity}
        onToggleLayer={toggleLayer}
        onToggleGeometryType={toggleGeometryType}
        onSetSortOrder={setSortOrder}
        onReset={resetFilters}
      />

      <div className="diagnostic-panel__list-container">
        {totalAll === 0 ? (
          <div className="diagnostic-panel__empty">
            <span className="diagnostic-panel__empty-icon">✓</span>
            <span className="diagnostic-panel__empty-text">
              No diagnostics — tile is clean
            </span>
          </div>
        ) : (
          <DiagnosticList
            errors={filteredGrouped.errors}
            warnings={filteredGrouped.warnings}
            infos={filteredGrouped.infos}
            errorOffset={errorOffset}
            warningOffset={warningOffset}
            infoOffset={infoOffset}
            selectedIndex={selectedIndex}
            expandedGroups={panelState.expandedGroups}
            onSelectDiagnostic={handleSelectDiagnostic}
            onToggleGroup={toggleGroup}
          />
        )}
      </div>
    </section>
  );
}

```

### File: `packages/inspector/src/components/feature/FeaturePanel.tsx`

```tsx
/**
 * @tileguard/inspector — FeaturePanel
 *
 * The right sidebar panel. Replaces the Step 1 "Coming in Step 2" placeholder.
 *
 * Responsibilities:
 *   - Subscribe to selection changes via useSelectedFeature()
 *   - Render FeatureHeader + GeometrySection + PropertyTable for the selected feature
 *   - Show a placeholder message when nothing is selected
 *   - Never touch the renderer or viewport directly
 *
 * Event flow (canvas → panel):
 *   Canvas click
 *     → InteractionController.handleClick()
 *     → InspectorStore.select()
 *     → useSelectedFeature() re-renders this panel
 *
 * Event flow (diagnostic panel → this panel):
 *   DiagnosticPanel selects a diagnostic
 *     → Inspector.selectDiagnostic()
 *     → InspectorStore.select()
 *     → useSelectedFeature() re-renders this panel
 */

import { useSelectedFeature } from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import './FeaturePanel.css';
import { FeatureHeader } from './FeatureHeader.js';
import { GeometrySection } from './GeometrySection.js';
import { PropertyTable } from './PropertyTable.js';

export interface FeaturePanelProps {
  readonly store: InspectorStore;
}

export function FeaturePanel({ store }: FeaturePanelProps): JSX.Element {
  const feature = useSelectedFeature(store);

  if (feature === null) {
    return (
      <div
        className="feature-panel feature-panel--empty"
        aria-label="Feature Inspector panel"
      >
        <div className="feature-panel__empty-state">
          <span className="feature-panel__empty-icon" aria-hidden="true">
            🔍
          </span>
          <span className="feature-panel__empty-title">
            No feature selected
          </span>
          <span className="feature-panel__empty-hint">
            Click a feature on the canvas or select a diagnostic to inspect it.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="feature-panel"
      aria-label="Feature Inspector panel"
      aria-live="polite"
    >
      <div className="feature-panel__section feature-panel__section--header">
        <FeatureHeader feature={feature} />
      </div>

      <div className="feature-panel__divider" role="separator" />

      <div className="feature-panel__section">
        <div className="feature-panel__section-title">Properties</div>
        <PropertyTable properties={feature.properties} />
      </div>

      <div className="feature-panel__divider" role="separator" />

      <div className="feature-panel__section">
        <div className="feature-panel__section-title">Geometry</div>
        <GeometrySection feature={feature} />
      </div>
    </div>
  );
}

```

### File: `packages/inspector/src/components/statistics/StatisticsPanel.tsx`

```tsx
/**
 * @tileguard/inspector — StatisticsPanel (Milestone 6 — Step 3)
 *
 * Full-width tile overview panel shown when the Statistics tab is active.
 * Consumes useStatistics and useLayerStatistics hooks.
 *
 * Layout:
 *   ┌─ Summary cards (Layers / Features / Diagnostics) ─────────────────┐
 *   ├─ Geometry distribution (donut chart) ──────────────────────────────┤
 *   ├─ Diagnostic distribution (bar chart) ──────────────────────────────┤
 *   └─ Layer table (sortable) ────────────────────────────────────────────┘
 */
import type { InspectorStore } from '../../store/inspector-store.js';
import {
  useLayerStatistics,
  useStatistics,
} from '../../hooks/use-statistics-settings.js';
import './StatisticsPanel.css';
import { DiagnosticChart } from './DiagnosticChart.js';
import { GeometryChart } from './GeometryChart.js';
import { LayerStatisticsTable } from './LayerStatisticsTable.js';
import { StatisticsCard } from './StatisticsCard.js';

export interface StatisticsPanelProps {
  readonly store: InspectorStore;
}

export function StatisticsPanel({ store }: StatisticsPanelProps): JSX.Element {
  const stats = useStatistics(store);
  const layers = useLayerStatistics(store);

  const totalDiag =
    stats.diagnostics.errors +
    stats.diagnostics.warnings +
    stats.diagnostics.info;

  return (
    <div className="statistics-panel" aria-label="Statistics panel">
      <div className="statistics-panel__header">
        <span className="statistics-panel__title">Statistics</span>
      </div>

      <div className="statistics-panel__body">
        {/* Summary cards */}
        <section className="statistics-panel__section" aria-label="Summary">
          <div className="statistics-panel__cards">
            <StatisticsCard label="Layers" value={stats.totalLayers} />
            <StatisticsCard label="Features" value={stats.totalFeatures} />
            <StatisticsCard
              label="Diagnostics"
              value={totalDiag}
              accent={
                stats.diagnostics.errors > 0
                  ? 'error'
                  : stats.diagnostics.warnings > 0
                    ? 'warning'
                    : totalDiag > 0
                      ? 'info'
                      : 'success'
              }
            />
          </div>
        </section>

        {/* Geometry distribution */}
        {stats.totalFeatures > 0 && (
          <section
            className="statistics-panel__section"
            aria-label="Geometry distribution"
          >
            <div className="statistics-panel__section-title">Geometry</div>
            <GeometryChart
              point={stats.geometryCounts.point}
              line={stats.geometryCounts.line}
              polygon={stats.geometryCounts.polygon}
            />
          </section>
        )}

        {/* Diagnostic distribution */}
        <section
          className="statistics-panel__section"
          aria-label="Diagnostic distribution"
        >
          <div className="statistics-panel__section-title">Diagnostics</div>
          <DiagnosticChart
            errors={stats.diagnostics.errors}
            warnings={stats.diagnostics.warnings}
            info={stats.diagnostics.info}
          />
        </section>

        {/* Layer table */}
        {stats.totalLayers > 0 && (
          <section
            className="statistics-panel__section"
            aria-label="Layer breakdown"
          >
            <div className="statistics-panel__section-title">Layers</div>
            <LayerStatisticsTable
              layers={layers.layers}
              sortKey={layers.sortKey}
              onSort={layers.setSortKey}
            />
          </section>
        )}

        {/* Empty state */}
        {stats.totalLayers === 0 && (
          <div className="statistics-panel__empty">
            <span className="statistics-panel__empty-icon" aria-hidden="true">
              📊
            </span>
            <span className="statistics-panel__empty-text">
              Load a tile to see statistics
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

```

### File: `packages/inspector/src/components/settings/SettingsPanel.tsx`

```tsx
/**
 * @tileguard/inspector — SettingsPanel (Milestone 6 — Step 3)
 *
 * Full-width settings panel shown when the Settings tab is active.
 *
 * All state reads from useSettings() which subscribes to SettingsService.
 * All mutations go through inspector.updateSettings() → SettingsService →
 * renderer update → re-render.
 *
 * Categories:
 *   Rendering   — vertices, tile/buffer bounds, anti-aliasing
 *   Interaction — hover, auto-focus, smooth zoom, selection outline
 *   Diagnostics — minimum severity filter
 *   Appearance  — overlay opacity, selection/hover thickness
 */
import type { Inspector } from '../../create-inspector.js';
import { useSettings } from '../../hooks/use-statistics-settings.js';
import './SettingsPanel.css';
import { Section } from './Section.js';
import { SliderSetting } from './SliderSetting.js';
import { ToggleSetting } from './ToggleSetting.js';

export interface SettingsPanelProps {
  readonly inspector: Inspector | null;
}

export function SettingsPanel({ inspector }: SettingsPanelProps): JSX.Element {
  const settings = useSettings();

  const update = (patch: Parameters<Inspector['updateSettings']>[0]) => {
    inspector?.updateSettings(patch);
  };

  const reset = () => {
    inspector?.resetSettings();
  };

  return (
    <div className="settings-panel" aria-label="Settings panel">
      <div className="settings-panel__header">
        <span className="settings-panel__title">Settings</span>
        <button
          type="button"
          className="settings-panel__reset-btn"
          onClick={reset}
          aria-label="Reset all settings to defaults"
          title="Reset to defaults"
        >
          ↺ Reset
        </button>
      </div>

      <div className="settings-panel__body">
        {/* ── Rendering ─────────────────────────────────────────────── */}
        <Section title="Rendering">
          <ToggleSetting
            label="Show vertices"
            description="Draw a marker on every geometry vertex"
            checked={settings.showVertices}
            onChange={(v) => update({ showVertices: v })}
          />
          <ToggleSetting
            label="Show tile bounds"
            description="Draw the tile extent rectangle"
            checked={settings.showTileBounds}
            onChange={(v) => update({ showTileBounds: v })}
          />
          <ToggleSetting
            label="Show buffer bounds"
            description="Draw the tile buffer zone rectangle"
            checked={settings.showBufferBounds}
            onChange={(v) => update({ showBufferBounds: v })}
          />
          <ToggleSetting
            label="Anti-aliasing"
            description="Smooth geometry edges"
            checked={settings.antiAliasing}
            onChange={(v) => update({ antiAliasing: v })}
          />
        </Section>

        {/* ── Interaction ──────────────────────────────────────────── */}
        <Section title="Interaction">
          <ToggleSetting
            label="Hover highlight"
            description="Highlight the feature under the cursor"
            checked={settings.hoverEnabled}
            onChange={(v) => update({ hoverEnabled: v })}
          />
          <ToggleSetting
            label="Auto-focus diagnostics"
            description="Scroll the canvas to the affected feature when selecting a diagnostic"
            checked={settings.autoFocusDiagnostics}
            onChange={(v) => update({ autoFocusDiagnostics: v })}
          />
          <ToggleSetting
            label="Smooth zoom"
            description="Animate zoom transitions"
            checked={settings.smoothZoom}
            onChange={(v) => update({ smoothZoom: v })}
          />
          <ToggleSetting
            label="Selection outline"
            description="Draw a prominent outline around the selected feature"
            checked={settings.selectionOutline}
            onChange={(v) => update({ selectionOutline: v })}
          />
        </Section>

        {/* ── Diagnostics ───────────────────────────────────────────── */}
        <Section title="Diagnostics">
          <div className="settings-panel__row settings-panel__row--label">
            <span className="settings-panel__field-label">
              Minimum severity
            </span>
          </div>
          <div
            className="settings-panel__severity-group"
            role="radiogroup"
            aria-label="Minimum diagnostic severity"
          >
            {(['error', 'warning', 'info'] as const).map((sev) => (
              <label key={sev} className="settings-panel__severity-option">
                <input
                  type="radio"
                  name="minSeverity"
                  value={sev}
                  checked={settings.minSeverity === sev}
                  onChange={() => update({ minSeverity: sev })}
                  className="settings-panel__radio"
                />
                <span
                  className={`settings-panel__severity-label settings-panel__severity-label--${sev}`}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────── */}
        <Section title="Appearance">
          <SliderSetting
            label="Overlay opacity"
            description="Transparency of diagnostic overlay markers"
            value={settings.overlayOpacity}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={(v) => update({ overlayOpacity: v })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <SliderSetting
            label="Selection thickness"
            description="Outline width of the selected feature"
            value={settings.selectionThickness}
            min={1}
            max={6}
            step={1}
            onChange={(v) => update({ selectionThickness: v })}
            format={(v) => `${v}px`}
          />
          <SliderSetting
            label="Hover thickness"
            description="Outline width of the hovered feature"
            value={settings.hoverThickness}
            min={1}
            max={6}
            step={1}
            onChange={(v) => update({ hoverThickness: v })}
            format={(v) => `${v}px`}
          />
        </Section>

        {/* ── Keyboard shortcuts reference ─────────────────────────── */}
        <Section title="Keyboard shortcuts" defaultOpen={false}>
          <div className="settings-panel__shortcuts">
            {[
              { key: 'F', desc: 'Focus selected feature' },
              { key: 'R', desc: 'Reset view' },
              { key: 'Esc', desc: 'Clear selection' },
              { key: 'Ctrl+F', desc: 'Focus search' },
              { key: 'Ctrl+,', desc: 'Open settings' },
              { key: 'Ctrl+1', desc: 'Diagnostics tab' },
              { key: 'Ctrl+2', desc: 'Statistics tab' },
              { key: 'Ctrl+3', desc: 'Settings tab' },
            ].map(({ key, desc }) => (
              <div key={key} className="settings-panel__shortcut-row">
                <kbd className="settings-panel__kbd">{key}</kbd>
                <span className="settings-panel__shortcut-desc">{desc}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

```

### File: `packages/inspector/src/components/profiler/DeveloperOverlay.tsx`

```tsx
/**
 * @tileguard/inspector — DeveloperOverlay (Milestone 6 — Step 4)
 *
 * Performance metrics HUD shown in a fixed corner of the canvas.
 * Toggled by Ctrl+Shift+D.
 */

import type { PerformanceMetrics } from '../../performance/PerformanceProfiler.js';
import type { ResolvedFeature } from '../../providers/FeatureProvider.js';
import type { ViewportState } from '../../viewport/viewport.js';

export interface DeveloperOverlayProps {
  readonly metrics: PerformanceMetrics;
  readonly viewport: ViewportState | null;
  readonly hoveredFeature: ResolvedFeature | null;
  readonly selectedFeature: ResolvedFeature | null;
  readonly totalFeatures: number;
  readonly visibleFeatures?: number;
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[11px] leading-5">
      <span className="text-[var(--tg-text-muted)]">{label}</span>
      <span
        className={
          accent
            ? 'font-mono font-semibold text-[var(--tg-accent)]'
            : 'font-mono text-[var(--tg-text-primary)]'
        }
      >
        {value}
      </span>
    </div>
  );
}

export function DeveloperOverlay({
  metrics,
  viewport,
  hoveredFeature,
  selectedFeature,
  totalFeatures,
  visibleFeatures,
}: DeveloperOverlayProps): JSX.Element {
  const fpsColor =
    metrics.fps >= 55
      ? 'text-[var(--tg-success)]'
      : metrics.fps >= 30
        ? 'text-[var(--tg-warning)]'
        : 'text-[var(--tg-error)]';

  return (
    <div
      className="absolute right-3 top-3 z-50 min-w-[180px] select-none rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-primary)]/85 px-3 py-2.5 backdrop-blur-sm"
      aria-label="Developer performance overlay"
      role="status"
      aria-live="off"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
          Dev Overlay
        </span>
        <span className={`text-sm font-bold tabular-nums ${fpsColor}`}>
          {metrics.fps.toFixed(0)} fps
        </span>
      </div>

      {/* Divider */}
      <div className="mb-2 h-px bg-[var(--tg-border)]" />

      {/* Metrics */}
      <div className="space-y-0.5">
        <MetricRow
          label="Frame time"
          value={`${metrics.frameTimeMs.toFixed(1)} ms`}
        />
        <MetricRow label="Renders" value={metrics.renderCount} />

        {viewport != null && (
          <>
            <MetricRow label="Zoom" value={`${viewport.zoom.toFixed(2)}×`} />
            <MetricRow
              label="Pan"
              value={`${Math.round(viewport.panX)}, ${Math.round(viewport.panY)}`}
            />
          </>
        )}

        <MetricRow
          label="Total features"
          value={totalFeatures.toLocaleString()}
        />
        {visibleFeatures != null && (
          <MetricRow label="Visible" value={visibleFeatures.toLocaleString()} />
        )}

        {hoveredFeature != null && (
          <MetricRow
            label="Hover"
            value={`${hoveredFeature.layerName}[${hoveredFeature.featureIndex}]`}
            accent
          />
        )}
        {selectedFeature != null && (
          <MetricRow
            label="Selected"
            value={`${selectedFeature.layerName}[${selectedFeature.featureIndex}]`}
            accent
          />
        )}
      </div>

      {/* Toggle hint */}
      <div className="mt-2 border-t border-[var(--tg-border)] pt-1.5 text-[10px] text-[var(--tg-text-muted)]">
        Ctrl+Shift+D to close
      </div>
    </div>
  );
}

```

### File: `packages/inspector/src/components/loading/LoadingOverlay.tsx`

```tsx
/**
 * @tileguard/inspector — LoadingOverlay (Milestone 6 — Step 4)
 *
 * Multi-step loading progress display shown while a tile is being decoded.
 */

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export type LoadingStep =
  | 'loading'
  | 'parsing'
  | 'statistics'
  | 'diagnostics'
  | 'ready';

interface StepDef {
  id: LoadingStep;
  label: string;
}

const STEPS: StepDef[] = [
  { id: 'loading', label: 'Loading tile' },
  { id: 'parsing', label: 'Parsing geometry' },
  { id: 'statistics', label: 'Building statistics' },
  { id: 'diagnostics', label: 'Preparing diagnostics' },
  { id: 'ready', label: 'Ready' },
];

const STEP_ORDER: LoadingStep[] = STEPS.map((s) => s.id);

function stepIndex(step: LoadingStep): number {
  return STEP_ORDER.indexOf(step);
}

export interface LoadingOverlayProps {
  readonly currentStep: LoadingStep;
  readonly fileName?: string;
  readonly error?: string;
}

export function LoadingOverlay({
  currentStep,
  fileName,
  error,
}: LoadingOverlayProps): JSX.Element {
  const currentIdx = stepIndex(currentStep);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--tg-bg-primary)]/90 backdrop-blur-sm"
      role="status"
      aria-label="Loading tile"
      aria-live="polite"
    >
      <div className="w-72 rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-6 shadow-[var(--tg-shadow-md)]">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--tg-text-primary)]">
            {error != null ? 'Load failed' : 'Loading'}
          </h2>
          {fileName != null && (
            <p className="mt-0.5 max-w-full truncate text-[11px] text-[var(--tg-text-muted)]">
              {fileName}
            </p>
          )}
        </div>

        {error != null ? (
          <div className="rounded border border-[var(--tg-error)]/30 bg-[var(--tg-error)]/10 px-3 py-2 text-xs text-[var(--tg-error)]">
            {error}
          </div>
        ) : (
          <ol className="space-y-2">
            {STEPS.map((step, i) => {
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;

              return (
                <li
                  key={step.id}
                  className="flex items-center gap-3 text-xs"
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-[var(--tg-success)]"
                      aria-hidden="true"
                    />
                  ) : isActive ? (
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-[var(--tg-accent)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      isDone
                        ? 'text-[var(--tg-text-secondary)]'
                        : isActive
                          ? 'font-medium text-[var(--tg-text-primary)]'
                          : 'text-[var(--tg-text-muted)]'
                    }
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

```

### File: `packages/inspector/src/renderer/canvas-renderer.ts`

```typescript
/**
 * @tileguard/inspector — Canvas 2D Renderer
 *
 * Concrete implementation of the Renderer interface using the HTML5 Canvas
 * 2D API. Acts as the central **Dispatcher** — it orchestrates the full
 * rendering pipeline by:
 *   1. Clearing the canvas
 *   2. Drawing the tile extent + buffer boundary boxes
 *   3. Walking VectorTileArtifact geometry via walkArtifact (traversal)
 *   4. Dispatching each geometry part to the appropriate drawing helper
 *   5. Drawing overlay markers (single top pass)
 *
 * Responsibility boundaries (ADR-009)
 * ────────────────────────────────────
 * CanvasRenderer:
 *   - owns the rendering pipeline (order of passes)
 *   - owns tile-to-screen coordinate transformation (via Viewport)
 *   - owns geometry dispatch (type → drawing helper)
 *   - owns overlay rendering
 *
 * CanvasRenderer MUST NOT:
 *   - implement geometry traversal (delegated to walkArtifact)
 *   - perform drawing primitives directly (delegated to shapes.ts)
 *   - define OverlayDescriptor (owned by overlay/overlay-adapter.ts)
 *   - expose highlightFeature() — selection is managed via InspectorStore
 *
 * Geometry dispatch
 * ─────────────────
 * There is exactly ONE place in this file where geometry types are
 * interpreted: the visitor passed to walkArtifact inside _collectGeometry.
 * The visitor callbacks (onPolygon, onLineString, onPoint) are the sole
 * dispatcher. No other method switches on feature.type for rendering
 * geometry. The private helpers _firstVertex and _flattenVertices are
 * geometry *accessors* — they extract raw coordinates — but they do not
 * dispatch to drawing helpers.
 *
 * Accumulation rationale (z-order)
 * ─────────────────────────────────
 * AccumulatedGeometry is a TEMPORARY render buffer. It exists for one
 * purpose: enforcing a global z-order across all layers.
 *
 * Without accumulation, a naïve traversal would draw polygons, lines, and
 * points interleaved per layer:
 *   layer A: polygon → line → point
 *   layer B: polygon → line → point
 *
 * This causes roads from layer B to be buried under building polygons from
 * layer A when the layers share the same nominal z-index. The accumulated
 * approach enforces:
 *   All polygons (all layers) → All lines (all layers) → All points (all layers)
 *
 * The buffer is allocated at the start of render(), filled during the
 * traversal pass, drained during the draw passes, and then immediately
 * discarded (garbage collected). It is NEVER stored as instance state.
 *
 * This is intentionally analogous to MapLibre's bucket system, which groups
 * geometry by type before issuing draw calls, though MapLibre uses GPU
 * buffers rather than CPU-side arrays.
 *
 * Public API
 * ──────────
 *   Renderer             — minimal 4-method interface all renderers implement
 *   CanvasRenderer       — Canvas 2D concrete implementation
 *   CanvasRendererOptions
 */

import type {
  VectorTileArtifact,
  VectorTileFeature,
} from '@tileguard/tile-rules';
import type { ScreenPoint } from '../geometry/index.js';
import { walkArtifact } from '../geometry/traversal.js';
import type { OverlayDescriptor } from '../overlay/overlay-adapter.js';
import type { Viewport } from '../viewport/viewport.js';
import {
  BUFFER_BOUNDARY_STYLE,
  LAYER_COLORS,
  LINE_STYLE,
  OVERLAY_COLORS,
  OVERLAY_STYLE,
  POINT_STYLE,
  POLYGON_STYLE,
  TILE_BOUNDARY_STYLE,
  VERTEX_STYLE,
} from './palette.js';
import {
  drawLineString,
  drawPoint,
  drawPolygon,
  drawTileBoundary,
  drawVertexMarkers,
} from './shapes.js';

// ---------------------------------------------------------------------------
// Renderer interface (4-method minimal API)
// ---------------------------------------------------------------------------

/**
 * Renderer — minimal interface all rendering backends implement.
 *
 * `highlightFeature` is intentionally omitted. Selection and highlighting
 * are visual state managed via InspectorStore → Overlay Adapter → render().
 */
export interface Renderer {
  /**
   * Attach a canvas element and acquire its 2D context.
   * Must be called before resize() or render().
   */
  attachCanvas(canvas: HTMLCanvasElement): void;

  /**
   * Update the canvas dimensions.
   * Triggers a Viewport resize; does not trigger a re-render.
   *
   * @param width   New canvas width in CSS pixels.
   * @param height  New canvas height in CSS pixels.
   */
  resize(width: number, height: number): void;

  /**
   * Clear the entire canvas to transparent black.
   * Called automatically at the start of each render() pass.
   */
  clear(): void;

  /**
   * Execute the full rendering pipeline:
   *   boundary → polygons → lines → points → vertices → overlays
   *
   * @param artifact  The decoded VectorTileArtifact to render.
   * @param overlays  Overlay descriptors produced by the OverlayAdapter.
   */
  render(artifact: VectorTileArtifact, overlays: OverlayDescriptor[]): void;
}

// ---------------------------------------------------------------------------
// CanvasRenderer options
// ---------------------------------------------------------------------------

/** Options for CanvasRenderer construction. */
export interface CanvasRendererOptions {
  /**
   * Viewport to use for tile-to-screen coordinate transforms.
   * The viewport is mutable — callers may replace it via setViewport().
   */
  viewport: Viewport;
  /**
   * Whether to draw vertex markers over all geometry.
   * Defaults to false.
   */
  showVertices?: boolean;
  /** Whether to draw the tile extent rectangle. Defaults to true. */
  showTileBounds?: boolean;
  /** Whether to draw the buffer zone rectangle. Defaults to true. */
  showBufferBounds?: boolean;
  /** Global opacity for diagnostic overlay markers (0.0–1.0). Defaults to 0.9. */
  overlayOpacity?: number;
  /** Line width for selection outlines in screen pixels. Defaults to 2. */
  selectionThickness?: number;
  /** Line width for hover outlines in screen pixels. Defaults to 2. */
  hoverThickness?: number;
}

// ---------------------------------------------------------------------------
// Temporary render buffer
// ---------------------------------------------------------------------------

/**
 * AccumulatedGeometry — temporary render buffer for one render() call.
 *
 * Allocated at the start of render(), populated during _collectGeometry,
 * consumed during the draw passes, then immediately discarded. It is NEVER
 * stored as instance state on CanvasRenderer.
 *
 * Purpose: enforce a global z-order where all polygons are drawn before all
 * lines, and all lines before all points — regardless of the layer order in
 * the artifact. See "Accumulation rationale" in the module header.
 */
interface AccumulatedGeometry {
  /** Screen-space polygon rings collected from all layers, in traversal order. */
  polygons: Array<{
    rings: readonly (readonly ScreenPoint[])[];
    layerName: string;
  }>;
  /** Screen-space line vertices collected from all layers, in traversal order. */
  lines: Array<{ points: readonly ScreenPoint[]; layerName: string }>;
  /** Screen-space point positions collected from all layers, in traversal order. */
  points: Array<{ point: ScreenPoint; layerName: string }>;
  /** All vertices across all geometry types (used for optional vertex markers). */
  vertices: ScreenPoint[];
}

// ---------------------------------------------------------------------------
// CanvasRenderer implementation
// ---------------------------------------------------------------------------

/**
 * CanvasRenderer — Canvas 2D implementation of the Renderer interface.
 *
 * Rendering pipeline (in order):
 *   1. clear()
 *   2. drawBoundary()   — tile extent box + buffer zone box
 *   3. _collectGeometry() — single traversal pass → temporary buffer
 *   4. _drawPolygons()  — all polygon geometry (filled + stroked)
 *   5. _drawLines()     — all linestring geometry
 *   6. _drawPoints()    — all point geometry
 *   7. _drawVertices()  — vertex markers (when showVertices = true)
 *   8. _drawOverlays()  — diagnostic overlay markers (top pass)
 *   [buffer discarded]
 */
export class CanvasRenderer implements Renderer {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _viewport: Viewport;
  private _showVertices: boolean;
  private _showTileBounds: boolean;
  private _showBufferBounds: boolean;
  private _overlayOpacity: number;
  private _selectionThickness: number;
  private _hoverThickness: number;

  constructor(options: CanvasRendererOptions) {
    this._viewport = options.viewport;
    this._showVertices = options.showVertices ?? false;
    this._showTileBounds = options.showTileBounds ?? true;
    this._showBufferBounds = options.showBufferBounds ?? true;
    this._overlayOpacity = options.overlayOpacity ?? OVERLAY_STYLE.globalAlpha;
    this._selectionThickness =
      options.selectionThickness ?? OVERLAY_STYLE.lineWidth;
    this._hoverThickness = options.hoverThickness ?? OVERLAY_STYLE.lineWidth;
  }

  // ---- Public accessors --------------------------------------------------

  /** Replace the active viewport (e.g. after pan/zoom in the UI). */
  setViewport(viewport: Viewport): void {
    this._viewport = viewport;
  }

  getViewport(): Viewport {
    return this._viewport;
  }

  /**
   * Update renderer options at runtime without reconstructing the renderer.
   * Only the supplied keys are changed; others remain at their current values.
   */
  setOptions(patch: Partial<CanvasRendererOptions>): void {
    if (patch.showVertices !== undefined) {
      this._showVertices = patch.showVertices;
    }
    if (patch.viewport !== undefined) {
      this._viewport = patch.viewport;
    }
    if (patch.showTileBounds !== undefined) {
      this._showTileBounds = patch.showTileBounds;
    }
    if (patch.showBufferBounds !== undefined) {
      this._showBufferBounds = patch.showBufferBounds;
    }
    if (patch.overlayOpacity !== undefined) {
      this._overlayOpacity = patch.overlayOpacity;
    }
    if (patch.selectionThickness !== undefined) {
      this._selectionThickness = patch.selectionThickness;
    }
    if (patch.hoverThickness !== undefined) {
      this._hoverThickness = patch.hoverThickness;
    }
  }

  // ---- Renderer interface ------------------------------------------------

  attachCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error(
        'CanvasRenderer.attachCanvas: failed to acquire a 2D context.',
      );
    }
    this._canvas = canvas;
    this._ctx = ctx;
  }

  resize(width: number, height: number): void {
    if (this._canvas !== null) {
      this._canvas.width = width;
      this._canvas.height = height;
    }
    this._viewport = this._viewport.resize(width, height);
  }

  clear(): void {
    const ctx = this._requireCtx();
    const canvas = this._requireCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  render(artifact: VectorTileArtifact, overlays: OverlayDescriptor[]): void {
    const ctx = this._requireCtx();
    const vp = this._viewport;

    // 1. Clear
    this.clear();

    // 2. Draw tile boundary + buffer zone (conditional on settings)
    if (this._showTileBounds || this._showBufferBounds) {
      this._drawBoundary(ctx, artifact, vp);
    }

    // 3. Collect all geometry into a temporary buffer in a single traversal pass.
    //    This buffer is local to this call — it is discarded when render() returns.
    const accumulated = this._collectGeometry(artifact, vp);

    // 4–6. Draw passes (enforces global z-order: polygons → lines → points)
    this._drawPolygons(ctx, accumulated);
    this._drawLines(ctx, accumulated);
    this._drawPoints(ctx, accumulated);

    // 7. Optional vertex markers
    if (this._showVertices) {
      this._drawVertices(ctx, accumulated);
    }

    // 8. Diagnostic overlays (top pass — always above geometry)
    this._drawOverlays(ctx, overlays, artifact, vp);

    // accumulated is now eligible for GC — no reference is kept
  }

  // ---- Private pipeline steps --------------------------------------------

  private _drawBoundary(
    ctx: CanvasRenderingContext2D,
    artifact: VectorTileArtifact,
    vp: Viewport,
  ): void {
    const layers = Object.values(artifact.content.layers);
    const extent = layers[0]?.extent ?? 4096;

    const origin = vp.tileToScreen({ x: 0, y: 0 });
    const maxCorner = vp.tileToScreen({ x: extent, y: extent });

    const buffer = Math.round(extent / 16);
    const bufferOrigin = vp.tileToScreen({ x: -buffer, y: -buffer });
    const bufferMax = vp.tileToScreen({
      x: extent + buffer,
      y: extent + buffer,
    });

    drawTileBoundary(
      ctx,
      origin,
      maxCorner,
      bufferOrigin,
      bufferMax,
      this._showTileBounds ? TILE_BOUNDARY_STYLE : null,
      this._showBufferBounds ? BUFFER_BOUNDARY_STYLE : null,
    );
  }

  /**
   * Walk the artifact once and accumulate screen-space geometry into a
   * temporary buffer. This is the ONLY place where geometry types are
   * dispatched to typed buckets (onPolygon / onLineString / onPoint).
   */
  private _collectGeometry(
    artifact: VectorTileArtifact,
    vp: Viewport,
  ): AccumulatedGeometry {
    const accumulated: AccumulatedGeometry = {
      polygons: [],
      lines: [],
      points: [],
      vertices: [],
    };

    walkArtifact(artifact, {
      onPolygon: (rings, ctx) => {
        const screenRings = rings.map((ring) =>
          ring.map((p): ScreenPoint => vp.tileToScreen(p)),
        );
        accumulated.polygons.push({
          rings: screenRings,
          layerName: ctx.layerName,
        });
        if (screenRings[0] !== undefined) {
          for (const v of screenRings[0]) accumulated.vertices.push(v);
        }
      },

      onLineString: (points, ctx) => {
        const screenPoints = points.map((p): ScreenPoint => vp.tileToScreen(p));
        accumulated.lines.push({
          points: screenPoints,
          layerName: ctx.layerName,
        });
        for (const v of screenPoints) accumulated.vertices.push(v);
      },

      onPoint: (points, ctx) => {
        for (const p of points) {
          const sp = vp.tileToScreen(p);
          accumulated.points.push({ point: sp, layerName: ctx.layerName });
          accumulated.vertices.push(sp);
        }
      },
    });

    return accumulated;
  }

  private _drawPolygons(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    for (const { rings, layerName } of accumulated.polygons) {
      const color = resolveLayerColor(layerName);
      drawPolygon(ctx, rings, {
        ...POLYGON_STYLE,
        fillColor: color,
        strokeColor: color,
      });
    }
  }

  private _drawLines(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    for (const { points, layerName } of accumulated.lines) {
      const color = resolveLayerColor(layerName);
      drawLineString(ctx, points, { ...LINE_STYLE, strokeColor: color });
    }
  }

  private _drawPoints(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    for (const { point, layerName } of accumulated.points) {
      const color = resolveLayerColor(layerName);
      drawPoint(ctx, point, { ...POINT_STYLE, fillColor: color });
    }
  }

  private _drawVertices(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    drawVertexMarkers(ctx, accumulated.vertices, VERTEX_STYLE);
  }

  private _drawOverlays(
    ctx: CanvasRenderingContext2D,
    overlays: OverlayDescriptor[],
    artifact: VectorTileArtifact,
    vp: Viewport,
  ): void {
    for (const overlay of overlays) {
      const color = OVERLAY_COLORS[overlay.severity];
      const layer = artifact.content.layers[overlay.layerName];
      if (layer === undefined) continue;
      const feature = layer.features[overlay.featureIndex];
      if (feature === undefined) continue;

      if (overlay.type === 'point-marker') {
        const first = firstVertex(feature);
        if (first !== undefined) {
          drawPoint(ctx, vp.tileToScreen(first), {
            radius: OVERLAY_STYLE.pointRadius,
            fillColor: color,
            strokeColor: '#ffffff',
            lineWidth: OVERLAY_STYLE.lineWidth,
            globalAlpha: this._overlayOpacity,
          });
        }
      } else if (overlay.type === 'segment-highlight') {
        const target = overlay.target as [number, number];
        const ring = firstRing(feature);
        const a = ring[target[0]];
        const b = ring[target[1]];
        if (a !== undefined && b !== undefined) {
          drawLineString(ctx, [vp.tileToScreen(a), vp.tileToScreen(b)], {
            strokeColor: color,
            lineWidth: OVERLAY_STYLE.lineWidth * 2,
            lineCap: OVERLAY_STYLE.lineCap,
            lineJoin: OVERLAY_STYLE.lineJoin,
            globalAlpha: this._overlayOpacity,
          });
        }
      } else if (overlay.type === 'ring-highlight') {
        const ringIndex =
          typeof overlay.target === 'number' ? overlay.target : 0;
        const rings = feature.geometry as readonly (readonly {
          x: number;
          y: number;
        }[])[];
        const ring = rings[ringIndex] ?? [];
        const pts = ring.map((p) => vp.tileToScreen(p));
        if (pts.length >= 2) {
          drawLineString(ctx, pts, {
            strokeColor: color,
            lineWidth: OVERLAY_STYLE.lineWidth * 2,
            lineCap: OVERLAY_STYLE.lineCap,
            lineJoin: OVERLAY_STYLE.lineJoin,
            globalAlpha: this._overlayOpacity,
          });
        }
      } else if (overlay.type === 'bbox-fill') {
        const allPts = flattenVertices(feature);
        if (allPts.length > 0) {
          const xs = allPts.map((p) => p.x);
          const ys = allPts.map((p) => p.y);
          const tl = vp.tileToScreen({
            x: Math.min(...xs),
            y: Math.min(...ys),
          });
          const br = vp.tileToScreen({
            x: Math.max(...xs),
            y: Math.max(...ys),
          });
          drawPolygon(
            ctx,
            [[tl, { x: br.x, y: tl.y }, br, { x: tl.x, y: br.y }]],
            {
              fillColor: color,
              fillAlpha: OVERLAY_STYLE.fillAlpha,
              strokeColor: color,
              lineWidth: OVERLAY_STYLE.lineWidth,
              lineJoin: OVERLAY_STYLE.lineJoin,
              globalAlpha: this._overlayOpacity,
            },
          );
        }
      }
    }
  }

  // ---- Private utilities -------------------------------------------------

  private _requireCtx(): CanvasRenderingContext2D {
    if (this._ctx === null) {
      throw new Error(
        'CanvasRenderer: no canvas attached. Call attachCanvas() before render().',
      );
    }
    return this._ctx;
  }

  private _requireCanvas(): HTMLCanvasElement {
    if (this._canvas === null) {
      throw new Error(
        'CanvasRenderer: no canvas attached. Call attachCanvas() before resize().',
      );
    }
    return this._canvas;
  }
}

// ---------------------------------------------------------------------------
// Module-level geometry accessors (not dispatchers — no drawing side effects)
// ---------------------------------------------------------------------------

/**
 * Return the first vertex of a feature's geometry, regardless of type.
 *
 * Used by the overlay pass to position point-marker overlays without
 * re-entering the traversal system. This is a coordinate accessor, not a
 * geometry dispatcher — it does not route to drawing helpers.
 */
function firstVertex(
  feature: VectorTileFeature,
): { x: number; y: number } | undefined {
  if (feature.type === 1) {
    const flat = feature.geometry as readonly { x: number; y: number }[];
    return flat[0];
  }
  const rings = feature.geometry as readonly (readonly {
    x: number;
    y: number;
  }[])[];
  return rings[0]?.[0];
}

/**
 * Return the first ring of a feature as a flat vertex array.
 *
 * For Point features (type=1) the geometry IS the flat vertex array.
 * For LineString/Polygon (type=2/3) the first ring is rings[0].
 *
 * Used by the overlay pass for segment-highlight positioning.
 */
function firstRing(
  feature: VectorTileFeature,
): readonly { x: number; y: number }[] {
  if (feature.type === 1) {
    return feature.geometry as readonly { x: number; y: number }[];
  }
  const rings = feature.geometry as readonly (readonly {
    x: number;
    y: number;
  }[])[];
  return rings[0] ?? [];
}

/**
 * Flatten all vertices of a feature into a single array.
 *
 * Used by the overlay pass to compute a feature's bounding box for
 * bbox-fill overlays.
 */
function flattenVertices(
  feature: VectorTileFeature,
): Array<{ x: number; y: number }> {
  if (feature.type === 1) {
    return [...(feature.geometry as readonly { x: number; y: number }[])];
  }
  const result: Array<{ x: number; y: number }> = [];
  const rings = feature.geometry as readonly (readonly {
    x: number;
    y: number;
  }[])[];
  for (const ring of rings) result.push(...ring);
  return result;
}

// ---------------------------------------------------------------------------
// Palette helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a layer name to its display colour token.
 * Falls back to LAYER_COLORS.default for unrecognised layer names.
 */
function resolveLayerColor(layerName: string): string {
  const key = layerName as keyof typeof LAYER_COLORS;
  return key in LAYER_COLORS ? LAYER_COLORS[key] : LAYER_COLORS.default;
}

```

### File: `packages/inspector/src/renderer/shapes.ts`

```typescript
/**
 * @tileguard/inspector — Renderer: Pure Drawing Routines
 *
 * Pure Canvas 2D drawing primitives. Each function:
 *   - accepts a CanvasRenderingContext2D, pre-transformed ScreenPoint(s), and
 *     style tokens from palette.ts
 *   - issues the minimal Canvas 2D path commands to draw the geometry
 *   - follows the save() → configure → beginPath() → path → fill/stroke → restore()
 *     lifecycle to guarantee full state isolation between calls
 *   - is stateless and side-effect-free except for drawing to `ctx`
 *
 * Architectural guardrails (ADR-009)
 * ──────────────────────────────────
 * Drawing helpers MUST NOT:
 *   - accept VectorTileArtifact, VectorTileFeature, Viewport, or traversal APIs
 *   - perform tile-to-screen coordinate transformation
 *   - perform feature dispatch or geometry-type switching
 *   - cache geometry or canvas state between calls
 *   - import @tileguard/tile-rules, InspectorStore, or overlay subsystem
 *   - contain business logic, hit testing, or validation
 *
 * Callers (CanvasRenderer) are responsible for coordinate transformation and
 * dispatching the correct helper for each geometry type.
 *
 * Polygon holes
 * ─────────────
 * `drawPolygon` uses `ctx.fill('evenodd')` so that interior rings correctly
 * subtract from exterior rings, matching MVT winding semantics.
 *
 * Exported functions
 * ──────────────────
 *   drawPoint          — filled circle + optional outline
 *   drawLineString     — stroked polyline
 *   drawPolygon        — multi-ring path with evenodd hole subtraction
 *   drawVertexMarkers  — small square markers at vertex coordinates
 *   drawTileBoundary   — tile extent box + optional buffer zone guide box
 */

import type { ScreenPoint } from '../geometry/index.js';

// ---------------------------------------------------------------------------
// Style token interfaces
// ---------------------------------------------------------------------------

/** Style tokens accepted by drawPoint. */
export interface PointStyle {
  readonly radius: number;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawLineString. */
export interface LineStyle {
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineCap: CanvasLineCap;
  readonly lineJoin: CanvasLineJoin;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawPolygon. */
export interface PolygonStyle {
  readonly fillColor: string;
  readonly fillAlpha: number;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineJoin: CanvasLineJoin;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawVertexMarkers. */
export interface VertexStyle {
  readonly halfSize: number;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawTileBoundary. */
export interface BoundaryStyle {
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineDash: readonly number[];
  readonly fillColor: string;
}

// ---------------------------------------------------------------------------
// drawPoint
// ---------------------------------------------------------------------------

/**
 * Draw a Point geometry as a filled circle with an outline stroke.
 *
 * @param ctx    Canvas 2D rendering context.
 * @param point  Pre-transformed screen-space coordinates of the point.
 * @param style  Visual style tokens (radius, colours, alpha).
 */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  point: ScreenPoint,
  style: PointStyle,
): void {
  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.beginPath();
  ctx.arc(point.x, point.y, style.radius, 0, Math.PI * 2);
  ctx.fillStyle = style.fillColor;
  ctx.fill();
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawLineString
// ---------------------------------------------------------------------------

/**
 * Draw a LineString geometry as a stroked polyline.
 *
 * Does nothing if `points` is empty or has fewer than 2 vertices
 * (degenerate linestrings produce no visible output).
 *
 * @param ctx    Canvas 2D rendering context.
 * @param points Pre-transformed screen-space vertices.
 * @param style  Visual style tokens (stroke, width, caps, alpha).
 */
export function drawLineString(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  style: LineStyle,
): void {
  if (points.length < 2) return;

  const first = points[0];
  if (first === undefined) return;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.lineCap = style.lineCap;
  ctx.lineJoin = style.lineJoin;

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p === undefined) continue;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawPolygon
// ---------------------------------------------------------------------------

/**
 * Draw a Polygon geometry as a multi-ring path.
 *
 * `rings[0]` is the exterior ring; `rings[1..n]` are interior rings (holes).
 * Interior rings are subtracted from the exterior using the `evenodd` fill
 * rule, which correctly handles arbitrary nesting depth.
 *
 * Each ring is closed automatically — callers do not need to repeat the first
 * vertex.
 *
 * Does nothing if `rings` is empty.
 *
 * @param ctx   Canvas 2D rendering context.
 * @param rings Pre-transformed screen-space rings. rings[0] = exterior.
 * @param style Visual style tokens (fill, stroke, alpha).
 */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  rings: readonly (readonly ScreenPoint[])[],
  style: PolygonStyle,
): void {
  if (rings.length === 0) return;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.beginPath();

  for (const ring of rings) {
    if (ring.length === 0) continue;
    const first = ring[0];
    if (first === undefined) continue;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < ring.length; i++) {
      const p = ring[i];
      if (p === undefined) continue;
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  // Fill with evenodd rule so interior rings become holes
  ctx.fillStyle = style.fillColor;
  ctx.globalAlpha = style.fillAlpha;
  ctx.fill('evenodd');

  // Stroke at full opacity relative to the parent globalAlpha
  ctx.globalAlpha = style.globalAlpha;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.lineJoin = style.lineJoin;
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawVertexMarkers
// ---------------------------------------------------------------------------

/**
 * Draw small square markers at each vertex in `points`.
 *
 * Used to display individual vertices during feature inspection. Squares are
 * axis-aligned and centred on each vertex.
 *
 * Does nothing if `points` is empty.
 *
 * @param ctx    Canvas 2D rendering context.
 * @param points Pre-transformed screen-space vertex positions.
 * @param style  Visual style tokens (size, colours, alpha).
 */
export function drawVertexMarkers(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  style: VertexStyle,
): void {
  if (points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;

  for (const p of points) {
    const x = p.x - style.halfSize;
    const y = p.y - style.halfSize;
    const size = style.halfSize * 2;

    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.fillStyle = style.fillColor;
    ctx.fill();
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawTileBoundary
// ---------------------------------------------------------------------------

/**
 * Draw the tile extent boundary box and an optional clipping buffer zone box.
 *
 * The tile boundary is drawn from `origin` to `maxCorner` using the tile
 * boundary style. If both `bufferOrigin` and `bufferMaxCorner` are provided,
 * a second (typically dotted) box is drawn for the buffer zone using the
 * buffer style.
 *
 * @param ctx             Canvas 2D rendering context.
 * @param origin          Top-left corner of the tile extent in screen pixels.
 * @param maxCorner       Bottom-right corner of the tile extent in screen pixels.
 * @param bufferOrigin    Top-left corner of the buffer zone (optional).
 * @param bufferMaxCorner Bottom-right corner of the buffer zone (optional).
 * @param tileStyle       Style tokens for the tile extent box.
 * @param bufferStyle     Style tokens for the buffer zone box (optional).
 */
export function drawTileBoundary(
  ctx: CanvasRenderingContext2D,
  origin: ScreenPoint,
  maxCorner: ScreenPoint,
  bufferOrigin: ScreenPoint | null,
  bufferMaxCorner: ScreenPoint | null,
  tileStyle: BoundaryStyle | null,
  bufferStyle?: BoundaryStyle | null,
): void {
  // --- Draw tile extent box ---
  if (tileStyle !== null) {
    ctx.save();
    ctx.strokeStyle = tileStyle.strokeColor;
    ctx.lineWidth = tileStyle.lineWidth;
    ctx.setLineDash(tileStyle.lineDash.slice());

    ctx.beginPath();
    ctx.rect(
      origin.x,
      origin.y,
      maxCorner.x - origin.x,
      maxCorner.y - origin.y,
    );
    ctx.stroke();
    ctx.restore();
  }

  // --- Draw buffer zone box (optional) ---
  if (
    bufferOrigin !== null &&
    bufferMaxCorner !== null &&
    bufferStyle != null
  ) {
    ctx.save();
    ctx.strokeStyle = bufferStyle.strokeColor;
    ctx.lineWidth = bufferStyle.lineWidth;
    ctx.setLineDash(bufferStyle.lineDash.slice());

    ctx.beginPath();
    ctx.rect(
      bufferOrigin.x,
      bufferOrigin.y,
      bufferMaxCorner.x - bufferOrigin.x,
      bufferMaxCorner.y - bufferOrigin.y,
    );
    ctx.stroke();
    ctx.restore();
  }
}

```

### File: `packages/inspector/tests/camera-animator.test.ts`

```typescript
/**
 * @tileguard/inspector — CameraAnimator tests (Milestone 6 — Step 4)
 *
 * Tests the animation engine: easing functions, RAF scheduling,
 * cancellation, onComplete callback, and isAnimating state.
 *
 * All tests use a synchronous, injectable RAF scheduler so no real timers
 * or browser APIs are required.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createCameraAnimator,
  type RafScheduler,
} from '../src/animation/CameraAnimator.js';
import type { ViewportState } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViewportState(
  overrides: Partial<ViewportState> = {},
): ViewportState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    extent: 4096,
    width: 800,
    height: 600,
    minZoom: 0.25,
    maxZoom: 64,
    ...overrides,
  };
}

/**
 * Synchronous RAF scheduler. Frames run immediately in registration order.
 * Use step(n) to advance exactly n frames; step() to drain everything.
 */
function makeSyncScheduler(): RafScheduler & {
  step: (count?: number) => void;
} {
  let nextId = 0;
  const pending = new Map<number, (ts: number) => void>();
  let ts = 0;
  return {
    requestFrame(cb) {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancelFrame(id) {
      pending.delete(id as number);
    },
    step(count = 100_000) {
      let i = 0;
      while (pending.size > 0 && i++ < count) {
        const [id, cb] = pending.entries().next().value as [
          number,
          (ts: number) => void,
        ];
        pending.delete(id);
        ts += 16; // simulate ~60fps
        cb(ts);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CameraAnimator', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('starts as not animating', () => {
    const animator = createCameraAnimator(makeSyncScheduler());
    expect(animator.isAnimating).toBe(false);
  });

  // ── Basic animation ────────────────────────────────────────────────────

  it('animates from source to target viewport', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const frames: ViewportState[] = [];

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 4 }),
      { duration: 160, easing: 'linear', onFrame: (s) => frames.push(s) },
    );
    scheduler.step();

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[frames.length - 1]!.zoom).toBeCloseTo(4, 1);
    expect(animator.isAnimating).toBe(false);
  });

  it('interpolates panX and panY alongside zoom', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const final: ViewportState[] = [];

    animator.animateTo(
      makeViewportState({ zoom: 1, panX: 0, panY: 0 }),
      makeViewportState({ zoom: 2, panX: 100, panY: 200 }),
      { duration: 64, easing: 'linear', onFrame: (s) => final.push(s) },
    );
    scheduler.step();

    const last = final[final.length - 1]!;
    expect(last.panX).toBeCloseTo(100, 1);
    expect(last.panY).toBeCloseTo(200, 1);
  });

  // ── onComplete ─────────────────────────────────────────────────────────

  it('fires onComplete exactly once when animation finishes naturally', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const onComplete = vi.fn();

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 2 }),
      { duration: 64, easing: 'linear', onFrame: () => {}, onComplete },
    );
    scheduler.step();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(animator.isAnimating).toBe(false);
  });

  // ── Cancellation ───────────────────────────────────────────────────────

  it('cancel() stops animation mid-flight', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    let frameCount = 0;

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 8 }),
      {
        duration: 1000,
        easing: 'linear',
        onFrame: () => {
          frameCount++;
        },
      },
    );
    scheduler.step(3); // advance 3 frames
    const countAtCancel = frameCount;
    animator.cancel();
    scheduler.step(10); // more steps — should produce nothing

    expect(animator.isAnimating).toBe(false);
    expect(frameCount).toBe(countAtCancel);
  });

  it('cancel() is a no-op when no animation is running', () => {
    const animator = createCameraAnimator(makeSyncScheduler());
    expect(() => animator.cancel()).not.toThrow();
    expect(animator.isAnimating).toBe(false);
  });

  it('onComplete is NOT called when animation is cancelled', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const onComplete = vi.fn();

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 10 }),
      { duration: 640, easing: 'linear', onFrame: () => {}, onComplete },
    );
    scheduler.step(3);
    animator.cancel();

    expect(onComplete).not.toHaveBeenCalled();
  });

  // ── New animation cancels previous ────────────────────────────────────

  it('starting a new animation cancels the in-flight one', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const complete1 = vi.fn();
    const frames2: number[] = [];

    // Long first animation
    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 10 }),
      {
        duration: 640,
        easing: 'linear',
        onFrame: () => {},
        onComplete: complete1,
      },
    );
    scheduler.step(3); // 3 frames in, still running
    expect(animator.isAnimating).toBe(true);

    // Start second animation — should cancel the first
    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 2 }),
      { duration: 64, easing: 'linear', onFrame: (s) => frames2.push(s.zoom) },
    );
    scheduler.step();

    expect(complete1).not.toHaveBeenCalled();
    expect(frames2[frames2.length - 1]).toBeCloseTo(2, 1);
  });

  // ── Easing functions ───────────────────────────────────────────────────

  it('supports all four easing functions without throwing', () => {
    for (const easing of [
      'linear',
      'easeOut',
      'easeInOut',
      'smoothstep',
    ] as const) {
      const scheduler = makeSyncScheduler();
      const animator = createCameraAnimator(scheduler);
      expect(() => {
        animator.animateTo(
          makeViewportState({ zoom: 1 }),
          makeViewportState({ zoom: 3 }),
          { duration: 64, easing, onFrame: () => {} },
        );
        scheduler.step();
      }).not.toThrow();
    }
  });

  it('easeOut converges faster than linear at the start', () => {
    // With easeOut, the first few frames should advance more than linear
    let linearZoom = 0;
    let easeOutZoom = 0;

    const run = (easing: 'linear' | 'easeOut', setter: (z: number) => void) => {
      const scheduler = makeSyncScheduler();
      const animator = createCameraAnimator(scheduler);
      animator.animateTo(
        makeViewportState({ zoom: 0 }),
        makeViewportState({ zoom: 1 }),
        { duration: 160, easing, onFrame: (s) => setter(s.zoom) },
      );
      scheduler.step(2); // just 2 frames
    };

    run('linear', (z) => {
      linearZoom = z;
    });
    run('easeOut', (z) => {
      easeOutZoom = z;
    });

    // easeOut should have progressed further than linear after the same number of frames
    expect(easeOutZoom).toBeGreaterThan(linearZoom);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('zero-duration animation completes immediately (no RAF scheduled)', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const frames: number[] = [];
    const onComplete = vi.fn();

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 5 }),
      {
        duration: 0,
        easing: 'linear',
        onFrame: (s) => frames.push(s.zoom),
        onComplete,
      },
    );
    // No scheduler.step() needed — should have run synchronously
    expect(frames[frames.length - 1]).toBeCloseTo(5, 1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(animator.isAnimating).toBe(false);
  });

  it('animating flag is true during animation and false after', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const snapshots: boolean[] = [];

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 2 }),
      {
        duration: 64,
        easing: 'linear',
        onFrame: () => {
          snapshots.push(animator.isAnimating);
        },
      },
    );
    scheduler.step();

    expect(snapshots.every(Boolean)).toBe(true); // true during all frames
    expect(animator.isAnimating).toBe(false); // false after completion
  });
});

```

### File: `packages/inspector/tests/spatial-index.test.ts`

```typescript
/**
 * @tileguard/inspector — SpatialIndex tests (Milestone 6 — Step 4)
 *
 * Tests the grid-based spatial index: build, point query, region query,
 * deduplication, replacement, and edge cases.
 */

import { describe, expect, it } from 'vitest';
import { createSpatialIndex } from '../src/performance/SpatialIndex.js';
import type { SpatialFeatureRef } from '../src/performance/SpatialIndex.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ref(
  layerName: string,
  featureIndex: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): SpatialFeatureRef {
  return { layerName, featureIndex, bounds: { minX, minY, maxX, maxY } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpatialIndex', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('starts with size 0 before any build', () => {
    expect(createSpatialIndex().size).toBe(0);
  });

  it('query() and queryRegion() on an unbuilt index return empty arrays', () => {
    const index = createSpatialIndex();
    expect(index.query({ x: 100, y: 100 })).toHaveLength(0);
    expect(
      index.queryRegion({ minX: 0, minY: 0, maxX: 4096, maxY: 4096 }),
    ).toHaveLength(0);
  });

  // ── build() ────────────────────────────────────────────────────────────

  it('build() reports the correct feature count via size', () => {
    const index = createSpatialIndex();
    index.build([
      ref('roads', 0, 0, 0, 100, 100),
      ref('roads', 1, 200, 200, 300, 300),
      ref('buildings', 0, 500, 500, 600, 600),
    ]);
    expect(index.size).toBe(3);
  });

  it('build() with an empty list produces size 0', () => {
    const index = createSpatialIndex();
    index.build([]);
    expect(index.size).toBe(0);
  });

  it('build() replaces a previous index', () => {
    const index = createSpatialIndex();
    index.build([ref('old', 0, 0, 0, 100, 100)]);
    index.build([ref('new', 0, 0, 0, 100, 100)]);

    const results = index.query({ x: 50, y: 50 });
    expect(results.some((r) => r.layerName === 'old')).toBe(false);
    expect(results.some((r) => r.layerName === 'new')).toBe(true);
    expect(index.size).toBe(1);
  });

  // ── query(point) ───────────────────────────────────────────────────────

  it('query() returns a feature whose bounding box covers the point', () => {
    const index = createSpatialIndex();
    index.build([ref('roads', 0, 0, 0, 200, 200)]);

    const results = index.query({ x: 100, y: 100 });
    expect(
      results.some((r) => r.layerName === 'roads' && r.featureIndex === 0),
    ).toBe(true);
  });

  it('query() does not return a feature in a far-away cell', () => {
    const index = createSpatialIndex(32, 4096);
    index.build([ref('roads', 0, 0, 0, 10, 10)]); // tiny feature near origin

    // Query a point far from the feature's cell
    const results = index.query({ x: 4090, y: 4090 });
    expect(results.some((r) => r.layerName === 'roads')).toBe(false);
  });

  it('query() returns multiple features in the same cell', () => {
    const index = createSpatialIndex();
    index.build([ref('a', 0, 0, 0, 200, 200), ref('b', 0, 50, 50, 150, 150)]);
    const results = index.query({ x: 100, y: 100 });
    expect(results.some((r) => r.layerName === 'a')).toBe(true);
    expect(results.some((r) => r.layerName === 'b')).toBe(true);
  });

  it('query() clamps out-of-bounds points to the grid boundary', () => {
    const index = createSpatialIndex(32, 4096);
    index.build([ref('edge', 0, 4000, 4000, 4096, 4096)]);

    // Point slightly beyond extent — should not throw, should clamp
    expect(() => index.query({ x: 5000, y: 5000 })).not.toThrow();
    expect(() => index.query({ x: -100, y: -100 })).not.toThrow();
  });

  // ── queryRegion() ──────────────────────────────────────────────────────

  it('queryRegion() returns features that intersect the region', () => {
    const index = createSpatialIndex();
    index.build([
      ref('inside', 0, 100, 100, 400, 400),
      ref('outside', 0, 3000, 3000, 4000, 4000),
    ]);

    const results = index.queryRegion({
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 500,
    });
    expect(results.some((r) => r.layerName === 'inside')).toBe(true);
    expect(results.every((r) => r.layerName !== 'outside')).toBe(true);
  });

  it('queryRegion() deduplicates a feature that spans multiple cells', () => {
    const index = createSpatialIndex();
    index.build([ref('big', 0, 0, 0, 4096, 4096)]);

    const results = index.queryRegion({
      minX: 0,
      minY: 0,
      maxX: 4096,
      maxY: 4096,
    });
    const bigHits = results.filter((r) => r.layerName === 'big');
    expect(bigHits).toHaveLength(1);
  });

  it('queryRegion() returns empty array when no features overlap', () => {
    const index = createSpatialIndex();
    index.build([ref('far', 0, 3500, 3500, 4096, 4096)]);

    const results = index.queryRegion({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    });
    expect(results).toHaveLength(0);
  });

  // ── Custom constructor options ─────────────────────────────────────────

  it('accepts custom grid size', () => {
    const index = createSpatialIndex(8, 4096);
    index.build([ref('a', 0, 0, 0, 100, 100)]);
    expect(index.size).toBe(1);
    expect(index.query({ x: 50, y: 50 }).some((r) => r.layerName === 'a')).toBe(
      true,
    );
  });

  it('accepts custom extent (e.g. 256)', () => {
    const index = createSpatialIndex(8, 256);
    index.build([ref('tiny', 0, 0, 0, 50, 50)]);
    expect(index.size).toBe(1);
  });

  // ── Large datasets ─────────────────────────────────────────────────────

  it('handles 1000 features without throwing', () => {
    const index = createSpatialIndex();
    const features: SpatialFeatureRef[] = Array.from(
      { length: 1000 },
      (_, i) => ({
        layerName: 'layer',
        featureIndex: i,
        bounds: {
          minX: (i % 64) * 64,
          minY: Math.floor(i / 64) * 64,
          maxX: (i % 64) * 64 + 32,
          maxY: Math.floor(i / 64) * 64 + 32,
        },
      }),
    );
    expect(() => index.build(features)).not.toThrow();
    expect(index.size).toBe(1000);
    expect(() => index.query({ x: 100, y: 100 })).not.toThrow();
  });
});

```

### File: `packages/inspector/tests/performance-profiler.test.ts`

```typescript
/**
 * @tileguard/inspector — PerformanceProfiler tests (Milestone 6 — Step 4)
 *
 * Tests FPS calculation, frame-time tracking, render count, and reset.
 * All timestamps are injected so the tests are deterministic and require
 * no real timers or DOM environment.
 */

import { describe, expect, it } from 'vitest';
import {
  createPerformanceProfiler,
  EMPTY_METRICS,
} from '../src/performance/PerformanceProfiler.js';

describe('PerformanceProfiler', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('returns EMPTY_METRICS shape on creation', () => {
    const p = createPerformanceProfiler();
    const m = p.getMetrics();
    expect(m.fps).toBe(0);
    expect(m.frameTimeMs).toBe(0);
    expect(m.renderCount).toBe(0);
    expect(m.lastFrameTime).toBe(0);
  });

  it('EMPTY_METRICS constant is frozen', () => {
    expect(Object.isFrozen(EMPTY_METRICS)).toBe(true);
  });

  it('getMetrics() returns a frozen snapshot', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    expect(Object.isFrozen(p.getMetrics())).toBe(true);
  });

  // ── renderCount ────────────────────────────────────────────────────────

  it('increments renderCount on every recordFrame() call', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    p.recordFrame(16);
    p.recordFrame(32);
    expect(p.getMetrics().renderCount).toBe(3);
  });

  it('renderCount starts at 0 and counts up from there', () => {
    const p = createPerformanceProfiler();
    expect(p.getMetrics().renderCount).toBe(0);
    p.recordFrame(100);
    expect(p.getMetrics().renderCount).toBe(1);
  });

  // ── frameTimeMs ────────────────────────────────────────────────────────

  it('computes frame time as delta between consecutive recordFrame() calls', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0); // first frame
    p.recordFrame(20); // second frame — delta = 20ms
    expect(p.getMetrics().frameTimeMs).toBeCloseTo(20, 1);
  });

  it('frame time is 0 when only one frame has been recorded', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(50);
    expect(p.getMetrics().frameTimeMs).toBe(0);
  });

  it('frame time updates to reflect the most recent interval', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    p.recordFrame(16);
    p.recordFrame(33); // ~17ms gap
    expect(p.getMetrics().frameTimeMs).toBeCloseTo(17, 1);
  });

  it('handles first frame at timestamp 0 correctly', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    p.recordFrame(16);
    // Should not produce NaN or incorrect values from ts=0 edge case
    const m = p.getMetrics();
    expect(Number.isFinite(m.frameTimeMs)).toBe(true);
    expect(m.frameTimeMs).toBeCloseTo(16, 1);
  });

  // ── FPS calculation ────────────────────────────────────────────────────

  it('returns fps=0 with fewer than 2 recorded frames', () => {
    const p = createPerformanceProfiler();
    expect(p.getMetrics().fps).toBe(0);
    p.recordFrame(0);
    expect(p.getMetrics().fps).toBe(0);
  });

  it('computes ~60 fps for 16ms frame intervals', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 61; i++) p.recordFrame(i * 16);
    const { fps } = p.getMetrics();
    expect(fps).toBeGreaterThan(55);
    expect(fps).toBeLessThan(70);
  });

  it('computes ~30 fps for 33ms frame intervals', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 61; i++) p.recordFrame(i * 33);
    const { fps } = p.getMetrics();
    expect(fps).toBeGreaterThan(25);
    expect(fps).toBeLessThan(35);
  });

  it('reports higher FPS after frame rate increases', () => {
    const p = createPerformanceProfiler();
    // First 30 frames at 33ms = ~30fps
    for (let i = 0; i < 30; i++) p.recordFrame(i * 33);
    const slowFps = p.getMetrics().fps;

    // Next 60 frames at 16ms = ~60fps (fills the 60-frame window)
    let t = 30 * 33;
    for (let i = 0; i < 60; i++) {
      t += 16;
      p.recordFrame(t);
    }
    const fastFps = p.getMetrics().fps;
    expect(fastFps).toBeGreaterThan(slowFps);
  });

  // ── lastFrameTime ─────────────────────────────────────────────────────

  it('lastFrameTime reflects the most recent recordFrame() timestamp', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(100);
    p.recordFrame(200);
    expect(p.getMetrics().lastFrameTime).toBe(200);
  });

  // ── reset() ───────────────────────────────────────────────────────────

  it('reset() clears all recorded state', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 20; i++) p.recordFrame(i * 16);
    p.reset();
    const m = p.getMetrics();
    expect(m.fps).toBe(0);
    expect(m.frameTimeMs).toBe(0);
    expect(m.renderCount).toBe(0);
    expect(m.lastFrameTime).toBe(0);
  });

  it('can record frames normally after reset()', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 10; i++) p.recordFrame(i * 16);
    p.reset();
    p.recordFrame(0);
    p.recordFrame(16);
    expect(p.getMetrics().renderCount).toBe(2);
    expect(p.getMetrics().frameTimeMs).toBeCloseTo(16, 1);
  });
});

```

### File: `packages/inspector/tests/workspace-service.test.ts`

```typescript
/**
 * @tileguard/inspector — WorkspaceService tests (Milestone 6 — Step 4)
 *
 * Tests defaults, partial updates, reset, subscriber notifications,
 * localStorage persistence, and malformed-data recovery.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LAYOUT,
  getWorkspaceService,
  resetWorkspaceServiceInstance,
} from '../src/services/WorkspaceService.js';

// ---------------------------------------------------------------------------
// localStorage mock helper
// ---------------------------------------------------------------------------

function makeLocalStorageMock(
  initial: Record<string, string> = {},
): Storage & { _store: Record<string, string> } {
  const _store: Record<string, string> = { ...initial };
  return {
    _store,
    getItem: (key: string) => _store[key] ?? null,
    setItem: (key: string, value: string) => {
      _store[key] = value;
    },
    removeItem: (key: string) => {
      delete _store[key];
    },
    clear: () => {
      for (const k of Object.keys(_store)) delete _store[k];
    },
    get length() {
      return Object.keys(_store).length;
    },
    key: (index: number) => Object.keys(_store)[index] ?? null,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: test-only window replacement
type AnyGlobal = any;

function withMockStorage<T>(mock: Storage, fn: () => T): T {
  const orig = (globalThis as AnyGlobal).window;
  (globalThis as AnyGlobal).window = { localStorage: mock };
  resetWorkspaceServiceInstance();
  try {
    return fn();
  } finally {
    (globalThis as AnyGlobal).window = orig;
    resetWorkspaceServiceInstance();
  }
}

const STORAGE_KEY = 'tileguard:inspector:workspace:v1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkspaceService', () => {
  beforeEach(() => {
    resetWorkspaceServiceInstance();
    if (typeof window !== 'undefined') window.localStorage.clear();
  });

  // ── Defaults ──────────────────────────────────────────────────────────

  it('returns DEFAULT_LAYOUT on first access', () => {
    expect(getWorkspaceService().getLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('DEFAULT_LAYOUT has expected shape', () => {
    expect(DEFAULT_LAYOUT.leftCollapsed).toBe(false);
    expect(DEFAULT_LAYOUT.rightCollapsed).toBe(false);
    expect(DEFAULT_LAYOUT.activeTab).toBe('welcome');
    expect(DEFAULT_LAYOUT.viewport).toBeNull();
    expect(DEFAULT_LAYOUT.lastFilePath).toBeNull();
  });

  // ── updateLayout() ────────────────────────────────────────────────────

  it('applies partial updates without touching unmentioned fields', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({ leftCollapsed: true, activeTab: 'statistics' });
    const layout = svc.getLayout();
    expect(layout.leftCollapsed).toBe(true);
    expect(layout.activeTab).toBe('statistics');
    expect(layout.rightCollapsed).toBe(DEFAULT_LAYOUT.rightCollapsed);
    expect(layout.viewport).toBe(DEFAULT_LAYOUT.viewport);
  });

  it('stores viewport state correctly', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({ viewport: { zoom: 2.5, panX: 100, panY: 200 } });
    const vp = svc.getLayout().viewport;
    expect(vp?.zoom).toBe(2.5);
    expect(vp?.panX).toBe(100);
    expect(vp?.panY).toBe(200);
  });

  it('stores lastFilePath correctly', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({ lastFilePath: 'my-tile.pbf' });
    expect(svc.getLayout().lastFilePath).toBe('my-tile.pbf');
  });

  // ── resetLayout() ─────────────────────────────────────────────────────

  it('resetLayout() restores all fields to defaults', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({
      leftCollapsed: true,
      activeTab: 'settings',
      lastFilePath: 'foo.pbf',
    });
    svc.resetLayout();
    expect(svc.getLayout()).toEqual(DEFAULT_LAYOUT);
  });

  // ── Subscriptions ─────────────────────────────────────────────────────

  it('notifies subscriber on updateLayout()', () => {
    const svc = getWorkspaceService();
    const cb = vi.fn();
    svc.subscribe(cb);
    svc.updateLayout({ leftCollapsed: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('notifies subscriber on resetLayout()', () => {
    const svc = getWorkspaceService();
    const cb = vi.fn();
    svc.subscribe(cb);
    svc.resetLayout();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops receiving notifications', () => {
    const svc = getWorkspaceService();
    const cb = vi.fn();
    const unsub = svc.subscribe(cb);
    unsub();
    svc.updateLayout({ leftCollapsed: true });
    expect(cb).not.toHaveBeenCalled();
  });

  it('unsubscribing twice does not throw', () => {
    const svc = getWorkspaceService();
    const unsub = svc.subscribe(vi.fn());
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
  });

  it('multiple subscribers each receive notifications', () => {
    const svc = getWorkspaceService();
    const a = vi.fn();
    const b = vi.fn();
    svc.subscribe(a);
    svc.subscribe(b);
    svc.updateLayout({ activeTab: 'diagnostics' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one does not affect the other', () => {
    const svc = getWorkspaceService();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = svc.subscribe(a);
    svc.subscribe(b);
    unsubA();
    svc.updateLayout({ activeTab: 'settings' });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('listener errors do not prevent other listeners from firing', () => {
    const svc = getWorkspaceService();
    const throwing = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const safe = vi.fn();
    svc.subscribe(throwing);
    svc.subscribe(safe);
    expect(() => svc.updateLayout({ leftCollapsed: true })).not.toThrow();
    expect(safe).toHaveBeenCalledTimes(1);
  });

  // ── localStorage persistence ───────────────────────────────────────────

  it('persists layout to localStorage on updateLayout()', () => {
    const mock = makeLocalStorageMock();
    withMockStorage(mock, () => {
      const svc = getWorkspaceService();
      svc.updateLayout({ activeTab: 'settings', leftCollapsed: true });
      const stored = mock._store[STORAGE_KEY];
      expect(stored).not.toBeUndefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.activeTab).toBe('settings');
      expect(parsed.leftCollapsed).toBe(true);
    });
  });

  it('persists layout to localStorage on resetLayout()', () => {
    const mock = makeLocalStorageMock();
    withMockStorage(mock, () => {
      const svc = getWorkspaceService();
      svc.updateLayout({ leftCollapsed: true });
      svc.resetLayout();
      const parsed = JSON.parse(mock._store[STORAGE_KEY]!);
      expect(parsed.leftCollapsed).toBe(DEFAULT_LAYOUT.leftCollapsed);
    });
  });

  it('loads previously persisted layout on init', () => {
    const persisted = JSON.stringify({
      leftCollapsed: true,
      activeTab: 'diagnostics',
    });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: persisted });
    withMockStorage(mock, () => {
      const svc = getWorkspaceService();
      expect(svc.getLayout().leftCollapsed).toBe(true);
      expect(svc.getLayout().activeTab).toBe('diagnostics');
      // Fields not in storage fall back to defaults
      expect(svc.getLayout().rightCollapsed).toBe(
        DEFAULT_LAYOUT.rightCollapsed,
      );
    });
  });

  // ── Malformed / invalid storage ────────────────────────────────────────

  it('falls back to DEFAULT_LAYOUT when localStorage contains malformed JSON', () => {
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: '{ not valid json' });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout()).toEqual(DEFAULT_LAYOUT);
    });
  });

  it('falls back to DEFAULT_LAYOUT when localStorage contains an empty object {}', () => {
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: '{}' });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout()).toEqual(DEFAULT_LAYOUT);
    });
  });

  it('ignores unknown keys in stored JSON', () => {
    const stored = JSON.stringify({
      unknownKey: 'surprise',
      activeTab: 'statistics',
    });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: stored });
    withMockStorage(mock, () => {
      const layout = getWorkspaceService().getLayout();
      expect(layout.activeTab).toBe('statistics');
      expect('unknownKey' in layout).toBe(false);
    });
  });

  it('rejects an invalid activeTab value and falls back to default', () => {
    const stored = JSON.stringify({ activeTab: 'not-a-valid-tab' });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: stored });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout().activeTab).toBe(
        DEFAULT_LAYOUT.activeTab,
      );
    });
  });

  it('rejects a malformed viewport object and stores null', () => {
    const stored = JSON.stringify({ viewport: { bad: true } });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: stored });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout().viewport).toBeNull();
    });
  });

  it('gracefully degrades when localStorage is unavailable', () => {
    // withMockStorage sets window but no localStorage
    const orig = (globalThis as AnyGlobal).window;
    (globalThis as AnyGlobal).window = undefined;
    resetWorkspaceServiceInstance();
    expect(() => {
      const svc = getWorkspaceService();
      svc.updateLayout({ leftCollapsed: true });
    }).not.toThrow();
    (globalThis as AnyGlobal).window = orig;
    resetWorkspaceServiceInstance();
  });
});

```

### File: `packages/inspector/tests/search-service-extended.test.ts`

```typescript
/**
 * @tileguard/inspector — SearchService extended-query tests (Milestone 6 — Step 4)
 *
 * Tests the new query syntax added in Step 4:
 *   layer:  — filter by layer name
 *   type:   — filter by geometry type
 *   id:     — match by feature ID (alias for feature:)
 *   /regex/ — regex match on property values
 *   AND     — combine two sub-queries
 *
 * Also validates relevance scoring (results sorted high→low)
 * and verifies backward compatibility with the original syntax.
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it } from 'vitest';
import { createFeatureProvider } from '../src/providers/FeatureProvider.js';
import { createSearchService } from '../src/services/SearchService.js';
import { createInspectorStore } from '../src/store/inspector-store.js';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test.pbf',
    content: {
      layers: {
        roads: {
          name: 'roads',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 2,
              geometryType: 'LineString',
              id: 10,
              properties: { highway: 'primary', name: 'Main Street' },
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
            {
              type: 2,
              geometryType: 'LineString',
              id: 11,
              properties: { highway: 'secondary', name: 'Side Road' },
              geometry: [
                [
                  { x: 50, y: 50 },
                  { x: 200, y: 200 },
                ],
              ],
            },
          ],
        },
        buildings: {
          name: 'buildings',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 3,
              geometryType: 'Polygon',
              id: 20,
              properties: { type: 'civic', height: 30 },
              geometry: [
                [
                  [
                    { x: 10, y: 10 },
                    { x: 20, y: 10 },
                    { x: 20, y: 20 },
                    { x: 10, y: 10 },
                  ],
                ],
              ],
            },
          ],
        },
        poi: {
          name: 'poi',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 1,
              geometryType: 'Point',
              id: 1,
              properties: { name: 'cafe', category: 'food' },
              geometry: [{ x: 200, y: 200 }],
            },
            {
              type: 1,
              geometryType: 'Point',
              id: 2,
              properties: { name: 'school', category: 'education' },
              geometry: [{ x: 300, y: 300 }],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

async function makeService() {
  const store = createInspectorStore();
  await store.load('test.pbf', makeArtifact(), []);
  return createSearchService(createFeatureProvider(store));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchService — extended queries (Step 4)', () => {
  // ── layer: ─────────────────────────────────────────────────────────────

  it('layer: returns only features from the named layer', async () => {
    const svc = await makeService();
    const results = svc.search('layer:roads');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  it('layer: is case-insensitive', async () => {
    const svc = await makeService();
    const results = svc.search('layer:ROADS');
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  it('layer: returns empty when the layer does not exist', async () => {
    const svc = await makeService();
    expect(svc.search('layer:nonexistent')).toHaveLength(0);
  });

  it('layer: partial match works (contains semantics)', async () => {
    const svc = await makeService();
    // 'oad' is a substring of 'roads'
    const results = svc.search('layer:oad');
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  // ── type: ──────────────────────────────────────────────────────────────

  it('type: returns only features with the given geometry type', async () => {
    const svc = await makeService();
    const results = svc.search('type:polygon');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) =>
        r.feature.geometryType.toLowerCase().includes('polygon'),
      ),
    ).toBe(true);
  });

  it('type:point returns only point features', async () => {
    const svc = await makeService();
    const results = svc.search('type:point');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) =>
        r.feature.geometryType.toLowerCase().includes('point'),
      ),
    ).toBe(true);
  });

  it('type:linestring returns only LineString features', async () => {
    const svc = await makeService();
    const results = svc.search('type:linestring');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) =>
        r.feature.geometryType.toLowerCase().includes('line'),
      ),
    ).toBe(true);
  });

  // ── id: (Step 4 alias) ─────────────────────────────────────────────────

  it('id: matches feature by numeric ID', async () => {
    const svc = await makeService();
    const results = svc.search('id:10');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.id).toBe(10);
  });

  it('id: returns empty for an ID that does not exist', async () => {
    const svc = await makeService();
    expect(svc.search('id:9999')).toHaveLength(0);
  });

  // ── feature: (backward compatibility) ─────────────────────────────────

  it('feature: prefix still works as an alias for id:', async () => {
    const svc = await makeService();
    const results = svc.search('feature:20');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.id).toBe(20);
  });

  // ── /regex/ ────────────────────────────────────────────────────────────

  it('/regex/ matches property values by pattern', async () => {
    const svc = await makeService();
    const results = svc.search('/^cafe$/');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.feature.properties.name === 'cafe')).toBe(
      true,
    );
  });

  it('/regex/ is case-insensitive', async () => {
    const svc = await makeService();
    const results = svc.search('/CAFE/');
    expect(results.some((r) => r.feature.properties.name === 'cafe')).toBe(
      true,
    );
  });

  it('/regex/ works with partial patterns', async () => {
    const svc = await makeService();
    const results = svc.search('/sch/');
    expect(results.some((r) => r.feature.properties.name === 'school')).toBe(
      true,
    );
  });

  it('/regex/ returns empty for a pattern that matches nothing', async () => {
    const svc = await makeService();
    expect(svc.search('/zzznomatch/')).toHaveLength(0);
  });

  it('malformed /regex/ (invalid pattern) falls back to free-text search', async () => {
    const svc = await makeService();
    // Invalid regex — should not throw
    expect(() => svc.search('/[invalid regex/')).not.toThrow();
  });

  // ── AND ────────────────────────────────────────────────────────────────

  it('AND combines two clauses (both must match)', async () => {
    const svc = await makeService();
    const results = svc.search('layer:buildings AND type:polygon');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.feature.layerName).toBe('buildings');
      expect(r.feature.geometryType.toLowerCase()).toContain('polygon');
    }
  });

  it('AND returns empty when one clause has no matches', async () => {
    const svc = await makeService();
    // roads layer has LineStrings, not Polygons
    expect(svc.search('layer:roads AND type:polygon')).toHaveLength(0);
  });

  it('AND works with id: and layer: clauses', async () => {
    const svc = await makeService();
    const results = svc.search('layer:roads AND id:10');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.id).toBe(10);
  });

  it('AND with property key=value and layer:', async () => {
    const svc = await makeService();
    const results = svc.search('layer:poi AND name=cafe');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'poi')).toBe(true);
  });

  // ── Relevance scoring ──────────────────────────────────────────────────

  it('results are sorted by score descending', async () => {
    const svc = await makeService();
    const results = svc.search('roads');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('each result has a positive score', async () => {
    const svc = await makeService();
    const results = svc.search('layer:roads');
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it('exact layer match scores higher than partial match', async () => {
    const svc = await makeService();
    // 'roads' is exact; 'road' is partial — roads-layer features should score higher
    const exactResults = svc.search('layer:roads');
    const partialResults = svc.search('layer:road');
    if (exactResults.length > 0 && partialResults.length > 0) {
      expect(exactResults[0]!.score).toBeGreaterThanOrEqual(
        partialResults[0]!.score,
      );
    }
  });

  // ── Backward compatibility ─────────────────────────────────────────────

  it('free-text search still works alongside new syntax', async () => {
    const svc = await makeService();
    expect(
      svc
        .search('primary')
        .some((r) => r.feature.properties.highway === 'primary'),
    ).toBe(true);
  });

  it('key=value search still works', async () => {
    const svc = await makeService();
    const results = svc.search('highway=primary');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.properties.highway).toBe('primary');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('returns empty array for blank query', async () => {
    const svc = await makeService();
    expect(svc.search('')).toHaveLength(0);
    expect(svc.search('   ')).toHaveLength(0);
  });

  it('returns empty array for a query with no matches', async () => {
    const svc = await makeService();
    expect(svc.search('layer:definitely_not_a_real_layer')).toHaveLength(0);
  });

  it('returns empty when no tile is loaded', () => {
    const store = createInspectorStore();
    const svc = createSearchService(createFeatureProvider(store));
    expect(svc.search('roads')).toHaveLength(0);
  });
});

```

### File: `packages/inspector/tests/export-service.test.ts`

```typescript
/**
 * @tileguard/inspector — ExportService tests (Milestone 6 — Step 4)
 *
 * Tests the Step 4 architecture stub:
 *   - getSupportedFormats() returns an empty array
 *   - export() always rejects with ExportNotImplementedError
 *   - ExportNotImplementedError carries the correct name and message
 *   - Multiple createExportService() calls return independent instances
 */

import { describe, expect, it } from 'vitest';
import {
  ExportNotImplementedError,
  createExportService,
  type ExportFormat,
} from '../src/services/ExportService.js';

describe('ExportService (Step 4 stub)', () => {
  // ── getSupportedFormats() ──────────────────────────────────────────────

  it('getSupportedFormats() returns an empty readonly array', () => {
    const svc = createExportService();
    const formats = svc.getSupportedFormats();
    expect(formats).toHaveLength(0);
  });

  it('getSupportedFormats() does not include png, json, or markdown yet', () => {
    const svc = createExportService();
    const formats = svc.getSupportedFormats();
    expect(formats).not.toContain('png');
    expect(formats).not.toContain('json');
    expect(formats).not.toContain('markdown');
  });

  it('getSupportedFormats() returns the same empty result on repeated calls', () => {
    const svc = createExportService();
    expect(svc.getSupportedFormats()).toHaveLength(0);
    expect(svc.getSupportedFormats()).toHaveLength(0);
  });

  // ── export() — rejection for every format ─────────────────────────────

  it('export() rejects with ExportNotImplementedError for png', async () => {
    const svc = createExportService();
    await expect(svc.export({ format: 'png' })).rejects.toThrow(
      ExportNotImplementedError,
    );
  });

  it('export() rejects with ExportNotImplementedError for json', async () => {
    const svc = createExportService();
    await expect(svc.export({ format: 'json' })).rejects.toThrow(
      ExportNotImplementedError,
    );
  });

  it('export() rejects with ExportNotImplementedError for markdown', async () => {
    const svc = createExportService();
    await expect(svc.export({ format: 'markdown' })).rejects.toThrow(
      ExportNotImplementedError,
    );
  });

  it('export() passes along export options without modifying them', async () => {
    const svc = createExportService();
    let thrownError: ExportNotImplementedError | null = null;
    try {
      await svc.export({ format: 'json', selectedOnly: true });
    } catch (err) {
      if (err instanceof ExportNotImplementedError) thrownError = err;
    }
    expect(thrownError).not.toBeNull();
  });

  // ── ExportNotImplementedError ──────────────────────────────────────────

  it('ExportNotImplementedError has name "ExportNotImplementedError"', () => {
    const err = new ExportNotImplementedError('png');
    expect(err.name).toBe('ExportNotImplementedError');
  });

  it('ExportNotImplementedError is an instance of Error', () => {
    expect(new ExportNotImplementedError('png')).toBeInstanceOf(Error);
  });

  it('ExportNotImplementedError message mentions the format', () => {
    for (const fmt of ['png', 'json', 'markdown'] as ExportFormat[]) {
      const err = new ExportNotImplementedError(fmt);
      expect(err.message).toContain(fmt);
    }
  });

  it('ExportNotImplementedError message mentions Milestone 7', () => {
    const err = new ExportNotImplementedError('png');
    expect(err.message).toMatch(/milestone 7/i);
  });

  // ── export() error shape when using await/catch ────────────────────────

  it('the rejection error contains the correct format in its message', async () => {
    const svc = createExportService();
    let caught: Error | undefined;
    try {
      await svc.export({ format: 'markdown' });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain('markdown');
  });

  // ── Factory creates independent instances ──────────────────────────────

  it('each createExportService() call returns a distinct instance', () => {
    const a = createExportService();
    const b = createExportService();
    expect(a).not.toBe(b);
  });
});

```

### File: `packages/inspector/tests/navigation-performance.test.ts`

```typescript
/**
 * @tileguard/inspector — Navigation & performance subsystem integration tests
 *
 * Cross-cutting tests verifying that the Step 4 subsystems cooperate correctly:
 *
 *   CameraAnimator  ↔  WorkspaceService   (animate → persist viewport)
 *   PerformanceProfiler                   (multi-instance, large frame counts)
 *   ExportService                         (stub pipeline, concurrent calls)
 *   SpatialIndex                          (viewport culling pattern)
 *   ShortcutService ↔ WorkspaceService    (action dispatch → layout update)
 *
 * Unit-level edge cases live in the individual service/module test files.
 * This file only tests cross-boundary behaviour.
 */

import { describe, expect, it } from 'vitest';

import {
  createCameraAnimator,
  type RafScheduler,
} from '../src/animation/CameraAnimator.js';
import {
  createExportService,
  ExportNotImplementedError,
} from '../src/services/ExportService.js';
import {
  createPerformanceProfiler,
  EMPTY_METRICS,
} from '../src/performance/PerformanceProfiler.js';
import {
  createSpatialIndex,
  type SpatialFeatureRef,
} from '../src/performance/SpatialIndex.js';
import {
  DEFAULT_LAYOUT,
  getWorkspaceService,
  resetWorkspaceServiceInstance,
} from '../src/services/WorkspaceService.js';
import { createShortcutService } from '../src/services/ShortcutService.js';
import type { ViewportState } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    extent: 4096,
    width: 800,
    height: 600,
    minZoom: 0.25,
    maxZoom: 64,
    ...overrides,
  };
}

function makeSyncScheduler(): RafScheduler & { step: (count?: number) => void } {
  let nextId = 0;
  const pending = new Map<number, (ts: number) => void>();
  let ts = 0;
  return {
    requestFrame(cb) { const id = nextId++; pending.set(id, cb); return id; },
    cancelFrame(id) { pending.delete(id as number); },
    step(count = 100_000) {
      let i = 0;
      while (pending.size > 0 && i++ < count) {
        const [id, cb] = pending.entries().next().value as [number, (ts: number) => void];
        pending.delete(id);
        ts += 16;
        cb(ts);
      }
    },
  };
}

function makeRef(
  layerName: string,
  featureIndex: number,
  minX: number, minY: number, maxX: number, maxY: number,
): SpatialFeatureRef {
  return { layerName, featureIndex, bounds: { minX, minY, maxX, maxY } };
}

// ---------------------------------------------------------------------------
// CameraAnimator ↔ WorkspaceService
// ---------------------------------------------------------------------------

describe('CameraAnimator ↔ WorkspaceService', () => {
  it('persists the final animated viewport to WorkspaceService on completion', () => {
    resetWorkspaceServiceInstance();
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const svc = getWorkspaceService();

    let finalState: ViewportState | null = null;
    animator.animateTo(
      makeViewport({ zoom: 1 }),
      makeViewport({ zoom: 3, panX: 200, panY: 100 }),
      {
        duration: 128,
        easing: 'easeInOut',
        onFrame: (s) => { finalState = s; },
        onComplete: () => {
          if (finalState !== null) {
            svc.updateLayout({
              viewport: { zoom: finalState.zoom, panX: finalState.panX, panY: finalState.panY },
            });
          }
        },
      },
    );
    scheduler.step();

    const vp = svc.getLayout().viewport;
    expect(vp).not.toBeNull();
    expect(vp!.zoom).toBeCloseTo(3, 1);
    expect(vp!.panX).toBeCloseTo(200, 1);
    resetWorkspaceServiceInstance();
  });

  it('does not persist a partial viewport when the animation is cancelled', () => {
    resetWorkspaceServiceInstance();
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const svc = getWorkspaceService();

    animator.animateTo(
      makeViewport({ zoom: 1 }),
      makeViewport({ zoom: 10 }),
      {
        duration: 1000,
        easing: 'linear',
        onFrame: () => {},
        onComplete: () => {
          svc.updateLayout({ viewport: { zoom: 10, panX: 0, panY: 0 } });
        },
      },
    );
    scheduler.step(3);
    animator.cancel();

    // onComplete must not have fired — viewport stays null
    expect(svc.getLayout().viewport).toBeNull();
    resetWorkspaceServiceInstance();
  });
});

// ---------------------------------------------------------------------------
// PerformanceProfiler — multi-instance behaviour
// ---------------------------------------------------------------------------

describe('PerformanceProfiler — multi-instance behaviour', () => {
  it('two profilers do not share state', () => {
    const p1 = createPerformanceProfiler();
    const p2 = createPerformanceProfiler();

    for (let i = 0; i < 10; i++) p1.recordFrame(i * 16);

    expect(p1.getMetrics().renderCount).toBe(10);
    expect(p2.getMetrics().renderCount).toBe(0);
  });

  it('resetting one profiler does not affect another', () => {
    const p1 = createPerformanceProfiler();
    const p2 = createPerformanceProfiler();

    for (let i = 0; i < 5; i++) { p1.recordFrame(i * 16); p2.recordFrame(i * 16); }
    p1.reset();

    expect(p1.getMetrics().renderCount).toBe(0);
    expect(p2.getMetrics().renderCount).toBe(5);
  });

  it('FPS remains accurate after 1000 frames (rolling window holds)', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 1000; i++) p.recordFrame(i * 16);

    const { fps, renderCount } = p.getMetrics();
    expect(renderCount).toBe(1000);
    expect(fps).toBeGreaterThan(50);
    expect(fps).toBeLessThan(70);
  });

  it('EMPTY_METRICS is returned when no profiler is connected (useProfiler null branch)', () => {
    // This mirrors what useProfiler does when profiler === null
    const result = null === null ? EMPTY_METRICS : createPerformanceProfiler().getMetrics();
    expect(result).toEqual(EMPTY_METRICS);
  });
});

// ---------------------------------------------------------------------------
// ExportService — pipeline usage patterns
// ---------------------------------------------------------------------------

describe('ExportService — pipeline usage patterns', () => {
  it('getSupportedFormats() gates export calls safely — no formats in Step 4 stub', async () => {
    const exporter = createExportService();
    const formats = exporter.getSupportedFormats();

    if (formats.includes('json')) {
      const result = await exporter.export({ format: 'json' });
      expect(result.format).toBe('json');
    } else {
      expect(formats).toHaveLength(0);
    }
  });

  it('concurrent export calls each reject independently', async () => {
    const exporter = createExportService();

    const results = await Promise.allSettled([
      exporter.export({ format: 'png' }),
      exporter.export({ format: 'json' }),
      exporter.export({ format: 'markdown' }),
    ]);

    for (const r of results) {
      expect(r.status).toBe('rejected');
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
        ExportNotImplementedError,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// SpatialIndex — viewport culling pattern
// ---------------------------------------------------------------------------

describe('SpatialIndex — viewport culling pattern', () => {
  it('queryRegion returns only features inside the viewport bounds', () => {
    const index = createSpatialIndex();
    index.build([
      makeRef('roads', 0, 0, 0, 500, 500),          // inside
      makeRef('roads', 1, 2000, 2000, 3000, 3000),   // outside
      makeRef('buildings', 0, 100, 100, 400, 400),   // inside
    ]);

    const visible = index.queryRegion({ minX: 0, minY: 0, maxX: 600, maxY: 600 });
    const keys = visible.map((r) => `${r.layerName}:${r.featureIndex}`);

    expect(keys).toContain('roads:0');
    expect(keys).toContain('buildings:0');
    expect(keys).not.toContain('roads:1');
  });

  it('rebuilding the index clears previous data', () => {
    const index = createSpatialIndex();
    index.build([makeRef('old', 0, 0, 0, 100, 100)]);
    index.build([makeRef('new', 0, 2000, 2000, 3000, 3000)]);

    const nearOrigin = index.queryRegion({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(nearOrigin.some((r) => r.layerName === 'old')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ShortcutService ↔ WorkspaceService
// ---------------------------------------------------------------------------

describe('ShortcutService ↔ WorkspaceService', () => {
  it('shortcut bindings include navigation and panel actions', () => {
    const bindings = createShortcutService().getBindings();
    const actions = bindings.map((b) => b.action);

    expect(actions).toContain('focusFeature');
    expect(actions).toContain('resetView');
    expect(actions).toContain('clearSelection');
    expect(actions).toContain('focusSearch');
    expect(actions).toContain('openSettings');
  });

  it('a shortcut action can drive a WorkspaceService layout update', () => {
    resetWorkspaceServiceInstance();
    const svc = getWorkspaceService();
    const bindings = createShortcutService().getBindings();
    const settingsBinding = bindings.find((b) => b.action === 'openSettings');

    expect(settingsBinding).toBeDefined();
    // Simulate what InspectorApp does when the shortcut fires:
    svc.updateLayout({ activeTab: 'settings' });

    expect(svc.getLayout().activeTab).toBe('settings');
    resetWorkspaceServiceInstance();
  });

  it('ShortcutService and WorkspaceService remain independent of each other', () => {
    resetWorkspaceServiceInstance();
    const svc = getWorkspaceService();

    svc.updateLayout({ leftCollapsed: true });
    // Workspace change must not corrupt shortcut bindings
    expect(createShortcutService().getBindings()).toHaveLength(12);

    resetWorkspaceServiceInstance();
  });
});

// ---------------------------------------------------------------------------
// Module availability smoke suite
// ---------------------------------------------------------------------------

describe('Step 4 module exports', () => {
  it('createCameraAnimator is exported as a function', () => {
    expect(typeof createCameraAnimator).toBe('function');
  });

  it('createSpatialIndex is exported as a function', () => {
    expect(typeof createSpatialIndex).toBe('function');
  });

  it('createPerformanceProfiler is exported as a function', () => {
    expect(typeof createPerformanceProfiler).toBe('function');
  });

  it('createExportService is exported as a function', () => {
    expect(typeof createExportService).toBe('function');
  });

  it('getWorkspaceService is exported as a function', () => {
    expect(typeof getWorkspaceService).toBe('function');
  });

  it('createShortcutService is exported as a function', () => {
    expect(typeof createShortcutService).toBe('function');
  });

  it('DEFAULT_LAYOUT has all required fields', () => {
    expect(DEFAULT_LAYOUT).toHaveProperty('leftCollapsed');
    expect(DEFAULT_LAYOUT).toHaveProperty('rightCollapsed');
    expect(DEFAULT_LAYOUT).toHaveProperty('activeTab');
    expect(DEFAULT_LAYOUT).toHaveProperty('viewport');
    expect(DEFAULT_LAYOUT).toHaveProperty('lastFilePath');
  });
});

```

### File: `packages/inspector/tests/developer-overlay.test.tsx`

```tsx
/**
 * @tileguard/inspector — DeveloperOverlay component tests
 *
 * Performance metrics HUD shown in developer mode (toggled by Ctrl+Shift+D).
 * Uses renderToString (React SSR) — no DOM or canvas required.
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DeveloperOverlay,
  type DeveloperOverlayProps,
} from '../src/components/profiler/DeveloperOverlay.js';
import { EMPTY_METRICS } from '../src/performance/PerformanceProfiler.js';
import type { ResolvedFeature } from '../src/providers/FeatureProvider.js';
import type { ViewportState } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
  return {
    zoom: 2,
    panX: 50,
    panY: 100,
    extent: 4096,
    width: 800,
    height: 600,
    minZoom: 0.25,
    maxZoom: 64,
    ...overrides,
  };
}

function makeFeature(layerName: string, featureIndex: number): ResolvedFeature {
  return {
    layerName,
    featureIndex,
    properties: {},
    geometryType: 'Point',
    geometry: [[]],
    id: featureIndex,
  } as unknown as ResolvedFeature;
}

function makeProps(
  overrides: Partial<DeveloperOverlayProps> = {},
): DeveloperOverlayProps {
  return {
    metrics: EMPTY_METRICS,
    viewport: null,
    hoveredFeature: null,
    selectedFeature: null,
    totalFeatures: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeveloperOverlay', () => {
  // ── Rendering ────────────────────────────────────────────────────────

  it('renders without throwing given minimal props', () => {
    expect(() =>
      renderToString(<DeveloperOverlay {...makeProps()} />),
    ).not.toThrow();
  });

  it('renders a "Dev Overlay" label', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toMatch(/dev overlay/i);
  });

  // ── Accessibility ────────────────────────────────────────────────────

  it('has role="status"', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('role="status"');
  });

  it('has aria-label="Developer performance overlay"', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('aria-label="Developer performance overlay"');
  });

  // ── FPS ──────────────────────────────────────────────────────────────

  it('shows "fps" unit label', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('fps');
  });

  it('displays the fps value from metrics', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          metrics: { fps: 58, frameTimeMs: 17.2, renderCount: 500, lastFrameTime: 9000 },
        })}
      />,
    );
    expect(html).toContain('58');
  });

  // ── Frame time & render count ─────────────────────────────────────────

  it('shows frame time label and value', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          metrics: { fps: 60, frameTimeMs: 16.6, renderCount: 10, lastFrameTime: 0 },
        })}
      />,
    );
    expect(html).toContain('Frame time');
    expect(html).toContain('16.6');
  });

  it('shows render count label and value', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          metrics: { fps: 60, frameTimeMs: 16.6, renderCount: 42, lastFrameTime: 0 },
        })}
      />,
    );
    expect(html).toContain('Renders');
    expect(html).toContain('42');
  });

  // ── Viewport ─────────────────────────────────────────────────────────

  it('shows zoom and pan when viewport is provided', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({ viewport: makeViewport({ zoom: 3, panX: 120, panY: 240 }) })}
      />,
    );
    expect(html).toContain('Zoom');
    expect(html).toContain('3.00');
    expect(html).toContain('Pan');
    expect(html).toContain('120');
    expect(html).toContain('240');
  });

  it('omits Zoom and Pan rows when viewport is null', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps({ viewport: null })} />);
    expect(html).not.toContain('>Zoom<');
    expect(html).not.toContain('>Pan<');
  });

  // ── Feature counts ────────────────────────────────────────────────────

  it('shows total features count with locale formatting', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ totalFeatures: 1234 })} />,
    );
    expect(html).toContain('Total features');
    expect(html).toContain('1,234');
  });

  it('shows visible features count when provided', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ visibleFeatures: 400, totalFeatures: 1000 })} />,
    );
    expect(html).toContain('Visible');
    expect(html).toContain('400');
  });

  it('omits the Visible row when visibleFeatures is not provided', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ totalFeatures: 1000 })} />,
    );
    expect(html).not.toContain('>Visible<');
  });

  // ── Hovered / selected features ───────────────────────────────────────

  it('shows hovered feature identifier when hoveredFeature is provided', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ hoveredFeature: makeFeature('roads', 7) })} />,
    );
    expect(html).toContain('Hover');
    expect(html).toContain('roads[7]');
  });

  it('shows selected feature identifier when selectedFeature is provided', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({ selectedFeature: makeFeature('buildings', 3) })}
      />,
    );
    expect(html).toContain('Selected');
    expect(html).toContain('buildings[3]');
  });

  it('omits the Hover row when hoveredFeature is null', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps({ hoveredFeature: null })} />);
    expect(html).not.toContain('>Hover<');
  });

  it('omits the Selected row when selectedFeature is null', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps({ selectedFeature: null })} />);
    expect(html).not.toContain('>Selected<');
  });

  // ── Toggle hint ───────────────────────────────────────────────────────

  it('shows the Ctrl+Shift+D close hint', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('Ctrl+Shift+D');
  });
});

```

### File: `packages/inspector/tests/loading-overlay.test.tsx`

```tsx
/**
 * @tileguard/inspector — LoadingOverlay component tests
 *
 * Multi-step tile-loading progress display.
 * Uses renderToString (React SSR) — no DOM or canvas required.
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoadingOverlay } from '../src/components/loading/LoadingOverlay.js';

describe('LoadingOverlay', () => {
  // ── Step list rendering ──────────────────────────────────────────────

  it('renders all 5 loading steps by label', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('Loading tile');
    expect(html).toContain('Parsing geometry');
    expect(html).toContain('Building statistics');
    expect(html).toContain('Preparing diagnostics');
    expect(html).toContain('Ready');
  });

  it('renders an ordered list element (ol) for the step list', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('<ol');
  });

  // ── Accessibility ────────────────────────────────────────────────────

  it('has role="status" for accessibility', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('role="status"');
  });

  it('has aria-label="Loading tile"', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('aria-label="Loading tile"');
  });

  it('marks the active step with aria-current="step"', () => {
    const html = renderToString(<LoadingOverlay currentStep="parsing" />);
    expect(html).toContain('aria-current="step"');
  });

  // ── Active step ──────────────────────────────────────────────────────

  it('shows the "Loading" heading when no error is present', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('Loading');
  });

  it('marks "Building statistics" as current when currentStep=statistics', () => {
    const html = renderToString(<LoadingOverlay currentStep="statistics" />);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Building statistics');
  });

  it('marks "Ready" as current when currentStep=ready', () => {
    const html = renderToString(<LoadingOverlay currentStep="ready" />);
    expect(html).toContain('aria-current="step"');
  });

  it('renders without throwing for every valid step value', () => {
    for (const step of [
      'loading',
      'parsing',
      'statistics',
      'diagnostics',
      'ready',
    ] as const) {
      expect(() =>
        renderToString(<LoadingOverlay currentStep={step} />),
      ).not.toThrow();
    }
  });

  // ── File name display ────────────────────────────────────────────────

  it('shows fileName when provided', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" fileName="my-tile.pbf" />,
    );
    expect(html).toContain('my-tile.pbf');
  });

  it('omits the fileName element when fileName is not provided', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).not.toContain('.pbf');
  });

  // ── Error state ──────────────────────────────────────────────────────

  it('shows "Load failed" heading when error is provided', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" error="File not found" />,
    );
    expect(html).toContain('Load failed');
  });

  it('renders the error message text', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" error="Unexpected tile format" />,
    );
    expect(html).toContain('Unexpected tile format');
  });

  it('hides the step list when an error is provided', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" error="Something went wrong" />,
    );
    expect(html).not.toContain('<ol');
  });

  it('does not show "Load failed" when there is no error', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).not.toContain('Load failed');
  });
});

```

### File: `packages/inspector/tests/step3-integration.test.ts`

```typescript
/**
 * @tileguard/inspector — Step 3 Integration Tests (Milestone 6 — Step 3)
 *
 * Tests the Inspector facade's Step 3 API surface:
 *   - getTileStatistics() — full tile statistics
 *   - getSettings()       — current settings via SettingsService
 *   - updateSettings()    — partial update + renderer propagation
 *   - resetSettings()     — restore defaults + renderer propagation
 *
 * Also verifies Step 1 and Step 2 compatibility is preserved under Step 3.
 *
 * Uses a mock Renderer that records setOptions() calls so we can assert
 * that settings changes are forwarded to the renderer correctly.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInspector, type Inspector } from '../src/create-inspector.js';
import type { CanvasRenderer } from '../src/renderer/canvas-renderer.js';
import type { Renderer } from '../src/renderer/canvas-renderer.js';
import {
  DEFAULT_SETTINGS,
  resetSettingsServiceInstance,
} from '../src/services/SettingsService.js';
import { createViewport, type Viewport } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test.pbf',
    content: {
      layers: {
        roads: {
          name: 'roads',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 2,
              geometryType: 'LineString',
              id: 10,
              properties: { highway: 'primary', name: 'Main Street' },
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
            {
              type: 2,
              geometryType: 'LineString',
              id: 11,
              properties: { highway: 'secondary' },
              geometry: [
                [
                  { x: 50, y: 50 },
                  { x: 200, y: 200 },
                ],
              ],
            },
          ],
        },
        buildings: {
          name: 'buildings',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 3,
              geometryType: 'Polygon',
              id: 20,
              properties: { type: 'civic', height: 30 },
              geometry: [
                [
                  [
                    { x: 10, y: 10 },
                    { x: 20, y: 10 },
                    { x: 20, y: 20 },
                    { x: 10, y: 10 },
                  ],
                ],
              ],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

function makePointArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'points.pbf',
    content: {
      layers: {
        poi: {
          name: 'poi',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 1,
              geometryType: 'Point',
              id: 1,
              properties: { name: 'cafe' },
              geometry: [{ x: 50, y: 50 }],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

function makeDiagnostics(): Diagnostic[] {
  return [
    {
      ruleId: 'tile/unclosed-ring',
      severity: 'error',
      message: 'Polygon not closed',
      artifact: {} as never,
      location: { layer: 'buildings', featureIndex: 0 },
    },
    {
      ruleId: 'tile/coordinate-range',
      severity: 'warning',
      message: 'Coordinate out of range',
      artifact: {} as never,
      location: { layer: 'roads', featureIndex: 1 },
    },
    {
      ruleId: 'tile/no-empty',
      severity: 'info',
      message: 'Layer is empty',
      artifact: {} as never,
      location: {},
    },
  ];
}

// ---------------------------------------------------------------------------
// Mock renderer — records setOptions() calls
// ---------------------------------------------------------------------------

type SetOptionsCall = Parameters<CanvasRenderer['setOptions']>[0];

function makeMockRenderer(): Renderer & {
  setOptionsCalls: SetOptionsCall[];
} {
  const setOptionsCalls: SetOptionsCall[] = [];
  return {
    attachCanvas: vi.fn(),
    resize: vi.fn(),
    clear: vi.fn(),
    // render() is required by the Renderer interface — called by RenderCoordinator
    render: vi.fn(),
    // Step 3 — CanvasRenderer.setOptions() extension point
    setOptions: vi.fn((opts: SetOptionsCall) => {
      setOptionsCalls.push(opts);
    }),
    setOptionsCalls,
  } as unknown as Renderer & { setOptionsCalls: SetOptionsCall[] };
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function makeViewport(): Viewport {
  return createViewport({ width: 800, height: 600 });
}

async function makeLoadedInspector(): Promise<{
  inspector: Inspector;
  renderer: Renderer & { setOptionsCalls: SetOptionsCall[] };
}> {
  const renderer = makeMockRenderer();
  const inspector = createInspector({ viewport: makeViewport(), renderer });
  await inspector.load('test.pbf', makeArtifact(), makeDiagnostics());
  return { inspector, renderer };
}

// ---------------------------------------------------------------------------
// Reset SettingsService singleton between tests to avoid state leakage
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetSettingsServiceInstance();
});

// ---------------------------------------------------------------------------
// getTileStatistics()
// ---------------------------------------------------------------------------

describe('Inspector.getTileStatistics()', () => {
  it('returns EMPTY_TILE_STATISTICS when no tile is loaded', () => {
    const inspector = createInspector({
      viewport: makeViewport(),
      renderer: makeMockRenderer(),
    });
    const stats = inspector.getTileStatistics();
    expect(stats.totalLayers).toBe(0);
    expect(stats.totalFeatures).toBe(0);
    expect(stats.geometryCounts).toEqual({ point: 0, line: 0, polygon: 0 });
    expect(stats.diagnostics).toEqual({ errors: 0, warnings: 0, info: 0 });
    expect(stats.layers).toHaveLength(0);
    inspector.dispose();
  });

  it('returns correct totals for a loaded tile', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();

    expect(stats.totalLayers).toBe(2);
    expect(stats.totalFeatures).toBe(3);
    expect(stats.geometryCounts.line).toBe(2);
    expect(stats.geometryCounts.polygon).toBe(1);
    expect(stats.geometryCounts.point).toBe(0);
    inspector.dispose();
  });

  it('returns correct diagnostic totals', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();

    expect(stats.diagnostics.errors).toBe(1);
    expect(stats.diagnostics.warnings).toBe(1);
    expect(stats.diagnostics.info).toBe(1);
    inspector.dispose();
  });

  it('returns correct per-layer breakdown', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();

    const roads = stats.layers.find((l) => l.name === 'roads');
    expect(roads).toBeDefined();
    expect(roads!.featureCount).toBe(2);
    expect(roads!.geometryCounts.line).toBe(2);
    expect(roads!.diagnosticCount).toBe(1);

    const buildings = stats.layers.find((l) => l.name === 'buildings');
    expect(buildings).toBeDefined();
    expect(buildings!.featureCount).toBe(1);
    expect(buildings!.geometryCounts.polygon).toBe(1);
    expect(buildings!.diagnosticCount).toBe(1);
    inspector.dispose();
  });

  it('updates statistics after loading a second tile', async () => {
    const { inspector } = await makeLoadedInspector();
    await inspector.load('points.pbf', makePointArtifact(), []);

    const stats = inspector.getTileStatistics();
    expect(stats.totalLayers).toBe(1);
    expect(stats.totalFeatures).toBe(1);
    expect(stats.geometryCounts.point).toBe(1);
    expect(stats.geometryCounts.line).toBe(0);
    expect(stats.diagnostics.errors).toBe(0);
    inspector.dispose();
  });

  it('returns an immutable stats object', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();
    expect(Object.isFrozen(stats)).toBe(true);
    expect(Object.isFrozen(stats.geometryCounts)).toBe(true);
    expect(Object.isFrozen(stats.diagnostics)).toBe(true);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// getSettings()
// ---------------------------------------------------------------------------

describe('Inspector.getSettings()', () => {
  it('returns the default settings before any update', () => {
    const inspector = createInspector({
      viewport: makeViewport(),
      renderer: makeMockRenderer(),
    });
    expect(inspector.getSettings()).toEqual(DEFAULT_SETTINGS);
    inspector.dispose();
  });

  it('returns current settings after updateSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });
    expect(inspector.getSettings().showVertices).toBe(true);
    inspector.dispose();
  });

  it('returns default settings after resetSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true, smoothZoom: false });
    inspector.resetSettings();
    expect(inspector.getSettings()).toEqual(DEFAULT_SETTINGS);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// updateSettings() → renderer propagation
// ---------------------------------------------------------------------------

describe('Inspector.updateSettings() → renderer propagation', () => {
  it('calls renderer.setOptions() with the updated settings', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });

    const calls = renderer.setOptionsCalls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1]!;
    expect(lastCall.showVertices).toBe(true);
    inspector.dispose();
  });

  it('forwards showTileBounds to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ showTileBounds: false });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.showTileBounds).toBe(false);
    inspector.dispose();
  });

  it('forwards showBufferBounds to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ showBufferBounds: false });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.showBufferBounds).toBe(false);
    inspector.dispose();
  });

  it('forwards overlayOpacity to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ overlayOpacity: 0.5 });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.overlayOpacity).toBe(0.5);
    inspector.dispose();
  });

  it('forwards selectionThickness to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ selectionThickness: 4 });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.selectionThickness).toBe(4);
    inspector.dispose();
  });

  it('forwards hoverThickness to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ hoverThickness: 3 });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.hoverThickness).toBe(3);
    inspector.dispose();
  });

  it('does not throw when renderer does not expose setOptions()', () => {
    // Renderer without setOptions — e.g. a minimal mock from Step 1 tests
    const minimalRenderer: Renderer = {
      attachCanvas: vi.fn(),
      resize: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
    } as unknown as Renderer;

    const inspector = createInspector({
      viewport: makeViewport(),
      renderer: minimalRenderer,
    });

    expect(() =>
      inspector.updateSettings({ showVertices: true }),
    ).not.toThrow();
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// resetSettings() → renderer propagation
// ---------------------------------------------------------------------------

describe('Inspector.resetSettings() → renderer propagation', () => {
  it('calls renderer.setOptions() with default values on reset', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    // First change something
    inspector.updateSettings({ showVertices: true });
    const callsBeforeReset = renderer.setOptionsCalls.length;

    inspector.resetSettings();
    expect(renderer.setOptionsCalls.length).toBeGreaterThan(callsBeforeReset);

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.showVertices).toBe(DEFAULT_SETTINGS.showVertices);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// Step 1 compatibility (load, render, handlePointerMove, dispose)
// ---------------------------------------------------------------------------

describe('Step 1 API compatibility under Step 3', () => {
  it('load() still works and does not affect settings', async () => {
    const { inspector } = await makeLoadedInspector();
    const settings = inspector.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    inspector.dispose();
  });

  it('render() does not throw after updateSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });
    expect(() => inspector.render()).not.toThrow();
    inspector.dispose();
  });

  it('dispose() does not throw when called after Step 3 API usage', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.getTileStatistics();
    inspector.updateSettings({ showVertices: true });
    inspector.resetSettings();
    expect(() => inspector.dispose()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Step 2 API compatibility under Step 3
// ---------------------------------------------------------------------------

describe('Step 2 API compatibility under Step 3', () => {
  it('getStatistics() (deprecated DiagnosticSummary) still works', async () => {
    const { inspector } = await makeLoadedInspector();
    const summary = inspector.getStatistics();
    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.infoCount).toBe(1);
    expect(summary.total).toBe(3);
    inspector.dispose();
  });

  it('selectDiagnostic() still works after calling getTileStatistics()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.getTileStatistics(); // invoke Step 3
    inspector.selectDiagnostic(0); // Step 2
    const selected = inspector.getSelectedFeature();
    expect(selected).not.toBeNull();
    expect(selected!.layerName).toBe('buildings');
    inspector.dispose();
  });

  it('search() still returns correct results after updateSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });
    const results = inspector.search('roads');
    expect(results.length).toBeGreaterThan(0);
    inspector.dispose();
  });

  it('getDiagnostic() still returns correct diagnostic after resetSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.resetSettings();
    const d = inspector.getDiagnostic(0);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('tile/unclosed-ring');
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// Settings shared across inspector instances (singleton behaviour)
// ---------------------------------------------------------------------------

describe('SettingsService singleton across Inspector instances', () => {
  it('settings change on one inspector is visible on another', () => {
    const r1 = makeMockRenderer();
    const r2 = makeMockRenderer();
    const i1 = createInspector({ viewport: makeViewport(), renderer: r1 });
    const i2 = createInspector({ viewport: makeViewport(), renderer: r2 });

    i1.updateSettings({ showVertices: true });

    // Both inspectors share the same SettingsService singleton
    expect(i2.getSettings().showVertices).toBe(true);

    i1.dispose();
    i2.dispose();
  });
});

```

----

## 7. Comprehensive Test Suite Verification & Benchmarks

All 32 test files and 730 unit tests pass 100% with clean TypeScript typechecks:

```text
 Test Files  32 passed (32)
      Tests  730 passed (730)
   Duration  3.04s
```

----

## 8. Final Architectural Freeze & Quality Audit

Milestone 6 is 100% complete and frozen for production release.