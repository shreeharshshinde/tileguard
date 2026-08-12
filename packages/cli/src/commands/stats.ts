/**
 * @tileguard/cli — `stats` command
 *
 * Displays tile statistics: layers, geometry, diagnostics, feature counts.
 *
 * Usage:
 *   tileguard stats tile.pbf [--json]
 */

import {
  getSnapshotStats,
  loadTileSnapshot,
} from '../analysis/AnalysisAdapter.js';
import type { OutputFormat } from '../output/OutputFormatter.js';
import { createOutputFormatter } from '../output/OutputFormatter.js';
import type {
  CliCommandResult,
  CommandContext,
} from '../runner/CommandRunner.js';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface StatsArgs {
  readonly file: string;
  readonly format: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function runStats(
  args: StatsArgs,
  ctx: CommandContext,
): Promise<CliCommandResult> {
  const { logger } = ctx;

  logger.phase('Loading tile');
  const snapshot = await loadTileSnapshot(args.file);
  const stats = getSnapshotStats(snapshot);

  // Compute geometry breakdown
  const geometryCounts = { ...snapshot.statistics.geometryCounts };

  // Diagnostic severity counts
  const severityCounts = { ...snapshot.statistics.diagnostics };

  // Layer details
  const layerDetails = snapshot.layers.map((l) => {
    const layerFeatures = snapshot.features.filter(
      (f) => f.layerName === l.name,
    );
    let vertices = 0;
    for (const f of layerFeatures) {
      for (const ring of f.geometry) {
        vertices += ring.length;
      }
    }
    return {
      name: l.name,
      features: l.featureCount,
      vertices,
      extent: l.extent,
    };
  });

  if (args.format === 'json') {
    const jsonOutput = `${JSON.stringify(
      {
        file: args.file,
        layers: stats.layerCount,
        features: stats.featureCount,
        vertices: stats.vertexCount,
        diagnostics: stats.diagnosticCount,
        geometry: geometryCounts,
        severity: severityCounts,
        layerDetails,
      },
      null,
      2,
    )}\n`;

    return { exitCode: 0, output: jsonOutput };
  }

  // Text output
  const fmt = createOutputFormatter('text');
  const sections: string[] = [];

  sections.push(fmt.heading(`TileGuard Stats — ${args.file}`));

  sections.push(
    fmt.summary('Overview', [
      ['Layers', stats.layerCount],
      ['Features', stats.featureCount],
      ['Vertices', stats.vertexCount],
      ['Diagnostics', stats.diagnosticCount],
    ]),
  );

  sections.push(
    fmt.summary('Geometry', [
      ['Points', geometryCounts.point],
      ['Lines', geometryCounts.line],
      ['Polygons', geometryCounts.polygon],
    ]),
  );

  if (stats.diagnosticCount > 0) {
    sections.push(
      fmt.summary('Diagnostic Severity', [
        ['Errors', severityCounts.errors],
        ['Warnings', severityCounts.warnings],
        ['Info', severityCounts.info],
      ]),
    );
  }

  sections.push(`\nLayers\n${'─'.repeat(40)}\n`);
  const headers = ['Name', 'Features', 'Vertices', 'Extent'];
  const rows = layerDetails.map((l) => [
    l.name,
    String(l.features),
    String(l.vertices),
    String(l.extent),
  ]);
  sections.push(fmt.table(headers, rows));

  // Rule summary
  if (snapshot.diagnostics.length > 0) {
    const ruleCounts = new Map<string, number>();
    for (const d of snapshot.diagnostics) {
      ruleCounts.set(d.ruleId, (ruleCounts.get(d.ruleId) ?? 0) + 1);
    }
    const ruleEntries = [...ruleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]): [string, number] => [rule, count]);

    sections.push(fmt.summary('Rule Summary', ruleEntries));
  }

  return { exitCode: 0, output: fmt.envelope(sections) };
}
