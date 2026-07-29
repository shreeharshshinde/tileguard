/**
 * @tileguard/inspector — Inspector Integration Layer (Milestone 6 — Step 3)
 *
 * Adds Step 3 settings and statistics API while keeping Steps 1 & 2 intact.
 *
 * Step 3 additions:
 *   - getSettings()        → InspectorSettings (from SettingsService)
 *   - updateSettings()     → partial update, persists to localStorage
 *   - resetSettings()      → restore defaults, persists to localStorage
 *   - getTileStatistics()  → TileStatistics (from StatisticsService)
 *   - getStatistics()      → kept as DiagnosticSummary alias for Step 2 compat
 *
 * Architecture: SettingsService is a singleton; Inspector is the bridge
 * between settings changes and the renderer (CanvasRenderer.setOptions).
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { ScreenPoint } from './geometry/index.js';
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
import type { Viewport } from './viewport/viewport.js';

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

  /** Full tile statistics snapshot (layers, geometry counts, diagnostic counts). */
  getTileStatistics(): TileStatistics;

  /** Returns the current user settings from SettingsService. */
  getSettings(): InspectorSettings;

  /**
   * Apply a partial settings update.
   * Persists to localStorage and immediately updates the renderer where
   * applicable (e.g. showVertices → CanvasRenderer.setOptions).
   */
  updateSettings(patch: Partial<InspectorSettings>): void;

  /** Reset all settings to defaults. Persists and updates renderer. */
  resetSettings(): void;
}

// ---------------------------------------------------------------------------
// Construction Options
// ---------------------------------------------------------------------------

export interface InspectorOptions {
  readonly viewport: Viewport;
  readonly renderer: Renderer;
  readonly store?: InspectorStore;
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

  private _lastSearchResults: readonly SearchResult[] = [];

  constructor({ viewport, renderer, store }: InspectorOptions) {
    this._store = store ?? createInspectorStore();
    this._renderer = renderer;

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

  /**
   * Push the settings that affect the renderer into CanvasRenderer.setOptions().
   * CanvasRenderer is the concrete class; we access setOptions() via a type
   * guard rather than widening the Renderer interface (which stays minimal).
   */
  private _applySettingsToRenderer(): void {
    const settings = getSettingsService().getSettings();
    const cr = this._renderer as Partial<CanvasRenderer>;
    if (typeof cr.setOptions === 'function') {
      cr.setOptions({ showVertices: settings.showVertices });
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInspector(options: InspectorOptions): Inspector {
  return new InspectorImpl(options);
}
