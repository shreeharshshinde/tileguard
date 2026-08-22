/**
 * @tileguard/inspector — HomeFooter
 *
 * Minimal, clean footer for the homepage. Shows branding,
 * links to GitHub, and the open-source / license info.
 */

export function HomeFooter(): JSX.Element {
  return (
    <footer className="relative w-full border-t border-white/5 px-6 py-10 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black ring-1 ring-white/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.1)]">
            <svg
              className="h-4 w-4 text-[var(--tg-accent)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">TileGuard</span>
          <span className="rounded-full border border-[var(--tg-accent)]/20 bg-[var(--tg-accent)]/5 px-2 py-0.5 font-mono text-[10px] text-[var(--tg-accent)]">
            v0.5.0-rc.1
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-8">
          <a
            href="https://github.com/shindeshreeharsh/tileguard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--tg-text-muted)] transition-colors hover:text-white"
          >
            GitHub
          </a>
          <a
            href="https://github.com/shindeshreeharsh/tileguard/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--tg-text-muted)] transition-colors hover:text-white"
          >
            MIT License
          </a>
          <a
            href="https://foss4g.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--tg-text-muted)] transition-colors hover:text-white"
          >
            FOSS4G 2026
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-[var(--tg-text-muted)]">
          © 2026 TileGuard. Open source under MIT.
        </p>
      </div>
    </footer>
  );
}
