/**
 * @tileguard/inspector — WorkspaceSidebar (Phase 1 — Step 3)
 *
 * The navigation sidebar rendered inside the Workspace shell.
 *
 * This is a thin wrapper around the existing SidebarNav that wires the
 * "Home" button to the exit workflow (ReturnHomeDialog) rather than
 * directly navigating.  All other tab-change events pass through unchanged.
 *
 * Spec rename mappings (labels only, IDs unchanged):
 *   'welcome'        → "Home"       (spec: Welcome → Home)
 *   'inspector'      → "Explore"    (spec: Inspector → Explore)
 *   'style-explorer' → "Style"      (already "Style" in SidebarNav)
 */
import { type NavTab, SidebarNav } from '../SidebarNav.js';

export interface WorkspaceSidebarProps {
  readonly activeTab: NavTab;
  readonly onTabChange: (tab: NavTab) => void;
  /**
   * Called when the user clicks the "Home" nav item while a session is active.
   * The parent (Workspace) decides whether to show ReturnHomeDialog.
   */
  readonly onHomeRequested: () => void;
}

export function WorkspaceSidebar({
  activeTab,
  onTabChange,
  onHomeRequested,
}: WorkspaceSidebarProps): JSX.Element {
  const handleTabChange = (tab: NavTab) => {
    if (tab === 'welcome') {
      // Intercept "Home" navigation — delegate to parent for exit flow.
      onHomeRequested();
      return;
    }
    onTabChange(tab);
  };

  return (
    <SidebarNav
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  );
}
