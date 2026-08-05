/**
 * @tileguard/inspector — HomePage (Phase 1 — Step 7)
 *
 * The permanent application entry point.  Shown when no session is active.
 * Canvas is NOT mounted while this page is visible.
 *
 * Layout (per spec):
 *
 *   TileGuard
 *   Engineering Workstation
 *   ────────────────────
 *   Quick Actions
 *     Load Tile  |  Load Style  |  Open Demo
 *   ────────────────────
 *   Demo Gallery
 *     Tokyo  |  Regression Demo  |  Broken Geometry
 *   ────────────────────
 *   Recent Sessions
 *   ────────────────────
 *   Documentation
 */
import { BookOpen, ExternalLink } from 'lucide-react';
import { useRef } from 'react';
import { DemoGallery } from './DemoGallery.js';
import { HomeHeader } from './HomeHeader.js';
import { QuickActions } from './QuickActions.js';
import { RecentSessions } from './RecentSessions.js';

export interface HomePageProps {
  readonly onFileSelected: (file: File) => void;
  readonly onComparisonSelected?: (fileA: File, fileB: File) => void;
  /** Called when the user requests to open the file picker from the recent-sessions list. */
  readonly onOpenFilePicker?: () => void;
}

// ---------------------------------------------------------------------------
// Documentation links section
// ---------------------------------------------------------------------------

function DocumentationLinks(): JSX.Element {
  const links: readonly { label: string; href: string }[] = [
    { label: 'Architecture', href: 'https://github.com/shreeharshshinde/tileguard/docs/architecture' },
    { label: 'Rule Reference', href: 'https://github.com/shreeharshshinde/tileguard/docs/rules' },
    { label: 'Contributing', href: 'https://github.com/shreeharshshinde/tileguard/CONTRIBUTING.md' },
  ];

  return (
    <section aria-labelledby="docs-heading" className="mb-[var(--tg-space-2xl)]">
      <div className="mb-[var(--tg-space-md)] flex items-center gap-[var(--tg-space-sm)]">
        <BookOpen className="h-4 w-4 text-[var(--tg-text-muted)]" aria-hidden="true" />
        <h2
          id="docs-heading"
          className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
        >
          Documentation
        </h2>
      </div>
      <ul className="flex flex-wrap gap-[var(--tg-space-sm)]">
        {links.map(({ label, href }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-md)] py-[var(--tg-space-xs)] text-xs text-[var(--tg-text-secondary)] transition hover:border-[var(--tg-accent)] hover:text-[var(--tg-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
            >
              {label}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Divider helper
// ---------------------------------------------------------------------------

function Divider(): JSX.Element {
  return (
    <div
      className="my-[var(--tg-space-xl)] h-px bg-[var(--tg-border)]"
      aria-hidden="true"
    />
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
    if (onOpenFilePicker !== undefined) {
      onOpenFilePicker();
    }
  };

  return (
    <main
      className="min-w-0 flex-1 overflow-y-auto bg-[var(--tg-bg-primary)]"
      aria-label="TileGuard Home"
    >
      <div className="mx-auto max-w-3xl px-[var(--tg-space-2xl)] py-[var(--tg-space-2xl)]">
        {/* Header */}
        <HomeHeader />

        <Divider />

        {/* Quick Actions */}
        <QuickActions
          onFileSelected={onFileSelected}
          onOpenDemo={scrollToGallery}
        />

        <Divider />

        {/* Demo Gallery */}
        <DemoGallery
          onFileSelected={onFileSelected}
          {...(onComparisonSelected !== undefined ? { onComparisonSelected } : {})}
          galleryRef={galleryRef as React.RefObject<HTMLElement>}
        />

        <Divider />

        {/* Recent Sessions */}
        <RecentSessions onOpenFilePicker={handleOpenFilePicker} />

        <Divider />

        {/* Documentation */}
        <DocumentationLinks />
      </div>
    </main>
  );
}
