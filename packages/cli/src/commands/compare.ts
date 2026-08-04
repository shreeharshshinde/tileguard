/**
 * @tileguard/cli — `compare` command
 *
 * Compares two vector tiles and reports structural differences.
 *
 * Usage:
 *   tileguard compare before.pbf after.pbf [--json] [--output file]
 */

import type { CliCommandResult, CommandContext } from '../runner/CommandRunner.js';
import { loadTileSnapshot, compareTiles } from '../analysis/AnalysisAdapter.js';
import { createOutputFormatter, formatDelta } from '../output/OutputFormatter.js';
import type { OutputFormat } from '../output/OutputFormatter.js';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface CompareArgs {
  readonly before: string;
  readonly after: string;
  readonly format: OutputFormat;
  readonly output?: string;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function runCompare(
  args: CompareArgs,
  ctx: CommandContext,
): Promise<CliCommandResult> {
  const { logger, config } = ctx;

  // Load tiles
  logger.phase('Loading tiles');
  logger.verbose(`Before: ${args.before}`);
  logger.verbose(`After: ${args.after}`);

  const snapshotA = await loadTileSnapshot(args.before);
  const snapshotB = await loadTileSnapshot(args.after);

  // Compare
  logger.phase('Comparing');
  const comparison = compareTiles(snapshotA, snapshotB, {
    stableProperties: config.comparison.stableProperties,
  });

  // Format output
  if (args.format === 'json') {
    const jsonOutput = JSON.stringify({
      isIdentical: comparison.isIdentical,
      features: comparison.features,
      layers: comparison.layers,
      stats: comparison.asReportInput.stats,
    }, null, 2) + '\n';

    if (args.output) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(args.output, jsonOutput, 'utf-8');
      logger.info(`Comparison written to ${args.output}`);
    }

    return { exitCode: 0, output: jsonOutput };
  }

  // Text output
  const fmt = createOutputFormatter('text');
  const sections: string[] = [];

  sections.push(fmt.heading('TileGuard Comparison'));
  sections.push(fmt.summary('Files', [
    ['Before', args.before],
    ['After', args.after],
    ['Status', comparison.isIdentical ? 'IDENTICAL' : 'CHANGED'],
  ]));

  sections.push(fmt.summary('Feature Changes', [
    ['Added', comparison.features.added],
    ['Removed', comparison.features.removed],
    ['Modified', comparison.features.modified],
    ['Unchanged', comparison.features.unchanged],
  ]));

  sections.push(fmt.summary('Layer Changes', [
    ['Added', comparison.layers.added],
    ['Removed', comparison.layers.removed],
    ['Modified', comparison.layers.modified],
  ]));

  const s = comparison.asReportInput.stats;
  sections.push(fmt.summary('Statistics Delta', [
    ['Layers', `${s.layersA} → ${s.layersB} (${formatDelta(s.layersB - s.layersA)})`],
    ['Features', `${s.featuresA} → ${s.featuresB} (${formatDelta(s.featuresB - s.featuresA)})`],
    ['Vertices', `${s.verticesA} → ${s.verticesB} (${formatDelta(s.verticesB - s.verticesA)})`],
    ['Diagnostics', `${s.diagnosticsA} → ${s.diagnosticsB} (${formatDelta(s.diagnosticsB - s.diagnosticsA)})`],
  ]));

  const output = fmt.envelope(sections);

  if (args.output) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(args.output, output, 'utf-8');
    logger.info(`Comparison written to ${args.output}`);
  }

  return {
    exitCode: comparison.isIdentical ? 0 : 1,
    output,
  };
}
