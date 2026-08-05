/**
 * @tileguard/reporters — MarkdownReporter (Milestone 7 — Step 3)
 *
 * Serialises an EngineeringReport to GitHub-flavoured Markdown.
 * Pure function — no side effects, no I/O.
 */

import type { EngineeringReport } from '../models/EngineeringReport.js';
import { MarkdownWriter } from '../utils/MarkdownWriter.js';

export function renderMarkdown(report: EngineeringReport): string {
  const md = new MarkdownWriter();
  const { metadata, overview, comparison, regression, statistics, diagnostics, recommendations } = report;

  // ── Title ──────────────────────────────────────────────────────────────────
  md.h1('TileGuard Engineering Report');
  md.p(
    `Generated: ${metadata.generatedAt}  |  ` +
    `TileGuard ${metadata.tileguardVersion}  |  ` +
    `Duration: ${metadata.totalDurationMs}ms`,
  );
  md.hr();

  // ── Overview ───────────────────────────────────────────────────────────────
  md.h2('Overview');
  md.table(
    ['Field', 'Value'],
    [
      ['Source tile', md.code(overview.sourceTile)],
      ['Target tile', md.code(overview.targetTile)],
      ['Status', overview.isIdentical ? md.badge('IDENTICAL', 'No changes', 'green') : md.badge('CHANGED', 'Differences found', 'yellow')],
      ['Regression candidates', String(overview.totalCandidates)],
      ['Overall confidence', overview.totalCandidates > 0 ? `${Math.round(overview.overallConfidence * 100)}%` : 'N/A'],
      ['Dominant kind', overview.dominantKind ?? 'N/A'],
    ],
  );

  // ── Comparison ─────────────────────────────────────────────────────────────
  md.h2('Comparison');
  md.h3('Feature Changes');
  md.table(
    ['Category', 'Count'],
    [
      ['Added', String(comparison.features.added)],
      ['Removed', String(comparison.features.removed)],
      ['Modified', String(comparison.features.modified)],
      ['Unchanged', String(comparison.features.unchanged)],
    ],
  );

  md.h3('Layer Changes');
  md.table(
    ['Category', 'Count'],
    [
      ['Added', String(comparison.layers.added)],
      ['Removed', String(comparison.layers.removed)],
      ['Modified', String(comparison.layers.modified)],
    ],
  );

  md.h3('Statistics Delta');
  md.table(
    ['Metric', 'Before (A)', 'After (B)', 'Delta'],
    [
      ['Layers', String(comparison.stats.layersA), String(comparison.stats.layersB), delta(comparison.stats.layersB - comparison.stats.layersA)],
      ['Features', String(comparison.stats.featuresA), String(comparison.stats.featuresB), delta(comparison.stats.featuresB - comparison.stats.featuresA)],
      ['Vertices', String(comparison.stats.verticesA), String(comparison.stats.verticesB), delta(comparison.stats.verticesB - comparison.stats.verticesA)],
      ['Diagnostics', String(comparison.stats.diagnosticsA), String(comparison.stats.diagnosticsB), delta(comparison.stats.diagnosticsB - comparison.stats.diagnosticsA)],
    ],
  );

  // ── Regression Analysis ────────────────────────────────────────────────────
  md.h2('Regression Analysis');

  if (regression.isClean) {
    md.p(md.badge('CLEAN', 'No regression candidates found', 'green'));
  } else {
    md.p(
      `${md.bold(String(regression.totalCandidates))} candidate(s) found across ` +
      `${md.bold(String(regression.totalFeatures))} features analysed. ` +
      `Overall confidence: ${md.bold(Math.round(regression.overallConfidence * 100) + '%')}.`,
    );

    regression.candidates.forEach((c, i) => {
      md.h3(`Candidate ${i + 1}: ${c.layerName}${c.featureId !== undefined ? ` #${c.featureId}` : ''}`);
      md.table(
        ['Field', 'Value'],
        [
          ['Kind', c.kind],
          ['Confidence', `${Math.round(c.confidence * 100)}%`],
          ['Top reason', c.topReason],
        ],
      );
      if (c.evidenceLabels.length > 0) {
        md.h4('Evidence');
        md.ul(c.evidenceLabels);
      }
      if (c.timelineLabels.length > 0) {
        md.h4('Impact Narrative');
        md.ol(c.timelineLabels);
      }
    });
  }

  // ── Diagnostics ────────────────────────────────────────────────────────────
  md.h2('Diagnostics');
  md.h3('Counts');
  md.table(
    ['Severity', 'Before (A)', 'After (B)'],
    [
      ['Errors', String(diagnostics.countA.errors), String(diagnostics.countB.errors)],
      ['Warnings', String(diagnostics.countA.warnings), String(diagnostics.countB.warnings)],
      ['Info', String(diagnostics.countA.info), String(diagnostics.countB.info)],
    ],
  );

  if (diagnostics.newDiagnostics.length > 0) {
    md.h3('New Diagnostics');
    md.table(
      ['Rule', 'Severity', 'Message'],
      diagnostics.newDiagnostics.map((d) => [
        md.code(d.ruleId),
        d.severity,
        d.message.slice(0, 80) + (d.message.length > 80 ? '…' : ''),
      ]),
    );
  }

  if (diagnostics.resolvedDiagnostics.length > 0) {
    md.h3('Resolved Diagnostics');
    md.table(
      ['Rule', 'Severity'],
      diagnostics.resolvedDiagnostics.map((d) => [md.code(d.ruleId), d.severity]),
    );
  }

  // ── Statistics ─────────────────────────────────────────────────────────────
  md.h2('Statistics');
  md.table(
    ['Metric', 'Before (A)', 'After (B)'],
    [
      ['Layers', String(statistics.layersA), String(statistics.layersB)],
      ['Features', String(statistics.featuresA), String(statistics.featuresB)],
      ['Vertices', String(statistics.verticesA), String(statistics.verticesB)],
      ['Diagnostics', String(statistics.diagnosticsA), String(statistics.diagnosticsB)],
    ],
  );

  // ── Recommendations ────────────────────────────────────────────────────────
  md.h2('Recommendations');
  if (recommendations.items.length === 0) {
    md.p('No recommendations generated.');
  } else {
    md.ol(recommendations.items);
  }

  if (recommendations.notes.length > 0) {
    md.h3('Engineer Notes');
    md.ul(recommendations.notes);
  } else {
    md.blockquote('No engineer notes. Add notes here before sharing this report.');
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  md.hr();
  md.p(`_Report generated by [TileGuard](https://github.com/shreeharshshinde/tileguard) · ${metadata.generatedAt}_`);

  return md.build();
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function delta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return String(n);
  return '0';
}
