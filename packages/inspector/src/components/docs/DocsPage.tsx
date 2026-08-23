import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FileText,
  GitCompare,
  Layers,
  Shield,
  Zap,
} from 'lucide-react';
import { getNavigationService } from '../../services/NavigationService.js';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const DOCS_URL = 'https://docs-tileguard.vercel.app';

const QUICK_LINKS = [
  {
    icon: Zap,
    title: 'Quick Start',
    description: 'Install and run in 5 minutes',
    href: `${DOCS_URL}/getting-started/quick-start`,
  },
  {
    icon: Layers,
    title: 'Rules Reference',
    description: '21 built-in rules for tiles & styles',
    href: `${DOCS_URL}/rules/`,
  },
  {
    icon: Shield,
    title: 'How It Works',
    description: 'Architecture and pipeline',
    href: `${DOCS_URL}/learn/how-it-works`,
  },
  {
    icon: GitCompare,
    title: 'CI / GitHub Actions',
    description: 'Automated quality gates',
    href: `${DOCS_URL}/guides/ci-github-actions`,
  },
];

export function DocsPage(): JSX.Element {
  return (
    <div className="relative flex h-screen w-screen flex-col items-center overflow-y-auto bg-[#000000] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, var(--tg-accent), transparent 60%)',
        }}
      />

      {/* Header back button */}
      <div className="absolute left-0 top-0 p-6 z-20">
        <button
          type="button"
          onClick={() => getNavigationService().goHome()}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition-all hover:bg-white/10 hover:border-white/20"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--tg-text-secondary)] transition-colors group-hover:text-white" />
          <span className="text-sm font-medium text-[var(--tg-text-secondary)] transition-colors group-hover:text-white">
            Back to Home
          </span>
        </button>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex max-w-2xl flex-col items-center pt-24 pb-16 px-6 text-center z-10"
      >
        {/* Icon */}
        <motion.div
          variants={fadeUp}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--tg-bg-primary)] ring-1 ring-[var(--tg-accent)]/50 shadow-[0_0_30px_rgba(163,255,0,0.15)]"
        >
          <BookOpen className="h-10 w-10 text-[var(--tg-accent)]" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={fadeUp}
          className="mb-4 text-4xl font-extrabold tracking-tight text-white"
        >
          Documentation
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mb-10 text-lg leading-relaxed text-[var(--tg-text-secondary)]"
        >
          Rules, architecture, guides, and API reference — everything you need
          to validate, inspect, and ship quality geospatial data.
        </motion.p>

        {/* Open docs button */}
        <motion.a
          variants={fadeUp}
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-14 inline-flex items-center gap-2 rounded-full bg-[var(--tg-accent)] px-6 py-3 text-sm font-bold text-black transition-all hover:bg-[var(--tg-accent-hover)] hover:shadow-[0_0_20px_rgba(163,255,0,0.3)]"
        >
          <FileText className="h-4 w-4" />
          Open Documentation
          <ArrowUpRight className="h-3.5 w-3.5" />
        </motion.a>

        {/* Quick links grid */}
        <motion.div
          variants={fadeUp}
          className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {QUICK_LINKS.map(({ icon: Icon, title, description, href }) => (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-4 text-left transition-all hover:border-[var(--tg-accent)]/40 hover:shadow-[0_0_15px_rgba(163,255,0,0.06)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black ring-1 ring-white/10 transition-all group-hover:ring-[var(--tg-accent)]/40">
                <Icon className="h-4 w-4 text-[var(--tg-text-muted)] transition-colors group-hover:text-[var(--tg-accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-[var(--tg-accent)]">
                  {title}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--tg-text-muted)]">
                  {description}
                </p>
              </div>
              <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:text-[var(--tg-accent)]" />
            </a>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
