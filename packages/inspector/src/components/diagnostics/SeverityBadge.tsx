/**
 * @tileguard/inspector — SeverityBadge
 *
 * Renders a colored severity indicator (icon + optional count label).
 * Used in DiagnosticItem and DiagnosticToolbar.
 */

import type { Severity } from '@tileguard/core';
import './SeverityBadge.css';

export interface SeverityBadgeProps {
  readonly severity: Severity;
  /** Optional count to display alongside the icon. */
  readonly count?: number;
  /** If true, renders only the icon without any text. */
  readonly iconOnly?: boolean;
}

/** Maps severity to a readable label and emoji icon. */
const SEVERITY_META: Record<
  Severity,
  { icon: string; label: string; className: string }
> = {
  error: { icon: '❌', label: 'Error', className: 'severity-badge--error' },
  warning: {
    icon: '⚠',
    label: 'Warning',
    className: 'severity-badge--warning',
  },
  info: { icon: 'ℹ', label: 'Info', className: 'severity-badge--info' },
};

export function SeverityBadge({
  severity,
  count,
  iconOnly = false,
}: SeverityBadgeProps): JSX.Element {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className={`severity-badge ${meta.className}`}
      title={`${meta.label}${count !== undefined ? ` (${count})` : ''}`}
      aria-label={`${meta.label}${count !== undefined ? ` ${count}` : ''}`}
    >
      <span className="severity-badge__icon" aria-hidden="true">
        {meta.icon}
      </span>
      {!iconOnly && count !== undefined && (
        <span className="severity-badge__count">{count}</span>
      )}
      {!iconOnly && count === undefined && (
        <span className="severity-badge__label">{meta.label}</span>
      )}
    </span>
  );
}
