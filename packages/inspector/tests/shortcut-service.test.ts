import { describe, expect, it, vi } from 'vitest';
import {
  createShortcutService,
  DEFAULT_SHORTCUTS,
  type ShortcutAction,
} from '../src/services/ShortcutService.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Builds a minimal mock EventTarget that captures listeners by type. */
function makeMockTarget() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const removeEventListener = vi.fn();
  const target = {
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners[type] = fn;
    },
    removeEventListener,
    _listeners: listeners,
  };
  return { target, listeners, removeEventListener };
}

/** Fires a synthetic keydown event through the mock target. */
function fireKey(
  listeners: Record<string, (e: unknown) => void>,
  key: string,
  ctrlKey = false,
  target: unknown = null,
) {
  listeners.keydown?.({
    key,
    ctrlKey,
    metaKey: false,
    shiftKey: false,
    target,
    preventDefault: vi.fn(),
  });
}

describe('ShortcutService', () => {
  // ── Bindings ──────────────────────────────────────────────────────────

  it('returns the default shortcut bindings', () => {
    const service = createShortcutService();
    expect(service.getBindings()).toEqual(DEFAULT_SHORTCUTS);
  });

  it('DEFAULT_SHORTCUTS contains exactly 17 bindings', () => {
    expect(DEFAULT_SHORTCUTS).toHaveLength(17);
  });

  it('accepts custom bindings at construction time', () => {
    const custom = [
      {
        key: 'x',
        ctrl: false,
        action: 'clearSelection' as ShortcutAction,
        description: 'Custom',
      },
    ] as const;
    const service = createShortcutService(custom);
    expect(service.getBindings()).toHaveLength(1);
    expect(service.getBindings()[0]!.key).toBe('x');
  });

  // ── All 8 shortcuts fire the correct action ───────────────────────────

  it('dispatches focusFeature for plain F', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'f', false);
    expect(handler).toHaveBeenCalledWith('focusFeature');
  });

  it('dispatches resetView for plain R', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'r', false);
    expect(handler).toHaveBeenCalledWith('resetView');
  });

  it('dispatches clearSelection for Escape', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'Escape', false);
    expect(handler).toHaveBeenCalledWith('clearSelection');
  });

  it('dispatches focusSearch for Ctrl+F', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'f', true);
    expect(handler).toHaveBeenCalledWith('focusSearch');
  });

  it('dispatches openSettings for Ctrl+,', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, ',', true);
    expect(handler).toHaveBeenCalledWith('openSettings');
  });

  it('dispatches showExplore for Ctrl+1', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, '1', true);
    expect(handler).toHaveBeenCalledWith('showExplore');
  });

  it('dispatches showDiagnostics for Ctrl+2', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, '2', true);
    expect(handler).toHaveBeenCalledWith('showDiagnostics');
  });

  it('dispatches showStatistics for Ctrl+3', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, '3', true);
    expect(handler).toHaveBeenCalledWith('showStatistics');
  });

  // ── Key-case normalisation ────────────────────────────────────────────

  it('normalises key to lowercase before matching (ESCAPE → escape → clearSelection)', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'ESCAPE', false);
    expect(handler).toHaveBeenCalledWith('clearSelection');
  });

  it('does not dispatch for an unregistered key', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'z', false);
    expect(handler).not.toHaveBeenCalled();
  });

  // ── Ctrl modifier discrimination ──────────────────────────────────────

  it('does not dispatch Ctrl shortcuts without ctrl key', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    // Ctrl+1 without ctrl should not fire
    fireKey(listeners, '1', false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not dispatch plain shortcuts with ctrl key', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    // plain-R with ctrl held should not fire resetView
    fireKey(listeners, 'r', true);
    expect(handler).not.toHaveBeenCalled();
  });

  // ── Text input suppression ────────────────────────────────────────────

  it('ignores shortcuts when target is an INPUT element', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'f', false, {
      tagName: 'INPUT',
      isContentEditable: false,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is a TEXTAREA element', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'r', false, {
      tagName: 'TEXTAREA',
      isContentEditable: false,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is a SELECT element', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'escape', false, {
      tagName: 'SELECT',
      isContentEditable: false,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when target is a contenteditable element', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'f', false, {
      tagName: 'DIV',
      isContentEditable: true,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires shortcuts when target is a non-contenteditable DIV', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'r', false, {
      tagName: 'DIV',
      isContentEditable: false,
    });
    expect(handler).toHaveBeenCalledWith('resetView');
  });

  it('fires shortcuts when event.target is null', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'r', false, null);
    expect(handler).toHaveBeenCalledWith('resetView');
  });

  // ── Handler registration / unregistration ────────────────────────────

  it('dispatches to multiple handlers simultaneously', () => {
    const service = createShortcutService();
    const a = vi.fn();
    const b = vi.fn();
    service.registerHandler(a);
    service.registerHandler(b);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'escape', false);
    expect(a).toHaveBeenCalledWith('clearSelection');
    expect(b).toHaveBeenCalledWith('clearSelection');
  });

  it('stops dispatching after handler unregistration', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    const unregister = service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    fireKey(listeners, 'r', false);
    expect(handler).toHaveBeenCalledTimes(1);

    unregister();
    fireKey(listeners, 'r', false);
    expect(handler).toHaveBeenCalledTimes(1); // no additional call
  });

  it('isolates handler errors — remaining handlers still fire', () => {
    const service = createShortcutService();
    const throwing = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const safe = vi.fn();
    service.registerHandler(throwing);
    service.registerHandler(safe);
    const { target, listeners } = makeMockTarget();
    service.attach(target as unknown as EventTarget);

    expect(() => fireKey(listeners, 'r', false)).not.toThrow();
    expect(safe).toHaveBeenCalledWith('resetView');
  });

  // ── attach() cleanup ─────────────────────────────────────────────────

  it('attach() returns a cleanup function that calls removeEventListener', () => {
    const service = createShortcutService();
    const { target, removeEventListener } = makeMockTarget();
    const cleanup = service.attach(target as unknown as EventTarget);

    cleanup();

    expect(removeEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });

  it('no longer dispatches after cleanup()', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);
    const { target, listeners } = makeMockTarget();

    // Re-implement removeEventListener to actually clear the listener
    target.removeEventListener.mockImplementation(
      (type: string, _fn: unknown) => {
        delete listeners[type];
      },
    );

    const cleanup = service.attach(target as unknown as EventTarget);
    cleanup();

    fireKey(listeners, 'r', false);
    expect(handler).not.toHaveBeenCalled();
  });
});
