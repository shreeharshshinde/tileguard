/**
 * @tileguard/reporters — HtmlWriter (Milestone 7.3 — Engineering Report UX)
 *
 * Fluent builder for self-contained, printable HTML reports.
 * Embeds all CSS inline — no external assets, no JS dependencies.
 * Pure string building — no DOM, no React, no side effects.
 *
 * New in Milestone 7.3:
 *   - Dashboard layout with sticky sidebar navigation
 *   - Cards, stat grids, collapsible <details> panels
 *   - Dark mode (prefers-color-scheme)
 *   - Print-optimised CSS
 *   - Confidence bars with colour thresholds
 */

// ---------------------------------------------------------------------------
// Escape helpers
// ---------------------------------------------------------------------------

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Embedded CSS — full dashboard styles
// ---------------------------------------------------------------------------

const EMBEDDED_CSS = `
/* ── Reset ─────────────────────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ── Design tokens ──────────────────────────────────────────────────────── */
:root{
  --brand:#4361ee;--brand-dark:#3a56d4;
  --bg:#f8f9fa;--surface:#fff;--surface-alt:#f1f3f9;
  --border:#dee2e6;--text:#1a1a2e;--text-muted:#6c757d;
  --green:#155724;--green-bg:#d4edda;
  --yellow:#856404;--yellow-bg:#fff3cd;
  --red:#721c24;--red-bg:#f8d7da;
  --orange:#7d3c00;--orange-bg:#ffe8cc;
  --blue:#004085;--blue-bg:#cce5ff;
  --radius:8px;--shadow:0 1px 3px rgba(0,0,0,.08);
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#0d1117;--surface:#161b22;--surface-alt:#1f2937;
    --border:#30363d;--text:#e6edf3;--text-muted:#8b949e;
    --brand:#58a6ff;--brand-dark:#79b8ff;
    --green:#3fb950;--green-bg:#0d2818;
    --yellow:#d29922;--yellow-bg:#2b1e00;
    --red:#f85149;--red-bg:#2d0f0f;
    --orange:#e3851b;--orange-bg:#2d1500;
    --blue:#58a6ff;--blue-bg:#0d1e35;
  }
}

/* ── Layout ──────────────────────────────────────────────────────────────── */
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:14px;line-height:1.6;color:var(--text);background:var(--bg);
}
.layout{display:flex;min-height:100vh}
.sidebar{
  width:220px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);
  position:sticky;top:0;height:100vh;overflow-y:auto;padding:1.5rem 1rem;
}
.sidebar-brand{font-weight:700;color:var(--brand);font-size:1rem;margin-bottom:1.5rem;display:block}
.sidebar nav a{
  display:block;padding:.35rem .5rem;color:var(--text-muted);text-decoration:none;
  border-radius:4px;font-size:.8rem;margin-bottom:2px;
}
.sidebar nav a:hover{background:var(--surface-alt);color:var(--text)}
.main{flex:1;max-width:900px;padding:2rem 2rem 4rem;overflow:hidden}

/* ── Typography ──────────────────────────────────────────────────────────── */
h1{font-size:1.6rem;color:var(--text);border-bottom:2px solid var(--brand);padding-bottom:.5rem;margin-bottom:1rem}
h2{font-size:1.15rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:.3rem;margin:2rem 0 .75rem}
h3{font-size:.95rem;color:var(--text);margin:1rem 0 .5rem}
p{margin-bottom:.75rem}
a{color:var(--brand);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:'SFMono-Regular',Consolas,monospace;font-size:.85em;background:var(--surface-alt);padding:.1rem .3rem;border-radius:3px;border:1px solid var(--border)}

/* ── Cards / Sections ───────────────────────────────────────────────────── */
.section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.5rem;margin-bottom:1.25rem;box-shadow:var(--shadow)}
.meta-bar{font-size:.8rem;color:var(--text-muted);margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:.5rem .75rem}
.meta-bar span{display:inline-flex;align-items:center;gap:.3rem}

/* ── Status / Risk bar ──────────────────────────────────────────────────── */
.status-bar{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:1rem;align-items:center}
.status-pill{
  padding:.35rem 1rem;border-radius:999px;font-size:.8rem;font-weight:700;
  letter-spacing:.02em;border:1.5px solid currentColor;
}

/* ── Badges ──────────────────────────────────────────────────────────────── */
.badge{display:inline-block;padding:.15rem .55rem;border-radius:4px;font-size:.72rem;font-weight:700;letter-spacing:.03em;vertical-align:middle}
.badge-green{background:var(--green-bg);color:var(--green)}
.badge-yellow{background:var(--yellow-bg);color:var(--yellow)}
.badge-red{background:var(--red-bg);color:var(--red)}
.badge-orange{background:var(--orange-bg);color:var(--orange)}
.badge-blue{background:var(--blue-bg);color:var(--blue)}
.badge-grey{background:var(--surface-alt);color:var(--text-muted)}

/* ── Stat grid ───────────────────────────────────────────────────────────── */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem;margin-bottom:1rem}
.stat-card{background:var(--surface-alt);border:1px solid var(--border);border-radius:6px;padding:.65rem .9rem}
.stat-card .label{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted)}
.stat-card .value{font-size:1.3rem;font-weight:700;color:var(--text);margin-top:.1rem}
.stat-card.highlight .value{color:var(--brand)}

/* ── Tables ──────────────────────────────────────────────────────────────── */
table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:.84rem}
th{background:var(--brand);color:#fff;padding:.45rem .7rem;text-align:left;font-weight:600}
td{padding:.4rem .7rem;border-bottom:1px solid var(--border);vertical-align:top}
tr:nth-child(even) td{background:var(--surface-alt)}
tr:hover td{background:rgba(67,97,238,.05)}

/* ── Key Findings ────────────────────────────────────────────────────────── */
.finding{border-left:3px solid var(--border);padding:.5rem .75rem;margin-bottom:.5rem;border-radius:0 4px 4px 0}
.finding.critical{border-color:var(--red)}
.finding.high{border-color:var(--red)}
.finding.medium{border-color:var(--yellow)}
.finding.low{border-color:var(--orange)}
.finding.info{border-color:var(--blue)}
.finding-title{font-weight:600;font-size:.88rem;margin-bottom:.2rem}
.finding-desc{font-size:.8rem;color:var(--text-muted)}

/* ── Regression candidates ──────────────────────────────────────────────── */
.candidate{border:1px solid var(--border);border-radius:6px;padding:.9rem 1rem;margin-bottom:.75rem;background:var(--surface)}
.candidate-header{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}
.candidate-rank{font-size:.72rem;color:var(--text-muted);min-width:1.5rem;font-weight:700}
.candidate-title{flex:1;font-weight:600;font-size:.9rem}
.conf-bar-wrap{width:100px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;flex-shrink:0}
.conf-bar{height:100%;border-radius:3px}
.conf-pct{font-size:.78rem;font-weight:700;min-width:2.5rem;text-align:right}

/* ── Recommendations ─────────────────────────────────────────────────────── */
.rec{border:1px solid var(--border);border-radius:6px;padding:.9rem 1rem;margin-bottom:.75rem;background:var(--surface)}
.rec-header{display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem}
.rec-priority{font-size:.7rem;font-weight:700;padding:.2rem .5rem;border-radius:3px}
.rec-title{font-weight:600;font-size:.9rem}
.rec-reason{font-size:.82rem;color:var(--text-muted);margin-bottom:.5rem}
.rec-evidence{font-size:.8rem}

/* ── Collapsible appendix ───────────────────────────────────────────────── */
details{border:1px solid var(--border);border-radius:6px;margin-bottom:.75rem;background:var(--surface)}
details>summary{padding:.7rem 1rem;cursor:pointer;font-weight:600;font-size:.88rem;list-style:none;display:flex;align-items:center;gap:.5rem;user-select:none}
details>summary::before{content:'▶';font-size:.7rem;transition:transform .2s;color:var(--text-muted)}
details[open]>summary::before{transform:rotate(90deg)}
details .details-body{padding:.75rem 1rem 1rem}

/* ── Lists ───────────────────────────────────────────────────────────────── */
ul,ol{padding-left:1.4rem;margin-bottom:.75rem}
li{margin-bottom:.2rem;font-size:.84rem}
.evidence-list{list-style:none;padding:0}
.evidence-list li{padding:.15rem 0;font-size:.8rem;color:var(--text-muted)}
.evidence-list li::before{content:'✓ ';color:var(--green)}

/* ── Misc ────────────────────────────────────────────────────────────────── */
blockquote{border-left:3px solid var(--brand);padding-left:.75rem;color:var(--text-muted);margin-bottom:.75rem;font-size:.84rem}
hr{border:none;border-top:1px solid var(--border);margin:1.5rem 0}
.footer{text-align:center;font-size:.72rem;color:var(--text-muted);margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border)}

/* ── Bar Chart (CSS-only) ────────────────────────────────────────────────── */
.bar-chart{margin-bottom:1rem}
.bar-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;font-size:.8rem}
.bar-label{min-width:120px;color:var(--text);font-weight:500;text-align:right;flex-shrink:0}
.bar-track{flex:1;height:18px;background:var(--surface-alt);border-radius:3px;overflow:hidden;border:1px solid var(--border)}
.bar-fill{height:100%;border-radius:3px;transition:width .3s ease}
.bar-fill.fill-red{background:var(--red)}
.bar-fill.fill-yellow{background:var(--yellow)}
.bar-fill.fill-blue{background:var(--blue)}
.bar-fill.fill-green{background:var(--green)}
.bar-fill.fill-orange{background:var(--orange)}
.bar-fill.fill-brand{background:var(--brand)}
.bar-value{min-width:36px;font-weight:700;color:var(--text);font-size:.78rem}

/* ── Investigation Metadata ──────────────────────────────────────────────── */
.investigation-meta table{font-size:.8rem;margin-bottom:0}
.investigation-meta td:first-child{font-weight:600;color:var(--text-muted);width:140px}

/* ── Print ───────────────────────────────────────────────────────────────── */
@media print{
  .sidebar{display:none}
  .layout{display:block}
  .main{max-width:100%;padding:1rem}
  .section{break-inside:avoid;box-shadow:none}
  h1,h2{break-after:avoid}
  details[open]{break-inside:avoid}
  @page{margin:2cm}
}
`.trim();

