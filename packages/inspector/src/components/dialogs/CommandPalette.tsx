/**
 * @tileguard/inspector — CommandPalette (Phase 4 — Step 5)
 *
 * VS Code-style command palette built with cmdk.
 * Opened with Ctrl+K.
 *
 * Commands:
 *   - Navigation: Open Explore, Diagnose, Statistics, Style, Compare, etc.
 *   - Actions: Load Demo, Generate Report, Toggle Presentation, Reset Camera
 *   - Settings: Open Settings, Show Shortcuts
 *
 * Features:
 *   - Fuzzy search via cmdk
 *   - Grouped commands
 *   - Keyboard shortcuts displayed inline
 *   - Timeline event on command execution
 */
import { Command } from 'cmdk';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Bug,
  Camera,
  Crosshair,
  FileJson,
  FileOutput,
  GitCompare,
  Home,
  Keyboard,
  Moon,
  Palette,
  Radar,
  Search,
  Settings,
  Shuffle,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInvestigationActions } from '../../context/InvestigationContext.js';
import type { WorkspacePage } from '../../services/NavigationService.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommandPaletteProps {
  readonly onClose: () => void;
  /** Navigate to a workspace page. */
  readonly onNavigate: (page: WorkspacePage) => void;
  /** Go to the home screen. */
  readonly onGoHome: () => void;
  /** Open the settings overlay. */
  readonly onOpenSettings: () => void;
  /** Open the shortcut overlay. */
  readonly onOpenShortcuts?: (() => void) | undefined;
  /** Toggle presentation mode. */
  readonly onTogglePresentationMode?: (() => void) | undefined;
  /** Open a file picker. */
  readonly onOpenFile?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Command definition
// ---------------------------------------------------------------------------

