/**
 * @tileguard/inspector — BenchmarkSection
 *
 * Showcases TileGuard's production benchmark results — throughput, latency,
 * and memory metrics across 3 real-world vector tile datasets.
 */
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { Activity, Cpu, Database, Gauge, MemoryStick, Zap, Trophy } from 'lucide-react';
import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Benchmark data (from actual runs on cached production tiles)
// ---------------------------------------------------------------------------

const BENCHMARK_RESULTS = [
  {
    dataset: 'CARTO Streets',
    tiles: 100,
    totalMs: 860.60,
    avgMs: 8.61,
    throughput: 116.20,
    diagnostics: 6785,
    fastest: true,
  },
  {
    dataset: 'OpenFreeMap',
    tiles: 100,
    totalMs: 1217.25,
    avgMs: 12.17,
    throughput: 82.15,
    diagnostics: 6644,
    fastest: false,
  },
  {
    dataset: 'OpenMapTiles',
    tiles: 94,
    totalMs: 1777.51,
    avgMs: 18.91,
    throughput: 52.88,
    diagnostics: 5628,
    fastest: false,
  },
];

const MAX_THROUGHPUT = 116.20;

const HIGHLIGHTS = [
  {
    icon: Gauge,
    label: 'Peak Throughput',
    value: 116,
    unit: 'tiles/sec',
    description: 'CARTO Streets dataset',
    color: 'text-[var(--tg-accent)]',
  },
  {
    icon: Zap,
    label: 'Fastest Avg Latency',
    value: 8.6,
    unit: 'ms/tile',
    description: 'Pure validation time',
    color: 'text-blue-400',
  },
  {
    icon: Database,
    label: 'Diagnostics Found',
    value: 19057,
    unit: 'total',
    description: 'Across all 3 datasets',
    color: 'text-purple-400',
  },
  {
    icon: MemoryStick,
    label: 'Heap Overhead',
    value: 10,
    unit: 'MB',
    prefix: '<',
    description: 'Low memory footprint',
    color: 'text-emerald-400',
  },
];

