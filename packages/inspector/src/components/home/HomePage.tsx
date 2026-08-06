/**
 * @tileguard/inspector — HomePage (Phase 2 redesign)
 *
 * Professional engineering workstation home screen.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │  Hero (HomeHeader — full-bleed with stats)       │
 *   ├───────────────────────────┬──────────────────────┤
 *   │  Quick Start              │  Recent + Docs       │
 *   │  Capabilities             │  (right rail)        │
 *   │  Demo Gallery             │                      │
 *   └───────────────────────────┴──────────────────────┘
 *
 * The entire page scrolls. Max-width 1200px, centred.
 * Right rail is sticky on larger viewports.
 */
import { BookOpen, ExternalLink, Clock, File, FolderOpen } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { toast } from 'sonner';
import { getWorkspaceService } from '../../services/WorkspaceService.js';
import { CapabilitiesSection } from './CapabilitiesSection.js';
import { DemoGallery } from './DemoGallery.js';
import { HomeHeader } from './HomeHeader.js';
import { QuickActions } from './QuickActions.js';

export interface HomePageProps {
  readonly onFileSelected: (file: File) => void;
  readonly onComparisonSelected?: (fileA: File, fileB: File) => void;
  readonly onOpenFilePicker?: () => void;
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function SectionGap(): JSX.Element {
  return <div className="h-8" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Right rail — Recent sessions
// ---------------------------------------------------------------------------

function RecentRail({ onOpenFilePicker }: { onOpenFilePicker: () => void }): JSX.Element {
  const layout = getWorkspaceService().getLayout();
  const lastFile = layout.lastFilePath;

  const handleClick = (filePath: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      void navigator.clipboard.writeText(filePath).then(() => {
        toast.success('Path copied', { description: filePath, duration: 2500 });
      });
      return;
    }
    onOpenFilePicker();
  };

  return (
    <div className="rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]">
      <div className="flex items-center gap-2 border-b border-[var(--tg-border)] px-4 py-3">
        <Clock className="h-3.5 w-3.5 text-[var(--tg-text-muted)]" aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
          Recent Sessions
        </h2>
      </div>

      <div className="p-3">
        {lastFile !== null ? (
          <Tooltip.Root delayDuration={400}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={(e) => handleClick(lastFile, e)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--tg-bg-hover)]"
                aria-label={`Reload ${lastFile} (Ctrl+click to copy path)`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--tg-bg-surface)]">
                  <File className="h-3.5 w-3.5 text-[var(--tg-text-muted)]" aria-hidden="true" />
                </div>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--tg-text-secondary)]">
                  {lastFile.split('/').pop() ?? lastFile}
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right" sideOffset={8}
                className="z-50 max-w-[18rem] rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-3 py-2 font-mono text-[11px] text-[var(--tg-text-secondary)] shadow-xl"
              >
                {lastFile}
                <div className="mt-1 font-sans text-[10px] text-[var(--tg-text-muted)]">Ctrl+click to copy</div>
                <Tooltip.Arrow className="fill-[var(--tg-border)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 py-5 text-center"
          >
            <FolderOpen className="h-6 w-6 text-[var(--tg-text-muted)]" aria-hidden="true" />
            <p className="text-xs text-[var(--tg-text-muted)]">No recent sessions</p>
            <button
              type="button"
              onClick={onOpenFilePicker}
              className="rounded-md border border-[var(--tg-border)] px-3 py-1 text-xs font-medium text-[var(--tg-text-secondary)] transition hover:border-[var(--tg-accent)]/50 hover:text-[var(--tg-accent)]"
            >
              Open File…
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right rail — Documentation links
// ---------------------------------------------------------------------------

function DocsRail(): JSX.Element {
  const links = [
    { label: 'Architecture', href: 'https://github.com/shreeharshshinde/tileguard/docs/architecture' },
    { label: 'Rule Reference', href: 'https://github.com/shreeharshshinde/tileguard/docs/rules' },
    { label: 'Contributing', href: 'https://github.com/shreeharshshinde/tileguard/CONTRIBUTING.md' },
    { label: 'GitHub', href: 'https://github.com/shreeharshshinde/tileguard' },
  ];

  return (
    <div className="rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]">
      <div className="flex items-center gap-2 border-b border-[var(--tg-border)] px-4 py-3">
        <BookOpen className="h-3.5 w-3.5 text-[var(--tg-text-muted)]" aria-hidden="true" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
          Documentation
        </h2>
      </div>
      <div className="p-3 space-y-0.5">
        {links.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
          >
            {label}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)]" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right rail — About / version card
// ---------------------------------------------------------------------------

function AboutRail(): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--tg-border)] bg-gradient-to-br from-[var(--tg-accent)]/6 to-transparent p-4">
      <p className="mb-1 text-sm font-semibold text-[var(--tg-text-primary)]">TileGuard Inspector</p>
      <p className="mb-3 text-xs leading-relaxed text-[var(--tg-text-secondary)]">
        The ESLint of geospatial — rule-based quality gates for vector tiles and MapLibre style specs.
      </p>
      <div className="space-y-1.5 text-[11px] text-[var(--tg-text-muted)]">
        <div className="flex justify-between">
          <span>Version</span>
          <span className="font-mono text-[var(--tg-text-secondary)]">1.0.0</span>
        </div>
        <div className="flex justify-between">
          <span>License</span>
          <span className="font-mono text-[var(--tg-text-secondary)]">MIT</span>
        </div>
        <div className="flex justify-between">
          <span>Presented at</span>
          <span className="text-[var(--tg-text-secondary)]">FOSS4G 2026</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------

