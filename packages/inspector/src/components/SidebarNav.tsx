import {
  AlertTriangle,
  BarChart3,
  Crosshair,
  Home,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'welcome'
  | 'inspector'
  | 'diagnostics'
  | 'statistics'
  | 'settings';

interface SidebarNavProps {
  readonly activeTab: NavTab;
  readonly onTabChange: (tab: NavTab) => void;
}

export function SidebarNav({
  activeTab,
  onTabChange,
}: SidebarNavProps): JSX.Element {
  const items: readonly { id: NavTab; label: string; icon: typeof Home }[] = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { id: 'inspector', label: 'Inspector', icon: Crosshair },
    { id: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="flex w-20 shrink-0 flex-col justify-between border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] py-[var(--tg-space-md)] select-none">
      <div className="space-y-2 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-accent)]'
                  : 'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--tg-border)] px-2 pt-3 text-center">
        <h3 className="text-xs font-bold tracking-tight text-[var(--tg-text-primary)]">
          TileGuard
        </h3>
        <p className="mt-1 text-[9px] font-mono text-[var(--tg-text-muted)]">
          v1.0.0
        </p>
      </div>
    </aside>
  );
}
