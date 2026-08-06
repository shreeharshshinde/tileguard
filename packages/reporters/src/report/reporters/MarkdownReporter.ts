/**
 * @tileguard/reporters — MarkdownReporter (Milestone 7.3 — Engineering Report UX)
 *
 * Serialises an EngineeringReport to GitHub-flavoured Markdown.
 *
 * Report structure (Milestone 7.3):
 *   1. Executive Summary       — status card + quick metrics
 *   2. Key Findings            — top 5–7 auto-derived findings
 *   3. Overview                — comparison header (legacy section — tests rely on ## Overview)
 *   4. Layer Impact            — per-layer change table
 *   5. Regression Highlights   — top-N candidates with confidence
 *   6. Diagnostics             — new/resolved/persistent + top rules
 *   7. Statistics              — before/after/delta table
 *   8. Recommendations         — prioritised with evidence
 *   9. Comparison (legacy)     — full feature/layer/stats tables (legacy section)
 *   Appendix                   — full detail inside <details> elements
 *
 * Pure function — no side effects, no I/O.
 */

import type { EngineeringReport, PrioritizedRecommendation, RegressionHighlight } from '../models/EngineeringReport.js';
import { MarkdownWriter } from '../utils/MarkdownWriter.js';

const STATUS_EMOJI: Record<string, string> = {
  'identical': '✅',
  'changes-detected': '⚠️',
  'regressions-found': '🔴',
  'clean': '✅',
};

const RISK_EMOJI: Record<string, string> = {
  'none': '✅',
  'low': '🟡',
  'medium': '🟠',
  'high': '🔴',
  'critical': '🚨',
};

