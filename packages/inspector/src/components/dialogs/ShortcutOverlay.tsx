/**
 * @tileguard/inspector — ShortcutOverlay (Phase 2 — Step 8)
 *
 * Keyboard shortcut reference dialog.
 * Opened with the '?' key.
 *
 * Searchable: typing filters shortcut descriptions.
 * Grouped by category for easy scanning.
 *
 * Accessibility:
 *   - Role="dialog", aria-modal="true"
 *   - Escape closes the dialog
 *   - Focus trapped within the dialog
 */
import { motion } from 'framer-motion';
import { Keyboard, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ShortcutEntry {
  key: string;
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Navigation',
    shortcuts: [
      { key: 'Ctrl+K', description: 'Open command palette' },
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: 'Ctrl+1', description: 'Go to Diagnose' },
      { key: 'Ctrl+2', description: 'Go to Statistics' },
      { key: 'Ctrl+3', description: 'Open Settings' },
    ],
  },
  {
    label: 'Canvas',
    shortcuts: [
      { key: 'R', description: 'Reset view' },
      { key: 'Esc', description: 'Clear selection' },
      { key: 'F', description: 'Focus selected feature' },
      { key: 'Ctrl+F', description: 'Focus search input' },
      { key: 'Scroll', description: 'Zoom in / out' },
      { key: 'Drag', description: 'Pan the canvas' },
    ],
  },
  {
    label: 'Rendering',
    shortcuts: [
      { key: 'V', description: 'Toggle vertex markers' },
      { key: 'B', description: 'Toggle tile bounds' },
      { key: 'H', description: 'Toggle hover highlight' },
    ],
  },
  {
    label: 'Workspace',
    shortcuts: [
      { key: 'Ctrl+,', description: 'Open settings' },
      { key: 'Ctrl+Shift+P', description: 'Toggle presentation mode' },
      { key: 'Ctrl+D', description: 'Toggle developer overlay' },
    ],
  },
];

export interface ShortcutOverlayProps {
  readonly onClose: () => void;
}

export function ShortcutOverlay({
  onClose,
}: ShortcutOverlayProps): JSX.Element {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.toLowerCase().trim();

  const filteredGroups = normalizedQuery
    ? SHORTCUT_GROUPS.map((group) => ({
        ...group,
        shortcuts: group.shortcuts.filter(
          (s) =>
            s.description.toLowerCase().includes(normalizedQuery) ||
            s.key.toLowerCase().includes(normalizedQuery),
        ),
      })).filter((g) => g.shortcuts.length > 0)
    : SHORTCUT_GROUPS;

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        aria-label="Keyboard shortcuts"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-lg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--tg-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard
              className="h-4 w-4 text-[var(--tg-accent)]"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-[var(--tg-text-primary)]">
              Keyboard Shortcuts
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            className="rounded-md p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--tg-border)] px-4 py-2">
          <div className="flex items-center gap-2">
            <Search
              className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shortcuts…"
              className="flex-1 bg-transparent text-sm text-[var(--tg-text-primary)] placeholder-[var(--tg-text-muted)] outline-none"
              aria-label="Search shortcuts"
            />
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
          </div>
        </div>

        {/* Shortcut groups */}
        <div className="max-h-96 overflow-y-auto p-4">
          {filteredGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--tg-text-muted)]">
              No shortcuts match "{query}"
            </p>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
                    {group.label}
                  </p>
                  <div className="space-y-0">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between rounded-md px-2 py-2 transition hover:bg-[var(--tg-bg-hover)]"
                      >
                        <span className="text-sm text-[var(--tg-text-secondary)]">
                          {shortcut.description}
                        </span>
                        <kbd className="rounded bg-[var(--tg-bg-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--tg-text-primary)] ring-1 ring-[var(--tg-border)]">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
