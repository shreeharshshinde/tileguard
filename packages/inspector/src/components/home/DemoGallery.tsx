/**
 * @tileguard/inspector — DemoGallery
 *
 * Grid of demo dataset cards on the Home screen.
 *
 * Libraries:
 *   - @radix-ui/react-tooltip   speaker notes visible on hover/keyboard focus
 *   - framer-motion             card entrance stagger + hover lift + AnimatePresence spinner
 *   - sonner                    toast on manifest error or dataset load failure
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  GitCompare,
  Globe,
  Loader2,
  RefreshCcw,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type DemoDataset,
  loadDemoDataset,
  loadDemoManifest,
} from '../../services/DemoLoader.js';

export interface DemoGalleryProps {
  readonly onFileSelected: (file: File) => void;
  readonly onComparisonSelected?: (fileA: File, fileB: File) => void;
  /** Ref forwarded by HomePage so QuickActions "Open Demo" can scroll here. */
  readonly galleryRef?: React.RefObject<HTMLElement>;
  /** When true, hides the built-in "Demo Gallery" section heading. */
  readonly hideSectionHeader?: boolean;
}

// ---------------------------------------------------------------------------
// Type meta — icon + accent color per dataset type
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  DemoDataset['type'],
  { icon: React.ReactNode; color: string; bg: string }
> = {
  tile: {
    icon: <Globe className="h-5 w-5" aria-hidden="true" />,
    color: 'text-[var(--tg-success)]',
    bg: 'bg-[var(--tg-success)]/10',
  },
  comparison: {
    icon: <GitCompare className="h-5 w-5" aria-hidden="true" />,
    color: 'text-[var(--tg-accent)]',
    bg: 'bg-[var(--tg-accent)]/10',
  },
  style: {
    icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
    color: 'text-[var(--tg-warning)]',
    bg: 'bg-[var(--tg-warning)]/10',
  },
};

const TAG_COLORS: Record<string, string> = {
  broken:
    'text-[var(--tg-error)] bg-[var(--tg-error)]/10 border-[var(--tg-error)]/25',
  comparison:
    'text-[var(--tg-accent)] bg-[var(--tg-accent)]/10 border-[var(--tg-accent)]/25',
  regression:
    'text-[var(--tg-warning)] bg-[var(--tg-warning)]/10 border-[var(--tg-warning)]/25',
  style: 'text-blue-400 bg-blue-400/10 border-blue-400/25',
  clean:
    'text-[var(--tg-success)] bg-[var(--tg-success)]/10 border-[var(--tg-success)]/25',
  diagnostics:
    'text-[var(--tg-error)] bg-[var(--tg-error)]/10 border-[var(--tg-error)]/25',
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
};

// ---------------------------------------------------------------------------
// SkeletonCard — pulse placeholder while manifest loads
// ---------------------------------------------------------------------------

function SkeletonCard({ index }: { index: number }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.07 }}
      className="h-44 animate-pulse rounded-[var(--tg-panel-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// DemoCard — individual dataset card
// ---------------------------------------------------------------------------

interface DemoCardProps {
  readonly dataset: DemoDataset;
  readonly index: number;
  readonly onLoad: (dataset: DemoDataset) => void;
  readonly loading: boolean;
  readonly anyLoading: boolean;
}

