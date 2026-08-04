/**
 * @tileguard/reporters — MarkdownWriter (Milestone 7 — Step 3)
 *
 * Fluent builder for GitHub-flavoured Markdown output.
 * Pure string building — no DOM, no React, no side effects.
 */

export class MarkdownWriter {
  private readonly _lines: string[] = [];

  // ---------------------------------------------------------------------------
  // Headings
  // ---------------------------------------------------------------------------

  h1(text: string): this {
    this._lines.push(`# ${text}`, '');
    return this;
  }

  h2(text: string): this {
    this._lines.push(`## ${text}`, '');
    return this;
  }

  h3(text: string): this {
    this._lines.push(`### ${text}`, '');
    return this;
  }

  h4(text: string): this {
    this._lines.push(`#### ${text}`, '');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------

  p(text: string): this {
    this._lines.push(text, '');
    return this;
  }

  bold(text: string): string {
    return `**${text}**`;
  }

  italic(text: string): string {
    return `_${text}_`;
  }

  code(text: string): string {
    return `\`${text}\``;
  }

  // ---------------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------------

  ul(items: readonly string[]): this {
    for (const item of items) {
      this._lines.push(`- ${item}`);
    }
    this._lines.push('');
    return this;
  }

  ol(items: readonly string[]): this {
    items.forEach((item, i) => {
      this._lines.push(`${i + 1}. ${item}`);
    });
    this._lines.push('');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Table
  // ---------------------------------------------------------------------------

  /**
   * Render a Markdown table.
   * @param headers Column header strings.
   * @param rows    Each inner array is one row; length must match headers.
   */
  table(headers: readonly string[], rows: readonly (readonly string[])[]): this {
    const header = `| ${headers.join(' | ')} |`;
    const separator = `| ${headers.map(() => '---').join(' | ')} |`;
    this._lines.push(header, separator);
    for (const row of rows) {
      this._lines.push(`| ${row.join(' | ')} |`);
    }
    this._lines.push('');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Code blocks
  // ---------------------------------------------------------------------------

  codeBlock(content: string, lang = ''): this {
    this._lines.push(`\`\`\`${lang}`, content, '```', '');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Dividers and spacing
  // ---------------------------------------------------------------------------

  hr(): this {
    this._lines.push('---', '');
    return this;
  }

  blank(): this {
    this._lines.push('');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Blockquote
  // ---------------------------------------------------------------------------

  blockquote(text: string): this {
    this._lines.push(`> ${text}`, '');
    return this;
  }

  // ---------------------------------------------------------------------------
  // Badge helpers (GitHub Markdown)
  // ---------------------------------------------------------------------------

  badge(label: string, message: string, color: 'green' | 'yellow' | 'red' | 'blue' | 'grey'): string {
    // Returns an inline Shields.io-style badge as plain text label
    const colorMap = { green: '✅', yellow: '⚠️', red: '❌', blue: '🔵', grey: '⬜' };
    return `${colorMap[color] ?? '⬜'} **${label}:** ${message}`;
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  build(): string {
    return this._lines.join('\n').trimEnd() + '\n';
  }

  toString(): string {
    return this.build();
  }
}
