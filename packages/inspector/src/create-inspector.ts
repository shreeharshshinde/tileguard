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
import type { ReportResult } from '@tileguard/reporters';
import { createReportEngine } from '@tileguard/reporters';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { RegressionAnalysis } from './analysis/models/regression.js';
import { createRegressionEngine } from './analysis/RegressionEngine.js';
import {
  type CameraAnimator,
  createCameraAnimator,
  type RafScheduler,
} from './animation/CameraAnimator.js';
import { createComparisonService } from './comparison/ComparisonService.js';
import type { TileComparison, TileSnapshot } from './comparison/models.js';
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
import { buildReportInputs } from './report/report-adapter.js';
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
  getSettingsService,
  type InspectorSettings,
} from './services/SettingsService.js';
import {
  createStatisticsService,
  type TileStatistics,
} from './services/StatisticsService.js';
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

  // ── Step 5 (Milestone 7 Step 1) API ──────────────────────────────────

  /**
   * Capture an immutable TileSnapshot from the currently loaded tile.
   * Returns null if no tile is loaded.
   */
  createSnapshot(): TileSnapshot | null;

  /**
   * Compare two tile snapshots and return a complete TileComparison result.
   * Deterministic: same inputs always produce the same output.
   */
  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison;

  // ── Step 6 (Milestone 7 Step 2) API ──────────────────────────────────

  /**
   * Analyse a TileComparison and return a ranked RegressionAnalysis.
   *
   * The engine never re-reads tiles or calls ComparisonService again —
   * it only reads the supplied comparison argument. This is a pure
   * transformation: same input always produces the same output.
   */
  analyzeRegression(comparison: TileComparison): RegressionAnalysis;

  // ── Step 7 (Milestone 7 Step 3) API ──────────────────────────────────

  /**
   * Generate an engineering report from a comparison + regression analysis.
   *
   * @param comparison  The TileComparison produced by compare().
   * @param regression  The RegressionAnalysis produced by analyzeRegression().
   * @param format      Output format: 'markdown' | 'html' | 'json'.
   * @returns           ReportResult — ok with content, or error with code+message.
   */
  generateReport(
    comparison: TileComparison,
    regression: RegressionAnalysis,
    format: 'markdown' | 'html' | 'json',
  ): ReportResult;
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

  // ── Step 5 (Milestone 7 Step 1) ──────────────────────────────────────────

  createSnapshot(): TileSnapshot | null {
    return createComparisonService().createSnapshot(this._store);
  }

  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison {
    return createComparisonService().compare(snapshotA, snapshotB);
  }

  // ── Step 6 (Milestone 7 Step 2) ──────────────────────────────────────────

  analyzeRegression(comparison: TileComparison): RegressionAnalysis {
    return createRegressionEngine().analyze(comparison);
  }

  // ── Step 7 (Milestone 7 Step 3) ──────────────────────────────────────────

  generateReport(
    comparison: TileComparison,
    regression: RegressionAnalysis,
    format: 'markdown' | 'html' | 'json',
  ): ReportResult {
    const { comparisonInput, regressionInput } = buildReportInputs(
      comparison,
      regression,
    );
    return createReportEngine({ tileguardVersion: '0.4.5' }).generate(
      comparisonInput,
      regressionInput,
      format,
    );
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
