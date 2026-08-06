/**
 * @tileguard/inspector — CapabilitiesSection
 *
 * Shows the three core capability areas with icons and short descriptions.
 * Positioned between QuickActions and DemoGallery on the home page.
 */
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  GitCompare,
  Layers,
  Palette,
  Radar,
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Layers,
    title: 'Tile Validation',
    description: '10 rules validating MVT structure, geometry, and feature metadata against real .pbf fixtures.',
    color: 'text-[var(--tg-success)]',
    bg: 'bg-[var(--tg-success)]/10',
    badge: '10 rules',
  },
  {
    icon: Palette,
    title: 'Style Linting',
    description: '9 rules checking MapLibre style specifications for source references, layer structure, and zoom ranges.',
    color: 'text-[var(--tg-accent)]',
    bg: 'bg-[var(--tg-accent)]/10',
    badge: '9 rules',
  },
  {
    icon: GitCompare,
    title: 'Tile Comparison',
    description: 'Structural diff between two tile versions — added, removed, and modified features with full layer breakdown.',
    color: 'text-[var(--tg-warning)]',
    bg: 'bg-[var(--tg-warning)]/10',
    badge: 'Analysis',
  },
  {
    icon: Radar,
    title: 'Regression Detection',
    description: 'Ranked regression analysis on comparison results — surfaces geometry regressions and property changes.',
    color: 'text-[var(--tg-error)]',
    bg: 'bg-[var(--tg-error)]/10',
    badge: 'Analysis',
  },
  {
    icon: BarChart3,
    title: 'Statistics',
    description: 'Feature count, layer composition, geometry type breakdown — all visualised per layer.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    badge: 'Workspace',
  },
  {
    icon: AlertTriangle,
    title: 'CI Integration',
    description: 'Drop-in GitHub Actions workflow. Run quality gates on every pull request, exactly like unit tests.',
    color: 'text-[var(--tg-text-secondary)]',
    bg: 'bg-[var(--tg-bg-surface)]',
    badge: 'DevOps',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export function CapabilitiesSection(): JSX.Element {
  return (
    <section aria-labelledby="capabilities-heading">
      <div className="mb-4 flex items-center gap-2">
        <h2
          id="capabilities-heading"
          className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
        >
          Capabilities
        </h2>
        <div className="h-px flex-1 bg-[var(--tg-border)]" aria-hidden="true" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {CAPABILITIES.map(({ icon: Icon, title, description, color, bg, badge }) => (
          <motion.div
            key={title}
            variants={item}
            className="group flex gap-3 rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-4 transition-colors hover:border-[var(--tg-border)] hover:bg-[var(--tg-bg-hover)]"
          >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--tg-text-primary)]">{title}</p>
                <span className="rounded border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--tg-text-muted)]">
                  {badge}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--tg-text-secondary)]">
                {description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
