/**
 * @tileguard/inspector — StyleExplorerPage (Milestone 8 — Step 1)
 *
 * Read-only Style Explorer that displays:
 *   - Document overview (version, name, features)
 *   - Sources list with types
 *   - Layers list with types and source references
 *   - Expression summary
 *   - Diagnostics from the analysis engine
 *
 * The page accepts a style JSON file via file-drop and runs the
 * style analysis engine. No rendering is performed.
 */

import { useState, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileJson,
  Layers,
  Database,
  Code2,
  Upload,
} from 'lucide-react';
import { analyzeStyle } from '@tileguard/style-rules/analysis';
import type {
  StyleAnalysis,
  StyleDiagnostic,
  ResolvedLayer,
} from '@tileguard/style-rules/analysis';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StyleExplorerPage(): JSX.Element {
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = analyzeStyle(text);
      if (result.analysis) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error ?? 'Failed to parse style document.');
        setAnalysis(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAnalysis(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFileLoad(file);
    },
    [handleFileLoad],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFileLoad(file);
    },
    [handleFileLoad],
  );

  if (!analysis) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--tg-border)] p-12 text-center">
          <Upload className="h-10 w-10 text-[var(--tg-text-muted)]" />
          <h2 className="text-lg font-semibold text-[var(--tg-text-primary)]">
            Style Explorer
          </h2>
          <p className="text-sm text-[var(--tg-text-secondary)]">
            Drop a MapLibre style.json file here or click to browse
          </p>
          <button
            type="button"
            className="mt-2 rounded-md bg-[var(--tg-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileInput}
            aria-label="Select style file"
          />
        </div>
        {error && (
          <div className="rounded-md bg-[var(--tg-error)]/10 p-3 text-sm text-[var(--tg-error)]">
            {error}
          </div>
        )}
      </div>
    );
  }

  const { document, statistics: stats, diagnostics } = analysis;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-4 gap-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-[var(--tg-accent)]" />
          <h1 className="text-lg font-semibold text-[var(--tg-text-primary)]">
            {fileName ?? 'Style Explorer'}
          </h1>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            analysis.valid
              ? 'bg-[var(--tg-success)]/10 text-[var(--tg-success)]'
              : 'bg-[var(--tg-error)]/10 text-[var(--tg-error)]'
          }`}
        >
          {analysis.valid ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {analysis.valid ? 'Valid' : `${analysis.errorCount} error${analysis.errorCount !== 1 ? 's' : ''}`}
        </span>
      </header>

      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Version" value={String(document.version ?? '—')} />
        <StatCard label="Sources" value={stats.sourceCount} />
        <StatCard label="Layers" value={stats.layerCount} />
        <StatCard label="Expressions" value={stats.expressionCount} />
      </div>

      {/* Sources */}
      <Section title="Sources" icon={<Database className="h-4 w-4" />}>
        {stats.sourceCount === 0 ? (
          <p className="text-sm text-[var(--tg-text-muted)]">No sources defined.</p>
        ) : (
          <div className="space-y-1">
            {[...analysis.sources.entries()].map(([id, source]) => (
              <div
                key={id}
                className="flex items-center justify-between rounded-md bg-[var(--tg-bg-secondary)] px-3 py-2"
              >
                <span className="text-sm font-medium text-[var(--tg-text-primary)]">
                  {id}
                </span>
                <span className="rounded bg-[var(--tg-bg-hover)] px-2 py-0.5 text-xs text-[var(--tg-text-secondary)]">
                  {source.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Layers */}
      <Section title="Layers" icon={<Layers className="h-4 w-4" />}>
        {stats.layerCount === 0 ? (
          <p className="text-sm text-[var(--tg-text-muted)]">No layers defined.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-auto">
            {analysis.layers.map((resolved: ResolvedLayer) => (
              <div
                key={resolved.layer.id}
                className="flex items-center justify-between rounded-md bg-[var(--tg-bg-secondary)] px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--tg-text-primary)]">
                    {resolved.layer.id}
                  </span>
                  {resolved.layer.source && (
                    <span className="text-xs text-[var(--tg-text-muted)]">
                      source: {resolved.layer.source}
                      {resolved.layer.sourceLayer ? ` → ${resolved.layer.sourceLayer}` : ''}
                    </span>
                  )}
                </div>
                <span className="rounded bg-[var(--tg-bg-hover)] px-2 py-0.5 text-xs text-[var(--tg-text-secondary)]">
                  {resolved.layer.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Expressions */}
      {stats.expressionCount > 0 && (
        <Section title="Expressions" icon={<Code2 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[var(--tg-text-muted)]">Total: </span>
              <span className="text-[var(--tg-text-primary)]">{stats.expressionCount}</span>
            </div>
            <div>
              <span className="text-[var(--tg-text-muted)]">Filters: </span>
              <span className="text-[var(--tg-text-primary)]">{stats.filterCount}</span>
            </div>
            <div>
              <span className="text-[var(--tg-text-muted)]">Data-driven layers: </span>
              <span className="text-[var(--tg-text-primary)]">{stats.dataDrivenLayerCount}</span>
            </div>
            <div>
              <span className="text-[var(--tg-text-muted)]">Unique operators: </span>
              <span className="text-[var(--tg-text-primary)]">{stats.expressionOperators.length}</span>
            </div>
          </div>
          {stats.uniquePropertyReferences.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-[var(--tg-text-muted)]">Referenced properties: </span>
              <span className="text-xs text-[var(--tg-text-primary)]">
                {stats.uniquePropertyReferences.join(', ')}
              </span>
            </div>
          )}
        </Section>
      )}

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <Section title="Diagnostics" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-1 max-h-48 overflow-auto">
            {diagnostics.map((d: StyleDiagnostic, i: number) => (
              <div
                key={`${d.code}-${i}`}
                className="flex items-start gap-2 rounded-md bg-[var(--tg-bg-secondary)] px-3 py-2"
              >
                <span
                  className={`mt-0.5 text-xs font-bold ${
                    d.severity === 'error'
                      ? 'text-[var(--tg-error)]'
                      : d.severity === 'warning'
                        ? 'text-[var(--tg-warning)]'
                        : 'text-[var(--tg-text-muted)]'
                  }`}
                >
                  {d.severity === 'error' ? '✗' : d.severity === 'warning' ? '⚠' : 'ℹ'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-[var(--tg-text-primary)]">{d.message}</p>
                  {d.suggestion && (
                    <p className="mt-0.5 text-xs text-[var(--tg-text-muted)]">
                      → {d.suggestion}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[var(--tg-text-muted)]">
                  {d.code}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-3 text-center">
      <p className="text-2xl font-bold text-[var(--tg-text-primary)]">{value}</p>
      <p className="text-xs text-[var(--tg-text-muted)]">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: JSX.Element;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--tg-border)] p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--tg-text-primary)]">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