export function HomePage({
  onFileSelected,
  onComparisonSelected,
  onOpenFilePicker,
}: HomePageProps): JSX.Element {
  const galleryRef = useRef<HTMLElement>(null);

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenFilePicker = () => {
    onOpenFilePicker?.();
  };

  return (
    <Tooltip.Provider>
      <main
        className="h-full w-full overflow-y-auto bg-[var(--tg-bg-primary)]"
        aria-label="TileGuard Home"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">

          {/* ── Hero ────────────────────────────────────────────── */}
          <HomeHeader />

          <SectionGap />

          {/* ── Two-column layout ───────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">

            {/* ── Left: main content ─────────────────────────── */}
            <div className="min-w-0 flex-1 space-y-8">

              {/* Quick Start */}
              <QuickActions
                onFileSelected={onFileSelected}
                onOpenDemo={scrollToGallery}
              />

              {/* Capabilities */}
              <CapabilitiesSection />

              {/* Demo Gallery */}
              <section aria-labelledby="demo-gallery-outer-heading">
                <div className="mb-4 flex items-center gap-2">
                  <h2
                    id="demo-gallery-outer-heading"
                    className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
                  >
                    Demo Gallery
                  </h2>
                  <div className="h-px flex-1 bg-[var(--tg-border)]" aria-hidden="true" />
                </div>
                <DemoGallery
                  onFileSelected={onFileSelected}
                  {...(onComparisonSelected !== undefined ? { onComparisonSelected } : {})}
                  galleryRef={galleryRef as React.RefObject<HTMLElement>}
                  hideSectionHeader
                />
              </section>
            </div>

            {/* ── Right rail ─────────────────────────────────── */}
            <div className="w-full space-y-4 lg:w-72 lg:shrink-0 lg:sticky lg:top-4">
              <RecentRail onOpenFilePicker={handleOpenFilePicker} />
              <DocsRail />
              <AboutRail />
            </div>
          </div>

          {/* Bottom padding so last section isn't flush against the edge */}
          <div className="h-16" aria-hidden="true" />
        </div>
      </main>
    </Tooltip.Provider>
  );
}
