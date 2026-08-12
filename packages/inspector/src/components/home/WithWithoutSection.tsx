/**
 * @tileguard/inspector — WithWithoutSection
 *
 * "Why engineers use TileGuard" — a compact comparison table
 * showing the before/after of manual tile debugging vs TileGuard.
 *
 * Communicates the actual value proposition in the most direct way possible.
 */
import { motion, useInView } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useRef } from 'react';

const COMPARISONS = [
  {
    without: 'Render test failed — limited root-cause context',
    with: 'Diagnostic identifies the exact rule and affected feature',
  },
  {
    without: 'Inspecting raw PBF data is difficult to do manually',
    with: 'Inspect any feature directly in the visual canvas explorer',
  },
  {
    without: 'Finding the affected feature can require manual investigation',
    with: 'Jump directly to the affected geometry in one click',
  },
  {
    without: 'Write custom scripts to diff two tile versions',
    with: 'Run a structured comparison and get a ranked diff instantly',
  },
  {
    without: 'Quality checks happen manually, inconsistently, or not at all',
    with: 'Run quality gates on every pull request via GitHub Actions',
  },
];

export function WithWithoutSection(): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      aria-label="Why engineers use TileGuard"
      className="relative w-full py-24 px-6 lg:px-10"
    >
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14 flex flex-col items-center text-center"
      >
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
          The value
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          From failure to explanation.
        </h2>
        <p className="mt-4 max-w-xl text-base text-[var(--tg-text-secondary)]">
          Every tool claims to make debugging easier. This is what that actually
          looks like.
        </p>
      </motion.div>

      {/* Comparison table */}
      <div className="group/table mx-auto max-w-5xl rounded-3xl border border-white/5 bg-[#09090b]">
        {/* Column headers */}
        <div className="grid grid-cols-2 border-b border-white/5 bg-[#09090b] rounded-t-3xl overflow-hidden">
          <div className="relative flex items-center gap-3 border-r border-white/5 bg-[var(--tg-error)]/[0.01] px-8 py-6">
            {/* Top glowing error line for the 'Without' column */}
            <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--tg-error)]/0 via-[var(--tg-error)]/50 to-[var(--tg-error)]/0" />

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tg-error)]/10 ring-1 ring-[var(--tg-error)]/20 shadow-[0_0_15px_rgba(255,51,102,0.1)]">
              <X
                className="h-3.5 w-3.5 text-[var(--tg-error)]"
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-bold tracking-wide text-[var(--tg-text-muted)] transition-colors duration-300 group-hover:text-white">
              Without TileGuard
            </span>
          </div>
          <div className="relative flex items-center gap-3 bg-[var(--tg-accent)]/[0.03] px-8 py-6">
            {/* Top glowing accent line for the 'With' column */}
            <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[var(--tg-accent)]/0 via-[var(--tg-accent)] to-[var(--tg-accent)]/0" />

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tg-accent)]/10 ring-1 ring-[var(--tg-accent)]/30 shadow-[0_0_15px_rgba(163,255,0,0.15)]">
              <Check
                className="h-3.5 w-3.5 text-[var(--tg-accent)]"
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-bold tracking-wide text-white">
              With TileGuard
            </span>
          </div>
        </div>

        {/* Rows */}
        {COMPARISONS.map((row, i) => (
          <motion.div
            key={row.without}
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{
              duration: 0.45,
              delay: i * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`group relative z-0 grid grid-cols-2 transition-all duration-500 hover:bg-[#121214] hover:scale-[1.03] hover:-translate-y-1 hover:z-20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:ring-1 hover:ring-white/10 hover:rounded-2xl overflow-hidden ${i < COMPARISONS.length - 1 ? 'border-b border-white/[0.02] hover:border-transparent' : ''} ${i === COMPARISONS.length - 1 ? 'rounded-b-3xl' : ''} group-hover/table:opacity-40 group-hover/table:blur-[2px] hover:!opacity-100 hover:!blur-none`}
          >
            {/* Without */}
            <div className="relative flex items-center gap-4 border-r border-white/5 bg-[var(--tg-error)]/[0.01] px-8 py-5 transition-all duration-300 group-hover:bg-[var(--tg-error)]/[0.02]">
              <X
                className="h-4 w-4 shrink-0 text-[var(--tg-error)]/40 transition-all duration-300 group-hover:text-[var(--tg-error)] group-hover:shadow-[0_0_10px_rgba(255,51,102,0.3)]"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-[var(--tg-text-muted)] transition-all duration-300 origin-left group-hover:text-white/70 group-hover:scale-[1.03]">
                {row.without}
              </p>
            </div>
            {/* With */}
            <div className="relative flex items-center gap-4 bg-[var(--tg-accent)]/[0.02] px-8 py-5 transition-colors duration-300 group-hover:bg-[var(--tg-accent)]/[0.06]">
              {/* Subtle left glow on hover */}
              <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-gradient-to-b from-transparent via-[var(--tg-accent)]/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <Check
                className="h-4 w-4 shrink-0 text-[var(--tg-accent)] shadow-[0_0_10px_rgba(163,255,0,0.3)]"
                aria-hidden="true"
              />
              <p className="text-sm font-medium leading-relaxed text-white transition-all duration-300 origin-left group-hover:scale-[1.03]">
                {row.with}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
