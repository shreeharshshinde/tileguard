/**
 * @tileguard/inspector — WhyTileGuardSection
 *
 * A bento-style "Why TileGuard?" section that highlights the key
 * differentiators over manual tile debugging or generic linters.
 */
import { motion, useInView } from 'framer-motion';
import { CheckCircle, GitMerge, Globe2, Layers2, Zap } from 'lucide-react';
import { useRef } from 'react';

const DIFFERENTIATORS = [
  {
    icon: Globe2,
    title: 'Browser-first, zero setup',
    description:
      'Works entirely in the browser. No Node.js, no CLI, no Docker. Paste a URL or drag a file and you\'re analysing in seconds.',
    span: 'lg:col-span-2',
  },
  {
    icon: Zap,
    title: 'ESLint for vector tiles',
    description:
      'Declarative, pluggable rule engine. The same mental model as ESLint — just for geospatial data instead of JavaScript.',
    span: 'lg:col-span-1',
  },
  {
    icon: Layers2,
    title: 'Full MVT awareness',
    description:
      'Understands the Mapbox Vector Tile spec deeply — layers, features, geometry types, coordinate systems, and winding order.',
    span: 'lg:col-span-1',
  },
  {
    icon: GitMerge,
    title: 'CI-native quality gates',
    description:
      'Designed to run headlessly inside GitHub Actions. Block a deployment if tiles regress — the same way unit tests block broken code.',
    span: 'lg:col-span-2',
  },
];

const PROOF_POINTS = [
  '10 tile rules, 9 style rules, all open source',
  '131 automated tests — CI green',
  'Zero external API calls — 100% local processing',
  'Built for FOSS4G 2026 — production road-tested',
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function WhyTileGuardSection(): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      aria-label="Why TileGuard"
      className="relative w-full py-24 px-6 lg:px-10"
    >
      {/* Faint mid-page glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] -translate-x-1/2 opacity-10 blur-[100px]"
        style={{ background: 'radial-gradient(circle, var(--tg-accent), transparent 65%)' }}
      />

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16 flex flex-col items-center text-center"
      >
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
          Why TileGuard
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          Quality gates your tiles
          <br />
          <span className="text-[var(--tg-text-muted)]">deserve.</span>
        </h2>
      </motion.div>

      {/* Bento grid */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DIFFERENTIATORS.map((item, i) => (
          <motion.div
            key={item.title}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? 'show' : 'hidden'}
            transition={{ delay: i * 0.08 }}
            className={`group relative flex flex-col overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(163,255,0,0.1)] ${item.span}`}
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-60 transition-all duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

            <div className="relative z-10 flex h-full flex-col gap-5 overflow-hidden rounded-[23px] bg-[#09090b] p-8 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
              {/* Corner glow */}
              <div className="absolute -right-12 -top-12 z-0 h-36 w-36 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-15" />

              <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_20px_rgba(163,255,0,0.2)]">
                <item.icon className="h-5 w-5 text-[var(--tg-text-muted)] transition-colors duration-500 group-hover:text-[var(--tg-accent)]" aria-hidden="true" />
              </div>

              <div className="relative z-10 flex flex-col gap-2">
                <h3 className="text-xl font-bold tracking-tight text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/75">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Proof-points card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? 'show' : 'hidden'}
          transition={{ delay: DIFFERENTIATORS.length * 0.08 }}
          className="group relative flex flex-col overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 lg:col-span-3"
        >
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-[var(--tg-accent)]/30 via-transparent to-[var(--tg-accent)]/30 opacity-60 transition-all duration-500 group-hover:opacity-100" />

          <div className="relative z-10 flex flex-col gap-6 overflow-hidden rounded-[23px] bg-[#09090b] p-8 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] lg:flex-row lg:items-center lg:justify-between">
            <div className="absolute left-1/2 top-1/2 -z-10 h-48 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[80px] transition-opacity duration-700 group-hover:opacity-10" />

            <p className="text-2xl font-bold text-white">
              Built for real-world geospatial pipelines.
            </p>

            <ul className="flex flex-col gap-3 lg:items-end lg:text-right">
              {PROOF_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-sm text-[var(--tg-text-secondary)]">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[var(--tg-accent)]" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
