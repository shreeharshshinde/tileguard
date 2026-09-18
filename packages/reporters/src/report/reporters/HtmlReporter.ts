/**
 * @tileguard/reporters — HtmlReporter (Milestone 7.3 — Engineering Report UX)
 *
 * Serialises an EngineeringReport to a self-contained, printable HTML dashboard.
 * No external assets — all CSS is embedded. Pure function — no side effects.
 *
 * Dashboard structure (Milestone 7.3):
 *   - Sticky sidebar navigation
 *   - Executive Summary with status/risk cards
 *   - Key Findings with severity colour-coding
 *   - Overview section (id="overview" — test compat)
 *   - Layer Impact table
 *   - Regression Analysis section (id="regression" — test compat)
 *   - Diagnostics section (id="diagnostics" — test compat)
 *   - Statistics section (id="statistics" — test compat)
 *   - Recommendations section (id="recommendations" — test compat)
 *   - Comparison section (id="comparison" — test compat)
 *   - Appendix with collapsible panels
 *   - Dark mode + print CSS
 */

import type { EngineeringReport } from '../models/EngineeringReport.js';
import { escapeHtml, HtmlWriter } from '../utils/HtmlWriter.js';

const STATUS_COLORS: Record<
  string,
  'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'grey'
> = {
  identical: 'green',
  clean: 'green',
  'changes-detected': 'yellow',
  'regressions-found': 'red',
};

const RISK_COLORS: Record<
  string,
  'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'grey'
> = {
  none: 'green',
  low: 'blue',
  medium: 'yellow',
  high: 'red',
  critical: 'red',
};

