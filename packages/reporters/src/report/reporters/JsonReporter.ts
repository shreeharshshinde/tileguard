/**
 * @tileguard/reporters — JsonReporter for Engineering Reports (Phase 2 — Step 10)
 *
 * Serialises an EngineeringReport to versioned JSON.
 * The output is an API contract — stable, documented, backward-compatible.
 *
 * Schema version 2 additions:
 *   - `$schema` field for tooling (future JSON Schema URL)
 *   - `schemaVersion` field (integer, currently 2)
 *   - `generator` metadata block
 *   - All existing sections preserved unchanged
 *
 * Pure function — no side effects, no I/O.
 */

import type { EngineeringReport } from '../models/EngineeringReport.js';

export interface JsonReportOptions {
  /** Indentation spaces. 0 = compact. Default 2. */
  readonly indent?: number | undefined;
  /** Whether to include the $schema reference URL. Default true. */
  readonly includeSchemaRef?: boolean | undefined;
}

/** Current JSON schema version. Increment on breaking changes. */
export const JSON_SCHEMA_VERSION = 2;

export function renderJson(report: EngineeringReport, options: JsonReportOptions = {}): string {
  const indent = options.indent ?? 2;
  const includeSchemaRef = options.includeSchemaRef ?? true;

  const output = {
    // Schema identification (Phase 2 — Step 10)
    ...(includeSchemaRef
      ? { $schema: 'https://tileguard.dev/schemas/report-v2.json' }
      : {}),
    schemaVersion: JSON_SCHEMA_VERSION,
    generator: {
      name: 'TileGuard',
      version: report.metadata.tileguardVersion,
      url: 'https://github.com/shreeharshshinde/tileguard',
    },
    // Full report content
    ...report,
  };

  return JSON.stringify(output, null, indent > 0 ? indent : undefined);
}
