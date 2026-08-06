/**
 * @tileguard/inspector — Sidebar (Phase 2 — Step 1+2)
 *
 * Professional engineering workstation sidebar with structured sections:
 *
 *   ┌─────────────────────┐
 *   │  SidebarWorkspaceCard│  ← active file / open file
 *   ├─────────────────────┤
 *   │  [Home]             │  ← go back to Home screen
 *   ├─────────────────────┤
 *   │  WORKSPACE          │
 *   │  Explore            │
 *   │  Diagnose           │
 *   │  Statistics         │
 *   │  Style              │
 *   ├─────────────────────┤
 *   │  ANALYSIS           │
 *   │  Compare            │
 *   │  Regression         │
 *   │  Reports            │
 *   ├─────────────────────┤
 *   │  Settings           │
 *   │  Help               │
 *   ├─────────────────────┤
 *   │  SidebarFooter      │  ← brand + version + presentation toggle
 *   └─────────────────────┘
 *
 * Replaces the old flat SidebarNav.
 * Width is fixed at 200px (wider than the old 80px icon-only bar) to
 * show both icon and label.
 */
import {
  AlertTriangle,
  BarChart3,
  CircleHelp,
  Crosshair,
  FileJson,
  FileOutput,
  GitCompare,
  Home,
  Radar,
  Settings,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { NavTab } from '../SidebarNav.js';
import { SidebarItem } from './SidebarItem.js';
import { SidebarSection } from './SidebarSection.js';
import { SidebarFooter } from './SidebarFooter.js';
import { SidebarWorkspaceCard } from './SidebarWorkspaceCard.js';

export interface SidebarProps {
  readonly activeTab: NavTab;
  readonly onTabChange: (tab: NavTab) => void;
  /** Called when the user clicks the Home item. */
  readonly onHomeRequested: () => void;
  /** The currently loaded tile file name, if any. */
  readonly currentFile?: string | null | undefined;
  /** Called when the user wants to open a file. */
  readonly onOpenFile?: (() => void) | undefined;
  /** Called when the user clicks the Help item. */
  readonly onHelpRequested?: (() => void) | undefined;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onHomeRequested,
  currentFile = null,
  onOpenFile,
  onHelpRequested,
}: SidebarProps): JSX.Element {
  const handleTabChange = (tab: NavTab) => {
    if (tab === 'settings') {
      // Settings is handled by the workspace overlay, not a page.
      onTabChange('settings');
      return;
    }
    onTabChange(tab);
  };

  return (
    <Tooltip.Provider>
      <aside
        className="flex w-[200px] shrink-0 flex-col border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden"
        aria-label="Workspace navigation"
      >
        {/* Active file card */}
        <SidebarWorkspaceCard
          currentFile={currentFile}
          onOpenFile={onOpenFile}
        />

        {/* Scrollable nav area */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1">
          {/* Home — always visible, exits workspace */}
          <SidebarSection>
            <SidebarItem
              id="welcome"
              label="Home"
              icon={Home}
              isActive={false}
              onClick={onHomeRequested}
            />
          </SidebarSection>

          {/* Workspace section */}
          <SidebarSection label="Workspace" withDivider>
            <SidebarItem
              id="inspector"
              label="Explore"
              icon={Crosshair}
              isActive={activeTab === 'inspector'}
              onClick={() => handleTabChange('inspector')}
            />
            <SidebarItem
              id="diagnostics"
              label="Diagnose"
              icon={AlertTriangle}
              isActive={activeTab === 'diagnostics'}
              onClick={() => handleTabChange('diagnostics')}
            />
            <SidebarItem
              id="statistics"
              label="Statistics"
              icon={BarChart3}
              isActive={activeTab === 'statistics'}
              onClick={() => handleTabChange('statistics')}
            />
            <SidebarItem
              id="style-explorer"
              label="Style"
              icon={FileJson}
              isActive={activeTab === 'style-explorer'}
              onClick={() => handleTabChange('style-explorer')}
            />
          </SidebarSection>

          {/* Analysis section */}
          <SidebarSection label="Analysis" withDivider>
            <SidebarItem
              id="compare"
              label="Compare"
              icon={GitCompare}
              isActive={activeTab === 'compare'}
              onClick={() => handleTabChange('compare')}
            />
            <SidebarItem
              id="regression"
              label="Regression"
              icon={Radar}
              isActive={activeTab === 'regression'}
              onClick={() => handleTabChange('regression')}
            />
            <SidebarItem
              id="reports"
              label="Reports"
              icon={FileOutput}
              isActive={activeTab === 'reports'}
              onClick={() => handleTabChange('reports')}
            />
          </SidebarSection>

          {/* Utilities section */}
          <SidebarSection withDivider>
            <SidebarItem
              id="settings"
              label="Settings"
              icon={Settings}
              isActive={activeTab === 'settings'}
              isUtility
              onClick={() => handleTabChange('settings')}
            />
            {onHelpRequested && (
              <SidebarItem
                id="help"
                label="Help"
                icon={CircleHelp}
                isActive={false}
                isUtility
                onClick={onHelpRequested}
              />
            )}
          </SidebarSection>
        </div>

        {/* Footer: brand + presentation mode toggle */}
        <SidebarFooter />
      </aside>
    </Tooltip.Provider>
  );
}
