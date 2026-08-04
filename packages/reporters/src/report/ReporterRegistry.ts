/**
 * @tileguard/reporters — ReporterRegistry (Milestone 7 — Step 3)
 *
 * Maps ReportFormat strings to format-specific render functions.
 * Extensible: call register() to add new formats (future plugins).
 */

import type { EngineeringReport, ReportFormat } from './models/EngineeringReport.js';
import { renderHtml } from './reporters/HtmlReporter.js';
import { renderMarkdown } from './reporters/MarkdownReporter.js';
import { renderJson } from './reporters/JsonReporter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormatRenderer = (report: EngineeringReport) => string;

export interface ReporterRegistry {
  /** Resolve a format to its render function. Returns undefined for unknown formats. */
  resolve(format: ReportFormat | string): FormatRenderer | undefined;
  /** Register a new format. Overwrites if format already registered. */
  register(format: string, renderer: FormatRenderer): void;
  /** List all registered format names. */
  formats(): readonly string[];
  /** Returns true if the format is registered. */
  has(format: string): boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createReporterRegistry(): ReporterRegistry {
  const _map = new Map<string, FormatRenderer>();

  // Built-in formats
  _map.set('markdown', renderMarkdown);
  _map.set('html', renderHtml);
  _map.set('json', (r) => renderJson(r));

  function resolve(format: ReportFormat | string): FormatRenderer | undefined {
    return _map.get(format);
  }

  function register(format: string, renderer: FormatRenderer): void {
    _map.set(format, renderer);
  }

  function formats(): readonly string[] {
    return [..._map.keys()];
  }

  function has(format: string): boolean {
    return _map.has(format);
  }

  return { resolve, register, formats, has };
}

/** Default singleton registry — used by ReportEngine and the CLI. */
export const defaultRegistry: ReporterRegistry = createReporterRegistry();
