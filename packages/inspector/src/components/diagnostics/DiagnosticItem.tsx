/**
 * @tileguard/inspector — DiagnosticItem
 *
 * Renders a single diagnostic row in the DiagnosticList.
 * Clicking an item triggers Inspector.selectDiagnostic(index),
 * which resolves the associated feature and updates the store.
 */

import type { Diagnostic } from '@tileguard/core';
import './DiagnosticItem.css';
import { SeverityBadge } from './SeverityBadge.js';

export interface DiagnosticItemProps {
  /** The diagnostic to display. */
  readonly diagnostic: Diagnostic;
  /** Zero-based index in the diagnostics array (used for selection). */
  readonly index: number;
  /** Whether this diagnostic is currently selected. */
  readonly isSelected: boolean;
  /** Called when the user clicks this item. */
  readonly onSelect: (index: number) => void;
}

/** Extract a human-readable layer name from the diagnostic location. */
function getLayerName(diagnostic: Diagnostic): string | null {
  const loc = diagnostic.location as { layer?: string } | undefined;
  return loc?.layer ?? null;
}

/** Extract a feature label from the diagnostic location. */
function getFeatureLabel(diagnostic: Diagnostic): string | null {
  const loc = diagnostic.location as
    | { featureIndex?: number; featureId?: number | string }
    | undefined;
  if (loc?.featureId !== undefined) return `Feature #${loc.featureId}`;
  if (loc?.featureIndex !== undefined) return `Feature #${loc.featureIndex}`;
  return null;
}

export function DiagnosticItem({
  diagnostic,
  index,
  isSelected,
  onSelect,
}: DiagnosticItemProps): JSX.Element {
  const layerName = getLayerName(diagnostic);
  const featureLabel = getFeatureLabel(diagnostic);

  return (
    <button
      type="button"
      className={`diagnostic-item${isSelected ? ' diagnostic-item--selected' : ''}`}
      onClick={() => onSelect(index)}
      aria-pressed={isSelected}
      aria-label={`${diagnostic.severity}: ${diagnostic.message}`}
    >
      <div className="diagnostic-item__header">
        <SeverityBadge severity={diagnostic.severity} iconOnly />
        <span className="diagnostic-item__message">{diagnostic.message}</span>
      </div>
      <div className="diagnostic-item__meta">
        {layerName !== null && (
          <span className="diagnostic-item__layer">{layerName}</span>
        )}
        {featureLabel !== null && (
          <span className="diagnostic-item__feature">{featureLabel}</span>
        )}
        {diagnostic.ruleId !== undefined && (
          <span className="diagnostic-item__rule">{diagnostic.ruleId}</span>
        )}
      </div>
      {diagnostic.suggestion !== undefined && (
        <div className="diagnostic-item__suggestion">
          {diagnostic.suggestion}
        </div>
      )}
    </button>
  );
}
