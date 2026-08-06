/**
 * @tileguard/inspector — CommandPalette (Phase 2 — Step 9)
 *
 * A searchable command palette opened with Ctrl+K.
 * Built without external cmdk dependency — uses a custom filter + keyboard
 * navigation pattern for full control.
 *
 * Commands are grouped and filterable by typing.
 * Enter executes the focused command. Arrow keys navigate.
 *
 * Accessibility:
 *   - Role="combobox" on the input, role="listbox" on the list
 *   - aria-activedescendant tracks the active option
 *   - Escape closes the dialog
 */
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  Bug,
  Crosshair,
  FileJson,
  FileOutput,
  GitCompare,
  Home,
  Moon,
  Radar,
  Search,
  Settings,
  Shuffle,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WorkspacePage } from '../../services/NavigationService.js';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  group: string;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  readonly onClose: () => void;
  /** Navigate to a workspace page. */
  readonly onNavigate: (page: WorkspacePage) => void;
  /** Go to the home screen. */
  readonly onGoHome: () => void;
  /** Open the settings overlay. */
  readonly onOpenSettings: () => void;
  /** Open the shortcut overlay. */
  readonly onOpenShortcuts?: () => void;
  /** Toggle presentation mode. */
  readonly onTogglePresentationMode?: () => void;
  /** Open a file picker. */
  readonly onOpenFile?: () => void;
}

