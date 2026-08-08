/**
 * @tileguard/cli — Output Formatter
 *
 * Formats structured data into human-readable text, JSON, or markdown
 * for CLI output. Used by all commands to produce consistent output.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OutputFormat = 'text' | 'json' | 'markdown' | 'html';

export interface TableRow {
  readonly [key: string]: string | number | boolean | null | undefined;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

export interface OutputFormatter {
  /** Format a key-value summary block. */
  summary(title: string, entries: readonly [string, string | number][]): string;
  /** Format a table with headers and rows. */
  table(
    headers: readonly string[],
    rows: readonly (readonly string[])[],
  ): string;
  /** Format a simple status line. */
  status(
    label: string,
    value: string | number,
    color?: 'green' | 'yellow' | 'red',
  ): string;
  /** Format a section heading. */
  heading(text: string): string;
  /** Format a separator line. */
  separator(): string;
  /** Wrap the full output with any necessary envelope (e.g., JSON object). */
  envelope(sections: readonly string[]): string;
}

// ---------------------------------------------------------------------------
// Text formatter
// ---------------------------------------------------------------------------

function createTextFormatter(): OutputFormatter {
  return {
    summary(title, entries) {
      const lines = [`\n${title}`, '─'.repeat(40)];
      const maxLabel = Math.max(...entries.map(([k]) => k.length));
      for (const [key, value] of entries) {
        lines.push(`  ${key.padEnd(maxLabel + 2)}${value}`);
      }
      return lines.join('\n') + '\n';
    },

    table(headers, rows) {
      const widths = headers.map((h, i) =>
        Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)),
      );
      const headerLine = headers.map((h, i) => h.padEnd(widths[i]!)).join('  ');
      const sep = widths.map((w) => '─'.repeat(w)).join('──');
      const body = rows.map((row) =>
        row.map((cell, i) => String(cell).padEnd(widths[i]!)).join('  '),
      );
      return [headerLine, sep, ...body].join('\n') + '\n';
    },

    status(label, value) {
      return `  ${label}: ${value}\n`;
    },

    heading(text) {
      return `\n${text}\n${'═'.repeat(text.length)}\n`;
    },

    separator() {
      return '─'.repeat(40) + '\n';
    },

    envelope(sections) {
      return sections.join('\n');
    },
  };
}

// ---------------------------------------------------------------------------
// JSON formatter
// ---------------------------------------------------------------------------

function createJsonFormatter(): OutputFormatter {
  const data: Record<string, unknown> = {};

  return {
    summary(title, entries) {
      const obj: Record<string, string | number> = {};
      for (const [key, value] of entries) {
        obj[key] = value;
      }
      data[title] = obj;
      return '';
    },

    table(_headers, _rows) {
      return '';
    },

    status(label, value) {
      data[label] = value;
      return '';
    },

    heading(_text) {
      return '';
    },

    separator() {
      return '';
    },

    envelope(_sections) {
      return JSON.stringify(data, null, 2) + '\n';
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOutputFormatter(format: OutputFormat): OutputFormatter {
  switch (format) {
    case 'json':
      return createJsonFormatter();
    case 'text':
    case 'markdown':
    case 'html':
    default:
      return createTextFormatter();
  }
}

// ---------------------------------------------------------------------------
// Utility: format a number with +/- prefix
// ---------------------------------------------------------------------------

export function formatDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return String(n);
  return '0';
}

/** Format milliseconds as a human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
