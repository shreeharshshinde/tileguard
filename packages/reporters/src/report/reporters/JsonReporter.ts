/**
 * @tileguard/reporters — JsonReporter for Engineering Reports (Milestone 7 — Step 3)
 *
 * Losslessly serialises an EngineeringReport to JSON.
 * Pure function — no side effects, no I/O.
 */

import type { EngineeringReport } from '../models/EngineeringReport.js';

export interface JsonReportOptions {
  /** Indentation spaces. 0 = compact. Default 2. */
  readonly indent?: number;
}

export function renderJson(report: EngineeringReport, options: JsonReportOptions = {}): string {
  const indent = options.indent ?? 2;
  return JSON.stringify(report, null, indent > 0 ? indent : undefined);
}
