/**
 * @tileguard/reporters — HtmlReporter (Milestone 7 — Step 3)
 *
 * Serialises an EngineeringReport to a self-contained, printable HTML document.
 * No external assets — all CSS is embedded. Pure function — no side effects.
 */

import type { EngineeringReport } from '../models/EngineeringReport.js';
import { escapeHtml, HtmlWriter } from '../utils/HtmlWriter.js';

export function renderHtml(report: EngineeringReport): string {
  const { metadata, overview, comparison, regression, statistics, diagnostics, recommendations } = report;
  const w = new HtmlWriter();
  w.setTitle('TileGuard Engineering Report');

  // ── Title ──────────────────────────────────────────────────────────────────
  w.h1('TileGuard Engineering Report');
  w.meta(
    `Generated: ${metadata.generatedAt} · TileGuard ${metadata.tileguardVersion} · Duration: ${metadata.totalDurationMs}ms`,
  );

  // ── Overview ───────────────────────────────────────────────────────────────
  w.sectionOpen('overview');
  w.h2('Overview');
  const statusBadge = overview.isIdentical
    ? w.badge('IDENTICAL', 'green')
    : w.badge('CHANGED', 'yellow');
  w.statGrid([
    { label: 'Source', value: overview.sourceTile },
    { label: 'Target', value: overview.targetTile },
    { label: 'Status', value: overview.isIdentical ? 'No changes' : 'Differences found' },
    { label: 'Candidates', value: overview.totalCandidates },
    {
      label: 'Confidence',
      value: overview.totalCandidates > 0 ? `${Math.round(overview.overallConfidence * 100)}%` : 'N/A',
    },
    { label: 'Dominant kind', value: overview.dominantKind ?? 'N/A' },
  ]);
  w.p(`Status: ${statusBadge}`);
  w.sectionClose();

  // ── Comparison ─────────────────────────────────────────────────────────────
  w.sectionOpen('comparison');
  w.h2('Comparison');

  w.h3('Feature Changes');
  w.statGrid([
    { label: 'Added', value: overview.featureChangeSummary.added },
    { label: 'Removed', value: overview.featureChangeSummary.removed },
    { label: 'Modified', value: overview.featureChangeSummary.modified },
    { label: 'Unchanged', value: overview.featureChangeSummary.unchanged },
  ]);

  w.h3('Layer Changes');
  w.table(
    ['Added', 'Removed', 'Modified'],
    [[
      String(comparison.layers.added),
      String(comparison.layers.removed),
      String(comparison.layers.modified),
    ]],
  );

  w.h3('Statistics Delta');
  w.table(
    ['Metric', 'Before (A)', 'After (B)', 'Delta'],
    [
      ['Layers', String(comparison.stats.layersA), String(comparison.stats.layersB), fmtDelta(comparison.stats.layersB - comparison.stats.layersA)],
      ['Features', String(comparison.stats.featuresA), String(comparison.stats.featuresB), fmtDelta(comparison.stats.featuresB - comparison.stats.featuresA)],
      ['Vertices', String(comparison.stats.verticesA), String(comparison.stats.verticesB), fmtDelta(comparison.stats.verticesB - comparison.stats.verticesA)],
      ['Diagnostics', String(comparison.stats.diagnosticsA), String(comparison.stats.diagnosticsB), fmtDelta(comparison.stats.diagnosticsB - comparison.stats.diagnosticsA)],
    ],
  );
  w.sectionClose();

  // ── Regression Analysis ────────────────────────────────────────────────────
  w.sectionOpen('regression');
  w.h2('Regression Analysis');

  if (regression.isClean) {
    w.p(`${w.badge('CLEAN', 'green')} No regression candidates found across ${regression.totalFeatures} features.`);
  } else {
    w.p(
      `${w.badge('REGRESSIONS FOUND', 'red')} ` +
      `<strong>${regression.totalCandidates}</strong> candidate(s) found · ` +
      `Overall confidence: <strong>${Math.round(regression.overallConfidence * 100)}%</strong>`,
    );

    for (let i = 0; i < regression.candidates.length; i++) {
      const c = regression.candidates[i]!;
      const label = `${c.layerName}${c.featureId !== undefined ? ` #${c.featureId}` : ''}`;
      w._bodyPush(`<div class="candidate">`);
      w.confidenceBar(`${i + 1}. ${label} · ${c.kind}`, c.confidence);
      w.table(
        ['Field', 'Value'],
        [
          ['Layer', escapeHtml(c.layerName)],
          ['Kind', escapeHtml(c.kind)],
          ['Confidence', `${Math.round(c.confidence * 100)}%`],
          ['Top reason', escapeHtml(c.topReason)],
        ],
      );
      if (c.evidenceLabels.length > 0) {
        w.h3('Evidence');
        w.evidenceList(c.evidenceLabels);
      }
      if (c.timelineLabels.length > 0) {
        w.h3('Impact Narrative');
        w.ol(c.timelineLabels.map((l) => escapeHtml(l)));
      }
      w._bodyPush('</div>');
    }
  }
  w.sectionClose();

  // ── Diagnostics ────────────────────────────────────────────────────────────
  w.sectionOpen('diagnostics');
  w.h2('Diagnostics');
  w.statGrid([
    { label: 'Errors (A→B)', value: `${diagnostics.countA.errors} → ${diagnostics.countB.errors}` },
    { label: 'Warnings (A→B)', value: `${diagnostics.countA.warnings} → ${diagnostics.countB.warnings}` },
    { label: 'New', value: diagnostics.newDiagnostics.length },
    { label: 'Resolved', value: diagnostics.resolvedDiagnostics.length },
  ]);

  if (diagnostics.newDiagnostics.length > 0) {
    w.h3('New Diagnostics');
    w.table(
      ['Rule', 'Severity', 'Message'],
      diagnostics.newDiagnostics.map((d) => [
        `<code>${escapeHtml(d.ruleId)}</code>`,
        w.badge(d.severity, d.severity === 'error' ? 'red' : d.severity === 'warning' ? 'yellow' : 'blue'),
        escapeHtml(d.message.slice(0, 100) + (d.message.length > 100 ? '…' : '')),
      ]),
    );
  }

  if (diagnostics.resolvedDiagnostics.length > 0) {
    w.h3('Resolved Diagnostics');
    w.table(
      ['Rule', 'Severity'],
      diagnostics.resolvedDiagnostics.map((d) => [
        `<code>${escapeHtml(d.ruleId)}</code>`,
        w.badge(d.severity, 'green'),
      ]),
    );
  }
  w.sectionClose();

  // ── Statistics ─────────────────────────────────────────────────────────────
  w.sectionOpen('statistics');
  w.h2('Statistics');
  w.statGrid([
    { label: 'Layers A', value: statistics.layersA },
    { label: 'Layers B', value: statistics.layersB },
    { label: 'Features A', value: statistics.featuresA },
    { label: 'Features B', value: statistics.featuresB },
    { label: 'Vertices A', value: statistics.verticesA },
    { label: 'Vertices B', value: statistics.verticesB },
  ]);
  w.sectionClose();

  // ── Recommendations ────────────────────────────────────────────────────────
  w.sectionOpen('recommendations');
  w.h2('Recommendations');
  if (recommendations.items.length === 0) {
    w.p('No recommendations generated.');
  } else {
    w.ol(recommendations.items.map((r) => escapeHtml(r)));
  }

  if (recommendations.notes.length > 0) {
    w.h3('Engineer Notes');
    w.ul(recommendations.notes.map((n) => escapeHtml(n)));
  } else {
    w.blockquote('No engineer notes. Add notes here before sharing this report.');
  }
  w.sectionClose();

  return w.build();
}

// ---------------------------------------------------------------------------
// Delta helper
// ---------------------------------------------------------------------------

function fmtDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return String(n);
  return '0';
}
