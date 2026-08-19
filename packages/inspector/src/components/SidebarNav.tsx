import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileJson,
  FileOutput,
  GitCompare,
  Home,
  SearchCode,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import type { WorkspaceTab } from '../services/WorkspaceService.js';

/** NavTab is an alias of WorkspaceTab — single source of truth in WorkspaceService. */
export type NavTab = WorkspaceTab;

interface SidebarNavProps {
  readonly activeTab: NavTab;
  readonly onTabChange: (tab: NavTab) => void;
}

const STORAGE_KEY = 'tg-sidebar-collapsed';

export function SidebarNav({
  activeTab,
  onTabChange,
}: SidebarNavProps): JSX.Element {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const items: readonly { id: NavTab; label: string; icon: typeof Home }[] = [
    { id: 'welcome', label: 'Home', icon: Home },
    { id: 'inspector', label: 'Explore', icon: Crosshair },
    { id: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'style-explorer', label: 'Style', icon: FileJson },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'regression', label: 'Regression', icon: SearchCode },
    { id: 'reports', label: 'Reports', icon: FileOutput },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="relative flex shrink-0 flex-col justify-between border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] py-[var(--tg-space-md)] select-none overflow-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? 48 : 80 }}
      aria-label="Sidebar navigation"
    >
      {/* Nav items */}
      <div className="space-y-1 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                className={[
                  'flex w-full flex-col items-center rounded-md px-1 py-2 transition-all duration-150',
                  collapsed ? 'gap-0' : 'gap-1',
                  isActive
                    ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-accent)]'
                    : 'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]',
                ].join(' ')}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="text-[10px] font-medium leading-tight">
                    {item.label}
                  </span>
                )}
              </button>

              {/* Tooltip — only visible when collapsed */}
              {collapsed && (
                <div
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-[var(--tg-bg-surface)] px-2 py-1 text-xs font-medium text-[var(--tg-text-primary)] shadow-lg ring-1 ring-[var(--tg-border)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  role="tooltip"
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom: version + collapse toggle */}
      <div className="border-t border-[var(--tg-border)] pt-3 px-1 flex flex-col items-center gap-2">
        {!collapsed && (
          <div className="text-center">
            <h3 className="text-xs font-bold tracking-tight text-[var(--tg-text-primary)]">
              TileGuard
            </h3>
            <p className="mt-0.5 text-[9px] font-mono text-[var(--tg-text-muted)]">
              v1.0.0
            </p>
          </div>
        )}

        {/* Collapse / expand toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-md p-1.5 text-[var(--tg-text-muted)] transition-all duration-150 hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </aside>
  );
}
