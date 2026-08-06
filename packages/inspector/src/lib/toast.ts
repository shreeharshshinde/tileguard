/**
 * @tileguard/inspector — toast (Phase 2 — Step 10)
 *
 * Thin wrapper around Sonner that exposes pre-styled toast helpers.
 * Import and call these instead of browser alert().
 *
 * Usage:
 *   import { tileLoadedToast, errorToast } from '../lib/toast.js';
 *   tileLoadedToast('tokyo-clean.pbf');
 *
 * The <Toaster /> must be mounted once in InspectorApp / ApplicationRouter.
 */
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Workspace toasts
// ---------------------------------------------------------------------------

export function tileLoadedToast(fileName: string): void {
  toast.success('Tile loaded', {
    description: fileName,
    duration: 3000,
  });
}

export function tileLoadErrorToast(fileName: string, error: string): void {
  toast.error('Failed to load tile', {
    description: `${fileName}: ${error}`,
    duration: 5000,
  });
}

export function comparisonCompleteToast(diffCount: number): void {
  toast.success('Comparison complete', {
    description: `${diffCount} difference${diffCount === 1 ? '' : 's'} found`,
    duration: 3000,
  });
}

export function regressionFoundToast(count: number): void {
  toast.warning(`${count} regression${count === 1 ? '' : 's'} detected`, {
    description: 'Review the Regression page for details.',
    duration: 4000,
  });
}

export function copiedToast(what = 'Copied to clipboard'): void {
  toast.success(what, { duration: 2000 });
}

export function exportSuccessToast(fileName: string): void {
  toast.success('Export successful', {
    description: fileName,
    duration: 3000,
  });
}

export function settingsSavedToast(): void {
  toast.success('Settings saved', { duration: 2000 });
}

export function genericErrorToast(message: string): void {
  toast.error('Error', {
    description: message,
    duration: 5000,
  });
}

// Re-export the raw toast for one-off usage
export { toast };
