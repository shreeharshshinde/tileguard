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

import * as Tooltip from '@radix-ui/react-tooltip';
import { motion, useInView } from 'framer-motion';
import { BookOpen, Clock, ExternalLink, File, FolderOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getWorkspaceService } from '../../services/WorkspaceService.js';
import { CapabilitiesSection } from './CapabilitiesSection.js';

import { GuidedDemoCard } from './GuidedDemoCard.js';
import { HomeFooter } from './HomeFooter.js';
import { HomeHeader } from './HomeHeader.js';
import { HowItWorksSection } from './HowItWorksSection.js';
import { InvestigationSelector } from './InvestigationSelector.js';
import { QuickActions } from './QuickActions.js';
import { WhyTileGuardSection } from './WhyTileGuardSection.js';
import { WithWithoutSection } from './WithWithoutSection.js';

export interface HomePageProps {
  readonly onFileSelected: (file: File) => void;
  readonly onComparisonSelected?: (fileA: File, fileB: File) => void;
  readonly onOpenFilePicker?: () => void;
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function _SectionGap(): JSX.Element {
  return <div className="h-8" aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Right rail — Recent sessions
// ---------------------------------------------------------------------------

function _RecentRail({
  onOpenFilePicker,
}: {
  onOpenFilePicker: () => void;
}): JSX.Element {
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
        <Clock
          className="h-3.5 w-3.5 text-[var(--tg-text-muted)]"
          aria-hidden="true"
        />
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
                  <File
                    className="h-3.5 w-3.5 text-[var(--tg-text-muted)]"
                    aria-hidden="true"
                  />
                </div>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--tg-text-secondary)]">
                  {lastFile.split('/').pop() ?? lastFile}
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                sideOffset={8}
                className="z-50 max-w-[18rem] rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-3 py-2 font-mono text-[11px] text-[var(--tg-text-secondary)] shadow-xl"
              >
                {lastFile}
                <div className="mt-1 font-sans text-[10px] text-[var(--tg-text-muted)]">
                  Ctrl+click to copy
                </div>
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
            <FolderOpen
              className="h-6 w-6 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
            <p className="text-xs text-[var(--tg-text-muted)]">
              No recent sessions
            </p>
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

function _DocsRail(): JSX.Element {
  const links = [
    {
      label: 'Quick Start',
      href: 'https://tileguard-docs-shindeshreeharsh.vercel.app/getting-started/quick-start',
    },
    {
      label: 'Rules Reference',
      href: 'https://tileguard-docs-shindeshreeharsh.vercel.app/rules/',
    },
    {
      label: 'Architecture',
      href: 'https://tileguard-docs-shindeshreeharsh.vercel.app/learn/how-it-works',
    },
    {
      label: 'CI / GitHub Actions',
      href: 'https://tileguard-docs-shindeshreeharsh.vercel.app/guides/ci-github-actions',
    },
    { label: 'GitHub', href: 'https://github.com/shindeshreeharsh/tileguard' },
  ];

  return (
    <div className="rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]">
      <div className="flex items-center gap-2 border-b border-[var(--tg-border)] px-4 py-3">
        <BookOpen
          className="h-3.5 w-3.5 text-[var(--tg-text-muted)]"
          aria-hidden="true"
        />
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
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right rail — About / version card
// ---------------------------------------------------------------------------

function _AboutRail(): JSX.Element {
  return (
    <div className="rounded-[var(--tg-panel-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--tg-bg-primary)] ring-1 ring-[var(--tg-border)] text-[var(--tg-accent)]">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--tg-text-primary)]">
          TileGuard
        </p>
      </div>
      <p className="mb-5 text-xs leading-relaxed text-[var(--tg-text-secondary)]">
        Automated quality gates for geospatial software.
      </p>
      <div className="space-y-2.5 text-[11px] text-[var(--tg-text-muted)]">
        <div className="flex justify-between items-center">
          <span>Version</span>
          <span className="rounded bg-[var(--tg-accent)]/10 border border-[var(--tg-accent)]/20 px-1.5 py-0.5 font-mono text-[10px] text-[var(--tg-accent)]">
            v0.5.0-rc.1
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>License</span>
          <span className="font-mono text-[var(--tg-text-primary)]">MIT</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Event</span>
          <span className="font-mono text-[var(--tg-text-primary)]">
            FOSS4G 2026
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ANIMATION VARIANTS
//
const pageContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

function AnimatedTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(terminalRef, { once: true, margin: '-50px' });
  const [typedCommand, setTypedCommand] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const fullCommand = 'tileguard check ./tiles/14/8741/5476.pbf';

  useEffect(() => {
    if (!isInView) return;
    
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      setTypedCommand(fullCommand.slice(0, currentIndex + 1));
      currentIndex++;
      
      if (currentIndex >= fullCommand.length) {
        clearInterval(intervalId);
        setTimeout(() => setShowOutput(true), 300);
      }
    }, 40);

    return () => clearInterval(intervalId);
  }, [isInView]);

