/**
 * @tileguard/inspector — WorkspaceService tests (Milestone 6 — Step 4)
 *
 * Tests defaults, partial updates, reset, subscriber notifications,
 * localStorage persistence, and malformed-data recovery.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LAYOUT,
  getWorkspaceService,
  resetWorkspaceServiceInstance,
} from '../src/services/WorkspaceService.js';

// ---------------------------------------------------------------------------
// localStorage mock helper
// ---------------------------------------------------------------------------

function makeLocalStorageMock(
  initial: Record<string, string> = {},
): Storage & { _store: Record<string, string> } {
  const _store: Record<string, string> = { ...initial };
  return {
    _store,
    getItem: (key: string) => _store[key] ?? null,
    setItem: (key: string, value: string) => {
      _store[key] = value;
    },
    removeItem: (key: string) => {
      delete _store[key];
    },
    clear: () => {
      for (const k of Object.keys(_store)) delete _store[k];
    },
    get length() {
      return Object.keys(_store).length;
    },
    key: (index: number) => Object.keys(_store)[index] ?? null,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: test-only window replacement
type AnyGlobal = any;

function withMockStorage<T>(mock: Storage, fn: () => T): T {
  const orig = (globalThis as AnyGlobal).window;
  (globalThis as AnyGlobal).window = { localStorage: mock };
  resetWorkspaceServiceInstance();
  try {
    return fn();
  } finally {
    (globalThis as AnyGlobal).window = orig;
    resetWorkspaceServiceInstance();
  }
}

const STORAGE_KEY = 'tileguard:inspector:workspace:v1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkspaceService', () => {
  beforeEach(() => {
    resetWorkspaceServiceInstance();
    if (typeof window !== 'undefined') window.localStorage.clear();
  });

  // ── Defaults ──────────────────────────────────────────────────────────

  it('returns DEFAULT_LAYOUT on first access', () => {
    expect(getWorkspaceService().getLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('DEFAULT_LAYOUT has expected shape', () => {
    expect(DEFAULT_LAYOUT.leftCollapsed).toBe(false);
    expect(DEFAULT_LAYOUT.rightCollapsed).toBe(false);
    expect(DEFAULT_LAYOUT.activeTab).toBe('welcome');
    expect(DEFAULT_LAYOUT.viewport).toBeNull();
    expect(DEFAULT_LAYOUT.lastFilePath).toBeNull();
  });

  // ── updateLayout() ────────────────────────────────────────────────────

  it('applies partial updates without touching unmentioned fields', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({ leftCollapsed: true, activeTab: 'statistics' });
    const layout = svc.getLayout();
    expect(layout.leftCollapsed).toBe(true);
    expect(layout.activeTab).toBe('statistics');
    expect(layout.rightCollapsed).toBe(DEFAULT_LAYOUT.rightCollapsed);
    expect(layout.viewport).toBe(DEFAULT_LAYOUT.viewport);
  });

  it('stores viewport state correctly', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({ viewport: { zoom: 2.5, panX: 100, panY: 200 } });
    const vp = svc.getLayout().viewport;
    expect(vp?.zoom).toBe(2.5);
    expect(vp?.panX).toBe(100);
    expect(vp?.panY).toBe(200);
  });

  it('stores lastFilePath correctly', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({ lastFilePath: 'my-tile.pbf' });
    expect(svc.getLayout().lastFilePath).toBe('my-tile.pbf');
  });

  // ── resetLayout() ─────────────────────────────────────────────────────

  it('resetLayout() restores all fields to defaults', () => {
    const svc = getWorkspaceService();
    svc.updateLayout({
      leftCollapsed: true,
      activeTab: 'settings',
      lastFilePath: 'foo.pbf',
    });
    svc.resetLayout();
    expect(svc.getLayout()).toEqual(DEFAULT_LAYOUT);
  });

  // ── Subscriptions ─────────────────────────────────────────────────────

  it('notifies subscriber on updateLayout()', () => {
    const svc = getWorkspaceService();
    const cb = vi.fn();
    svc.subscribe(cb);
    svc.updateLayout({ leftCollapsed: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('notifies subscriber on resetLayout()', () => {
    const svc = getWorkspaceService();
    const cb = vi.fn();
    svc.subscribe(cb);
    svc.resetLayout();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops receiving notifications', () => {
    const svc = getWorkspaceService();
    const cb = vi.fn();
    const unsub = svc.subscribe(cb);
    unsub();
    svc.updateLayout({ leftCollapsed: true });
    expect(cb).not.toHaveBeenCalled();
  });

  it('unsubscribing twice does not throw', () => {
    const svc = getWorkspaceService();
    const unsub = svc.subscribe(vi.fn());
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
  });

  it('multiple subscribers each receive notifications', () => {
    const svc = getWorkspaceService();
    const a = vi.fn();
    const b = vi.fn();
    svc.subscribe(a);
    svc.subscribe(b);
    svc.updateLayout({ activeTab: 'diagnostics' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one does not affect the other', () => {
    const svc = getWorkspaceService();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = svc.subscribe(a);
    svc.subscribe(b);
    unsubA();
    svc.updateLayout({ activeTab: 'settings' });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('listener errors do not prevent other listeners from firing', () => {
    const svc = getWorkspaceService();
    const throwing = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const safe = vi.fn();
    svc.subscribe(throwing);
    svc.subscribe(safe);
    expect(() => svc.updateLayout({ leftCollapsed: true })).not.toThrow();
    expect(safe).toHaveBeenCalledTimes(1);
  });

  // ── localStorage persistence ───────────────────────────────────────────

  it('persists layout to localStorage on updateLayout()', () => {
    const mock = makeLocalStorageMock();
    withMockStorage(mock, () => {
      const svc = getWorkspaceService();
      svc.updateLayout({ activeTab: 'settings', leftCollapsed: true });
      const stored = mock._store[STORAGE_KEY];
      expect(stored).not.toBeUndefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.activeTab).toBe('settings');
      expect(parsed.leftCollapsed).toBe(true);
    });
  });

  it('persists layout to localStorage on resetLayout()', () => {
    const mock = makeLocalStorageMock();
    withMockStorage(mock, () => {
      const svc = getWorkspaceService();
      svc.updateLayout({ leftCollapsed: true });
      svc.resetLayout();
      const parsed = JSON.parse(mock._store[STORAGE_KEY]!);
      expect(parsed.leftCollapsed).toBe(DEFAULT_LAYOUT.leftCollapsed);
    });
  });

  it('loads previously persisted layout on init', () => {
    const persisted = JSON.stringify({
      leftCollapsed: true,
      activeTab: 'diagnostics',
    });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: persisted });
    withMockStorage(mock, () => {
      const svc = getWorkspaceService();
      expect(svc.getLayout().leftCollapsed).toBe(true);
      expect(svc.getLayout().activeTab).toBe('diagnostics');
      // Fields not in storage fall back to defaults
      expect(svc.getLayout().rightCollapsed).toBe(
        DEFAULT_LAYOUT.rightCollapsed,
      );
    });
  });

  // ── Malformed / invalid storage ────────────────────────────────────────

  it('falls back to DEFAULT_LAYOUT when localStorage contains malformed JSON', () => {
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: '{ not valid json' });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout()).toEqual(DEFAULT_LAYOUT);
    });
  });

  it('falls back to DEFAULT_LAYOUT when localStorage contains an empty object {}', () => {
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: '{}' });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout()).toEqual(DEFAULT_LAYOUT);
    });
  });

  it('ignores unknown keys in stored JSON', () => {
    const stored = JSON.stringify({
      unknownKey: 'surprise',
      activeTab: 'statistics',
    });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: stored });
    withMockStorage(mock, () => {
      const layout = getWorkspaceService().getLayout();
      expect(layout.activeTab).toBe('statistics');
      expect('unknownKey' in layout).toBe(false);
    });
  });

  it('rejects an invalid activeTab value and falls back to default', () => {
    const stored = JSON.stringify({ activeTab: 'not-a-valid-tab' });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: stored });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout().activeTab).toBe(
        DEFAULT_LAYOUT.activeTab,
      );
    });
  });

  it('rejects a malformed viewport object and stores null', () => {
    const stored = JSON.stringify({ viewport: { bad: true } });
    const mock = makeLocalStorageMock({ [STORAGE_KEY]: stored });
    withMockStorage(mock, () => {
      expect(getWorkspaceService().getLayout().viewport).toBeNull();
    });
  });

  it('gracefully degrades when localStorage is unavailable', () => {
    // withMockStorage sets window but no localStorage
    const orig = (globalThis as AnyGlobal).window;
    (globalThis as AnyGlobal).window = undefined;
    resetWorkspaceServiceInstance();
    expect(() => {
      const svc = getWorkspaceService();
      svc.updateLayout({ leftCollapsed: true });
    }).not.toThrow();
    (globalThis as AnyGlobal).window = orig;
    resetWorkspaceServiceInstance();
  });
});
