/**
 * @tileguard/inspector — HowItWorksSection
 *
 * A step-by-step visual walkthrough of the TileGuard workflow.
 * Shows the linear pipeline: Load → Inspect → Diagnose → Report
 */
import { motion, useInView } from 'framer-motion';
import { BarChart3, FileUp, GitCompare, ScrollText } from 'lucide-react';
import { useRef } from 'react';

const STEPS = [
  {
    number: '01',
    icon: FileUp,
    title: 'Load a Tile',
    description:
      'Drag and drop any Mapbox Vector Tile (.pbf or .mvt) directly into the browser. Tile analysis runs locally — no TileGuard server is required.',
    accent: '#a3ff00',
  },
  {
    number: '02',
    icon: BarChart3,
    title: 'Inspect & Explore',
    description:
      'Visually explore layer structure, geometry types, feature counts, and coordinate ranges in the interactive canvas and feature explorer.',
    accent: '#a3ff00',
  },
  {
    number: '03',
    icon: GitCompare,
    title: 'Run Diagnostics',
    description:
      'Apply 10 tile rules and 9 style rules against your tile. Violations are ranked by severity and surfaced with full diagnostic context.',
    accent: '#a3ff00',
  },
  {
    number: '04',
    icon: ScrollText,
    title: 'Generate Report',
    description:
      'Export a structured quality report as Markdown or JSON — ready to drop into a pull request, share with a team, or integrate with CI.',
    accent: '#a3ff00',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HowItWorksSection(): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      aria-label="How TileGuard Works"
      className="relative w-full py-24 px-6 lg:px-10"
    >
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16 flex flex-col items-center text-center"
      >
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
          Workflow
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          From raw tile to quality report
          <br />
          <span className="text-[var(--tg-text-muted)]">in four steps.</span>
        </h2>
      </motion.div>

      {/* Steps grid */}
      <div className="relative mx-auto max-w-[1360px]">
        {/* Continuous horizontal connector glowing line (desktop only) */}
        <div className="absolute left-[10%] right-[10%] top-[140px] z-0 hidden h-px lg:block">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--tg-accent)] to-transparent opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--tg-accent)] to-transparent blur-[4px] opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--tg-accent)] to-transparent blur-[12px] opacity-40" />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          className="relative z-10 grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              variants={fadeUp}
              className={`group relative flex flex-col overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(163,255,0,0.1)] ${i % 2 !== 0 ? 'lg:mt-16' : ''}`}
            >
              {/* Border gradient */}
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-60 transition-all duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

              <div className="relative z-10 flex h-full aspect-square flex-col overflow-hidden rounded-[23px] bg-[#09090b] p-8 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
                {/* Soft glow */}
                <div className="absolute -left-10 -top-10 z-0 h-40 w-40 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-15" />

                {/* Massive watermark number (moved to top right) */}
                <div className="pointer-events-none absolute top-4 right-6 z-0 select-none font-mono text-[120px] font-black leading-none text-white/[0.02] transition-colors duration-500 group-hover:text-[var(--tg-accent)]/[0.1]">
                  {step.number}
                </div>

                {/* Top: Icon */}
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_20px_rgba(163,255,0,0.2)]">
                    <step.icon
                      className="h-6 w-6 text-[var(--tg-text-muted)] transition-colors duration-500 group-hover:text-[var(--tg-accent)]"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Text content */}
                <div className="relative z-10 mt-auto flex flex-col gap-4">
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
                    {step.title}
                  </h3>
                  <p className="text-sm md:text-[15px] leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/80">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
