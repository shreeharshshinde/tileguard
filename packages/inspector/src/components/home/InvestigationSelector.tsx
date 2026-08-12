/**
 * @tileguard/inspector — InvestigationSelector
 *
 * "What are you investigating?" — the primary user decision point.
 *
 * Layout: 1 large featured card (primary action) + 2×2 grid of secondary actions.
 * The featured card ("Validate a Tile") is visually dominant — it's the #1 use case.
 */
import { motion, useInView } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  GitCompare,
  Layers,
  Palette,
  PlayCircle,
} from 'lucide-react';
import { useRef } from 'react';

export interface InvestigationSelectorProps {
  readonly onFileSelected: (file: File) => void;
  readonly onOpenDemo: () => void;
}

const SECONDARY = [
  {
    icon: Layers,
    title: 'Inspect a Tile',
    description: 'Explore layers, features, and geometry interactively',
    tag: 'Explorer',
  },
  {
    icon: GitCompare,
    title: 'Compare Tiles',
    description: 'Diff two tile versions — additions, removals, regressions',
    tag: 'Diff',
  },
  {
    icon: Palette,
    title: 'Validate a Style',
    description: 'Check MapLibre GL JS style specs for issues',
    tag: 'Style Linter',
  },
  {
    icon: PlayCircle,
    title: 'Open a Demo',
    description: 'Start with pre-loaded Tokyo datasets, no file needed',
    tag: 'Quick start',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function InvestigationSelector({
  onOpenDemo,
}: InvestigationSelectorProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      ref={ref}
      aria-label="What are you investigating?"
      className="relative w-full px-6 py-16 lg:px-10"
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 text-center"
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--tg-text-muted)]">
          Primary decision point
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          What are you investigating?
        </h2>
        <p className="mt-4 text-base text-[var(--tg-text-secondary)]">
          Choose your starting point — TileGuard will guide you from there.
        </p>
      </motion.div>

      {/* Cards grid: 1 large featured + 4 secondary (all 50% width on desktop) */}
      <motion.div
        variants={container}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-6 lg:grid-rows-3"
      >
        {/* ── Featured card: Validate a Tile ──────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="group relative flex flex-col overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(163,255,0,0.18)] lg:col-span-3 lg:row-span-2"
        >
          {/* Gradient border */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[var(--tg-accent)]/40 to-transparent opacity-70 transition-all duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

          <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-[23px] bg-[#09090b] p-8 shadow-[inset_0_1px_0px_rgba(255,255,255,0.07)]">
            {/* Large accent glow */}
            <div className="absolute -right-16 -top-16 z-0 h-56 w-56 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[80px] transition-opacity duration-700 group-hover:opacity-20" />

            {/* Top: Icon + badge */}
            <div className="relative z-10 mb-auto flex items-start justify-between pb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black ring-1 ring-[var(--tg-accent)]/30 shadow-[0_0_20px_rgba(163,255,0,0.15),inset_0_1px_0px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:ring-[var(--tg-accent)]/60 group-hover:shadow-[0_0_30px_rgba(163,255,0,0.3)]">
                <AlertTriangle
                  className="h-7 w-7 text-[var(--tg-accent)]"
                  aria-hidden="true"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tg-accent)]/30 bg-[var(--tg-accent)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--tg-accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--tg-accent)]" />
                Most common
              </span>
            </div>

            {/* Bottom: Text + CTA */}
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
                  Validate a Tile
                </h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/80">
                  Find structural problems, geometry errors, and rule violations
                  in any .pbf or .mvt vector tile file.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-accent)] transition-all duration-300 group-hover:gap-3">
                Drop a tile to start
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Secondary cards: 2 × 2 ─────────────────────────────────────── */}
        {SECONDARY.map((item, _i) => (
          <motion.button
            key={item.title}
            type="button"
            variants={fadeUp}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (item.title === 'Open a Demo') onOpenDemo();
            }}
            className="group relative flex flex-col items-start overflow-hidden rounded-2xl bg-[#09090b] p-[1px] text-left transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(163,255,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] lg:col-span-3"
            aria-label={item.title}
          >
            {/* Border gradient */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 transition-all duration-400 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

            <div className="relative z-10 flex h-full w-full flex-col gap-5 overflow-hidden rounded-[15px] bg-[#09090b] px-6 py-5 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
              {/* Corner glow */}
              <div className="absolute -left-8 -top-8 z-0 h-24 w-24 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[50px] transition-opacity duration-500 group-hover:opacity-15" />

              {/* Icon + tag row */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.08)] transition-all duration-400 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_16px_rgba(163,255,0,0.2)]">
                  <item.icon
                    className="h-5 w-5 text-[var(--tg-text-muted)] transition-colors duration-400 group-hover:text-[var(--tg-accent)]"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)] transition-colors duration-400 group-hover:text-[var(--tg-accent)]/70">
                  {item.tag}
                </span>
              </div>

              {/* Text */}
              <div className="relative z-10 flex flex-col gap-1">
                <h3 className="text-sm font-bold tracking-tight text-white transition-colors duration-400 group-hover:text-[var(--tg-accent)]">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-400 group-hover:text-white/70">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}