interface CommandItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly group: string;
  readonly shortcut?: string;
  readonly action: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const actions = useInvestigationActions();

  // Reset query when mounted
  useEffect(() => setQuery(''), []);

  const executeCommand = (cmd: CommandItem) => {
    cmd.action();
    actions.addTimelineEvent({
      action: 'Command',
      detail: cmd.label,
      icon: 'zap',
    });
  };

  const commands: CommandItem[] = [
    // ── Navigation ────────────────────────────────────────────────────────
    {
      id: 'nav-home',
      label: 'Go Home',
      description: 'Return to the home screen',
      icon: Home,
      group: 'Navigation',
      shortcut: 'Ctrl+H',
      action: () => {
        onGoHome();
        onClose();
      },
    },
    {
      id: 'nav-explore',
      label: 'Open Explore',
      description: 'Inspect geometry, features, and layers',
      icon: Crosshair,
      group: 'Navigation',
      shortcut: 'Ctrl+1',
      action: () => {
        onNavigate('inspector');
        onClose();
      },
    },
    {
      id: 'nav-diagnostics',
      label: 'Open Diagnostics',
      description: 'Check for geometry errors and rule violations',
      icon: Bug,
      group: 'Navigation',
      shortcut: 'Ctrl+2',
      action: () => {
        onNavigate('diagnostics');
        onClose();
      },
    },
    {
      id: 'nav-statistics',
      label: 'Jump to Statistics',
      description: 'View feature counts and layer composition',
      icon: BarChart3,
      group: 'Navigation',
      shortcut: 'Ctrl+3',
      action: () => {
        onNavigate('statistics');
        onClose();
      },
    },
    {
      id: 'nav-style',
      label: 'Open Style Explorer',
      description: 'Validate MapLibre style specifications',
      icon: Palette,
      group: 'Navigation',
      shortcut: 'Ctrl+4',
      action: () => {
        onNavigate('style-explorer');
        onClose();
      },
    },
    {
      id: 'nav-compare',
      label: 'Run Comparison',
      description: 'Compare two tiles side by side',
      icon: GitCompare,
      group: 'Navigation',
      shortcut: 'Ctrl+5',
      action: () => {
        onNavigate('compare');
        onClose();
      },
    },
    {
      id: 'nav-regression',
      label: 'Run Regression Analysis',
      description: 'Detect quality regressions between versions',
      icon: Radar,
      group: 'Navigation',
      shortcut: 'Ctrl+6',
      action: () => {
        onNavigate('regression');
        onClose();
      },
    },
    {
      id: 'nav-reports',
      label: 'Generate Report',
      description: 'Export structured quality reports',
      icon: FileOutput,
      group: 'Navigation',
      shortcut: 'Ctrl+7',
      action: () => {
        onNavigate('reports');
        onClose();
      },
    },

    // ── Actions ───────────────────────────────────────────────────────────
    ...((onOpenFile
      ? [
          {
            id: 'action-load',
            label: 'Load Tile',
            description: 'Open a .pbf vector tile file',
            icon: Shuffle,
            group: 'Actions',
            action: () => {
              onOpenFile();
              onClose();
            },
          },
        ]
      : []) as CommandItem[]),
    {
      id: 'action-settings',
      label: 'Open Settings',
      description: 'Configure appearance and workspace behaviour',
      icon: Settings,
      group: 'Actions',
      shortcut: 'Ctrl+,',
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    ...((onOpenShortcuts
      ? [
          {
            id: 'action-shortcuts',
            label: 'Show Keyboard Shortcuts',
            description: 'View all available shortcuts',
            icon: Keyboard,
            group: 'Actions',
            shortcut: '?',
            action: () => {
              onOpenShortcuts();
              onClose();
            },
          },
        ]
      : []) as CommandItem[]),
    ...((onTogglePresentationMode
      ? [
          {
            id: 'action-presentation',
            label: 'Toggle Presentation Mode',
            description: 'Optimise for projector display',
            icon: Moon,
            group: 'Actions',
            shortcut: 'Ctrl+Shift+P',
            action: () => {
              onTogglePresentationMode();
              onClose();
            },
          },
        ]
      : []) as CommandItem[]),
    {
      id: 'action-reset-camera',
      label: 'Reset Camera',
      description: 'Reset viewport to default zoom and position',
      icon: Camera,
      group: 'Actions',
      shortcut: 'Space',
      action: () => {
        onClose();
      },
    },
  ];

  // Group commands
  const groups = new Map<string, CommandItem[]>();
  for (const cmd of commands) {
    const existing = groups.get(cmd.group) ?? [];
    existing.push(cmd);
    groups.set(cmd.group, existing);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Command Palette"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-[var(--tg-border)] px-4 py-3">
            <Search
              className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command..."
              className="flex-1 bg-transparent text-sm text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus:outline-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear"
                  className="rounded p-0.5 text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="rounded bg-[var(--tg-bg-secondary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tg-text-muted)] ring-1 ring-[var(--tg-border)]">
                Esc
              </kbd>
            </div>
          </div>

          {/* Command list */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--tg-text-muted)]">
              No commands match "{query}"
            </Command.Empty>

            {Array.from(groups.entries()).map(([groupLabel, groupCommands]) => (
              <Command.Group
                key={groupLabel}
                heading={
                  <span className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
                    {groupLabel}
                  </span>
                }
              >
                {groupCommands.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.description}`}
                      onSelect={() => executeCommand(cmd)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors data-[selected=true]:bg-[var(--tg-bg-hover)]"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)] data-[selected=true]:text-[var(--tg-accent)]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[var(--tg-text-primary)]">
                          {cmd.label}
                        </span>
                        <span className="block truncate text-xs text-[var(--tg-text-muted)]">
                          {cmd.description}
                        </span>
                      </div>
                      {cmd.shortcut && (
                        <kbd className="shrink-0 rounded bg-[var(--tg-bg-secondary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tg-text-muted)] ring-1 ring-[var(--tg-border)]">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-[var(--tg-border)] px-4 py-2">
            <span className="text-[10px] text-[var(--tg-text-muted)]">
              ↑↓ navigate · Enter select · Esc close · Ctrl+/ for search
            </span>
          </div>
        </Command>
      </motion.div>
    </div>
  );
}

// Re-export Command type for external use
export type { CommandItem as Command };
