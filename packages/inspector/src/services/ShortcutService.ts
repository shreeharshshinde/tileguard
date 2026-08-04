/**
 * @tileguard/inspector — ShortcutService (Milestone 6 — Step 4)
 *
 * Registers and dispatches keyboard shortcuts.
 * Shortcuts never fire when focus is inside a text input/textarea.
 *
 * Supported shortcuts:
 *   F            — focus selected feature (fit bounds)
 *   R            — reset view
 *   Escape       — clear selection
 *   Ctrl+F       — focus search input
 *   Ctrl+,       — open settings tab
 *   Ctrl+1       — show diagnostics tab
 *   Ctrl+2       — show statistics tab
 *   Ctrl+3       — show settings tab
 *   Ctrl+H       — toggle hover highlight (Step 4)
 *   Ctrl+Shift+V — toggle vertex display (Step 4)
 *   Ctrl+B       — toggle tile bounds (Step 4)
 *   Ctrl+Shift+D — toggle developer overlay (Step 4)
 *
 * Boundary: DOM KeyboardEvent only. No React, no store, no renderer.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ShortcutAction =
  | 'focusFeature'
  | 'resetView'
  | 'clearSelection'
  | 'focusSearch'
  | 'openSettings'
  | 'showDiagnostics'
  | 'showStatistics'
  | 'showSettings'
  // Step 4
  | 'toggleHover'
  | 'toggleVertices'
  | 'toggleBounds'
  | 'toggleDevOverlay'
  // Milestone 7.5 — Step D
  | 'togglePresentationMode';

export interface ShortcutBinding {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly action: ShortcutAction;
  readonly description: string;
}

export const DEFAULT_SHORTCUTS: readonly ShortcutBinding[] = Object.freeze([
  {
    key: 'f',
    ctrl: false,
    shift: false,
    action: 'focusFeature',
    description: 'Focus selected feature',
  },
  {
    key: 'r',
    ctrl: false,
    shift: false,
    action: 'resetView',
    description: 'Reset view',
  },
  {
    key: 'escape',
    ctrl: false,
    shift: false,
    action: 'clearSelection',
    description: 'Clear selection',
  },
  {
    key: 'f',
    ctrl: true,
    shift: false,
    action: 'focusSearch',
    description: 'Focus search',
  },
  {
    key: ',',
    ctrl: true,
    shift: false,
    action: 'openSettings',
    description: 'Open settings',
  },
  {
    key: '1',
    ctrl: true,
    shift: false,
    action: 'showDiagnostics',
    description: 'Show diagnostics',
  },
  {
    key: '2',
    ctrl: true,
    shift: false,
    action: 'showStatistics',
    description: 'Show statistics',
  },
  {
    key: '3',
    ctrl: true,
    shift: false,
    action: 'showSettings',
    description: 'Show settings',
  },
  // Step 4 additions
  {
    key: 'h',
    ctrl: true,
    shift: false,
    action: 'toggleHover',
    description: 'Toggle hover highlight',
  },
  {
    key: 'v',
    ctrl: true,
    shift: true,
    action: 'toggleVertices',
    description: 'Toggle vertex display',
  },
  {
    key: 'b',
    ctrl: true,
    shift: false,
    action: 'toggleBounds',
    description: 'Toggle tile bounds',
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    action: 'toggleDevOverlay',
    description: 'Toggle developer overlay',
  },
  // Milestone 7.5 — Step D
  {
    key: 'p',
    ctrl: true,
    shift: true,
    action: 'togglePresentationMode',
    description: 'Toggle presentation mode',
  },
]);

export type ShortcutHandler = (action: ShortcutAction) => void;

// ---------------------------------------------------------------------------
// ShortcutService interface
// ---------------------------------------------------------------------------

export interface ShortcutService {
  registerHandler(handler: ShortcutHandler): () => void;
  attach(target?: EventTarget): () => void;
  getBindings(): readonly ShortcutBinding[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function isTextInput(target: EventTarget | null): boolean {
  if (target === null) return false;
  const el = target as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

class ShortcutServiceImpl implements ShortcutService {
  private readonly _bindings: readonly ShortcutBinding[];
  private readonly _handlers: Set<ShortcutHandler> = new Set();

  constructor(bindings: readonly ShortcutBinding[]) {
    this._bindings = bindings;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  registerHandler(handler: ShortcutHandler): () => void {
    this._handlers.add(handler);
    return () => {
      this._handlers.delete(handler);
    };
  }

  attach(target: EventTarget = window): () => void {
    target.addEventListener('keydown', this._onKeyDown as EventListener);
    return () => {
      target.removeEventListener('keydown', this._onKeyDown as EventListener);
    };
  }

  getBindings(): readonly ShortcutBinding[] {
    return this._bindings;
  }

  private _onKeyDown(event: KeyboardEvent): void {
    if (isTextInput(event.target)) return;

    const key = event.key.toLowerCase();
    const ctrl = Boolean(event.ctrlKey || event.metaKey);
    const shift = Boolean(event.shiftKey);

    for (const binding of this._bindings) {
      const bindingCtrl = binding.ctrl ?? false;
      const bindingShift = binding.shift ?? false;
      if (
        binding.key.toLowerCase() === key &&
        bindingCtrl === ctrl &&
        bindingShift === shift
      ) {
        event.preventDefault();
        this._dispatch(binding.action);
        return;
      }
    }
  }

  private _dispatch(action: ShortcutAction): void {
    for (const handler of this._handlers) {
      try {
        handler(action);
      } catch {
        // Isolate handler errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createShortcutService(
  bindings: readonly ShortcutBinding[] = DEFAULT_SHORTCUTS,
): ShortcutService {
  return new ShortcutServiceImpl(bindings);
}
