/**
 * @tileguard/cli — `report` command
 *
 * Generates an engineering report from tile comparison + regression analysis.
 *
 * Usage:
 *   tileguard report before.pbf after.pbf --format markdown --output report.md
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createReportEngine } from '@tileguard/reporters';
import type { CliCommandResult, CommandContext } from '../runner/CommandRunner.js';
import {
  analyzeRegression,
  compareTiles,
  loadTileSnapshot,
} from '../analysis/AnalysisAdapter.js';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface ReportArgs {
  readonly before: string;
  readonly after: string;
  readonly format: 'markdown' | 'html' | 'json';
  readonly output?: string;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function runReport(
  args: ReportArgs,
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

  // Generate report
  logger.phase(`Generating ${args.format} report`);
  const engine = createReportEngine({ tileguardVersion: '0.5.0' });
  const result = engine.generate(
    comparison.asReportInput,
    regression.asReportInput,
    args.format,
  );

  if (!result.ok) {
    return {
      exitCode: 3,
      message: `[tileguard] Report generation failed: ${result.error.message}`,
    };
  }

  const content = result.value.content;

  // Write output
  const ext = args.format === 'markdown' ? 'md' : args.format;
  const outputPath = args.output
    ? resolve(args.output)
    : resolve(config.output.directory, `tileguard-report.${ext}`);

  if (args.output || config.output.directory !== '.') {
    writeFileSync(outputPath, content, 'utf-8');
    logger.info(`Report written to ${outputPath}`);
  }

  if (args.output) {
    return {
      exitCode: regression.isClean ? 0 : 1,
      message: `Report generated: ${outputPath}`,
    };
  }

  return {
    exitCode: regression.isClean ? 0 : 1,
    output: content,
  };
}
