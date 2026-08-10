/**
 * @tileguard/inspector — GuidedDemoCard
 *
 * "Your first investigation" — a compelling entry point for new users.
 * Shows real tile statistics from the Tokyo demo tile and invites
 * users to run a guided investigation in under 60 seconds.
 */
import { motion, useInView } from 'framer-motion';
import { AlertCircle, ArrowRight, Layers, MapPin, Zap } from 'lucide-react';
import { useRef } from 'react';

export interface GuidedDemoCardProps {
  readonly onOpenDemo: () => void;
}

const TILE_STATS = [
  { icon: MapPin, label: 'Source', value: 'Tokyo, Japan' },
  { icon: Layers, label: 'Layers', value: '8 layers' },
  { icon: Zap, label: 'Features', value: '~12K features' },
  { icon: AlertCircle, label: 'Diagnostics', value: '1 finding' },
];

export function GuidedDemoCard({ onOpenDemo }: GuidedDemoCardProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="mx-auto w-full max-w-6xl px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="group relative overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(163,255,0,0.12)]"
      >
        {/* Gradient border */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[var(--tg-accent)]/25 via-transparent to-[var(--tg-accent)]/25 opacity-70 transition-all duration-500 group-hover:from-[var(--tg-accent)]/60 group-hover:to-[var(--tg-accent)]/60 group-hover:opacity-100" />

        <div className="relative z-10 flex flex-col overflow-hidden rounded-[23px] bg-[#09090b] shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)] lg:flex-row">
          {/* Soft background glow */}
          <div className="absolute left-1/2 top-1/2 -z-10 h-64 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-8" />

          {/* Left: CTA */}
          <div className="flex flex-col justify-center gap-6 p-10 lg:w-1/2 lg:border-r lg:border-white/5">
            {/* Badge */}
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--tg-accent)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--tg-accent)]" />
              New to TileGuard? Start here.
            </span>

            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
                Your first investigation,
                <br />
                in under 60 seconds.
              </h2>
              <p className="text-base leading-relaxed text-[var(--tg-text-secondary)]">
                Load a real Tokyo vector tile and investigate a deliberately
                broken geometry — from raw .pbf file to a full diagnostic report,
                guided step by step.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenDemo}
              className="group/btn relative flex w-fit items-center gap-3 overflow-hidden rounded-full bg-[var(--tg-accent)] px-6 py-3 text-sm font-bold text-black transition-all duration-300 hover:shadow-[0_0_30px_rgba(163,255,0,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Start Guided Demo</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" aria-hidden="true" />
            </button>
          </div>

          {/* Right: Tile stats */}
          <div className="flex flex-col justify-center gap-6 p-10 lg:w-1/2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--tg-text-muted)]">
              What you'll load
            </p>

            {/* Fake "terminal" tile preview */}
            <div className="rounded-2xl border border-white/5 bg-black/40 p-5 font-mono">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tg-error)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tg-warning)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tg-success)]" />
                <span className="ml-2 text-[10px] text-[var(--tg-text-muted)]">tokyo_14-14548-6487.pbf</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--tg-text-muted)]">size</span>
                  <span className="text-[11px] text-white">403 KB</span>
                </div>
                <div className="h-px bg-white/5" />
                {TILE_STATS.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--tg-text-muted)]">
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {label}
                    </span>
                    <span className={`text-[11px] font-medium ${label === 'Diagnostics' ? 'text-[var(--tg-warning)]' : 'text-white'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--tg-text-muted)] italic">
              "Load → Inspect → Diagnose → Report. The full TileGuard
              pipeline, live in your browser."
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