const METHODOLOGY = [
  {
    icon: Cpu,
    title: 'JIT Warmup',
    description: '5 discarded warm-up runs to eliminate V8 compilation overhead.',
  },
  {
    icon: Activity,
    title: 'Offline-only',
    description: 'Tiles cached locally — network latency excluded from timing.',
  },
  {
    icon: Database,
    title: 'GC Sweep',
    description: 'Double garbage collection before and after measurement loops.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------

function AnimatedCount({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  inView,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  inView: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString(),
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, { duration: 1.6, ease: 'easeOut' });
    return controls.stop;
  }, [inView, to, count]);

  return (
    <span>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BenchmarkSection(): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      aria-label="Benchmark Performance"
      className="relative w-full py-24 px-6 lg:px-10 overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2 opacity-[0.07] blur-[130px]"
        style={{ background: 'radial-gradient(ellipse, var(--tg-accent), transparent 65%)' }}
      />

      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16 flex flex-col items-center text-center"
      >
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
          <Activity className="h-3 w-3" aria-hidden="true" />
          Performance
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          Benchmarked on
          <br />
          <span className="text-[var(--tg-text-muted)]">production tile data.</span>
        </h2>
        <p className="mt-4 max-w-xl text-base text-[var(--tg-text-secondary)]">
          Real throughput numbers from 3 production vector tile sources — no synthetic data.
          Measured offline with JIT warmup, GC sweeps, and hard assertions.
        </p>
      </motion.div>

      {/* Highlight stat cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="mx-auto mb-16 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4"
      >
        {HIGHLIGHTS.map(({ icon: Icon, label, value, unit, prefix, description, color }) => (
          <motion.div
            key={label}
            variants={fadeUp}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(163,255,0,0.12)]"
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 to-transparent opacity-40 transition-opacity duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[15px] bg-[#09090b] px-4 py-7 text-center shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
              <div className="absolute -right-6 -top-6 z-0 h-20 w-20 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[36px] transition-opacity duration-700 group-hover:opacity-10" />

              <Icon
                className={`relative z-10 mb-0.5 h-5 w-5 ${color} opacity-70 transition-opacity duration-500 group-hover:opacity-100`}
                aria-hidden="true"
              />
              <p className={`relative z-10 text-3xl font-black tracking-tight text-white`}>
                <AnimatedCount to={value} prefix={prefix} decimals={value % 1 !== 0 ? 1 : 0} inView={inView} />
                <span className="ml-1 text-xs font-medium text-[var(--tg-text-muted)]">{unit}</span>
              </p>
              <p className="relative z-10 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
                {label}
              </p>
              <p className="relative z-10 text-[10px] text-[var(--tg-text-muted)] opacity-60">
                {description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Results table card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="mx-auto mb-16 max-w-5xl"
      >
        <div className="relative overflow-hidden rounded-3xl bg-[#09090b] ring-1 ring-white/[0.07]">
          {/* Top glow line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Table header */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-8 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black ring-1 ring-white/10">
              <Activity className="h-4 w-4 text-[var(--tg-accent)]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dataset Benchmark Results</h3>
              <p className="text-xs text-[var(--tg-text-muted)]">
                100 tiles per dataset · Node.js v22 · NVMe SSD
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
                  <th className="px-8 py-4">Dataset</th>
                  <th className="px-4 py-4 text-right">Tiles</th>
                  <th className="px-4 py-4 text-right">Total (ms)</th>
                  <th className="px-4 py-4 text-right">Avg/Tile (ms)</th>
                  <th className="px-4 py-4 text-right">Throughput</th>
                  <th className="px-8 py-4 text-right">Diagnostics</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARK_RESULTS.map((row, i) => (
                  <tr
                    key={row.dataset}
                    className={`group transition-colors hover:bg-white/[0.025] ${
                      i < BENCHMARK_RESULTS.length - 1 ? 'border-b border-white/[0.05]' : ''
                    }`}
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{row.dataset}</span>
                        {row.fastest && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tg-accent)]/10 border border-[var(--tg-accent)]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--tg-accent)]">
                            <Trophy className="h-2.5 w-2.5" />
                            Fastest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[var(--tg-text-secondary)]">
                      {row.tiles}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[var(--tg-text-secondary)]">
                      {row.totalMs.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[var(--tg-text-secondary)]">
                      {row.avgMs.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
                          row.fastest
                            ? 'bg-[var(--tg-accent)]/15 border border-[var(--tg-accent)]/30 text-[var(--tg-accent)]'
                            : 'bg-white/5 border border-white/10 text-zinc-400'
                        }`}>
                          {row.throughput.toFixed(1)}
                          <span className="text-[10px] font-normal opacity-70">t/s</span>
                        </span>
                        {/* Progress bar */}
                        <div className="w-20 h-1 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${row.fastest ? 'bg-[var(--tg-accent)]' : 'bg-zinc-600'}`}
                            initial={{ width: 0 }}
                            animate={inView ? { width: `${(row.throughput / MAX_THROUGHPUT) * 100}%` } : {}}
                            transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right font-mono text-sm text-[var(--tg-text-secondary)]">
                      {row.diagnostics.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Methodology cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3"
      >
        {METHODOLOGY.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            variants={fadeUp}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_30px_-10px_rgba(163,255,0,0.1)]"
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/8 to-transparent opacity-50 transition-opacity duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />
            <div className="relative z-10 flex h-full flex-col gap-4 overflow-hidden rounded-[15px] bg-[#09090b] p-6 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black ring-1 ring-white/10 transition-all duration-500 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_15px_rgba(163,255,0,0.15)]">
                <Icon
                  className="h-4 w-4 text-[var(--tg-text-muted)] transition-colors duration-500 group-hover:text-[var(--tg-accent)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white transition-colors duration-500 group-hover:text-[var(--tg-accent)]">
                  {title}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--tg-text-secondary)]">
                  {description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mx-auto mt-12 max-w-2xl text-center text-xs text-[var(--tg-text-muted)]"
      >
        Measured on Node.js v22 with --expose-gc. Intel Core i7, 16 GB RAM, NVMe SSD. Results
        represent pure validation overhead — no network I/O.
      </motion.p>
    </section>
  );
}
