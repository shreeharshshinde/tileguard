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
import { BenchmarkSection } from './BenchmarkSection.js';
import { CapabilitiesSection } from './CapabilitiesSection.js';


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
      href: 'https://docs-tileguard.vercel.app/getting-started/quick-start',
    },
    {
      label: 'Rules Reference',
      href: 'https://docs-tileguard.vercel.app/rules/',
    },
    {
      label: 'Architecture',
      href: 'https://docs-tileguard.vercel.app/learn/how-it-works',
    },
    {
      label: 'CI / GitHub Actions',
      href: 'https://docs-tileguard.vercel.app/guides/ci-github-actions',
    },
    { label: 'GitHub', href: 'https://github.com/shreeharshshinde/tileguard' },
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
// HomePage
// ---------------------------------------------------------------------------

const pageContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.8 },
  },
};

function AnimatedTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(terminalRef, { once: true, margin: '-80px' });
  const [typedCommand, setTypedCommand] = useState('');
  const [phase, setPhase] = useState<'typing' | 'output' | 'done'>('typing');
  const fullCommand = 'tileguard check ./tiles/z14/8741/5476.pbf';

  useEffect(() => {
    if (!isInView) return;
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      setTypedCommand(fullCommand.slice(0, currentIndex + 1));
      currentIndex++;
      if (currentIndex >= fullCommand.length) {
        clearInterval(intervalId);
        setTimeout(() => setPhase('output'), 400);
        setTimeout(() => setPhase('done'), 2200);
      }
    }, 35);
    return () => clearInterval(intervalId);
  }, [isInView]);

  const line = (delay: number, content: JSX.Element) => (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={phase !== 'typing' ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );

  return (
    <div ref={terminalRef} className="mx-auto mt-10 w-full max-w-4xl relative">

      {/* Outer ambient glow layers */}
      <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-[var(--tg-accent)]/15 via-transparent to-blue-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-sm pointer-events-none" />
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-16 w-3/4 bg-[var(--tg-accent)]/10 blur-[40px] rounded-full pointer-events-none" />

      {/* Main terminal shell */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="group relative overflow-hidden rounded-2xl
          border border-white/[0.09]
          bg-gradient-to-br from-[#101014] via-[#0c0c10] to-[#080810]
          shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)]
          transition-all duration-500
          hover:border-[var(--tg-accent)]/20
          hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07),0_0_60px_rgba(163,255,0,0.07)]"
      >

        {/* Scanline overlay for CRT texture */}
        <div
          className="pointer-events-none absolute inset-0 z-20 opacity-[0.025]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
          }}
        />

        {/* Inner top glare */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-white/[0.04] to-transparent z-10" />

        {/* Accent glow dot top-right */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--tg-accent)] opacity-[0.06] blur-[50px]" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-blue-500 opacity-[0.04] blur-[50px]" />

        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--tg-accent)]/40 to-transparent z-30" />

        {/* ── Titlebar ── */}
        <div className="relative z-30 flex items-center gap-0 border-b border-white/[0.06] bg-white/[0.015] px-5 py-3.5">
          {/* Traffic lights */}
          <div className="flex items-center gap-2 mr-4">
            <div className="relative h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.5)]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
            </div>
            <div className="relative h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.4)]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
            </div>
            <div className="relative h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.4)]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
            </div>
          </div>

          {/* Centered title with icon */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <svg className="h-3.5 w-3.5 text-[var(--tg-accent)] opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-mono text-[11px] text-zinc-500 tracking-widest select-none">
              zsh — tileguard
            </span>
          </div>
        </div>

        {/* ── Terminal body ── */}
        <div className="relative z-30 p-6 md:p-8 font-mono text-[13px] leading-[1.8] text-zinc-300 overflow-x-auto text-left min-h-[380px]">

          {/* Command prompt */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[var(--tg-accent)] drop-shadow-[0_0_6px_rgba(163,255,0,0.6)] select-none font-bold">❯</span>
            <span className="text-white/90">
              {/* command segments colored */}
              {typedCommand.length > 0 && (
                <>
                  <span className="text-[var(--tg-accent)]/90">
                    {typedCommand.slice(0, Math.min(typedCommand.length, 10))}
                  </span>
                  {typedCommand.length > 10 && (
                    <span className="text-sky-400/80">
                      {typedCommand.slice(10, Math.min(typedCommand.length, 17))}
                    </span>
                  )}
                  {typedCommand.length > 17 && (
                    <span className="text-zinc-300">
                      {typedCommand.slice(17)}
                    </span>
                  )}
                </>
              )}
              {phase === 'typing' && (
                <span className="inline-block w-[2px] h-[13px] ml-0.5 bg-[var(--tg-accent)] align-middle opacity-90 shadow-[0_0_6px_rgba(163,255,0,0.8)]"
                  style={{ animation: 'pulse 1s ease-in-out infinite' }} />
              )}
            </span>
          </div>

          {/* Output */}
          {phase !== 'typing' && (
            <div className="mt-4 space-y-0">

              {line(0, <div className="h-0.5" />)}

              {/* Source file header */}
              {line(0.05, (
                <div className="text-zinc-100 font-semibold tracking-tight">
                  ./tiles/z14/8741/5476.pbf
                </div>
              ))}

              {/* ── Error 1 ── */}
              {line(0.14, (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.6)] font-bold">✗</span>
                  <span className="text-red-400 font-semibold tracking-tight">tile/self-intersection</span>
                </div>
              ))}
              {line(0.22, (
                <div className="pl-5 text-zinc-400">
                  Geometry in layer <span className="text-amber-300/80">"landuse"</span> has intersecting segments.
                </div>
              ))}
              {line(0.28, (
                <div className="pl-5 text-zinc-600 text-[11.5px]">
                  at ./tiles/z14/8741/5476.pbf → layer: <span className="text-zinc-500">landuse</span>, feature: <span className="text-zinc-500">42</span>, part: <span className="text-zinc-500">0</span>
                </div>
              ))}
              {line(0.33, (
                <div className="pl-5 text-cyan-500/70 text-[11.5px]">
                  ℹ Simplify or repair this geometry before serving.
                </div>
              ))}

              {/* ── Warning 1 ── */}
              {line(0.43, (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] font-bold">⚠</span>
                  <span className="text-amber-400 font-semibold tracking-tight">tile/winding-order</span>
                </div>
              ))}
              {line(0.51, (
                <div className="pl-5 text-zinc-400">
                  Exterior ring in <span className="text-amber-300/80">"buildings"</span> has clockwise winding (expected CCW).
                </div>
              ))}
              {line(0.57, (
                <div className="pl-5 text-zinc-600 text-[11.5px]">
                  at ./tiles/z14/8741/5476.pbf → layer: <span className="text-zinc-500">buildings</span>, feature: <span className="text-zinc-500">17</span>
                </div>
              ))}

              {/* ── Passing rules ── */}
              {line(0.66, (
                <div className="mt-2.5 space-y-0.5">
                  {['tile/required-layers', 'tile/coordinate-range', 'tile/hole-containment', 'tile/no-empty'].map((rule) => (
                    <div key={rule} className="flex items-center gap-2 text-zinc-600">
                      <span className="text-green-500/80 drop-shadow-[0_0_3px_rgba(34,197,94,0.4)]">✓</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* ── Verdict ── */}
              {line(0.82, (
                <div className="mt-4 pt-3.5 border-t border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">✗</span>
                    <span className="text-red-400 font-bold tracking-wide">FAILED</span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-zinc-600">
                    <span className="text-red-400/80">1 error</span>
                    {', '}
                    <span className="text-amber-400/80">1 warning</span>
                    {' in 1 source '}
                    <span className="text-zinc-700">(34ms)</span>
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </motion.div>
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
              href="https://docs-tileguard.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[var(--tg-text-secondary)] hover:text-white transition-colors"
            >
              Documentation
            </a>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/shreeharshshinde/tileguard"
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

        {/* Benchmark Performance */}
        <div className="relative z-10 w-full">
          <BenchmarkSection />
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
