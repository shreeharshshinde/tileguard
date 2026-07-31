/**
 * @tileguard/inspector — DiagnosticToolbar
 *
 * The filter bar at the top of the Diagnostics panel.
 * Contains severity filter checkboxes, a layer dropdown, and a sort control.
 *
 * All state is received as props — this component owns no state.
 * Filtering is purely derivational (no store mutations here).
 */

import type {
  DiagnosticSortOrder,
  SeverityFilter,
} from '../../hooks/use-store.js';
import type { LayerInfo } from '../../providers/LayerProvider.js';
import './DiagnosticToolbar.css';

export interface DiagnosticToolbarProps {
  readonly severity: SeverityFilter;
  readonly activeLayers: ReadonlySet<string>;
  readonly activeGeometryTypes: ReadonlySet<string>;
  readonly layers: readonly LayerInfo[];
  readonly geometryTypes: readonly string[];
  readonly sortOrder: DiagnosticSortOrder;
  readonly onToggleSeverity: (key: keyof SeverityFilter) => void;
  readonly onToggleLayer: (layerName: string) => void;
  readonly onToggleGeometryType: (type: string) => void;
  readonly onSetSortOrder: (order: DiagnosticSortOrder) => void;
  readonly onReset: () => void;
}

interface SeverityCheckboxProps {
  id: keyof SeverityFilter;
  label: string;
  icon: string;
  checked: boolean;
  onChange: (key: keyof SeverityFilter) => void;
}

function SeverityCheckbox({
  id,
  label,
  icon,
  checked,
  onChange,
}: SeverityCheckboxProps): JSX.Element {
  return (
    <label
      className={`diagnostic-toolbar__severity-item diagnostic-toolbar__severity-item--${id}`}
      title={label}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(id)}
        aria-label={`Show ${label}`}
        className="diagnostic-toolbar__checkbox"
      />
      <span aria-hidden="true">{icon}</span>
    </label>
  );
}

export function DiagnosticToolbar({
  severity,
  activeLayers,
  activeGeometryTypes,
  layers,
  geometryTypes,
  sortOrder,
  onToggleSeverity,
  onToggleLayer,
  onToggleGeometryType,
  onSetSortOrder,
  onReset,
}: DiagnosticToolbarProps): JSX.Element {
  const hasActiveLayerFilter = activeLayers.size > 0;
  const hasActiveGeometryFilter = activeGeometryTypes.size > 0;

  return (
    <div
      className="diagnostic-toolbar"
      role="toolbar"
      aria-label="Diagnostic filters"
    >
      {/* Severity checkboxes */}
      <fieldset className="diagnostic-toolbar__severity-group">
        <legend className="diagnostic-toolbar__sr-only">
          Filter by severity
        </legend>
        <SeverityCheckbox
          id="error"
          label="Errors"
          icon="❌"
          checked={severity.error}
          onChange={onToggleSeverity}
        />
        <SeverityCheckbox
          id="warning"
          label="Warnings"
          icon="⚠"
          checked={severity.warning}
          onChange={onToggleSeverity}
        />
        <SeverityCheckbox
          id="info"
          label="Info"
          icon="ℹ"
          checked={severity.info}
          onChange={onToggleSeverity}
        />
      </fieldset>

      {/* Layer filter dropdown */}
      {layers.length > 0 && (
        <div className="diagnostic-toolbar__layer-group">
          <details className="diagnostic-toolbar__dropdown">
            <summary
              className={`diagnostic-toolbar__dropdown-trigger${hasActiveLayerFilter ? ' diagnostic-toolbar__dropdown-trigger--active' : ''}`}
              aria-label={`Layer filter${hasActiveLayerFilter ? ` (${activeLayers.size} active)` : ''}`}
            >
              Layers
              {hasActiveLayerFilter && (
                <span className="diagnostic-toolbar__active-indicator">
                  {activeLayers.size}
                </span>
              )}
            </summary>
            <fieldset className="diagnostic-toolbar__dropdown-content">
              <legend className="diagnostic-toolbar__sr-only">
                Layer checkboxes
              </legend>
              {layers.map((layer) => (
                <label
                  key={layer.name}
                  className="diagnostic-toolbar__layer-item"
                >
                  <input
                    type="checkbox"
                    checked={
                      !hasActiveLayerFilter || activeLayers.has(layer.name)
                    }
                    onChange={() => onToggleLayer(layer.name)}
                    aria-label={`Show layer ${layer.name}`}
                    className="diagnostic-toolbar__checkbox"
                  />
                  <span className="diagnostic-toolbar__layer-name">
                    {layer.name}
                  </span>
                  <span className="diagnostic-toolbar__layer-count">
                    {layer.featureCount}
                  </span>
                </label>
              ))}
            </fieldset>
          </details>
        </div>
      )}

      {geometryTypes.length > 0 && (
        <div className="diagnostic-toolbar__layer-group">
          <details className="diagnostic-toolbar__dropdown">
            <summary
              className={`diagnostic-toolbar__dropdown-trigger${hasActiveGeometryFilter ? ' diagnostic-toolbar__dropdown-trigger--active' : ''}`}
              aria-label={`Geometry filter${hasActiveGeometryFilter ? ` (${activeGeometryTypes.size} active)` : ''}`}
            >
              Geometry
              {hasActiveGeometryFilter && (
                <span className="diagnostic-toolbar__active-indicator">
                  {activeGeometryTypes.size}
                </span>
              )}
            </summary>
            <fieldset className="diagnostic-toolbar__dropdown-content">
              <legend className="diagnostic-toolbar__sr-only">
                Geometry checkboxes
              </legend>
              {geometryTypes.map((geometryType) => (
                <label
                  key={geometryType}
                  className="diagnostic-toolbar__layer-item"
                >
                  <input
                    type="checkbox"
                    checked={
                      !hasActiveGeometryFilter ||
                      activeGeometryTypes.has(geometryType)
                    }
                    onChange={() => onToggleGeometryType(geometryType)}
                    aria-label={`Show geometry ${geometryType}`}
                    className="diagnostic-toolbar__checkbox"
                  />
                  <span className="diagnostic-toolbar__layer-name">
                    {geometryType}
                  </span>
                </label>
              ))}
            </fieldset>
          </details>
        </div>
      )}

      <span className="diagnostic-toolbar__spacer" />

      {/* Sort order */}
      <label
        className="diagnostic-toolbar__sort"
        aria-label="Sort diagnostics by"
      >
        <select
          value={sortOrder}
          onChange={(e) =>
            onSetSortOrder(e.target.value as DiagnosticSortOrder)
          }
          className="diagnostic-toolbar__sort-select"
          aria-label="Sort order"
        >
          <option value="severity">By severity</option>
          <option value="layer">By layer</option>
          <option value="rule">By rule</option>
        </select>
      </label>

      {/* Reset */}
      <button
        type="button"
        className="diagnostic-toolbar__reset"
        onClick={onReset}
        aria-label="Reset filters"
        title="Reset all filters"
      >
        ↺
      </button>
    </div>
  );
}