export function renderMarkdown(report: EngineeringReport): string {
  const md = new MarkdownWriter();
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE + METADATA HEADER
  // ═══════════════════════════════════════════════════════════════════════════

  md.h1('TileGuard Engineering Report');
  md.p(
    `**Generated:** ${metadata.generatedAt}  |  ` +
    `**TileGuard:** ${metadata.tileguardVersion}  |  ` +
    `**Duration:** ${metadata.totalDurationMs}ms  |  ` +
    `**Engine:** Analysis`,
  );
  md.hr();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Executive Summary');

  const statusIcon = STATUS_EMOJI[executiveSummary.status] ?? '⬜';
  const riskIcon = RISK_EMOJI[executiveSummary.regressionRisk] ?? '⬜';
  const statusLabel = executiveSummary.status.replace(/-/g, ' ').toUpperCase();
  const riskLabel = executiveSummary.regressionRisk.toUpperCase();

  md.p(
    `${statusIcon} **Status:** ${statusLabel}  |  ` +
    `${riskIcon} **Regression Risk:** ${riskLabel}  |  ` +
    `**Duration:** ${executiveSummary.durationMs}ms`,
  );

  md.p(
    `**Compared:** \`${executiveSummary.sourceTile}\` → \`${executiveSummary.targetTile}\``,
  );

  const m = executiveSummary.metrics;
  md.table(
    ['Metric', 'Value'],
    [
      ['Layers Changed', String(m.layersChanged)],
      ['Features Added', `+${m.featuresAdded.toLocaleString()}`],
      ['Features Modified', `~${m.featuresModified.toLocaleString()}`],
      ['Features Removed', `-${m.featuresRemoved.toLocaleString()}`],
      ['Regression Candidates', String(m.regressionCandidates)],
      ['New Diagnostics', String(m.newDiagnostics)],
      ['Overall Confidence', m.regressionCandidates > 0 ? `${m.overallConfidencePct}%` : 'N/A'],
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — KEY FINDINGS
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Key Findings');

  if (keyFindings.length === 0) {
    md.p('No significant findings. Tile appears healthy.');
  } else {
    const sevEmoji: Record<string, string> = {
      critical: '🚨',
      high: '🔴',
      medium: '🟠',
      low: '🟡',
      info: '🔵',
    };
    for (const f of keyFindings) {
      const icon = sevEmoji[f.severity] ?? '⬜';
      md.p(`${icon} **${f.rank}. ${f.title}**  \n> ${f.description}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — OVERVIEW  (kept for test compatibility: ## Overview)
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Overview');
  md.table(
    ['Field', 'Value'],
    [
      ['Source tile', md.code(overview.sourceTile)],
      ['Target tile', md.code(overview.targetTile)],
      ['Status', overview.isIdentical ? '✅ **IDENTICAL** — No changes' : '⚠️ **CHANGED** — Differences found'],
      ['Regression candidates', String(overview.totalCandidates)],
      ['Overall confidence', overview.totalCandidates > 0 ? `${Math.round(overview.overallConfidence * 100)}%` : 'N/A'],
      ['Dominant kind', overview.dominantKind ?? 'N/A'],
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — LAYER IMPACT
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Layer Impact');

  if (layerImpact.length === 0) {
    md.p('No per-layer data available.');
  } else {
    md.table(
      ['Layer', 'Added (+)', 'Modified (~)', 'Removed (-)'],
      layerImpact.map(l => [
        md.bold(l.layerName),
        l.added > 0 ? `+${l.added.toLocaleString()}` : '—',
        l.modified > 0 ? `~${l.modified.toLocaleString()}` : '—',
        l.removed > 0 ? `-${l.removed.toLocaleString()}` : '—',
      ]),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — REGRESSION HIGHLIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Regression Analysis');

  if (regressionHighlights.isClean) {
    md.p('✅ **CLEAN** — No regression candidates found across ' + regression.totalFeatures.toLocaleString() + ' features.');
  } else {
    md.p(
      `🔴 **${regressionHighlights.totalCandidates}** candidate(s) detected  |  ` +
      `Overall confidence: **${regressionHighlights.overallConfidencePct}%**` +
      (regressionHighlights.dominantKind ? `  |  Dominant pattern: **${regressionHighlights.dominantKind}**` : ''),
    );

    // Confidence bar helper (text)
    const confBar = (pct: number): string => {
      const filled = Math.round(pct / 10);
      const empty = 10 - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const level = pct >= 80 ? 'HIGH' : pct >= 50 ? 'MEDIUM' : 'LOW';
      return `\`${bar}\` ${pct}% ${level}`;
    };

    md.h3('Regression Highlights');
    for (const c of regressionHighlights.topCandidates) {
      renderCandidateInline(md, c, confBar);
    }

    if (regressionHighlights.remainingCandidates.length > 0) {
      md.p(`> 📎 **${regressionHighlights.remainingCandidates.length}** additional candidate(s) in [Appendix F](#appendix-f--all-regression-candidates).`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — DIAGNOSTICS  (## Diagnostics — test compatibility)
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Diagnostics');

  // New/Resolved/Persistent summary
  md.table(
    ['Category', 'Count'],
    [
      ['🆕 New', String(diagnosticsSummary.newCount)],
      ['✅ Resolved', String(diagnosticsSummary.resolvedCount)],
      ['⏳ Persistent (estimated)', String(diagnosticsSummary.persistentCount)],
    ],
  );

  if (diagnosticsSummary.topRules.length > 0) {
    md.h3('Top Rules');
    md.table(
      ['Rule', 'Count', 'Severity'],
      diagnosticsSummary.topRules.map(r => [
        md.code(r.ruleId),
        String(r.count),
        r.severity,
      ]),
    );
  }

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

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — STATISTICS  (## Statistics — test compatibility)
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Statistics');

  md.table(
    ['Metric', 'Before', 'After', 'Δ'],
    [
      ['Layers', String(statisticsDashboard.layersA), String(statisticsDashboard.layersB), fmt(statisticsDashboard.layersDelta)],
      ['Features', n(statisticsDashboard.featuresA), n(statisticsDashboard.featuresB), fmt(statisticsDashboard.featuresDelta)],
      ['Vertices', n(statisticsDashboard.verticesA), n(statisticsDashboard.verticesB), fmt(statisticsDashboard.verticesDelta)],
      ['Diagnostics', String(statisticsDashboard.diagnosticsA), String(statisticsDashboard.diagnosticsB), fmt(statisticsDashboard.diagnosticsDelta)],
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — RECOMMENDATIONS  (## Recommendations — test compatibility)
  // ═══════════════════════════════════════════════════════════════════════════

  md.h2('Recommendations');

  if (prioritizedRecommendations.length === 0 && recommendations.items.length === 0) {
    md.p('No recommendations generated.');
  } else if (prioritizedRecommendations.length > 0) {
    renderPrioritizedRecs(md, prioritizedRecommendations);
  } else {
    md.ol(recommendations.items);
  }

  if (recommendations.notes.length > 0) {
    md.h3('Engineer Notes');
    md.ul(recommendations.notes);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9 — COMPARISON (legacy — test compatibility: ## Comparison)
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // APPENDIX — full detail in collapsible <details> elements
  // ═══════════════════════════════════════════════════════════════════════════

  md.hr();
  md.h2('Appendix');

  // A — Added features
  renderAppendixGroup(md, 'A — Added Features', appendix.addedByLayer, comparison.features.added);

  // B — Modified features
  renderAppendixGroup(md, 'B — Modified Features', appendix.modifiedByLayer, comparison.features.modified);

  // C — Removed features
  renderAppendixGroup(md, 'C — Removed Features', appendix.removedByLayer, comparison.features.removed);

  // D — All diagnostics
  if (appendix.allNewDiagnostics.length > 0) {
    renderDiagnosticsAppendix(md, appendix.allNewDiagnostics);
  }

  // E — Raw statistics
  md.p('<details>\n<summary><strong>E — Raw Statistics</strong></summary>\n');
  md.table(
    ['Metric', 'Before', 'After', 'Δ'],
    [
      ['Layers', String(appendix.rawStatistics.layersA), String(appendix.rawStatistics.layersB), fmt(appendix.rawStatistics.layersDelta)],
      ['Features', n(appendix.rawStatistics.featuresA), n(appendix.rawStatistics.featuresB), fmt(appendix.rawStatistics.featuresDelta)],
      ['Vertices', n(appendix.rawStatistics.verticesA), n(appendix.rawStatistics.verticesB), fmt(appendix.rawStatistics.verticesDelta)],
      ['Diagnostics', String(appendix.rawStatistics.diagnosticsA), String(appendix.rawStatistics.diagnosticsB), fmt(appendix.rawStatistics.diagnosticsDelta)],
    ],
  );
  md.p('</details>\n');

  // F — All regression candidates
  if (appendix.allCandidates.length > 0) {
    md.p('<details>\n<summary><strong>F — All Regression Candidates (' + appendix.allCandidates.length + ')</strong></summary>\n');
    md.table(
      ['#', 'Layer', 'Feature', 'Kind', 'Confidence', 'Top Reason'],
      appendix.allCandidates.map((c, i) => [
        String(i + 1),
        c.layerName,
        c.featureId !== undefined ? String(c.featureId) : '—',
        c.kind,
        `${Math.round(c.confidence * 100)}%`,
        c.topReason.slice(0, 60) + (c.topReason.length > 60 ? '…' : ''),
      ]),
    );
    md.p('</details>\n');
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  md.hr();
  md.p(`_Report generated by [TileGuard](https://github.com/shreeharshshinde/tileguard) v${metadata.tileguardVersion} · ${metadata.generatedAt}_`);

  return md.build();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n > 0) return `**+${n.toLocaleString()}**`;
  if (n < 0) return `**${n.toLocaleString()}**`;
  return '0';
}

function n(val: number): string {
  return val.toLocaleString();
}

function renderCandidateInline(
  md: MarkdownWriter,
  c: RegressionHighlight,
  confBar: (pct: number) => string,
): void {
  const label = `${c.layerName}${c.featureId !== undefined ? ` #${c.featureId}` : ''}`;
  md.h4(`${c.rank}. ${label} — ${c.kind}`);
  md.p(`Confidence: ${confBar(c.confidencePct)}`);
  md.p(`**Top reason:** ${c.topReason}`);
  if (c.evidenceLabels.length > 0) {
    md.ul(c.evidenceLabels);
  }
}

function renderPrioritizedRecs(
  md: MarkdownWriter,
  recs: readonly PrioritizedRecommendation[],
): void {
  const priorityEmoji: Record<string, string> = { HIGH: '🔴', MEDIUM: '🟠', LOW: '🟡' };

  for (const r of recs) {
    const icon = priorityEmoji[r.priority] ?? '⬜';
    md.h3(`${icon} ${r.priority}: ${r.title}`);
    md.p(`**Reason:** ${r.reason}`);
    if (r.affectedLayers.length > 0) {
      md.p(`**Affected layers:** ${r.affectedLayers.join(', ')}`);
    }
    if (r.evidence.length > 0) {
      md.p('**Evidence:**');
      md.ul(r.evidence);
    }
    if (r.actions.length > 0) {
      md.p('**Actions:**');
      md.ol(r.actions);
    }
  }
}

function renderAppendixGroup(
  md: MarkdownWriter,
  title: string,
  groups: readonly { layerName: string; count: number; examples: readonly string[] }[],
  fallbackTotal: number,
): void {
  if (groups.length > 0) {
    const total = groups.reduce((s, g) => s + g.count, 0);
    md.p(`<details>\n<summary><strong>${title} (${total.toLocaleString()})</strong></summary>\n`);
    md.table(
      ['Layer', 'Count', 'Examples'],
      groups.map(g => [
        g.layerName,
        g.count.toLocaleString(),
        g.examples.slice(0, 5).join(', ') || '—',
      ]),
    );
    md.p('</details>\n');
  } else if (fallbackTotal > 0) {
    md.p(`<details>\n<summary><strong>${title} (${fallbackTotal.toLocaleString()})</strong></summary>\n`);
    md.p('_Per-layer breakdown not available. Provide `layerStats` in ComparisonInput for detail._');
    md.p('</details>\n');
  }
}

function renderDiagnosticsAppendix(md: MarkdownWriter, diags: readonly { ruleId: string; severity: string; message: string }[]): void {
  md.p(`<details>\n<summary><strong>D — All New Diagnostics (${diags.length})</strong></summary>\n`);
  md.table(
    ['Rule', 'Severity', 'Message'],
    diags.map(d => [
      md.code(d.ruleId),
      d.severity,
      d.message.slice(0, 100) + (d.message.length > 100 ? '…' : ''),
    ]),
  );
  md.p('</details>\n');
}