// ---------------------------------------------------------------------------
// HtmlWriter
// ---------------------------------------------------------------------------

export class HtmlWriter {
  private readonly _body: string[] = [];
  private _title = 'TileGuard Engineering Report';
  private _version = '';
  private _timestamp = '';
  private readonly _navLinks: Array<{ id: string; label: string }> = [];

  setTitle(title: string): this {
    this._title = title;
    return this;
  }

  setVersion(version: string): this {
    this._version = version;
    return this;
  }

  setTimestamp(timestamp: string): this {
    this._timestamp = timestamp;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Headings
  // ---------------------------------------------------------------------------

  h1(text: string): this {
    this._body.push(`<h1>${esc(text)}</h1>`);
    return this;
  }

  h2(text: string): this {
    this._body.push(`<h2>${esc(text)}</h2>`);
    return this;
  }

  h3(text: string): this {
    this._body.push(`<h3>${esc(text)}</h3>`);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Text / paragraphs
  // ---------------------------------------------------------------------------

  p(html: string): this {
    this._body.push(`<p>${html}</p>`);
    return this;
  }

  hr(): this {
    this._body.push('<hr>');
    return this;
  }

  blockquote(text: string): this {
    this._body.push(`<blockquote>${esc(text)}</blockquote>`);
    return this;
  }

  meta(text: string): this {
    this._body.push(`<p class="meta">${esc(text)}</p>`);
    return this;
  }

  /** Meta bar with multiple labelled items. */
  metaBar(items: readonly { label: string; value: string }[]): this {
    const inner = items
      .map(
        (i) => `<span><strong>${esc(i.label)}</strong> ${esc(i.value)}</span>`,
      )
      .join('');
    this._body.push(`<div class="meta-bar">${inner}</div>`);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Sections (cards)
  // ---------------------------------------------------------------------------

  sectionOpen(id: string): this {
    this._body.push(`<section class="section" id="${esc(id)}">`);
    return this;
  }

  sectionClose(): this {
    this._body.push('</section>');
    return this;
  }

  // Register a nav link for the sidebar
  addNavLink(id: string, label: string): this {
    this._navLinks.push({ id, label });
    return this;
  }

  // ---------------------------------------------------------------------------
  // Status bar
  // ---------------------------------------------------------------------------

  statusBar(items: readonly { label: string; color: BadgeColor }[]): this {
    this._body.push('<div class="status-bar">');
    for (const i of items) {
      this._body.push(
        `<span class="status-pill badge-${i.color}">${esc(i.label)}</span>`,
      );
    }
    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Badges
  // ---------------------------------------------------------------------------

  badge(label: string, color: BadgeColor): string {
    return `<span class="badge badge-${color}">${esc(label)}</span>`;
  }

  // ---------------------------------------------------------------------------
  // Stat grid
  // ---------------------------------------------------------------------------

  statGrid(
    stats: readonly {
      label: string;
      value: string | number;
      highlight?: boolean;
    }[],
  ): this {
    this._body.push('<div class="stat-grid">');
    for (const s of stats) {
      const cls = s.highlight ? 'stat-card highlight' : 'stat-card';
      this._body.push(
        `<div class="${cls}">` +
          `<div class="label">${esc(s.label)}</div>` +
          `<div class="value">${esc(String(s.value))}</div>` +
          `</div>`,
      );
    }
    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Tables
  // ---------------------------------------------------------------------------

  table(
    headers: readonly string[],
    rows: readonly (readonly string[])[],
  ): this {
    this._body.push('<table><thead><tr>');
    for (const h of headers) {
      this._body.push(`<th>${esc(h)}</th>`);
    }
    this._body.push('</tr></thead><tbody>');
    for (const row of rows) {
      this._body.push('<tr>');
      for (const cell of row) {
        // Allow pre-escaped HTML (badges etc)
        this._body.push(`<td>${cell}</td>`);
      }
      this._body.push('</tr>');
    }
    this._body.push('</tbody></table>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------------

  ul(items: readonly string[]): this {
    this._body.push('<ul>');
    for (const item of items) {
      this._body.push(`<li>${item}</li>`);
    }
    this._body.push('</ul>');
    return this;
  }

  ol(items: readonly string[]): this {
    this._body.push('<ol>');
    for (const item of items) {
      this._body.push(`<li>${item}</li>`);
    }
    this._body.push('</ol>');
    return this;
  }

  evidenceList(items: readonly string[]): this {
    this._body.push('<ul class="evidence-list">');
    for (const item of items) {
      this._body.push(`<li>${esc(item)}</li>`);
    }
    this._body.push('</ul>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Key finding card
  // ---------------------------------------------------------------------------

  findingCard(
    rank: number,
    severity: string,
    title: string,
    description: string,
  ): this {
    const color = severityToColor(severity);
    this._body.push(
      `<div class="finding ${esc(severity)}">`,
      `<div class="finding-title">${esc(`${rank}. ${title}`)} ${this.badge(severity.toUpperCase(), color)}</div>`,
      `<div class="finding-desc">${esc(description)}</div>`,
      `</div>`,
    );
    return this;
  }

  // ---------------------------------------------------------------------------
  // Regression candidate card
  // ---------------------------------------------------------------------------

  candidateCard(
    rank: number,
    label: string,
    kind: string,
    confidencePct: number,
    topReason: string,
    evidenceLabels: readonly string[],
  ): this {
    const barColor =
      confidencePct >= 80
        ? '#dc3545'
        : confidencePct >= 50
          ? '#ffc107'
          : '#4361ee';
    const confBadge =
      confidencePct >= 80 ? 'red' : confidencePct >= 50 ? 'yellow' : 'blue';

    this._body.push(
      `<div class="candidate">`,
      `<div class="candidate-header">`,
      `<span class="candidate-rank">#${rank}</span>`,
      `<span class="candidate-title">${esc(label)} — <em>${esc(kind)}</em></span>`,
      `<div class="conf-bar-wrap"><div class="conf-bar" style="width:${confidencePct}%;background:${barColor}"></div></div>`,
      `<span class="conf-pct">${this.badge(`${confidencePct}%`, confBadge)}</span>`,
      `</div>`,
      `<p style="font-size:.82rem;margin-bottom:.4rem">${esc(topReason)}</p>`,
    );

    if (evidenceLabels.length > 0) {
      this.evidenceList(evidenceLabels);
    }

    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Recommendation card
  // ---------------------------------------------------------------------------

  recommendationCard(
    priority: 'HIGH' | 'MEDIUM' | 'LOW',
    title: string,
    reason: string,
    affectedLayers: readonly string[],
    evidence: readonly string[],
    actions: readonly string[],
  ): this {
    const color: BadgeColor =
      priority === 'HIGH' ? 'red' : priority === 'MEDIUM' ? 'yellow' : 'blue';
    this._body.push(
      `<div class="rec">`,
      `<div class="rec-header">`,
      `${this.badge(priority, color)}`,
      `<span class="rec-title">${esc(title)}</span>`,
      `</div>`,
      `<p class="rec-reason">${esc(reason)}</p>`,
    );
    if (affectedLayers.length > 0) {
      this._body.push(
        `<p style="font-size:.8rem;margin-bottom:.4rem">` +
          `<strong>Affected layers:</strong> ${affectedLayers.map((l) => `<code>${esc(l)}</code>`).join(', ')}` +
          `</p>`,
      );
    }
    if (evidence.length > 0) {
      this._body.push(
        `<p style="font-size:.78rem;font-weight:600;margin-bottom:.2rem">Evidence:</p>`,
      );
      this.evidenceList(evidence);
    }
    if (actions.length > 0) {
      this._body.push(
        `<p style="font-size:.78rem;font-weight:600;margin-bottom:.2rem">Actions:</p>`,
      );
      this._body.push('<ol>');
      for (const a of actions) {
        this._body.push(`<li>${esc(a)}</li>`);
      }
      this._body.push('</ol>');
    }
    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Confidence bar
  // ---------------------------------------------------------------------------

  confidenceBar(label: string, confidence: number): this {
    const pct = Math.round(confidence * 100);
    const color = pct >= 80 ? '#dc3545' : pct >= 50 ? '#ffc107' : '#4361ee';
    this._body.push(
      `<div class="candidate-header">`,
      `<span>${esc(label)}</span>`,
      `<div class="conf-bar-wrap"><div class="conf-bar" style="width:${pct}%;background:${color}"></div></div>`,
      `<span class="conf-pct">${pct}%</span>`,
      `</div>`,
    );
    return this;
  }

  // ---------------------------------------------------------------------------
  // Bar chart (CSS-only — no JS dependencies)
  // ---------------------------------------------------------------------------

  barChart(
    items: readonly { label: string; value: number; color: 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'brand' }[],
  ): this {
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    this._body.push('<div class="bar-chart">');
    for (const item of items) {
      const pct = Math.round((item.value / maxVal) * 100);
      this._body.push(
        `<div class="bar-row">`,
        `<span class="bar-label">${esc(item.label)}</span>`,
        `<div class="bar-track"><div class="bar-fill fill-${item.color}" style="width:${pct}%"></div></div>`,
        `<span class="bar-value">${item.value.toLocaleString()}</span>`,
        `</div>`,
      );
    }
    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Investigation metadata (collapsible)
  // ---------------------------------------------------------------------------

  investigationMeta(
    fields: readonly { label: string; value: string }[],
  ): this {
    this._body.push('<div class="investigation-meta">');
    this.detailsOpen('📋 Investigation Metadata');
    this._body.push('<table><tbody>');
    for (const f of fields) {
      this._body.push(
        `<tr><td>${esc(f.label)}</td><td>${esc(f.value)}</td></tr>`,
      );
    }
    this._body.push('</tbody></table>');
    this.detailsClose();
    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Collapsible section (<details>)
  // ---------------------------------------------------------------------------

  detailsOpen(summaryHtml: string, open = false): this {
    this._body.push(`<details${open ? ' open' : ''}>`);
    this._body.push(`<summary>${summaryHtml}</summary>`);
    this._body.push('<div class="details-body">');
    return this;
  }

  detailsClose(): this {
    this._body.push('</div>');
    this._body.push('</details>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Escape hatch for raw HTML fragments (use sparingly)
  // ---------------------------------------------------------------------------

  _bodyPush(raw: string): this {
    this._body.push(raw);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  build(): string {
    const sidebar = buildSidebar(this._title, this._navLinks);
    const footer = `<div class="footer">Generated by <a href="https://github.com/shindeshreeharsh/tileguard">TileGuard</a> v${esc(this._version)} · ${esc(this._timestamp)}</div>`;

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<title>${esc(this._title)}</title>`,
      `<style>${EMBEDDED_CSS}</style>`,
      '</head>',
      '<body>',
      '<div class="layout">',
      sidebar,
      '<main class="main">',
      ...this._body,
      footer,
      '</main>',
      '</div>',
      '</body>',
      '</html>',
    ].join('\n');
  }
}

// ---------------------------------------------------------------------------
// Sidebar builder
// ---------------------------------------------------------------------------

function buildSidebar(
  title: string,
  links: Array<{ id: string; label: string }>,
): string {
  const linkHtml = links
    .map((l) => `<a href="#${esc(l.id)}">${esc(l.label)}</a>`)
    .join('\n');

  return `<aside class="sidebar">
<a class="sidebar-brand" href="#">🛡️ ${esc(title)}</a>
<nav>
${linkHtml}
</nav>
</aside>`;
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

type BadgeColor = 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'grey';

function severityToColor(severity: string): BadgeColor {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'high':
      return 'red';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'orange';
    default:
      return 'blue';
  }
}

/** Escape HTML entities — exported for use by reporters. */
export { esc as escapeHtml };
