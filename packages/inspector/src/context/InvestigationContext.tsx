/**
 * @tileguard/inspector — InvestigationContext (Phase 4 — Step 1)
 *
 * Global shared investigation state. Every workspace reads from this context
 * so selection, camera, and active entities persist seamlessly across
 * workspace changes.
 *
 * Stores:
 *   - Selected feature (layer + index)
 *   - Hovered feature (layer + index)
 *   - Active layer name
 *   - Active diagnostic (ruleId + index)
 *   - Selected style layer
 *   - Camera position (zoom, panX, panY)
 *   - Comparison state (which files, which result)
 *   - Regression selection
 *   - Timeline events (investigation history)
 *
 * Architecture:
 *   InvestigationProvider wraps the ApplicationRouter. All workspace
 *   components use useInvestigation() to read/write shared state.
 *   The existing InspectorContext (store + inspector instance) is preserved
 *   for low-level tile state — InvestigationContext is the higher-level
 *   cross-workspace coordination layer.
 */

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from 'react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Reference to a feature within a layer. */
export interface FeatureSelection {
  readonly layerName: string;
  readonly featureIndex: number;
}

/** Reference to a diagnostic. */
export interface DiagnosticSelection {
  readonly ruleId: string;
  readonly diagnosticIndex: number;
}

/** Camera / viewport position. */
export interface CameraPosition {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

/** Comparison state within the investigation. */
export interface ComparisonState {
  readonly filePathA: string | null;
  readonly filePathB: string | null;
  readonly isActive: boolean;
}

/** A single timeline event in the investigation history. */
export interface TimelineEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly action: string;
  readonly detail: string;
  readonly workspace?: string;
  readonly icon?: string;
}

/** The complete investigation state. */
export interface InvestigationState {
  // ── Selection ─────────────────────────────────────────────────────────────
  readonly selectedFeature: FeatureSelection | null;
  readonly hoveredFeature: FeatureSelection | null;
  readonly activeLayer: string | null;
  readonly activeDiagnostic: DiagnosticSelection | null;
  readonly selectedStyleLayer: string | null;

  // ── Viewport ──────────────────────────────────────────────────────────────
  readonly camera: CameraPosition;

  // ── Workflow ──────────────────────────────────────────────────────────────
  readonly comparison: ComparisonState;
  readonly regressionSelection: string | null; // regression candidate ID

  // ── Timeline ──────────────────────────────────────────────────────────────
  readonly timeline: readonly TimelineEvent[];

