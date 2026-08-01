/**
 * @tileguard/inspector — useWorkspace hook (Milestone 6 — Step 4)
 *
 * React bridge for WorkspaceService. Uses useSyncExternalStore() so the
 * component tree re-renders whenever the layout changes.
 */

import { useSyncExternalStore } from 'react';
import {
  getWorkspaceService,
  type WorkspaceLayout,
} from '../services/WorkspaceService.js';

/**
 * Returns the current workspace layout and an updater.
 *
 * @example
 *   const { layout, updateLayout } = useWorkspace();
 *   updateLayout({ leftCollapsed: true });
 */
export function useWorkspace(): {
  layout: WorkspaceLayout;
  updateLayout: (patch: Partial<WorkspaceLayout>) => void;
  resetLayout: () => void;
} {
  const svc = getWorkspaceService();

  const layout = useSyncExternalStore(
    (cb) => svc.subscribe(cb),
    () => svc.getLayout(),
    () => svc.getLayout(),
  );

  return {
    layout,
    updateLayout: (patch) => svc.updateLayout(patch),
    resetLayout: () => svc.resetLayout(),
  };
}
