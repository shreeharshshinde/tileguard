/**
 * @tileguard/inspector — HomeHeader
 *
 * Animated application header on the Home page.
 * Uses Framer Motion stagger orchestration for a polished cascaded entrance.
 * Each child (icon, title, subtitle) animates independently via variants.
 */
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

const logoVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 320, damping: 22, delay: 0.02 },
  },
};

export function HomeHeader(): JSX.Element {
  return (
    <motion.header
      variants={container}
      initial="hidden"
      animate="show"
      className="mb-10 text-center"
    >
      {/* Logo + wordmark */}
      <motion.div
        variants={item}
        className="mb-4 flex items-center justify-center gap-3"
      >
        <motion.span
          variants={logoVariant}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tg-accent)]/10 ring-1 ring-[var(--tg-accent)]/30"
        >
          <Shield
            className="h-6 w-6 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
        </motion.span>

        <h1 className="text-4xl font-bold tracking-tight text-[var(--tg-text-primary)]">
          TileGuard
        </h1>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        variants={item}
        className="mb-3 text-sm text-[var(--tg-text-secondary)]"
      >
        Vector tile quality analysis &amp; visual debugging workstation
      </motion.p>

      {/* Badge row */}
      <motion.div
        variants={item}
        className="flex items-center justify-center gap-2"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--tg-accent)]/30 bg-[var(--tg-accent)]/8 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--tg-accent)]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--tg-accent)]"
            aria-hidden="true"
          />
          Engineering Workstation
        </span>

        <span className="rounded-full border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-2.5 py-0.5 text-[10px] font-mono text-[var(--tg-text-muted)]">
          v0.4.x
        </span>
      </motion.div>
    </motion.header>
  );
}
