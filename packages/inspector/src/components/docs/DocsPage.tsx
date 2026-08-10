import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { getNavigationService } from '../../services/NavigationService.js';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function DocsPage(): JSX.Element {
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#000000] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      {/* Background glow */}
      <div 
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[100px]" 
        style={{ background: 'radial-gradient(circle, var(--tg-accent), transparent 60%)' }} 
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
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex max-w-lg flex-col items-center text-center z-10"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--tg-bg-primary)] ring-1 ring-[var(--tg-accent)]/50 shadow-[0_0_30px_rgba(163,255,0,0.15)]">
          <BookOpen className="h-10 w-10 text-[var(--tg-accent)]" />
        </div>
        
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white">
          Documentation
        </h1>
        
        <p className="mb-10 text-lg leading-relaxed text-[var(--tg-text-secondary)]">
          The official TileGuard documentation is currently being written. It will contain complete references for all rules, configuration guides, and architecture overviews.
        </p>

        <div className="rounded-2xl border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-6 py-4">
          <p className="font-mono text-sm text-[var(--tg-accent)]">
            Coming soon in v1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
