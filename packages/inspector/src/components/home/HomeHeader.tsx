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
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: 'easeOut' as const },
  },
};

const logoAnim = {
  hidden: { opacity: 0, scale: 0.75 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
      delay: 0.04,
    },
  },
};

const STAT_ITEMS = [
  { value: '25', label: 'Rules', icon: Layers },
  { value: '12', label: 'CLI Commands', icon: Zap },
  { value: '1,678', label: 'Tests Passing', icon: Shield },
  { value: 'CI', label: 'Ready', icon: GitCompare },
];

export function HomeHeader(): JSX.Element {
  return (
    <header className="relative mb-16 flex flex-col items-center text-center">
      {/* Background geospatial dotted map */}
      <div className="pointer-events-none absolute left-1/2 top-[-100px] -z-10 h-[600px] w-[1000px] -translate-x-1/2 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]">
        <img
          src="/dotted_map.svg"
          alt=""
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo */}
        <motion.div variants={up} className="-mb-8 md:-mb-16">
          <motion.div
            variants={logoAnim}
            className="relative flex h-64 w-64 md:h-[400px] md:w-[400px] items-center justify-center drop-shadow-[0_0_50px_rgba(163,255,0,0.3)]"
          >
            <img
              src="/tileguard_hero_logo.png"
              alt="TileGuard Logo"
              className="h-full w-full object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={up}
          className="mb-6 text-6xl md:text-8xl font-extrabold tracking-tighter"
        >
          <span className="text-white">Tile</span>
          <span className="text-[var(--tg-accent)] drop-shadow-[0_0_15px_rgba(163,255,0,0.4)]">
            Guard
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          variants={up}
          className="mx-auto mb-6 max-w-3xl text-2xl md:text-[28px] font-medium leading-snug tracking-tight text-white/90"
        >
          Automated quality gates for{' '}
          <span className="bg-gradient-to-r from-[var(--tg-accent)] to-emerald-400 bg-clip-text text-transparent font-semibold drop-shadow-[0_0_10px_rgba(163,255,0,0.15)]">
            geospatial software.
          </span>
        </motion.p>

        {/* Sub-tagline — precise four-line product description */}
        <motion.p
          variants={up}
          className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-[var(--tg-text-secondary)]"
        >
          Validate vector tiles and MapLibre styles.{' '}
          <span className="text-white/70">
            Inspect geometry. Diagnose failures. Compare tile versions. Generate
            engineering reports.
          </span>
        </motion.p>

        {/* Metrics */}
        <motion.div
          variants={up}
          className="relative flex overflow-hidden rounded-full bg-[#09090b] p-[1px] shadow-[0_10px_30px_-10px_rgba(163,255,0,0.15)]"
        >
          {/* Ultra-thin gradient border wrapper (active) */}
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-[var(--tg-accent)]/40 via-transparent to-[var(--tg-accent)]/40 opacity-100" />

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-8 md:gap-14 rounded-full bg-[#09090b] px-10 py-5 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] w-full">
            {/* Subtle radial glow (active) */}
            <div className="absolute left-1/2 top-1/2 -z-10 h-24 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--tg-accent)] opacity-15 blur-[50px]" />

            {STAT_ITEMS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black ring-1 ring-[var(--tg-accent)]/40 shadow-[0_0_15px_rgba(163,255,0,0.2),inset_0_1px_0px_rgba(255,255,255,0.1)]">
                  <Icon
                    className="h-4 w-4 text-[var(--tg-accent)]"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xl font-bold tracking-tight text-white leading-none mb-1.5 drop-shadow-sm">
                    {value}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)] leading-none">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </header>
  );
}