export function CommandPalette({
  onClose,
  onNavigate,
  onGoHome,
  onOpenSettings,
  onOpenShortcuts,
  onTogglePresentationMode,
  onOpenFile,
}: CommandPaletteProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const buildCommands = (): Command[] => [
    {
      id: 'nav-home',
      label: 'Go Home',
      description: 'Return to the home screen',
      icon: Home,
      group: 'Navigation',
      action: () => { onGoHome(); onClose(); },
    },
    {
      id: 'nav-explore',
      label: 'Open Explore',
      description: 'Inspect geometry, features, and layers',
      icon: Crosshair,
      group: 'Navigation',
      action: () => { onNavigate('inspector'); onClose(); },
    },
    {
      id: 'nav-diagnostics',
      label: 'Open Diagnostics',
      description: 'Check for geometry errors and rule violations',
      icon: Bug,
      group: 'Navigation',
      shortcut: 'Ctrl+1',
      action: () => { onNavigate('diagnostics'); onClose(); },
    },
    {
      id: 'nav-statistics',
      label: 'Open Statistics',
      description: 'View feature counts and layer composition',
      icon: BarChart3,
      group: 'Navigation',
      shortcut: 'Ctrl+2',
      action: () => { onNavigate('statistics'); onClose(); },
    },
    {
      id: 'nav-style',
      label: 'Open Style Explorer',
      description: 'Validate MapLibre style specifications',
      icon: FileJson,
      group: 'Navigation',
      action: () => { onNavigate('style-explorer'); onClose(); },
    },
    {
      id: 'nav-compare',
      label: 'Compare Tiles',
      description: 'Run a structural diff between two tiles',
      icon: GitCompare,
      group: 'Analysis',
      action: () => { onNavigate('compare'); onClose(); },
    },
    {
      id: 'nav-regression',
      label: 'Run Regression',
      description: 'Detect quality changes between tile versions',
      icon: Radar,
      group: 'Analysis',
      action: () => { onNavigate('regression'); onClose(); },
    },
    {
      id: 'nav-reports',
      label: 'Generate Report',
      description: 'Export structured quality reports',
      icon: FileOutput,
      group: 'Analysis',
      action: () => { onNavigate('reports'); onClose(); },
    },
    ...(onOpenFile
      ? [{
          id: 'action-load-tile',
          label: 'Load Tile',
          description: 'Open a .pbf vector tile file',
          icon: Shuffle,
          group: 'Actions',
          action: () => { onOpenFile(); onClose(); },
        }]
      : []),
    {
      id: 'action-settings',
      label: 'Open Settings',
      description: 'Configure appearance and workspace behaviour',
      icon: Settings,
      group: 'Actions',
      shortcut: 'Ctrl+,',
      action: () => { onOpenSettings(); onClose(); },
    },
    ...(onOpenShortcuts
      ? [{
          id: 'action-shortcuts',
          label: 'Show Shortcuts',
          description: 'View all keyboard shortcuts',
          icon: Zap,
          group: 'Actions',
          shortcut: '?',
          action: () => { onOpenShortcuts(); onClose(); },
        }]
      : []),
    ...(onTogglePresentationMode
      ? [{
          id: 'action-presentation',
          label: 'Toggle Presentation Mode',
          description: 'Optimise for projector display',
          icon: Moon,
          group: 'Actions',
          shortcut: 'Ctrl+Shift+P',
          action: () => { onTogglePresentationMode(); onClose(); },
        }]
      : []),
  ];

  const allCommands = buildCommands();
  const normalized = query.toLowerCase().trim();

  const filteredCommands = normalized
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(normalized) ||
          (c.description?.toLowerCase().includes(normalized) ?? false) ||
          c.group.toLowerCase().includes(normalized),
      )
    : allCommands;

  // Group the filtered commands
  const groups = Array.from(
    filteredCommands.reduce((map, cmd) => {
      const group = map.get(cmd.group) ?? [];
      group.push(cmd);
      map.set(cmd.group, group);
      return map;
    }, new Map<string, Command[]>()),
  );

  // Flat list for keyboard navigation
  const flatList = filteredCommands;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatList.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          flatList[activeIndex]?.action();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, flatList, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-active="true"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Palette */}
      <motion.div
        role="dialog"
        aria-label="Command palette"
        initial={{ scale: 0.97, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: -8 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-lg)]"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--tg-border)] px-4 py-3">
          <Search
            className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            aria-label="Command search"
            aria-autocomplete="list"
            aria-controls="command-list"
            aria-activedescendant={
              flatList[activeIndex]?.id ? `cmd-${flatList[activeIndex]?.id}` : undefined
            }
            role="combobox"
            aria-expanded="true"
            className="flex-1 bg-transparent text-sm text-[var(--tg-text-primary)] placeholder-[var(--tg-text-muted)] outline-none"
          />
          <div className="flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="rounded p-0.5 text-[var(--tg-text-muted)] transition hover:text-[var(--tg-text-secondary)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <kbd className="rounded bg-[var(--tg-bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tg-text-muted)] ring-1 ring-[var(--tg-border)]">
              Esc
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          aria-label="Commands"
          className="max-h-80 overflow-y-auto"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[var(--tg-text-muted)]">
                No commands match "{query}"
              </p>
            </div>
          ) : (
            <div className="p-2">
              {groups.map(([groupLabel, commands]) => (
                <div key={groupLabel} className="mb-2">
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
                    {groupLabel}
                  </p>
                  {commands.map((cmd) => {
                    const globalIndex = flatList.findIndex((c) => c.id === cmd.id);
                    const isActive = globalIndex === activeIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        id={`cmd-${cmd.id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        onClick={cmd.action}
                        className={[
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                          isActive
                            ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-primary)]'
                            : 'text-[var(--tg-text-secondary)]',
                        ].join(' ')}
                      >
                        <Icon
                          className={[
                            'h-4 w-4 shrink-0',
                            isActive
                              ? 'text-[var(--tg-accent)]'
                              : 'text-[var(--tg-text-muted)]',
                          ].join(' ')}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{cmd.label}</span>
                          {cmd.description && (
                            <span className="block truncate text-xs text-[var(--tg-text-muted)]">
                              {cmd.description}
                            </span>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="shrink-0 rounded bg-[var(--tg-bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tg-text-muted)] ring-1 ring-[var(--tg-border)]">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
