/**
 * @tileguard/inspector — DiagnosticList
 *
 * Renders grouped diagnostics (errors → warnings → info) with collapsible
 * group sections. Each group header shows a severity badge with count.
 *
 * The list receives its data as props — no store access inside this component.
 * All interaction flows upward via onSelectDiagnostic.
 */

import type { Diagnostic } from '@tileguard/core';
import './DiagnosticList.css';
import { DiagnosticItem } from './DiagnosticItem.js';
import { SeverityBadge } from './SeverityBadge.js';

export interface DiagnosticListProps {
  readonly errors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
  readonly infos: readonly Diagnostic[];
  /** Global index offset for errors (their position in the full array). */
  readonly errorOffset: number;
  readonly warningOffset: number;
  readonly infoOffset: number;
  /** Index of the currently selected diagnostic (global), or null. */
  readonly selectedIndex: number | null;
  /** Set of group IDs that are currently expanded ('error'|'warning'|'info'). */
  readonly expandedGroups: ReadonlySet<string>;
  readonly onSelectDiagnostic: (globalIndex: number) => void;
  readonly onToggleGroup: (groupId: string) => void;
}

interface GroupSectionProps {
  groupId: string;
  label: string;
  items: readonly Diagnostic[];
  offset: number;
  selectedIndex: number | null;
  isExpanded: boolean;
  onSelect: (idx: number) => void;
  onToggle: (groupId: string) => void;
}

function GroupSection({
  groupId,
  label,
  items,
  offset,
  selectedIndex,
  isExpanded,
  onSelect,
  onToggle,
}: GroupSectionProps): JSX.Element | null {
  if (items.length === 0) return null;

  const severity = groupId as 'error' | 'warning' | 'info';

  return (
    <div className={`diagnostic-group diagnostic-group--${groupId}`}>
      <button
        type="button"
        className="diagnostic-group__header"
        onClick={() => onToggle(groupId)}
        aria-expanded={isExpanded}
        aria-label={`${label} group, ${items.length} items`}
      >
        <span className="diagnostic-group__chevron" aria-hidden="true">
          {isExpanded ? '▾' : '▸'}
        </span>
        <SeverityBadge severity={severity} count={items.length} />
      </button>
      {isExpanded && (
        <ul className="diagnostic-group__list">
          {items.map((diag, i) => {
            const globalIndex = offset + i;
            return (
              <li key={globalIndex}>
                <DiagnosticItem
                  diagnostic={diag}
                  index={globalIndex}
                  isSelected={selectedIndex === globalIndex}
                  onSelect={onSelect}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DiagnosticList({
  errors,
  warnings,
  infos,
  errorOffset,
  warningOffset,
  infoOffset,
  selectedIndex,
  expandedGroups,
  onSelectDiagnostic,
  onToggleGroup,
}: DiagnosticListProps): JSX.Element {
  const hasAny = errors.length > 0 || warnings.length > 0 || infos.length > 0;

  if (!hasAny) {
    return (
      <div className="diagnostic-list diagnostic-list--empty">
        <span className="diagnostic-list__empty-text">No diagnostics</span>
      </div>
    );
  }

  return (
    <div className="diagnostic-list" role="list" aria-label="Diagnostics">
      <GroupSection
        groupId="error"
        label="Errors"
        items={errors}
        offset={errorOffset}
        selectedIndex={selectedIndex}
        isExpanded={expandedGroups.has('error')}
        onSelect={onSelectDiagnostic}
        onToggle={onToggleGroup}
      />
      <GroupSection
        groupId="warning"
        label="Warnings"
        items={warnings}
        offset={warningOffset}
        selectedIndex={selectedIndex}
        isExpanded={expandedGroups.has('warning')}
        onSelect={onSelectDiagnostic}
        onToggle={onToggleGroup}
      />
      <GroupSection
        groupId="info"
        label="Info"
        items={infos}
        offset={infoOffset}
        selectedIndex={selectedIndex}
        isExpanded={expandedGroups.has('info')}
        onSelect={onSelectDiagnostic}
        onToggle={onToggleGroup}
      />
    </div>
  );
}