  // ── Meta ──────────────────────────────────────────────────────────────────
  readonly datasetName: string | null;
  readonly startedAt: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type InvestigationAction =
  | { type: 'SELECT_FEATURE'; payload: FeatureSelection | null }
  | { type: 'HOVER_FEATURE'; payload: FeatureSelection | null }
  | { type: 'SET_ACTIVE_LAYER'; payload: string | null }
  | { type: 'SET_ACTIVE_DIAGNOSTIC'; payload: DiagnosticSelection | null }
  | { type: 'SET_STYLE_LAYER'; payload: string | null }
  | { type: 'SET_CAMERA'; payload: CameraPosition }
  | { type: 'SET_COMPARISON'; payload: Partial<ComparisonState> }
  | { type: 'SET_REGRESSION_SELECTION'; payload: string | null }
  | {
      type: 'ADD_TIMELINE_EVENT';
      payload: Omit<TimelineEvent, 'id' | 'timestamp'>;
    }
  | { type: 'SET_DATASET_NAME'; payload: string | null }
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

let _eventCounter = 0;

function createTimelineEvent(
  partial: Omit<TimelineEvent, 'id' | 'timestamp'>,
): TimelineEvent {
  _eventCounter += 1;
  return {
    ...partial,
    id: `ev-${Date.now()}-${_eventCounter}`,
    timestamp: Date.now(),
  };
}

const INITIAL_STATE: InvestigationState = {
  selectedFeature: null,
  hoveredFeature: null,
  activeLayer: null,
  activeDiagnostic: null,
  selectedStyleLayer: null,
  camera: { zoom: 1, panX: 0, panY: 0 },
  comparison: { filePathA: null, filePathB: null, isActive: false },
  regressionSelection: null,
  timeline: [],
  datasetName: null,
  startedAt: Date.now(),
};

const MAX_TIMELINE_EVENTS = 200;

function investigationReducer(
  state: InvestigationState,
  action: InvestigationAction,
): InvestigationState {
  switch (action.type) {
    case 'SELECT_FEATURE': {
      const event = action.payload
        ? createTimelineEvent({
            action: 'Selected Feature',
            detail: `${action.payload.layerName} #${action.payload.featureIndex}`,
            icon: 'crosshair',
          })
        : null;
      return {
        ...state,
        selectedFeature: action.payload,
        activeLayer: action.payload?.layerName ?? state.activeLayer,
        timeline: event
          ? [...state.timeline, event].slice(-MAX_TIMELINE_EVENTS)
          : state.timeline,
      };
    }

    case 'HOVER_FEATURE':
      return { ...state, hoveredFeature: action.payload };

    case 'SET_ACTIVE_LAYER': {
      const event = action.payload
        ? createTimelineEvent({
            action: 'Focused Layer',
            detail: action.payload,
            icon: 'layers',
          })
        : null;
      return {
        ...state,
        activeLayer: action.payload,
        timeline: event
          ? [...state.timeline, event].slice(-MAX_TIMELINE_EVENTS)
          : state.timeline,
      };
    }

    case 'SET_ACTIVE_DIAGNOSTIC': {
      const event = action.payload
        ? createTimelineEvent({
            action: 'Viewed Diagnostic',
            detail: action.payload.ruleId,
            workspace: 'diagnostics',
            icon: 'alert-triangle',
          })
        : null;
      return {
        ...state,
        activeDiagnostic: action.payload,
        timeline: event
          ? [...state.timeline, event].slice(-MAX_TIMELINE_EVENTS)
          : state.timeline,
      };
    }

    case 'SET_STYLE_LAYER': {
      const event = action.payload
        ? createTimelineEvent({
            action: 'Selected Style Layer',
            detail: action.payload,
            workspace: 'style-explorer',
            icon: 'palette',
          })
        : null;
      return {
        ...state,
        selectedStyleLayer: action.payload,
        timeline: event
          ? [...state.timeline, event].slice(-MAX_TIMELINE_EVENTS)
          : state.timeline,
      };
    }

    case 'SET_CAMERA':
      return { ...state, camera: action.payload };

    case 'SET_COMPARISON': {
      const merged = { ...state.comparison, ...action.payload };
      const event = action.payload.isActive
        ? createTimelineEvent({
            action: 'Started Comparison',
            detail: `${merged.filePathA ?? '?'} vs ${merged.filePathB ?? '?'}`,
            workspace: 'compare',
            icon: 'git-compare',
          })
        : null;
      return {
        ...state,
        comparison: merged,
        timeline: event
          ? [...state.timeline, event].slice(-MAX_TIMELINE_EVENTS)
          : state.timeline,
      };
    }

    case 'SET_REGRESSION_SELECTION': {
      const event = action.payload
        ? createTimelineEvent({
            action: 'Selected Regression',
            detail: action.payload,
            workspace: 'regression',
            icon: 'trending-down',
          })
        : null;
      return {
        ...state,
        regressionSelection: action.payload,
        timeline: event
          ? [...state.timeline, event].slice(-MAX_TIMELINE_EVENTS)
          : state.timeline,
      };
    }

    case 'ADD_TIMELINE_EVENT':
      return {
        ...state,
        timeline: [
          ...state.timeline,
          createTimelineEvent(action.payload),
        ].slice(-MAX_TIMELINE_EVENTS),
      };

    case 'SET_DATASET_NAME':
      return { ...state, datasetName: action.payload };

    case 'RESET':
      return { ...INITIAL_STATE, startedAt: Date.now() };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface InvestigationActions {
  selectFeature(selection: FeatureSelection | null): void;
  hoverFeature(selection: FeatureSelection | null): void;
  setActiveLayer(layer: string | null): void;
  setActiveDiagnostic(diagnostic: DiagnosticSelection | null): void;
  setStyleLayer(layer: string | null): void;
  setCamera(position: CameraPosition): void;
  setComparison(state: Partial<ComparisonState>): void;
  setRegressionSelection(id: string | null): void;
  addTimelineEvent(event: Omit<TimelineEvent, 'id' | 'timestamp'>): void;
  setDatasetName(name: string | null): void;
  reset(): void;
}

interface InvestigationContextValue {
  readonly state: InvestigationState;
  readonly actions: InvestigationActions;
}

const InvestigationContext = createContext<InvestigationContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function InvestigationProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [state, dispatch] = useReducer(investigationReducer, INITIAL_STATE);

  const actions: InvestigationActions = useMemo(
    () => ({
      selectFeature: (payload) => dispatch({ type: 'SELECT_FEATURE', payload }),
      hoverFeature: (payload) => dispatch({ type: 'HOVER_FEATURE', payload }),
      setActiveLayer: (payload) =>
        dispatch({ type: 'SET_ACTIVE_LAYER', payload }),
      setActiveDiagnostic: (payload) =>
        dispatch({ type: 'SET_ACTIVE_DIAGNOSTIC', payload }),
      setStyleLayer: (payload) =>
        dispatch({ type: 'SET_STYLE_LAYER', payload }),
      setCamera: (payload) => dispatch({ type: 'SET_CAMERA', payload }),
      setComparison: (payload) => dispatch({ type: 'SET_COMPARISON', payload }),
      setRegressionSelection: (payload) =>
        dispatch({ type: 'SET_REGRESSION_SELECTION', payload }),
      addTimelineEvent: (payload) =>
        dispatch({ type: 'ADD_TIMELINE_EVENT', payload }),
      setDatasetName: (payload) =>
        dispatch({ type: 'SET_DATASET_NAME', payload }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <InvestigationContext.Provider value={value}>
      {children}
    </InvestigationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the global investigation state and actions.
 * Must be used within an InvestigationProvider.
 */
export function useInvestigation(): InvestigationContextValue {
  const ctx = useContext(InvestigationContext);
  if (ctx === null) {
    throw new Error(
      'useInvestigation must be used within an InvestigationProvider.',
    );
  }
  return ctx;
}

/**
 * Convenience hook: returns only the investigation state (no actions).
 */
export function useInvestigationState(): InvestigationState {
  return useInvestigation().state;
}

/**
 * Convenience hook: returns only the investigation actions (no state).
 */
export function useInvestigationActions(): InvestigationActions {
  return useInvestigation().actions;
}