function DemoCard({
  dataset,
  index,
  onLoad,
  loading,
  anyLoading,
}: DemoCardProps): JSX.Element {
  const meta = TYPE_META[dataset.type];

  return (
    <Tooltip.Root delayDuration={350}>
      <Tooltip.Trigger asChild>
        <motion.button
          type="button"
          variants={cardVariant}
          onClick={() => onLoad(dataset)}
          disabled={anyLoading}
          whileHover={anyLoading ? {} : { y: -3 }}
          whileTap={anyLoading ? {} : { scale: 0.97 }}
          className="group flex w-full flex-col rounded-[var(--tg-panel-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-4 text-left transition-colors hover:border-[var(--tg-accent)]/60 hover:bg-[var(--tg-bg-hover)] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--tg-bg-primary)]"
          aria-label={`Load demo: ${dataset.title}`}
          aria-busy={loading}
        >
          {/* Icon row */}
          <div className="mb-3 flex items-start justify-between gap-2">
            {/* Coloured icon pill */}
            <span
              className={`flex items-center justify-center rounded-lg p-1.5 ${meta.color} ${meta.bg}`}
            >
              {meta.icon}
            </span>

            {/* Loading spinner (AnimatePresence for smooth mount/unmount) */}
            <AnimatePresence>
              {loading && (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2
                    className="h-4 w-4 animate-spin text-[var(--tg-accent)]"
                    aria-hidden="true"
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Title */}
          <span className="mb-1 text-sm font-semibold leading-snug text-[var(--tg-text-primary)] transition-colors group-hover:text-[var(--tg-accent)]">
            {dataset.title}
          </span>

          {/* Description */}
          <span className="mb-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-[var(--tg-text-secondary)]">
            {dataset.description}
          </span>

          {/* Tags */}
          <div className="mt-auto flex flex-wrap gap-1">
            {dataset.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                  TAG_COLORS[tag] ??
                  'border-[var(--tg-border)] bg-[var(--tg-bg-surface)] text-[var(--tg-text-muted)]'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Demo step footer */}
          <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--tg-border)] pt-2.5">
            <Zap
              className="h-3 w-3 shrink-0 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
            <span className="truncate text-[10px] font-medium text-[var(--tg-text-muted)]">
              {dataset.demoStep}
            </span>
          </div>
        </motion.button>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-50 max-w-[15rem] rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--tg-text-secondary)] shadow-xl"
        >
          {dataset.speakerNote ?? `Load the ${dataset.title} demo`}
          <Tooltip.Arrow className="fill-[var(--tg-border)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ---------------------------------------------------------------------------
// DemoGallery
// ---------------------------------------------------------------------------

export function DemoGallery({
  onFileSelected,
  onComparisonSelected,
  galleryRef,
  hideSectionHeader = false,
}: DemoGalleryProps): JSX.Element {
  const [datasets, setDatasets] = useState<readonly DemoDataset[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const internalRef = useRef<HTMLElement>(null);
  const sectionRef = (galleryRef ??
    internalRef) as React.RefObject<HTMLElement>;

  // Load manifest on mount
  useEffect(() => {
    let cancelled = false;
    loadDemoManifest()
      .then((manifest) => {
        if (!cancelled) setDatasets(manifest.datasets);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : 'Failed to load demo manifest';
          setManifestError(msg);
          toast.error('Demo gallery unavailable', {
            description: msg,
            duration: 6000,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetry = () => {
    setManifestError(null);
    setDatasets([]);
  };

  const handleLoad = async (dataset: DemoDataset) => {
    if (loadingId !== null) return;
    setLoadingId(dataset.id);

    const result = await loadDemoDataset(dataset);
    setLoadingId(null);

    if (result.kind === 'error') {
      toast.error(`Failed to load "${dataset.title}"`, {
        description: result.message,
        duration: 5000,
      });
      return;
    }

    if (result.kind === 'comparison') {
      toast.success('Comparison tiles loaded', {
        description: `${dataset.title} — ready to compare`,
        duration: 3000,
      });
      if (onComparisonSelected !== undefined) {
        onComparisonSelected(result.fileA, result.fileB);
      } else {
        onFileSelected(result.fileA);
      }
      return;
    }

    toast.success('Tile loaded', {
      description: dataset.title,
      duration: 3000,
    });
    onFileSelected(result.file);
  };

  return (
    <Tooltip.Provider>
      <section
        ref={sectionRef as React.RefObject<HTMLElement>}
        aria-labelledby="demo-gallery-heading"
        className="mb-10"
      >
        {/* Section heading */}
        {!hideSectionHeader && (
          <h2
            id="demo-gallery-heading"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
          >
            Demo Gallery
          </h2>
        )}

        {/* Error state */}
        {manifestError !== null ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--tg-error)]/30 bg-[var(--tg-error)]/5 px-4 py-3 text-xs text-[var(--tg-error)]"
            role="alert"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {manifestError}
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1 rounded px-2 py-1 text-[var(--tg-error)] transition hover:bg-[var(--tg-error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-error)]"
              aria-label="Retry loading demo gallery"
            >
              <RefreshCcw className="h-3 w-3" aria-hidden="true" />
              Retry
            </button>
          </motion.div>
        ) : datasets.length === 0 ? (
          /* Skeleton shimmer while manifest loads */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        ) : (
          /* Staggered card grid */
          <motion.div
            variants={grid}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {datasets.map((ds, i) => (
              <DemoCard
                key={ds.id}
                dataset={ds}
                index={i}
                onLoad={(d) => void handleLoad(d)}
                loading={loadingId === ds.id}
                anyLoading={loadingId !== null}
              />
            ))}
          </motion.div>
        )}
      </section>
    </Tooltip.Provider>
  );
}
