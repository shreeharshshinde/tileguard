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
      'Drag and drop any Mapbox Vector Tile (.pbf or .mvt) directly into the browser — no server required, processing is 100% local.',
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
      <motion.div
        variants={container}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {STEPS.map((step, i) => (
          <motion.div
            key={step.number}
            variants={fadeUp}
            className="group relative flex flex-col overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(163,255,0,0.1)]"
          >
            {/* Border gradient */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-60 transition-all duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

            <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-[23px] bg-[#09090b] p-7 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
              {/* Glow */}
              <div className="absolute -left-10 -top-10 z-0 h-32 w-32 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-15" />

              {/* Step number + connector line */}
              <div className="relative z-10 mb-6 flex items-center gap-4">
                <span className="font-mono text-4xl font-black text-white/5 transition-colors duration-500 group-hover:text-[var(--tg-accent)]/20 leading-none">
                  {step.number}
                </span>
                {/* Connector line — shown only between steps */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-full top-1/2 hidden h-px w-6 -translate-y-1/2 bg-white/5 lg:block" />
                )}
              </div>

              {/* Icon */}
              <div className="relative z-10 mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_20px_rgba(163,255,0,0.2)]">
                <step.icon className="h-5 w-5 text-[var(--tg-text-muted)] transition-colors duration-500 group-hover:text-[var(--tg-accent)]" aria-hidden="true" />
              </div>

              {/* Text */}
              <div className="relative z-10 mt-auto flex flex-col gap-2.5">
                <h3 className="text-lg font-bold tracking-tight text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/75">
                  {step.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
