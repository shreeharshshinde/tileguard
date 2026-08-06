/**
 * @tileguard/inspector — HomeHeader (Phase 2 redesign)
 *
 * Full-bleed hero section for the Home page.
 * Includes: animated logo, headline, subline, badge row, and a
 * subtle animated gradient mesh background.
 */
import { motion } from 'framer-motion';
import { GitCompare, Layers, Shield, Zap } from 'lucide-react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const up = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

const logoAnim = {
  hidden: { opacity: 0, scale: 0.75 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.04 },
  },
};

const STAT_ITEMS = [
  { value: '10', label: 'Tile Rules', icon: Layers },
  { value: '9', label: 'Style Rules', icon: Zap },
  { value: '131', label: 'Tests Passing', icon: Shield },
  { value: 'CI', label: 'Ready', icon: GitCompare },
];

export function HomeHeader(): JSX.Element {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]">
      {/* Decorative gradient mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(59,130,246,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(34,197,94,0.10) 0%, transparent 60%)',
        }}
      />

      {/* Grid dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--tg-text-primary) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative px-8 pb-8 pt-10 text-center"
      >
        {/* Logo + wordmark */}
        <motion.div
          variants={up}
          className="mb-5 flex items-center justify-center gap-3"
        >
          <motion.div
            variants={logoAnim}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tg-accent)]/12 ring-2 ring-[var(--tg-accent)]/25"
          >
            <Shield className="h-7 w-7 text-[var(--tg-accent)]" aria-hidden="true" />
          </motion.div>
          <h1 className="text-5xl font-bold tracking-tight text-[var(--tg-text-primary)]">
            TileGuard
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={up}
          className="mx-auto mb-2 max-w-lg text-base font-medium text-[var(--tg-text-secondary)]"
        >
          Automated quality gates for geospatial software
        </motion.p>

        <motion.p
          variants={up}
          className="mx-auto mb-6 max-w-md text-sm text-[var(--tg-text-muted)]"
        >
          The same engineering discipline ESLint brings to JavaScript,
          applied to vector tiles and MapLibre style specifications.
        </motion.p>

        {/* Badge row */}
        <motion.div
          variants={up}
          className="mb-8 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tg-accent)]/30 bg-[var(--tg-accent)]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--tg-accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--tg-accent)]" aria-hidden="true" />
            Engineering Workstation
          </span>
          <span className="rounded-full border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-2.5 py-1 font-mono text-[10px] text-[var(--tg-text-muted)]">
            v1.0.0
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--tg-success)]/30 bg-[var(--tg-success)]/8 px-2.5 py-1 text-[11px] font-medium text-[var(--tg-success)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--tg-success)]" aria-hidden="true" />
            MIT License
          </span>
          <span className="rounded-full border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-2.5 py-1 text-[11px] text-[var(--tg-text-muted)]">
            FOSS4G 2026 · Hiroshima
          </span>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={up}
          className="grid grid-cols-4 divide-x divide-[var(--tg-border)] overflow-hidden rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-primary)]/60"
        >
          {STAT_ITEMS.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 px-4 py-3"
            >
              <Icon
                className="h-4 w-4 text-[var(--tg-accent)]"
                aria-hidden="true"
              />
              <span className="text-xl font-bold text-[var(--tg-text-primary)]">
                {value}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--tg-text-muted)]">
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </header>
  );
}
