/**
 * @tileguard/inspector — StylePage (Phase 3 — Style Workspace)
 *
 * Purpose-built workspace for MapLibre style inspection.
 * Answers: "How is this style constructed?"
 *
 * Layout:
 *   ┌──────────────┬────────────────────────────┬──────────────────────┐
 *   │ SourceTree   │                            │  Layer Details       │
 *   │              │   Style Summary /          │                      │
 *   │ LayerTree    │   Drop Zone                │  Paint / Layout      │
 *   │              │                            │  Expressions         │
 *   │ Imports      │                            │  Filter              │
 *   └──────────────┴────────────────────────────┴──────────────────────┘
 *
 * Keeps the existing analyzeStyle engine untouched.
 * Adds IDE-style three-column layout around the existing read logic.
 */
import {
  AlertTriangle,
  CheckCircle,
  Code2,
  Database,
  FileJson,
  Layers,
  Paintbrush,
  ScanSearch,
  Upload,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { analyzeStyle } from '@tileguard/style-rules/analysis';
import type {
  ResolvedLayer,
  StyleAnalysis,
} from '@tileguard/style-rules/analysis';
import {
  EmptyWorkspace,
  PanelDivider,
  PanelHeader,
  PanelSection,
  WorkspaceBadge,
  WorkspacePanel,
  WorkspaceToolbar,
} from '../shared/index.js';
import type { WorkspaceToolbarAction } from '../shared/WorkspaceComponents.js';

// ---------------------------------------------------------------------------
// SourceTree
// ---------------------------------------------------------------------------

function SourceTree({ analysis }: { analysis: StyleAnalysis }): JSX.Element {
  const sources = [...analysis.sources.entries()];
  return (
    <div>
      {sources.length === 0 ? (
        <p className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] italic text-[var(--tg-text-muted)]">
          No sources defined
        </p>
      ) : (
        sources.map(([id, source]) => (
          <div
            key={id}
            className="flex items-center justify-between px-[var(--tg-space-md)] py-[var(--tg-space-sm)] hover:bg-[var(--tg-bg-hover)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Database className="h-3 w-3 shrink-0 text-[var(--tg-accent)] opacity-70" aria-hidden />
              <span className="truncate text-xs text-[var(--tg-text-primary)]">{id}</span>
            </div>
            <WorkspaceBadge label={source.type} variant="neutral" />
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LayerTree
// ---------------------------------------------------------------------------

interface LayerTreeProps {
  readonly layers: readonly ResolvedLayer[];
  readonly selectedLayerId: string | null;
  readonly onSelect: (id: string) => void;
}

function LayerTree({ layers, selectedLayerId, onSelect }: LayerTreeProps): JSX.Element {
  const typeColor: Record<string, string> = {
    fill: 'text-[var(--tg-success)]',
    line: 'text-[var(--tg-info)]',
    symbol: 'text-[var(--tg-warning)]',
    circle: 'text-[var(--tg-error)]',
    heatmap: 'text-[var(--tg-warning)]',
    background: 'text-[var(--tg-text-muted)]',
  };

  if (layers.length === 0) {
    return (
      <p className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] italic text-[var(--tg-text-muted)]">
        No layers defined
      </p>
    );
  }

  return (
    <>
      {layers.map((resolved) => {
        const id = resolved.layer.id;
        const type = resolved.layer.type;
        const isSelected = selectedLayerId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={isSelected}
            className={[
              'flex w-full items-center gap-2 px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-left text-xs transition-colors hover:bg-[var(--tg-bg-hover)]',
              isSelected ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-accent)]' : 'text-[var(--tg-text-secondary)]',
            ].join(' ')}
          >
            <Layers className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
            <span className="flex-1 truncate text-[var(--tg-text-primary)]">{id}</span>
            <span className={`shrink-0 text-[9px] font-medium ${typeColor[type] ?? 'text-[var(--tg-text-muted)]'}`}>
              {type}
            </span>
          </button>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// LayerDetailPanel — right panel showing the selected layer's paint/layout/filter
// ---------------------------------------------------------------------------

function LayerDetailPanel({ analysis, layerId }: { analysis: StyleAnalysis; layerId: string | null }): JSX.Element {
  if (layerId === null) {
    return (
      <EmptyWorkspace
        icon={ScanSearch}
        title="No layer selected"
        description="Select a layer from the left panel to inspect its paint properties, layout, and expressions."
      />
    );
  }

  const resolved = analysis.layers.find(r => r.layer.id === layerId);
  if (!resolved) {
    return (
      <EmptyWorkspace
        icon={ScanSearch}
        title="Layer not found"
        description={`Layer "${layerId}" was not found in the analysis.`}
      />
    );
  }

  const { layer } = resolved;
  const paint = layer.paint ?? {};
  const layout = layer.layout ?? {};
  const filter = layer.filter;

  return (
    <WorkspacePanel
      label="Layer Details"
      header={<PanelHeader title="Layer Details" icon={Paintbrush} subtitle={layer.type} />}
    >
      {/* Identity */}
      <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <span className="text-[var(--tg-text-muted)]">ID</span>
          <code className="font-mono text-[var(--tg-text-secondary)] truncate">{layer.id}</code>
          <span className="text-[var(--tg-text-muted)]">Type</span>
          <code className="font-mono text-[var(--tg-text-secondary)]">{layer.type}</code>
          {layer.source && (
            <>
              <span className="text-[var(--tg-text-muted)]">Source</span>
              <code className="font-mono text-[var(--tg-text-secondary)] truncate">{layer.source}</code>
            </>
          )}
          {layer.sourceLayer && (
            <>
              <span className="text-[var(--tg-text-muted)]">Source Layer</span>
              <code className="font-mono text-[var(--tg-text-secondary)] truncate">{layer.sourceLayer}</code>
            </>
          )}
          {layer.minzoom !== undefined && (
            <>
              <span className="text-[var(--tg-text-muted)]">Min Zoom</span>
              <code className="font-mono text-[var(--tg-text-secondary)]">{layer.minzoom}</code>
            </>
          )}
          {layer.maxzoom !== undefined && (
            <>
              <span className="text-[var(--tg-text-muted)]">Max Zoom</span>
              <code className="font-mono text-[var(--tg-text-secondary)]">{layer.maxzoom}</code>
            </>
          )}
        </div>
      </div>

      {/* Paint properties */}
      {Object.keys(paint).length > 0 && (
        <>
          <PanelDivider />
          <PanelSection title="Paint">
            <PropertyList properties={paint as Record<string, unknown>} />
          </PanelSection>
        </>
      )}

      {/* Layout properties */}
      {Object.keys(layout).length > 0 && (
        <>
          <PanelDivider />
          <PanelSection title="Layout">
            <PropertyList properties={layout as Record<string, unknown>} />
          </PanelSection>
        </>
      )}

      {/* Filter */}
      {filter !== undefined && (
        <>
          <PanelDivider />
          <PanelSection title="Filter">
            <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
              <pre className="max-h-32 overflow-auto rounded bg-[var(--tg-bg-surface)] p-2 font-mono text-[9px] leading-relaxed text-[var(--tg-text-secondary)]">
                {JSON.stringify(filter, null, 2)}
              </pre>
            </div>
          </PanelSection>
        </>
      )}

      {/* Diagnostics for this layer */}
      {resolved.diagnostics && resolved.diagnostics.length > 0 && (
        <>
          <PanelDivider />
          <PanelSection title={`Diagnostics (${resolved.diagnostics.length})`}>
            {resolved.diagnostics.map((d, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-[var(--tg-space-md)] py-[var(--tg-space-xs)]"
              >
                <AlertTriangle
                  className={`mt-0.5 h-3 w-3 shrink-0 ${d.severity === 'error' ? 'text-[var(--tg-error)]' : 'text-[var(--tg-warning)]'}`}
                  aria-hidden
                />
                <p className="text-[10px] text-[var(--tg-text-secondary)]">{d.message}</p>
              </div>
            ))}
          </PanelSection>
        </>
      )}
    </WorkspacePanel>
  );
}

function PropertyList({ properties }: { properties: Record<string, unknown> }): JSX.Element {
  return (
    <table className="w-full text-[10px]" aria-label="Properties">
      <tbody>
        {Object.entries(properties).map(([key, value]) => (
          <tr key={key} className="border-b border-[var(--tg-border)]/50 hover:bg-[var(--tg-bg-hover)]">
            <td className="py-1 pl-[var(--tg-space-md)] pr-2 font-mono text-[var(--tg-text-secondary)] w-1/2">
              <span className="truncate block max-w-[100px]" title={key}>{key}</span>
            </td>
            <td className="py-1 pr-[var(--tg-space-md)] font-mono text-[var(--tg-text-primary)] w-1/2">
              {typeof value === 'object'
                ? <code className="text-[9px] text-[var(--tg-accent)]">[expr]</code>
                : String(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// StylePage — root workspace component
// ---------------------------------------------------------------------------

export interface StylePageProps {
  readonly leftWidth?: number;
  readonly rightWidth?: number;
  readonly leftCollapsed?: boolean;
  readonly rightCollapsed?: boolean;
  readonly onLeftResize?: (w: number) => void;
  readonly onRightResize?: (w: number) => void;
}

export function StylePage({
  leftWidth = 240,
  rightWidth = 280,
  leftCollapsed = false,
  rightCollapsed = false,
}: StylePageProps): JSX.Element {
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setSelectedLayerId(null);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  }, [loadFile]);

  const toolbarActions: readonly WorkspaceToolbarAction[] = [
    {
      id: 'open',
      icon: Upload,
      label: 'Load Style',
      onClick: () => fileInputRef.current?.click(),
    },
    ...(analysis ? [
      {
        id: 'validate',
        icon: CheckCircle,
        label: 'Validate',
        onClick: () => { /* re-run analysis */ },
        active: analysis.valid,
      } satisfies WorkspaceToolbarAction,
    ] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Contextual toolbar */}
      <WorkspaceToolbar
        actions={toolbarActions}
        rightSlot={
          fileName ? (
            <span className="flex items-center gap-1 text-[10px] text-[var(--tg-text-muted)]">
              <FileJson className="h-3.5 w-3.5" aria-hidden />
              <span className="max-w-40 truncate">{fileName}</span>
              {analysis && (
                <WorkspaceBadge
                  label={analysis.valid ? 'valid' : `${analysis.errorCount} err`}
                  variant={analysis.valid ? 'success' : 'error'}
                />
              )}
            </span>
          ) : undefined
        }
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); }}
        aria-label="Select style file"
      />

      {/* Three-column layout */}
      <div
        className="flex min-h-0 flex-1 overflow-hidden"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Left: Source + Layer tree */}
        {!leftCollapsed && (
          <aside
            className="flex shrink-0 flex-col overflow-hidden border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
            style={{ width: leftWidth }}
            aria-label="Style tree"
          >
            {analysis ? (
              <WorkspacePanel
                label="Style Tree"
                header={<PanelHeader title="Style Tree" icon={FileJson} subtitle={fileName ?? undefined} />}
              >
                <PanelSection title={`Sources · ${analysis.statistics.sourceCount}`}>
                  <SourceTree analysis={analysis} />
                </PanelSection>
                <PanelDivider />
                <PanelSection title={`Layers · ${analysis.statistics.layerCount}`}>
                  <LayerTree
                    layers={analysis.layers}
                    selectedLayerId={selectedLayerId}
                    onSelect={setSelectedLayerId}
                  />
                </PanelSection>
                <PanelDivider />
                <PanelSection title="Expressions">
                  <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <span className="text-[var(--tg-text-muted)]">Total</span>
                      <span className="font-mono text-[var(--tg-text-secondary)]">{analysis.statistics.expressionCount}</span>
                      <span className="text-[var(--tg-text-muted)]">Filters</span>
                      <span className="font-mono text-[var(--tg-text-secondary)]">{analysis.statistics.filterCount}</span>
                      <span className="text-[var(--tg-text-muted)]">Data-driven</span>
                      <span className="font-mono text-[var(--tg-text-secondary)]">{analysis.statistics.dataDrivenLayerCount}</span>
                    </div>
                  </div>
                </PanelSection>
              </WorkspacePanel>
            ) : (
              <EmptyWorkspace
                icon={FileJson}
                title="No style loaded"
                description="Load a MapLibre style to inspect layers and expressions."
                actions={[{ label: 'Choose File', onClick: () => fileInputRef.current?.click() }]}
              />
            )}
          </aside>
        )}

        {/* Center: Overview / drop zone */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-auto">
          {!analysis ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--tg-border)] p-12">
                <Upload className="h-10 w-10 text-[var(--tg-text-muted)]" />
                <h2 className="text-lg font-semibold text-[var(--tg-text-primary)]">Style Explorer</h2>
                <p className="text-sm text-[var(--tg-text-secondary)]">Drop a MapLibre style.json here or click to browse</p>
                <button
                  type="button"
                  className="mt-2 rounded-md bg-[var(--tg-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </button>
              </div>
              {error && (
                <div className="rounded-md bg-[var(--tg-error)]/10 p-3 text-sm text-[var(--tg-error)]">{error}</div>
              )}
            </div>
          ) : (
            <div className="p-[var(--tg-space-lg)] space-y-4">
              {/* Summary header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-[var(--tg-accent)]" aria-hidden />
                  <h1 className="text-base font-semibold text-[var(--tg-text-primary)]">{fileName ?? 'Style'}</h1>
                </div>
                <WorkspaceBadge
                  label={analysis.valid ? '✓ Valid' : `${analysis.errorCount} error${analysis.errorCount !== 1 ? 's' : ''}`}
                  variant={analysis.valid ? 'success' : 'error'}
                />
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Version', value: String(analysis.document.version ?? '—'), icon: Code2 },
                  { label: 'Sources', value: analysis.statistics.sourceCount, icon: Database },
                  { label: 'Layers', value: analysis.statistics.layerCount, icon: Layers },
                  { label: 'Expressions', value: analysis.statistics.expressionCount, icon: Code2 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-3 text-center">
                    <Icon className="mx-auto mb-1 h-4 w-4 text-[var(--tg-accent)]" aria-hidden />
                    <p className="text-lg font-bold text-[var(--tg-text-primary)]">{value}</p>
                    <p className="text-[10px] text-[var(--tg-text-muted)]">{label}</p>
                  </div>
                ))}
              </div>

              {/* Diagnostics summary */}
              {analysis.diagnostics.length > 0 && (
                <div className="rounded-lg border border-[var(--tg-warning)]/30 bg-[var(--tg-warning)]/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--tg-warning)]">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                    {analysis.diagnostics.length} diagnostic{analysis.diagnostics.length !== 1 ? 's' : ''}
                  </div>
                  <ul className="space-y-1">
                    {analysis.diagnostics.slice(0, 5).map((d, i) => (
                      <li key={i} className="text-xs text-[var(--tg-text-secondary)]">
                        <code className="text-[var(--tg-text-muted)]">{d.code}</code>{' '}
                        {d.message}
                      </li>
                    ))}
                    {analysis.diagnostics.length > 5 && (
                      <li className="text-[10px] text-[var(--tg-text-muted)]">
                        …and {analysis.diagnostics.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Layer detail panel */}
        {!rightCollapsed && (
          <aside
            className="flex shrink-0 flex-col overflow-hidden border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
            style={{ width: rightWidth }}
            aria-label="Layer Details"
          >
            {analysis ? (
              <LayerDetailPanel analysis={analysis} layerId={selectedLayerId} />
            ) : (
              <EmptyWorkspace
                icon={Paintbrush}
                title="No style loaded"
                description="Load a MapLibre style to inspect layers and expressions."
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
