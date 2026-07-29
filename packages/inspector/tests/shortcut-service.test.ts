import { describe, expect, it, vi } from 'vitest';
import { createShortcutService, DEFAULT_SHORTCUTS } from '../src/services/ShortcutService.js';

describe('ShortcutService', () => {
  it('returns default shortcut bindings', () => {
    const service = createShortcutService();
    expect(service.getBindings()).toEqual(DEFAULT_SHORTCUTS);
  });

  it('attaches listener and dispatches matching shortcut actions', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);

    const listeners: Record<string, (e: unknown) => void> = {};
    const mockTarget = {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: vi.fn(),
    };

    const cleanup = service.attach(mockTarget as unknown as EventTarget);

    // Trigger keydown for Escape key
    listeners.keydown?.({
      key: 'Escape',
      ctrlKey: false,
      shiftKey: false,
      target: null,
      preventDefault: vi.fn(),
    });

    expect(handler).toHaveBeenCalledWith('clearSelection');
    cleanup();
    expect(mockTarget.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('ignores shortcuts when target is an input element', () => {
    const service = createShortcutService();
    const handler = vi.fn();
    service.registerHandler(handler);

    const listeners: Record<string, (e: unknown) => void> = {};
    const mockTarget = {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: vi.fn(),
    };

    service.attach(mockTarget as unknown as EventTarget);

    // Trigger keydown with an input target
    listeners.keydown?.({
      key: 'f',
      ctrlKey: false,
      shiftKey: false,
      target: { tagName: 'INPUT', isContentEditable: false },
      preventDefault: vi.fn(),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
