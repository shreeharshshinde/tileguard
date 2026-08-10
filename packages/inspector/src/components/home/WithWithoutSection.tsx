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
    without: 'Render test failed — no actionable context',
    with: 'Diagnostic identifies the exact rule and affected feature',
  },
  {
    without: 'Manually decode PBF binary to understand tile structure',
    with: 'Inspect any feature directly in the visual canvas explorer',
  },
  {
    without: 'Search through thousands of features to find the problem',
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
          Every tool claims to make debugging easier. This is what that actually looks like.
        </p>
      </motion.div>

      {/* Comparison table */}
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/5 bg-[#09090b]">
        {/* Column headers */}
        <div className="grid grid-cols-2 border-b border-white/5">
          <div className="flex items-center gap-3 border-r border-white/5 px-8 py-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tg-error)]/10">
              <X className="h-3.5 w-3.5 text-[var(--tg-error)]" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-[var(--tg-text-muted)]">Without TileGuard</span>
          </div>
          <div className="flex items-center gap-3 px-8 py-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tg-accent)]/10">
              <Check className="h-3.5 w-3.5 text-[var(--tg-accent)]" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-white">With TileGuard</span>
          </div>
        </div>

        {/* Rows */}
        {COMPARISONS.map((row, i) => (
          <motion.div
            key={row.without}
            initial={{ opacity: 0, x: -16 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            className={`grid grid-cols-2 ${i < COMPARISONS.length - 1 ? 'border-b border-white/5' : ''}`}
          >
            {/* Without */}
            <div className="flex items-start gap-4 border-r border-white/5 px-8 py-5">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tg-error)]/50" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-[var(--tg-text-muted)]">
                {row.without}
              </p>
            </div>
            {/* With */}
            <div className="flex items-start gap-4 px-8 py-5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tg-accent)]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-white">
                {row.with}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