  return (
    <div ref={terminalRef} className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-3xl shadow-2xl relative group transition-all duration-300 hover:border-[var(--tg-accent)]/30 hover:shadow-[0_0_40px_rgba(163,255,0,0.1)]">
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--tg-accent)]/30 to-transparent"></div>
      
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-black/40 px-5 py-4">
        <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
        <div className="h-3 w-3 rounded-full bg-amber-500/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
        <div className="h-3 w-3 rounded-full bg-green-500/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"></div>
        <div className="ml-2 flex-1 text-center font-mono text-[11px] font-medium tracking-wider text-zinc-500">
          bash
        </div>
      </div>
      
      {/* Terminal body */}
      <div className="p-6 font-mono text-sm leading-relaxed text-zinc-200 overflow-x-auto text-left min-h-[340px]">
        <div className="flex items-start">
          <span className="mr-3 select-none text-[var(--tg-accent)] font-bold">$</span>
          <span className="text-white">
            {typedCommand}
            {!showOutput && <span className="inline-block w-[7px] h-4 ml-1 bg-zinc-400 animate-pulse align-middle" />}
          </span>
        </div>
        
        {showOutput && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <div className="mt-6">
              <span className="text-red-500 font-bold mr-2">✗</span>
              <span className="text-white font-medium">tile/self-intersection</span>
            </div>
            <div className="pl-6 mt-1 text-zinc-400">
              Geometry in layer "landuse", feature 42<br/>
              has intersecting segments 1 and 4.<br/>
              <span className="text-zinc-500">→ layer: landuse · feature: 42 · part: 0</span><br/>
              <span className="text-zinc-500">ℹ Simplify or repair this geometry.</span>
            </div>
            
            <div className="mt-6">
              <span className="text-amber-500 font-bold mr-2">⚠</span>
              <span className="text-white font-medium">tile/winding-order</span>
            </div>
            <div className="pl-6 mt-1 text-zinc-400">
              Ring 0 in "buildings", feature 17 has incorrect winding.<br/>
              <span className="text-zinc-500">→ layer: buildings · feature: 17</span>
            </div>
            
            <div className="mt-6 flex flex-col gap-1">
              <div>
                <span className="text-green-500 font-bold mr-2">✓</span>
                <span className="text-zinc-500">tile/required-layers</span>
              </div>
              <div>
                <span className="text-green-500 font-bold mr-2">✓</span>
                <span className="text-zinc-500">tile/coordinate-range</span>
              </div>
              <div>
                <span className="text-green-500 font-bold mr-2">✓</span>
                <span className="text-zinc-500">tile/hole-containment</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800/50 text-zinc-400">
              1 error · 1 warning · 1 file · 34ms
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function HomePage({
  onFileSelected,
  onComparisonSelected,
}: HomePageProps): JSX.Element {
  const galleryRef = useRef<HTMLElement>(null);

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Tooltip.Provider>
      <main
        className="relative h-screen w-screen overflow-y-auto overflow-x-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)] selection:bg-[var(--tg-accent)] selection:text-black"
        aria-label="TileGuard Home"
      >
        {/* Massive top glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-[-20%] -z-10 h-[1000px] w-[1200px] -translate-x-1/2 opacity-20 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, var(--tg-accent), transparent 60%)',
          }}
        />

        {/* Header Bar */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeIn}
          className="absolute top-0 left-0 w-full flex items-center justify-between p-6 z-20"
        >
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)]">
              <svg
                className="h-4 w-4 text-[var(--tg-accent)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              TileGuard
            </span>
          </div>

          {/* Right: Docs, GitHub Star & Version */}
          <div className="flex items-center gap-8">
            <a
              href="https://tileguard-docs-shindeshreeharsh.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[var(--tg-text-secondary)] hover:text-white transition-colors"
            >
              Documentation
            </a>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/shindeshreeharsh/tileguard"
                target="_blank"
                rel="noreferrer"
                className="group flex h-8 items-center gap-2 rounded-full border border-white/5 bg-[#09090b] px-4 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] transition-all duration-300 hover:border-[var(--tg-accent)]/50 hover:shadow-[0_0_15px_rgba(163,255,0,0.15)]"
              >
                <svg
                  className="h-4 w-4 text-[var(--tg-text-muted)] group-hover:text-[var(--tg-accent)] transition-colors duration-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-[11px] font-bold tracking-wide text-white transition-colors duration-300">
                  Star us on GitHub
                </span>
              </a>
              <span className="flex h-8 items-center rounded-full bg-[var(--tg-accent)]/10 border border-[var(--tg-accent)]/20 px-3 font-mono text-[11px] font-semibold tracking-wider text-[var(--tg-accent)]">
                v0.5.0-rc.1
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Centered Content (Top) */}
        <motion.div
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto max-w-7xl px-6 pt-32 lg:px-10 flex flex-col items-center"
        >
          {/* Hero */}
          <HomeHeader />

          {/* Core Action Zone (Dropzone + 2 Cards) */}
          <motion.div variants={fadeUp} className="w-full max-w-6xl mt-4 mb-12">
            <QuickActions
              onFileSelected={onFileSelected}
              onOpenDemo={scrollToGallery}
            />
          </motion.div>
        </motion.div>

        {/* "What are you investigating?" — primary user decision point */}
        <div className="relative z-10 w-full">
          <InvestigationSelector
            onFileSelected={onFileSelected}
            onOpenDemo={scrollToGallery}
          />
        </div>

        {/* Guided demo card */}
        <div className="relative z-10 w-full py-6">
          <GuidedDemoCard onOpenDemo={scrollToGallery} />
        </div>

        {/* Capabilities Conveyor Belt (Full Width) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeIn}
          className="w-full relative z-10"
        >
          <CapabilitiesSection />
        </motion.div>

        {/* How It Works */}
        <div className="relative z-10 w-full">
          <HowItWorksSection />
        </div>

        {/* Without vs With TileGuard */}
        <div className="relative z-10 w-full">
          <WithWithoutSection />
        </div>

        {/* Why TileGuard */}
        <div className="relative z-10 w-full">
          <WhyTileGuardSection />
        </div>

        {/* Demo Gallery */}
        <motion.div
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto max-w-6xl px-6 pb-24 lg:px-10 w-full"
        >
          <motion.div variants={fadeUp} className="w-full mt-8">
            <div className="mb-12 flex flex-col items-center text-center">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
                CLI Tool
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                Try it now,
                <br />
                <span className="text-[var(--tg-text-muted)]">
                  locally in your terminal.
                </span>
              </h2>
              <p className="mt-4 max-w-lg text-base text-[var(--tg-text-secondary)]">
                Run tileguard check directly in your CI/CD pipeline or local
                environment to instantly validate vector tiles.
              </p>
            </div>
            
            <AnimatedTerminal />
          </motion.div>
        </motion.div>

        {/* Footer */}
        <div className="relative z-10 w-full">
          <HomeFooter />
        </div>
      </main>
    </Tooltip.Provider>
  );
}
