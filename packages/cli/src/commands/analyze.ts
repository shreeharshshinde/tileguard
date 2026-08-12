/**
 * @tileguard/cli — `analyze` command
 *
 * Runs full analysis pipeline: comparison + regression investigation.
 *
 * Usage:
 *   tileguard analyze before.pbf after.pbf [--json] [--output file]
 */

import {
  analyzeRegression,
  compareTiles,
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

export interface AnalyzeArgs {
  readonly before: string;
  readonly after: string;
  readonly format: OutputFormat;
  readonly output?: string;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function runAnalyze(
  args: AnalyzeArgs,
  ctx: CommandContext,
): Promise<CliCommandResult> {
  const { logger, config } = ctx;

  // Load tiles
  logger.phase('Loading tiles');
  const snapshotA = await loadTileSnapshot(args.before);
  const snapshotB = await loadTileSnapshot(args.after);

  // Compare
  logger.phase('Comparing');
  const comparison = compareTiles(snapshotA, snapshotB, {
    stableProperties: config.comparison.stableProperties,
  });

  // Regression analysis
  logger.phase('Investigating regressions');
  const regression = analyzeRegression(comparison, {
    stableProperties: config.comparison.stableProperties,
    minConfidence: config.regression.minConfidence,
  });

  // Format output
  if (args.format === 'json') {
    const jsonOutput = `${JSON.stringify(
      {
        comparison: {
          isIdentical: comparison.isIdentical,
          features: comparison.features,
          layers: comparison.layers,
        },
        regression: {
          isClean: regression.isClean,
          totalCandidates: regression.totalCandidates,
          overallConfidence: regression.overallConfidence,
          dominantKind: regression.dominantKind,
          candidates: regression.candidates.map((c) => ({
            layerName: c.layerName,
            featureId: c.featureId,
            kind: c.kind,
            confidence: c.confidence,
            reason: c.reason,
            evidence: c.evidence,
          })),
        },
      },
      null,
      2,
    )}\n`;

    if (args.output) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(args.output, jsonOutput, 'utf-8');
      logger.info(`Analysis written to ${args.output}`);
    }

    return {
      exitCode: regression.isClean ? 0 : 2,
      output: jsonOutput,
    };
  }

  // Text output
  const fmt = createOutputFormatter('text');
  const sections: string[] = [];

  sections.push(fmt.heading('TileGuard Analysis'));

  sections.push(
    fmt.summary('Comparison', [
      ['Status', comparison.isIdentical ? 'IDENTICAL' : 'CHANGED'],
      ['Features added', comparison.features.added],
      ['Features removed', comparison.features.removed],
      ['Features modified', comparison.features.modified],
    ]),
  );

  sections.push(
    fmt.summary('Regression Analysis', [
      ['Status', regression.isClean ? 'CLEAN' : 'REGRESSIONS FOUND'],
      ['Candidates', regression.totalCandidates],
      [
        'Overall confidence',
        regression.totalCandidates > 0
          ? `${Math.round(regression.overallConfidence * 100)}%`
          : 'N/A',
      ],
      ['Dominant kind', regression.dominantKind ?? 'N/A'],
    ]),
  );

  if (regression.candidates.length > 0) {
    sections.push(`\nRegression Candidates\n${'─'.repeat(40)}\n`);
    for (const c of regression.candidates) {
      sections.push(
        `  ${c.kind.padEnd(22)} ${c.layerName.padEnd(15)} ` +
          `${Math.round(c.confidence * 100)}%  ${c.reason}\n`,
      );
    }
  }

  const output = fmt.envelope(sections);

  if (args.output) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(args.output, output, 'utf-8');
    logger.info(`Analysis written to ${args.output}`);
  }

  return {
    exitCode: regression.isClean ? 0 : 2,
    output,
  };
}
