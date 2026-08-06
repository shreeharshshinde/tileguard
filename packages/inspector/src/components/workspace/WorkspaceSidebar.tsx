/**
 * @tileguard/inspector — WorkspaceSidebar (Phase 2 — Step 2)
 *
 * Workspace-level navigation sidebar. Delegates to the new sectioned
 * Sidebar component and wires up the Home exit flow.
 */
import { Sidebar } from '../navigation/Sidebar.js';
import type { NavTab } from '../SidebarNav.js';

export interface WorkspaceSidebarProps {
  readonly activeTab: NavTab;
  readonly onTabChange: (tab: NavTab) => void;
  /**
   * Called when the user clicks the "Home" nav item while a session is active.
   * The parent (Workspace) decides whether to show ReturnHomeDialog.
   */
  readonly onHomeRequested: () => void;
  /** Active tile file name, if any, for the workspace card. */
  readonly currentFile?: string | null | undefined;
  /** Called when the user clicks the open-file button in the workspace card. */
  readonly onOpenFile?: (() => void) | undefined;
  /** Called when the user clicks the Help item. */
  readonly onHelpRequested?: (() => void) | undefined;
}

export function WorkspaceSidebar({
  activeTab,
  onTabChange,
  onHomeRequested,
  currentFile = null,
  onOpenFile,
  onHelpRequested,
}: WorkspaceSidebarProps): JSX.Element {
  return (
    <Sidebar
      activeTab={activeTab}
      onTabChange={onTabChange}
      onHomeRequested={onHomeRequested}
      currentFile={currentFile}
      onOpenFile={onOpenFile}
      onHelpRequested={onHelpRequested}
    />
  );
}
