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
    description:
      '12 rules validating MVT structure, geometry, and feature metadata against real .pbf fixtures.',
    color: 'text-[var(--tg-success)]',
    bg: 'bg-[var(--tg-success)]/10',
    badge: '12 rules',
  },
  {
    icon: Palette,
    title: 'Style Linting',
    description:
      '9 rules checking MapLibre style specifications for source references, layer structure, and zoom ranges.',
    color: 'text-[var(--tg-accent)]',
    bg: 'bg-[var(--tg-accent)]/10',
    badge: '9 rules',
  },
  {
    icon: GitCompare,
    title: 'Tile Comparison',
    description:
      'Structural diff between two tile versions — added, removed, and modified features with full layer breakdown.',
    color: 'text-[var(--tg-warning)]',
    bg: 'bg-[var(--tg-warning)]/10',
    badge: 'Analysis',
  },
  {
    icon: Radar,
    title: 'Regression Detection',
    description:
      'Ranked regression analysis on comparison results — surfaces geometry regressions and property changes.',
    color: 'text-[var(--tg-error)]',
    bg: 'bg-[var(--tg-error)]/10',
    badge: 'Analysis',
  },
  {
    icon: BarChart3,
    title: 'Statistics',
    description:
      'Feature count, layer composition, geometry type breakdown — all visualised per layer.',
    color: 'text-[var(--tg-text-primary)]',
    bg: 'bg-[var(--tg-text-primary)]/10',
    badge: 'Workspace',
  },
  {
    icon: AlertTriangle,
    title: 'CI Integration',
    description:
      'Drop-in GitHub Actions workflow. Run quality gates on every pull request, exactly like unit tests.',
    color: 'text-[var(--tg-text-secondary)]',
    bg: 'bg-[var(--tg-border)]',
    badge: 'DevOps',
  },
];

const _container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const _item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
};

export function CapabilitiesSection(): JSX.Element {
  // Duplicate array 3 times for a seamless infinite scroll
  const marqueeItems = [...CAPABILITIES, ...CAPABILITIES, ...CAPABILITIES];

  return (
    <section
      aria-label="Capabilities"
      className="relative flex w-full flex-col overflow-hidden py-24"
    >
      {/* Section heading */}
      <div className="mb-14 flex flex-col items-center text-center px-6">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
          Everything you need
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          Built for vector data.
        </h2>
        <p className="mt-4 max-w-xl text-base text-[var(--tg-text-secondary)]">
          TileGuard ships with a complete suite of tools to inspect, diagnose,
          and validate your map tiles.
        </p>
      </div>

      <div className="relative flex w-full overflow-hidden py-4">
        {/* Fade masks for the left and right edges to blend into the black background */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-32 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-20 w-32 bg-gradient-to-l from-black to-transparent" />

        {/* The scrolling container */}
        <div className="flex w-max animate-marquee gap-6 hover:[animation-play-state:paused] pr-6">
          {marqueeItems.map(
            ({ icon: Icon, title, description, color, badge }, index) => (
              <div
                key={`${title}-${index}`}
                className="group relative flex w-[380px] shrink-0 flex-col overflow-hidden rounded-3xl bg-[#09090b] p-[1px] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(163,255,0,0.15)]"
              >
                {/* Ultra-thin gradient border wrapper */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/15 to-transparent opacity-50 transition-opacity duration-500 group-hover:from-[var(--tg-accent)] group-hover:opacity-100" />

                {/* Inner card container */}
                <div className="relative z-10 flex h-full flex-col justify-between overflow-hidden rounded-[23px] bg-[#09090b] p-8 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]">
                  {/* Subtle radial glow on hover */}
                  <div className="absolute -right-20 -top-20 z-0 h-40 w-40 rounded-full bg-[var(--tg-accent)] opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-15" />

                  <div className="relative z-10 flex h-full flex-col">
                    {/* Top row: Icon and Badge */}
                    <div className="mb-10 flex items-start justify-between">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)] transition-all duration-500 group-hover:scale-110 group-hover:ring-[var(--tg-accent)]/40 group-hover:shadow-[0_0_20px_rgba(163,255,0,0.2)]">
                        <Icon
                          className={`h-5 w-5 ${color} transition-colors group-hover:text-[var(--tg-accent)]`}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="inline-flex items-center rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)] backdrop-blur-md transition-all duration-500 group-hover:border-[var(--tg-accent)]/30 group-hover:bg-[var(--tg-accent)]/10 group-hover:text-[var(--tg-accent)]">
                        {badge}
                      </span>
                    </div>

                    {/* Bottom row: Title and Description */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-[var(--tg-accent)]">
                        {title}
                      </h3>
                      <p className="text-base leading-relaxed text-[var(--tg-text-secondary)] transition-colors duration-500 group-hover:text-white/80">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
