/**
 * @tileguard/inspector — DemoCatalog (Milestone 7.5 — Step C)
 *
 * Loads DemoManifest.json and renders the demo dataset grid.
 * Calls onLoadDemo when a dataset card is clicked.
 */

import { AlertCircle, Loader2, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  loadDemoDataset,
  loadDemoManifest,
  type DemoDataset,
  type DemoManifest,
} from '../../services/DemoLoader.js';
import { DemoCard } from './DemoCard.js';

interface DemoCatalogProps {
  readonly onLoadSingleDemo: (file: File, dataset: DemoDataset) => void;
  readonly onLoadComparisonDemo: (fileA: File, fileB: File, dataset: DemoDataset) => void;
}

type ManifestState =
  | { status: 'loading' }
  | { status: 'loaded'; manifest: DemoManifest }
  | { status: 'error'; message: string };

export function DemoCatalog({ onLoadSingleDemo, onLoadComparisonDemo }: DemoCatalogProps): JSX.Element {
  const [manifestState, setManifestState] = useState<ManifestState>({ status: 'loading' });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDemoManifest()
      .then((manifest) => {
        if (!cancelled) setManifestState({ status: 'loaded', manifest });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setManifestState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to load demo catalog',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoad = async (dataset: DemoDataset) => {
    setLoadingId(dataset.id);
    setLoadError(null);

    const result = await loadDemoDataset(dataset);

    if (result.kind === 'error') {
      setLoadError(result.message);
      setLoadingId(null);
      return;
    }

    if (result.kind === 'comparison') {
      onLoadComparisonDemo(result.fileA, result.fileB, result.dataset);
    } else {
      onLoadSingleDemo(result.file, result.dataset);
    }

    setLoadingId(null);
  };

  if (manifestState.status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-[var(--tg-space-sm)] py-[var(--tg-space-xl)] text-sm text-[var(--tg-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading demo catalog…
      </div>
    );
  }

  if (manifestState.status === 'error') {
    return (
      <div className="flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] border border-[var(--tg-error)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-xs text-[var(--tg-error)]">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {manifestState.message}
      </div>
    );
  }

  const { manifest } = manifestState;

  return (
    <section aria-labelledby="demo-catalog-heading">
      <div className="mb-[var(--tg-space-md)] flex items-center gap-[var(--tg-space-sm)]">
        <PlayCircle className="h-4 w-4 text-[var(--tg-accent)]" aria-hidden="true" />
        <h2
          id="demo-catalog-heading"
          className="text-sm font-semibold text-[var(--tg-text-primary)]"
        >
          Demo Datasets
        </h2>
        <span className="text-xs text-[var(--tg-text-muted)]">
          — no file picker needed
        </span>
      </div>

      {loadError !== null && (
        <div className="mb-[var(--tg-space-md)] flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] border border-[var(--tg-error)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-xs text-[var(--tg-error)]">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-[var(--tg-space-md)] sm:grid-cols-2 xl:grid-cols-3">
        {manifest.datasets.map((dataset) => (
          <DemoCard
            key={dataset.id}
            dataset={dataset}
            isLoading={loadingId === dataset.id}
            onLoad={(d) => { void handleLoad(d); }}
          />
        ))}
      </div>
    </section>
  );
}