export function renderHtml(report: EngineeringReport): string {
  const {
    metadata,
    overview,
    comparison,
    regression,
    statistics,
    diagnostics,
    recommendations,
    executiveSummary,
    keyFindings,
    layerImpact,
    regressionHighlights,
    diagnosticsSummary,
    statisticsDashboard,
    prioritizedRecommendations,
    appendix,
  } = report;

  const w = new HtmlWriter();
  w.setTitle('TileGuard Engineering Report');
  w.setVersion(metadata.tileguardVersion);
  w.setTimestamp(metadata.generatedAt);

  // Register sidebar nav links
  w.addNavLink('executive-summary', '📋 Executive Summary');
  w.addNavLink('key-findings', '🔍 Key Findings');
  w.addNavLink('overview', '📊 Overview');
  w.addNavLink('layer-impact', '📐 Layer Impact');
  w.addNavLink('regression', '🔬 Regression Analysis');
  w.addNavLink('diagnostics', '🩺 Diagnostics');
  w.addNavLink('statistics', '📈 Statistics');
  w.addNavLink('recommendations', '💡 Recommendations');
  w.addNavLink('comparison', '🔄 Comparison');
  w.addNavLink('appendix', '📎 Appendix');

  // ── Title ──────────────────────────────────────────────────────────────────
  w.h1('TileGuard Engineering Report');
  w.metaBar([
    { label: 'Generated:', value: metadata.generatedAt },
    { label: 'TileGuard:', value: metadata.tileguardVersion },
    { label: 'Duration:', value: `${metadata.totalDurationMs}ms` },
    { label: 'Source:', value: metadata.sourceTile },
    { label: 'Target:', value: metadata.targetTile },
  ]);

  // Investigation metadata (collapsible — matches Markdown format)
  const metaFields: Array<{ label: string; value: string }> = [
    { label: 'Report ID', value: metadata.reportId ?? '—' },
    { label: 'Generated', value: metadata.generatedAt },
    { label: 'TileGuard Version', value: metadata.tileguardVersion },
    { label: 'Duration', value: `${metadata.totalDurationMs}ms` },
    { label: 'Source Tile', value: metadata.sourceTile },
    { label: 'Target Tile', value: metadata.targetTile },
  ];
  if (metadata.platform)
    metaFields.push({ label: 'Platform', value: metadata.platform });
  if (metadata.nodeVersion)
    metaFields.push({ label: 'Node.js', value: metadata.nodeVersion });
  if (metadata.cliVersion)
    metaFields.push({ label: 'CLI Version', value: metadata.cliVersion });
  if (metadata.configPath)
    metaFields.push({ label: 'Config', value: metadata.configPath });
  if (metadata.sourceTileHash)
    metaFields.push({ label: 'Source Hash', value: metadata.sourceTileHash });
  if (metadata.targetTileHash)
    metaFields.push({ label: 'Target Hash', value: metadata.targetTileHash });
  w.investigationMeta(metaFields);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('executive-summary');
  w.h2('Executive Summary');

  w.statusBar([
    {
      label: executiveSummary.status.replace(/-/g, ' ').toUpperCase(),
      color: STATUS_COLORS[executiveSummary.status] ?? 'grey',
    },
    {
      label: `RISK: ${executiveSummary.regressionRisk.toUpperCase()}`,
      color: RISK_COLORS[executiveSummary.regressionRisk] ?? 'grey',
    },
    {
      label: `${executiveSummary.durationMs}ms`,
      color: 'grey',
    },
  ]);

  const m = executiveSummary.metrics;
  w.statGrid([
    { label: 'Layers Changed', value: m.layersChanged },
    {
      label: 'Features Added',
      value: `+${m.featuresAdded.toLocaleString()}`,
      highlight: m.featuresAdded > 0,
    },
    {
      label: 'Features Modified',
      value: `~${m.featuresModified.toLocaleString()}`,
    },
    {
      label: 'Features Removed',
      value: `-${m.featuresRemoved.toLocaleString()}`,
      highlight: m.featuresRemoved > 0,
    },
    {
      label: 'Regression Candidates',
      value: m.regressionCandidates,
      highlight: m.regressionCandidates > 0,
    },
    {
      label: 'New Diagnostics',
      value: m.newDiagnostics,
      highlight: m.newDiagnostics > 0,
    },
    {
      label: 'Overall Confidence',
      value: m.regressionCandidates > 0 ? `${m.overallConfidencePct}%` : 'N/A',
    },
  ]);

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — KEY FINDINGS
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('key-findings');
  w.h2('Key Findings');

  if (keyFindings.length === 0) {
    w.p('No significant findings. Tile appears healthy.');
  } else {
    for (const f of keyFindings) {
      w.findingCard(f.rank, f.severity, f.title, f.description);
    }
  }

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — OVERVIEW  (id="overview" — test compat)
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('overview');
  w.h2('Overview');

  const statusBadge = overview.isIdentical
    ? w.badge('IDENTICAL', 'green')
    : w.badge('CHANGED', 'yellow');

  w.statGrid([
    { label: 'Source', value: overview.sourceTile },
    { label: 'Target', value: overview.targetTile },
    { label: 'Regression Candidates', value: overview.totalCandidates },
    {
      label: 'Overall Confidence',
      value:
        overview.totalCandidates > 0
          ? `${Math.round(overview.overallConfidence * 100)}%`
          : 'N/A',
    },
    { label: 'Dominant Kind', value: overview.dominantKind ?? 'N/A' },
  ]);

  w.p(`Status: ${statusBadge}`);
  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — LAYER IMPACT
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('layer-impact');
  w.h2('Layer Impact');

  if (layerImpact.length === 0) {
    w.p('No per-layer data available.');
  } else {
    w.table(
      ['Layer', 'Added (+)', 'Modified (~)', 'Removed (-)'],
      layerImpact.map((l) => [
        escapeHtml(l.layerName),
        l.added > 0 ? w.badge(`+${l.added.toLocaleString()}`, 'green') : '—',
        l.modified > 0
          ? w.badge(`~${l.modified.toLocaleString()}`, 'yellow')
          : '—',
        l.removed > 0 ? w.badge(`-${l.removed.toLocaleString()}`, 'red') : '—',
      ]),
    );
  }

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — REGRESSION ANALYSIS  (id="regression" — test compat)
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('regression');
  w.h2('Regression Analysis');

  if (regressionHighlights.isClean) {
    w.p(
      `${w.badge('CLEAN', 'green')} No regression candidates found across ` +
        `${regression.totalFeatures.toLocaleString()} features.`,
    );
  } else {
    w.p(
      `${w.badge('REGRESSIONS FOUND', 'red')} ` +
        `<strong>${regressionHighlights.totalCandidates}</strong> candidate(s) · ` +
        `Overall confidence: <strong>${regressionHighlights.overallConfidencePct}%</strong>` +
        (regressionHighlights.dominantKind
          ? ` · Dominant pattern: ${w.badge(regressionHighlights.dominantKind, 'orange')}`
          : ''),
    );

    w.h3('Top Candidates');
    for (const c of regressionHighlights.topCandidates) {
      const label = `${c.layerName}${c.featureId !== undefined ? ` #${c.featureId}` : ''}`;
      w.candidateCard(
        c.rank,
        label,
        c.kind,
        c.confidencePct,
        c.topReason,
        c.evidenceLabels,
      );
    }

    if (regressionHighlights.remainingCandidates.length > 0) {
      w.p(
        `<em>${regressionHighlights.remainingCandidates.length} additional candidate(s) in ` +
          `<a href="#appendix">Appendix F</a>.</em>`,
      );
    }
  }

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — DIAGNOSTICS  (id="diagnostics" — test compat)
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('diagnostics');
  w.h2('Diagnostics');

  w.statGrid([
    {
      label: '🆕 New',
      value: diagnosticsSummary.newCount,
      highlight: diagnosticsSummary.newCount > 0,
    },
    { label: '✅ Resolved', value: diagnosticsSummary.resolvedCount },
    {
      label: '⏳ Persistent (est.)',
      value: diagnosticsSummary.persistentCount,
    },
    { label: 'Total (A)', value: diagnosticsSummary.totalA },
    { label: 'Total (B)', value: diagnosticsSummary.totalB },
  ]);

  if (diagnosticsSummary.topRules.length > 0) {
    w.h3('Top Rules');
    w.barChart(
      diagnosticsSummary.topRules.map((r) => ({
        label: r.ruleId,
        value: r.count,
        color:
          r.severity === 'error'
            ? ('red' as const)
            : r.severity === 'warning'
              ? ('yellow' as const)
              : ('blue' as const),
      })),
    );
    w.table(
      ['Rule', 'Count', 'Severity'],
      diagnosticsSummary.topRules.map((r) => [
        `<code>${escapeHtml(r.ruleId)}</code>`,
        String(r.count),
        w.badge(
          r.severity,
          r.severity === 'error'
            ? 'red'
            : r.severity === 'warning'
              ? 'yellow'
              : 'blue',
        ),
      ]),
    );
  }

  if (diagnostics.newDiagnostics.length > 0) {
    w.h3('New Diagnostics');
    w.table(
      ['Rule', 'Severity', 'Message'],
      diagnostics.newDiagnostics.map((d) => [
        `<code>${escapeHtml(d.ruleId)}</code>`,
        w.badge(
          d.severity,
          d.severity === 'error'
            ? 'red'
            : d.severity === 'warning'
              ? 'yellow'
              : 'blue',
        ),
        escapeHtml(
          d.message.slice(0, 100) + (d.message.length > 100 ? '…' : ''),
        ),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — STATISTICS  (id="statistics" — test compat)
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('statistics');
  w.h2('Statistics');

  w.table(
    ['Metric', 'Before', 'After', 'Δ'],
    [
      [
        'Layers',
        String(statisticsDashboard.layersA),
        String(statisticsDashboard.layersB),
        fmtDelta(statisticsDashboard.layersDelta, w),
      ],
      [
        'Features',
        statisticsDashboard.featuresA.toLocaleString(),
        statisticsDashboard.featuresB.toLocaleString(),
        fmtDelta(statisticsDashboard.featuresDelta, w),
      ],
      [
        'Vertices',
        statisticsDashboard.verticesA.toLocaleString(),
        statisticsDashboard.verticesB.toLocaleString(),
        fmtDelta(statisticsDashboard.verticesDelta, w),
      ],
      [
        'Diagnostics',
        String(statisticsDashboard.diagnosticsA),
        String(statisticsDashboard.diagnosticsB),
        fmtDelta(statisticsDashboard.diagnosticsDelta, w),
      ],
    ],
  );

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — RECOMMENDATIONS  (id="recommendations" — test compat)
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('recommendations');
  w.h2('Recommendations');

  if (
    prioritizedRecommendations.length === 0 &&
    recommendations.items.length === 0
  ) {
    w.p('No recommendations generated.');
  } else if (prioritizedRecommendations.length > 0) {
    for (const r of prioritizedRecommendations) {
      w.recommendationCard(
        r.priority,
        r.title,
        r.reason,
        r.affectedLayers,
        r.evidence,
        r.actions,
      );
    }
  } else {
    w.ol(recommendations.items.map((i) => escapeHtml(i)));
  }

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9 — COMPARISON  (id="comparison" — test compat)
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('comparison');
  w.h2('Comparison');

  w.h3('Feature Changes');
  w.statGrid([
    { label: 'Added', value: comparison.features.added },
    { label: 'Removed', value: comparison.features.removed },
    { label: 'Modified', value: comparison.features.modified },
    { label: 'Unchanged', value: comparison.features.unchanged },
  ]);

  w.h3('Layer Changes');
  w.table(
    ['Added', 'Removed', 'Modified'],
    [
      [
        String(comparison.layers.added),
        String(comparison.layers.removed),
        String(comparison.layers.modified),
      ],
    ],
  );

  w.h3('Statistics Delta');
  w.table(
    ['Metric', 'Before (A)', 'After (B)', 'Δ'],
    [
      [
        'Layers',
        String(comparison.stats.layersA),
        String(comparison.stats.layersB),
        rawDelta(comparison.stats.layersB - comparison.stats.layersA),
      ],
      [
        'Features',
        String(comparison.stats.featuresA),
        String(comparison.stats.featuresB),
        rawDelta(comparison.stats.featuresB - comparison.stats.featuresA),
      ],
      [
        'Vertices',
        String(comparison.stats.verticesA),
        String(comparison.stats.verticesB),
        rawDelta(comparison.stats.verticesB - comparison.stats.verticesA),
      ],
      [
        'Diagnostics',
        String(comparison.stats.diagnosticsA),
        String(comparison.stats.diagnosticsB),
        rawDelta(comparison.stats.diagnosticsB - comparison.stats.diagnosticsA),
      ],
    ],
  );

  w.sectionClose();

  // ═══════════════════════════════════════════════════════════════════════════
  // APPENDIX — collapsible panels
  // ═══════════════════════════════════════════════════════════════════════════

  w.sectionOpen('appendix');
  w.h2('Appendix');

  // A — Added
  if (appendix.addedByLayer.length > 0) {
    const total = appendix.addedByLayer.reduce((s, g) => s + g.count, 0);
    w.detailsOpen(`A — Added Features (${total.toLocaleString()})`);
    w.table(
      ['Layer', 'Count', 'Examples'],
      appendix.addedByLayer.map((g) => [
        escapeHtml(g.layerName),
        g.count.toLocaleString(),
        g.examples
          .slice(0, 5)
          .map((e) => escapeHtml(e))
          .join(', ') || '—',
      ]),
    );
    w.detailsClose();
  } else if (comparison.features.added > 0) {
    w.detailsOpen(
      `A — Added Features (${comparison.features.added.toLocaleString()})`,
    );
    w.p(
      '<em>Per-layer breakdown not available. Provide <code>layerStats</code> in ComparisonInput for detail.</em>',
    );
    w.detailsClose();
  }

  // B — Modified
  if (appendix.modifiedByLayer.length > 0) {
    const total = appendix.modifiedByLayer.reduce((s, g) => s + g.count, 0);
    w.detailsOpen(`B — Modified Features (${total.toLocaleString()})`);
    w.table(
      ['Layer', 'Count', 'Examples'],
      appendix.modifiedByLayer.map((g) => [
        escapeHtml(g.layerName),
        g.count.toLocaleString(),
        g.examples
          .slice(0, 5)
          .map((e) => escapeHtml(e))
          .join(', ') || '—',
      ]),
    );
    w.detailsClose();
  } else if (comparison.features.modified > 0) {
    w.detailsOpen(
      `B — Modified Features (${comparison.features.modified.toLocaleString()})`,
    );
    w.p('<em>Per-layer breakdown not available.</em>');
    w.detailsClose();
  }

  // C — Removed
  if (appendix.removedByLayer.length > 0) {
    const total = appendix.removedByLayer.reduce((s, g) => s + g.count, 0);
    w.detailsOpen(`C — Removed Features (${total.toLocaleString()})`);
    w.table(
      ['Layer', 'Count', 'Examples'],
      appendix.removedByLayer.map((g) => [
        escapeHtml(g.layerName),
        g.count.toLocaleString(),
        g.examples
          .slice(0, 5)
          .map((e) => escapeHtml(e))
          .join(', ') || '—',
      ]),
    );
    w.detailsClose();
  } else if (comparison.features.removed > 0) {
    w.detailsOpen(
      `C — Removed Features (${comparison.features.removed.toLocaleString()})`,
    );
    w.p('<em>Per-layer breakdown not available.</em>');
    w.detailsClose();
  }

  // D — All new diagnostics
  if (appendix.allNewDiagnostics.length > 0) {
    w.detailsOpen(
      `D — All New Diagnostics (${appendix.allNewDiagnostics.length})`,
    );
    w.table(
      ['Rule', 'Severity', 'Message'],
      appendix.allNewDiagnostics.map((d) => [
        `<code>${escapeHtml(d.ruleId)}</code>`,
        w.badge(
          d.severity,
          d.severity === 'error'
            ? 'red'
            : d.severity === 'warning'
              ? 'yellow'
              : 'blue',
        ),
        escapeHtml(
          d.message.slice(0, 100) + (d.message.length > 100 ? '…' : ''),
        ),
      ]),
    );
    w.detailsClose();
  }

  // E — Raw statistics
  w.detailsOpen('E — Raw Statistics');
  w.table(
    ['Metric', 'Before', 'After', 'Δ'],
    [
      [
        'Layers',
        String(statistics.layersA),
        String(statistics.layersB),
        rawDelta(statistics.layersB - statistics.layersA),
      ],
      [
        'Features',
        String(statistics.featuresA),
        String(statistics.featuresB),
        rawDelta(statistics.featuresB - statistics.featuresA),
      ],
      [
        'Vertices',
        String(statistics.verticesA),
        String(statistics.verticesB),
        rawDelta(statistics.verticesB - statistics.verticesA),
      ],
      [
        'Diagnostics',
        String(statistics.diagnosticsA),
        String(statistics.diagnosticsB),
        rawDelta(statistics.diagnosticsB - statistics.diagnosticsA),
      ],
    ],
  );
  w.detailsClose();

  // F — All regression candidates
  if (appendix.allCandidates.length > 0) {
    w.detailsOpen(
      `F — All Regression Candidates (${appendix.allCandidates.length})`,
    );
    w.table(
      ['#', 'Layer', 'Feature', 'Kind', 'Confidence', 'Top Reason'],
      appendix.allCandidates.map((c, i) => [
        String(i + 1),
        escapeHtml(c.layerName),
        c.featureId !== undefined ? String(c.featureId) : '—',
        escapeHtml(c.kind),
        `${Math.round(c.confidence * 100)}%`,
        escapeHtml(
          c.topReason.slice(0, 60) + (c.topReason.length > 60 ? '…' : ''),
        ),
      ]),
    );
    w.detailsClose();
  }

  w.sectionClose();

  return w.build();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rawDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return String(n);
  return '0';
}

function fmtDelta(n: number, w: HtmlWriter): string {
  if (n > 0) return w.badge(`+${n.toLocaleString()}`, 'green');
  if (n < 0) return w.badge(`${n.toLocaleString()}`, 'red');
  return '0';
}
