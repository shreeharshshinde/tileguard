/**
 * @tileguard/inspector — HelpOverlay (Phase 2 — Step 15)
 *
 * A comprehensive help dialog opened from the ? button or Help sidebar item.
 * Contains: Keyboard shortcuts, Workflow guide, links, and version info.
 */
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  GitBranch,
  Globe,
  Keyboard,
  Workflow,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface HelpTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const HELP_TABS: HelpTab[] = [
  { id: 'workflow', label: 'Workflow', icon: Workflow },
  { id: 'keyboard', label: 'Shortcuts', icon: Keyboard },
  { id: 'links', label: 'Links', icon: Globe },
];

export interface HelpOverlayProps {
  readonly onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps): JSX.Element {
  const [activeTab, setActiveTab] = useState('workflow');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        role="dialog"
        aria-label="Help"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-lg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--tg-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <CircleHelp
              className="h-4 w-4 text-[var(--tg-accent)]"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-[var(--tg-text-primary)]">
              TileGuard Inspector Help
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="rounded-md p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-[var(--tg-border)] px-2">
          {HELP_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-[var(--tg-accent)] text-[var(--tg-accent)]'
                    : 'border-transparent text-[var(--tg-text-muted)] hover:text-[var(--tg-text-secondary)]',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-4">
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--tg-text-secondary)]">
                TileGuard Inspector is a quality engineering workstation for
                vector tiles. Follow this workflow to validate a tile:
              </p>
              {[
                {
                  step: '1',
                  title: 'Load a tile',
                  description:
                    'Drop a .pbf file onto the canvas, or use the Open Tile button in the sidebar. The Tokyo demo tile is available on the Home screen.',
                },
                {
                  step: '2',
                  title: 'Explore geometry',
                  description:
                    "The Explore view renders the tile's geometry on the canvas. Click features to inspect their properties, layers, and geometry type.",
                },
                {
                  step: '3',
                  title: 'Run diagnostics',
                  description:
                    'The Diagnose view runs all quality rules against the tile. Each diagnostic shows the affected feature and a suggested fix.',
                },
                {
                  step: '4',
                  title: 'Compare tiles',
                  description:
                    'Load a baseline and candidate tile in the Compare view to detect structural differences between tile versions.',
                },
                {
                  step: '5',
                  title: 'Generate a report',
                  description:
                    'Export a structured quality report from the Reports view for CI integration or review.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tg-accent)]/15 text-xs font-bold text-[var(--tg-accent)]">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--tg-text-primary)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--tg-text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'keyboard' && (
            <div className="space-y-4">
              {[
                {
                  group: 'Global',
                  shortcuts: [
                    { key: 'Ctrl+K', desc: 'Command palette' },
                    { key: '?', desc: 'This help dialog' },
                    { key: 'Ctrl+,', desc: 'Settings' },
                    { key: 'Ctrl+Shift+P', desc: 'Presentation mode' },
                  ],
                },
                {
                  group: 'Canvas',
                  shortcuts: [
                    { key: 'R', desc: 'Reset view' },
                    { key: 'Esc', desc: 'Clear selection' },
                    { key: 'F', desc: 'Focus selected feature' },
                    { key: 'Ctrl+F', desc: 'Search' },
                  ],
                },
                {
                  group: 'Navigation',
                  shortcuts: [
                    { key: 'Ctrl+1', desc: 'Diagnostics' },
                    { key: 'Ctrl+2', desc: 'Statistics' },
                  ],
                },
              ].map((group) => (
                <div key={group.group}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
                    {group.group}
                  </p>
                  <div className="space-y-0">
                    {group.shortcuts.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center justify-between rounded-md px-2 py-1.5"
                      >
                        <span className="text-sm text-[var(--tg-text-secondary)]">
                          {s.desc}
                        </span>
                        <kbd className="rounded bg-[var(--tg-bg-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--tg-text-primary)] ring-1 ring-[var(--tg-border)]">
                          {s.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-3">
              {[
                {
                  label: 'TileGuard on GitHub',
                  description: 'Source code, issues, and contributions',
                  href: 'https://github.com/shindeshreeharsh/tileguard',
                  icon: GitBranch,
                },
                {
                  label: 'MapLibre GL JS',
                  description: 'Open-source map rendering library',
                  href: 'https://maplibre.org',
                  icon: Globe,
                },
                {
                  label: 'Vector Tile Specification',
                  description: 'Mapbox Vector Tile (MVT) format reference',
                  href: 'https://github.com/mapbox/vector-tile-spec',
                  icon: BookOpen,
                },
                {
                  label: 'FOSS4G 2026 – Hiroshima',
                  description: 'TileGuard presentation at FOSS4G 2026',
                  href: 'https://2026.foss4g.org',
                  icon: Globe,
                },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-md border border-[var(--tg-border)] px-3 py-2.5 text-left transition hover:border-[var(--tg-accent)]/30 hover:bg-[var(--tg-bg-hover)]"
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-[var(--tg-accent)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--tg-text-primary)]">
                        {link.label}
                      </p>
                      <p className="text-xs text-[var(--tg-text-muted)]">
                        {link.description}
                      </p>
                    </div>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)]"
                      aria-hidden="true"
                    />
                  </a>
                );
              })}

              {/* Version block */}
              <div className="mt-4 rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-3 py-2.5">
                <p className="text-xs font-medium text-[var(--tg-text-secondary)]">
                  TileGuard Inspector
                </p>
                <p className="font-mono text-[10px] text-[var(--tg-text-muted)]">
                  v1.0.0 · MIT License
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
