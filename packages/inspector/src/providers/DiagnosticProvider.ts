/**
 * @tileguard/inspector — DiagnosticProvider
 *
 * Reads diagnostic data from InspectorStore and exposes it in a flat,
 * service-friendly form. Applies the store's filter state to produce the
 * visible diagnostic subset without mutating the store.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { Diagnostic, Severity } from '@tileguard/core';
import type { InspectorStore } from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Grouped diagnostics by severity for display in the DiagnosticPanel. */
export interface DiagnosticGroups {
  readonly errors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
  readonly infos: readonly Diagnostic[];
}

/** Summary counts for the badge display. */
export interface DiagnosticSummary {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly total: number;
}

// ---------------------------------------------------------------------------
// DiagnosticProvider interface
// ---------------------------------------------------------------------------

export interface DiagnosticProvider {
  /**
   * Returns all diagnostics from the current tile load.
   * Returns an empty array when no tile is loaded.
   */
  getAllDiagnostics(): readonly Diagnostic[];

  /**
   * Returns diagnostics filtered by the store's active filter state.
   * - visibleLayers: only include diagnostics whose location.layer matches
   * - minSeverity: only include diagnostics at or above the given severity
   * - ruleId: only include diagnostics matching the given rule ID
   */
  getFilteredDiagnostics(): readonly Diagnostic[];

  /**
   * Returns diagnostics grouped by severity (error, warning, info).
   * Respects the same filter state as getFilteredDiagnostics().
   */
  getGrouped(): DiagnosticGroups;

  /**
   * Returns a summary of diagnostic counts (unfiltered, for badge display).
   */
  getSummary(): DiagnosticSummary;

  /**
   * Returns a single diagnostic by its array index within the loaded
   * diagnostics list.
   */
  getDiagnosticAt(index: number): Diagnostic | null;
}

// ---------------------------------------------------------------------------
// Severity ordering
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

function meetsSeverity(
  diagnostic: Diagnostic,
  minSeverity: Severity | null,
): boolean {
  if (minSeverity === null) return true;
  return (
    (SEVERITY_ORDER[diagnostic.severity] ?? 0) >=
    (SEVERITY_ORDER[minSeverity] ?? 0)
  );
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class DiagnosticProviderImpl implements DiagnosticProvider {
  constructor(private readonly _store: InspectorStore) {}

  getAllDiagnostics(): readonly Diagnostic[] {
    const { lifecycle } = this._store;
    if (lifecycle.status !== 'loaded') return [];
    return lifecycle.diagnostics;
  }

  getFilteredDiagnostics(): readonly Diagnostic[] {
    const all = this.getAllDiagnostics();
    const { filters } = this._store;
    const { visibleLayers, minSeverity, ruleId } = filters;

    return all.filter((d) => {
      // Layer filter: empty set means "show all"
      if (visibleLayers.size > 0) {
        const diagLayer =
          (d.location as { layer?: string } | undefined)?.layer ?? null;
        if (diagLayer === null || !visibleLayers.has(diagLayer)) return false;
      }
      // Severity filter
      if (!meetsSeverity(d, minSeverity)) return false;
      // Rule ID filter
      if (ruleId !== null && d.ruleId !== ruleId) return false;
      return true;
    });
  }

  getGrouped(): DiagnosticGroups {
    const filtered = this.getFilteredDiagnostics();
    const errors: Diagnostic[] = [];
    const warnings: Diagnostic[] = [];
    const infos: Diagnostic[] = [];
    for (const d of filtered) {
      if (d.severity === 'error') errors.push(d);
      else if (d.severity === 'warning') warnings.push(d);
      else infos.push(d);
    }
    return { errors, warnings, infos };
  }

  getSummary(): DiagnosticSummary {
    const all = this.getAllDiagnostics();
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    for (const d of all) {
      if (d.severity === 'error') errorCount++;
      else if (d.severity === 'warning') warningCount++;
      else infoCount++;
    }
    return { errorCount, warningCount, infoCount, total: all.length };
  }

  getDiagnosticAt(index: number): Diagnostic | null {
    const all = this.getAllDiagnostics();
    return all[index] ?? null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a DiagnosticProvider backed by the given InspectorStore.
 *
 * @example
 *   const provider = createDiagnosticProvider(store);
 *   const { errors } = provider.getGrouped();
 */
export function createDiagnosticProvider(
  store: InspectorStore,
): DiagnosticProvider {
  return new DiagnosticProviderImpl(store);
}
