/**
 * @tileguard/reporters — HtmlWriter (Milestone 7 — Step 3)
 *
 * Fluent builder for self-contained, printable HTML reports.
 * Embeds all CSS inline — no external assets, no JS.
 * Pure string building — no DOM, no React, no side effects.
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
// Embedded CSS
// ---------------------------------------------------------------------------

const EMBEDDED_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; line-height: 1.6; color: #1a1a2e; background: #f8f9fa;
    max-width: 960px; margin: 0 auto; padding: 2rem 1rem;
  }
  h1 { font-size: 1.75rem; color: #0d1b2a; border-bottom: 2px solid #4361ee; padding-bottom: .5rem; margin-bottom: 1.5rem; }
  h2 { font-size: 1.2rem; color: #0d1b2a; border-bottom: 1px solid #dee2e6; padding-bottom: .3rem; margin: 1.5rem 0 .75rem; }
  h3 { font-size: 1rem; color: #343a40; margin: 1rem 0 .5rem; }
  p { margin-bottom: .75rem; }
  .meta { font-size: .8rem; color: #6c757d; margin-bottom: 1.5rem; }
  .badge { display: inline-block; padding: .15rem .5rem; border-radius: 4px; font-size: .75rem; font-weight: 600; }
  .badge-green { background: #d4edda; color: #155724; }
  .badge-yellow { background: #fff3cd; color: #856404; }
  .badge-red { background: #f8d7da; color: #721c24; }
  .badge-blue { background: #cce5ff; color: #004085; }
  .badge-grey { background: #e2e3e5; color: #383d41; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: .85rem; }
  th { background: #4361ee; color: #fff; padding: .5rem .75rem; text-align: left; }
  td { padding: .45rem .75rem; border-bottom: 1px solid #dee2e6; }
  tr:nth-child(even) td { background: #f1f3f9; }
  ul, ol { padding-left: 1.5rem; margin-bottom: .75rem; }
  li { margin-bottom: .25rem; }
  code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: .85em; background: #e9ecef; padding: .1rem .3rem; border-radius: 3px; }
  pre { background: #1a1a2e; color: #e9ecef; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: none; padding: 0; color: inherit; font-size: .82rem; }
  .section { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .75rem; margin-bottom: 1rem; }
  .stat-card { background: #f1f3f9; border-radius: 6px; padding: .75rem 1rem; }
  .stat-card .label { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: #6c757d; }
  .stat-card .value { font-size: 1.4rem; font-weight: 700; color: #0d1b2a; margin-top: .1rem; }
  .candidate { border: 1px solid #dee2e6; border-radius: 6px; padding: .75rem 1rem; margin-bottom: .75rem; }
  .candidate-header { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
  .confidence-bar-wrap { flex: 1; height: 6px; background: #dee2e6; border-radius: 3px; overflow: hidden; }
  .confidence-bar { height: 100%; border-radius: 3px; background: #4361ee; }
  .confidence-pct { font-size: .8rem; font-weight: 700; min-width: 2.5rem; text-align: right; }
  .evidence-list { list-style: none; padding: 0; }
  .evidence-list li { font-size: .8rem; color: #495057; padding: .2rem 0; }
  .evidence-list li::before { content: '✓ '; color: #28a745; }
  blockquote { border-left: 3px solid #4361ee; padding-left: 1rem; color: #6c757d; margin-bottom: .75rem; }
  hr { border: none; border-top: 1px solid #dee2e6; margin: 1.5rem 0; }
  .footer { text-align: center; font-size: .75rem; color: #adb5bd; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #dee2e6; }
  @media print {
    body { background: white; }
    .section { break-inside: avoid; box-shadow: none; }
    h1, h2 { break-after: avoid; }
  }
`.trim();

// ---------------------------------------------------------------------------
// HtmlWriter
// ---------------------------------------------------------------------------

export class HtmlWriter {
  private readonly _body: string[] = [];
  private _title = 'TileGuard Engineering Report';

  setTitle(title: string): this {
    this._title = title;
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
  // Text
  // ---------------------------------------------------------------------------

  p(html: string): this {
    this._body.push(`<p>${html}</p>`);
    return this;
  }

  /** Wrap content in a section card */
  sectionOpen(id?: string): this {
    this._body.push(`<div class="section"${id ? ` id="${esc(id)}"` : ''}>`);
    return this;
  }

  sectionClose(): this {
    this._body.push('</div>');
    return this;
  }

  meta(text: string): this {
    this._body.push(`<p class="meta">${esc(text)}</p>`);
    return this;
  }

  badge(label: string, color: 'green' | 'yellow' | 'red' | 'blue' | 'grey'): string {
    return `<span class="badge badge-${color}">${esc(label)}</span>`;
  }

  hr(): this {
    this._body.push('<hr>');
    return this;
  }

  blockquote(text: string): this {
    this._body.push(`<blockquote>${esc(text)}</blockquote>`);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Stat grid
  // ---------------------------------------------------------------------------

  statGrid(stats: readonly { label: string; value: string | number }[]): this {
    this._body.push('<div class="stat-grid">');
    for (const s of stats) {
      this._body.push(
        `<div class="stat-card"><div class="label">${esc(s.label)}</div><div class="value">${esc(String(s.value))}</div></div>`,
      );
    }
    this._body.push('</div>');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------

  table(headers: readonly string[], rows: readonly (readonly string[])[]): this {
    this._body.push('<table><thead><tr>');
    for (const h of headers) {
      this._body.push(`<th>${esc(h)}</th>`);
    }
    this._body.push('</tr></thead><tbody>');
    for (const row of rows) {
      this._body.push('<tr>');
      for (const cell of row) {
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
  // Confidence bar
  // ---------------------------------------------------------------------------

  confidenceBar(label: string, confidence: number): this {
    const pct = Math.round(confidence * 100);
    const color = pct >= 80 ? '#dc3545' : pct >= 50 ? '#ffc107' : '#4361ee';
    this._body.push(
      `<div class="candidate-header">`,
      `<span>${esc(label)}</span>`,
      `<div class="confidence-bar-wrap"><div class="confidence-bar" style="width:${pct}%;background:${color}"></div></div>`,
      `<span class="confidence-pct">${pct}%</span>`,
      `</div>`,
    );
    return this;
  }

  // ---------------------------------------------------------------------------
  // Code
  // ---------------------------------------------------------------------------

  pre(content: string, lang = ''): this {
    this._body.push(`<pre><code${lang ? ` class="language-${esc(lang)}"` : ''}>${esc(content)}</code></pre>`);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Escape hatch for raw HTML fragments (use sparingly)
  // ---------------------------------------------------------------------------

  /** Push a raw HTML string directly into the body. Caller is responsible for escaping. */
  _bodyPush(raw: string): this {
    this._body.push(raw);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  build(): string {
    const footer = `<div class="footer">Generated by TileGuard · <a href="https://github.com/shreeharsh-shinde/tileguard">tileguard</a></div>`;
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
      ...this._body,
      footer,
      '</body>',
      '</html>',
    ].join('\n');
  }
}

/** Escape HTML entities — exported for use by reporters. */
export { esc as escapeHtml };
