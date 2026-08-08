/**
 * ReportPage — Milestone 7 Step 3 Report Generation UI
 *
 * Features:
 *   - Generate Markdown / HTML / JSON from comparison + regression
 *   - Live preview in selected format
 *   - Download button (browser file save)
 *   - Copy to clipboard
 *
 * Calls the @tileguard/reporters ReportEngine via report-adapter
 * (never imports reporters formats directly — that's the engine's job).
 */

import { createReportEngine } from '@tileguard/reporters';
import {
  Braces,
  Check,
  Copy,
  Download,
  FileCode,
  FileText,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { RegressionAnalysis } from '../../analysis/models/regression.js';
import type { TileComparison } from '../../comparison/models.js';
import { buildReportInputs } from '../../report/report-adapter.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportFormat = 'markdown' | 'html' | 'json';

const FORMAT_TABS = [
  {
    id: 'markdown' as ReportFormat,
    label: 'Markdown',
    Icon: FileText,
    ext: 'md',
    mime: 'text/markdown',
  },
  {
    id: 'html' as ReportFormat,
    label: 'HTML',
    Icon: FileCode,
    ext: 'html',
    mime: 'text/html',
  },
  {
    id: 'json' as ReportFormat,
    label: 'JSON',
    Icon: Braces,
    ext: 'json',
    mime: 'application/json',
  },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReportPageProps {
  readonly comparison: TileComparison | null;
  readonly regression: RegressionAnalysis | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportPage({
  comparison,
  regression,
}: ReportPageProps): JSX.Element {
  const [format, setFormat] = useState<ReportFormat>('markdown');
  const [copied, setCopied] = useState(false);

  // Generate report whenever comparison, regression, or format changes
  const result = useMemo(() => {
    if (!comparison || !regression) return null;
    const { comparisonInput, regressionInput } = buildReportInputs(
      comparison,
      regression,
    );
    return createReportEngine({ tileguardVersion: '0.4.5' }).generate(
      comparisonInput,
      regressionInput,
      format,
    );
  }, [comparison, regression, format]);

  const content = result?.ok ? result.value.content : null;
  const errorMsg = result && !result.ok ? result.error.message : null;

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!content) return;
    const tab = FORMAT_TABS.find((t) => t.id === format)!;
    const blob = new Blob([content], { type: tab.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tileguard-report.${tab.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, format]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!content) return;
    void navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!comparison || !regression) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText
          className="h-10 w-10 text-[var(--tg-text-muted)]"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-[var(--tg-text-primary)]">
          Engineering Report
        </p>
        <p className="max-w-xs text-xs text-[var(--tg-text-muted)]">
          Run a comparison and regression analysis first, then generate a
          shareable report here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-4 py-2">
        {/* Format tabs */}
        <div className="flex gap-1" role="tablist" aria-label="Report format">
          {FORMAT_TABS.map(({ id, label, Icon }) => {
            const active = format === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFormat(id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--tg-accent)] text-white'
                    : 'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Copy */}
        <button
          type="button"
          onClick={handleCopy}
          disabled={!content}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--tg-text-secondary)] transition-colors hover:bg-[var(--tg-bg-hover)] disabled:opacity-40"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check
              className="h-3.5 w-3.5 text-[var(--tg-success)]"
              aria-hidden="true"
            />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!content}
          className="flex items-center gap-1.5 rounded bg-[var(--tg-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Download report"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download
        </button>
      </div>

      {/* ── Preview ── */}
      <div className="min-h-0 flex-1 overflow-auto bg-[var(--tg-bg-primary)]">
        {errorMsg ? (
          <div className="p-4 text-sm text-[var(--tg-error)]" role="alert">
            {errorMsg}
          </div>
        ) : content ? (
          format === 'html' ? (
            <iframe
              srcDoc={content}
              title="HTML report preview"
              className="h-full w-full border-0"
              sandbox="allow-same-origin"
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-[var(--tg-text-primary)]">
              {content}
            </pre>
          )
        ) : (
          <div className="flex items-center justify-center p-8 text-xs text-[var(--tg-text-muted)]">
            Generating…
          </div>
        )}
      </div>
    </div>
  );
}
