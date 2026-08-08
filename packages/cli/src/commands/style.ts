/**
 * @tileguard/cli — `style` command
 *
 * Parses and analyzes a MapLibre style specification, producing:
 *   - Parsed document summary
 *   - Validation diagnostics
 *   - Style statistics
 *
 * Usage:
 *   tileguard style style.json [--json]
 */

import { readFile } from 'node:fs/promises';
import type { StyleAnalysis, StyleDiagnostic } from '@tileguard/style-rules';
import { analyzeStyle } from '@tileguard/style-rules';
import type { OutputFormat } from '../output/OutputFormatter.js';
import { createOutputFormatter } from '../output/OutputFormatter.js';
import type {
  CliCommandResult,
  CommandContext,
} from '../runner/CommandRunner.js';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface StyleArgs {
  readonly file: string;
  readonly format: OutputFormat;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function runStyle(
  args: StyleArgs,
  ctx: CommandContext,
): Promise<CliCommandResult> {
  const { logger } = ctx;

  // Load file
  logger.phase('Loading style');
  let raw: string;
  try {
    raw = await readFile(args.file, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 3,
      message: `[tileguard] Failed to read "${args.file}": ${message}`,
    };
  }

  // Analyze
  logger.phase('Analyzing style');
  const { analysis, error } = analyzeStyle(raw);

  if (!analysis) {
    return {
      exitCode: 2,
      message: `[tileguard] Parse error: ${error ?? 'Unknown error'}`,
    };
  }

  // Determine exit code
  const exitCode =
    analysis.errorCount > 0 ? 2 : analysis.warningCount > 0 ? 1 : 0;

  if (args.format === 'json') {
    return {
      exitCode,
      output: formatJson(args.file, analysis),
    };
  }

  return {
    exitCode,
    output: formatText(args.file, analysis),
  };
}

// ---------------------------------------------------------------------------
// JSON Output
// ---------------------------------------------------------------------------

function formatJson(file: string, analysis: StyleAnalysis): string {
  const output = {
    file,
    valid: analysis.valid,
    version: analysis.document.version,
    name: analysis.document.name ?? null,
    statistics: {
      sources: analysis.statistics.sourceCount,
      sourcesByType: analysis.statistics.sourcesByType,
      layers: analysis.statistics.layerCount,
      layersByType: analysis.statistics.layersByType,
      expressions: analysis.statistics.expressionCount,
      filters: analysis.statistics.filterCount,
      paintProperties: analysis.statistics.paintPropertyCount,
      layoutProperties: analysis.statistics.layoutPropertyCount,
      dataDrivenLayers: analysis.statistics.dataDrivenLayerCount,
    },
    diagnostics: analysis.diagnostics.map((d) => ({
      severity: d.severity,
      code: d.code,
      message: d.message,
      path: d.path,
      suggestion: d.suggestion ?? null,
    })),
    errors: analysis.errorCount,
    warnings: analysis.warningCount,
    info: analysis.infoCount,
  };

  return JSON.stringify(output, null, 2) + '\n';
}

// ---------------------------------------------------------------------------
// Text Output
// ---------------------------------------------------------------------------

function formatText(file: string, analysis: StyleAnalysis): string {
  const fmt = createOutputFormatter('text');
  const sections: string[] = [];
  const stats = analysis.statistics;

  // Header
  sections.push(fmt.heading(`TileGuard Style — ${file}`));

  // Status line
  const statusSymbol = analysis.valid ? '✓' : '✗';
  const statusText = analysis.valid ? 'Valid' : 'Issues found';
  sections.push(`  ${statusSymbol} ${statusText}\n`);

  // Overview
  sections.push(
    fmt.summary('Overview', [
      ['Version', analysis.document.version ?? 'missing'],
      ['Name', analysis.document.name ?? '(unnamed)'],
      ['Sources', stats.sourceCount],
      ['Layers', stats.layerCount],
      ['Expressions', stats.expressionCount],
      ['Filters', stats.filterCount],
    ]),
  );

  // Sources by type
  if (stats.sourceCount > 0) {
    const sourceEntries = Object.entries(stats.sourcesByType).map(
      ([type, count]): [string, number] => [type, count],
    );
    sections.push(fmt.summary('Sources', sourceEntries));
  }

  // Layers by type
  if (stats.layerCount > 0) {
    const layerEntries = Object.entries(stats.layersByType).map(
      ([type, count]): [string, number] => [type, count],
    );
    sections.push(fmt.summary('Layers', layerEntries));
  }

  // Features
  if (stats.usesSprites || stats.usesGlyphs || stats.usesTerrain) {
    const features: [string, string][] = [];
    if (stats.usesSprites) features.push(['Sprites', 'yes']);
    if (stats.usesGlyphs) features.push(['Glyphs', 'yes']);
    if (stats.usesTerrain) features.push(['Terrain', 'yes']);
    sections.push(fmt.summary('Features', features));
  }

  // Diagnostics
  if (analysis.diagnostics.length > 0) {
    sections.push(
      fmt.summary('Diagnostics', [
        ['Errors', analysis.errorCount],
        ['Warnings', analysis.warningCount],
        ['Info', analysis.infoCount],
      ]),
    );

    sections.push('\nFindings\n' + '─'.repeat(40) + '\n');
    for (const diag of analysis.diagnostics) {
      const icon = severityIcon(diag.severity);
      sections.push(`  ${icon} [${diag.code}] ${diag.message}\n`);
      if (diag.suggestion) {
        sections.push(`    → ${diag.suggestion}\n`);
      }
    }
  }

  return fmt.envelope(sections);
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return '✗';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return '·';
  }
}
