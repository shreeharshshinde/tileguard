import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getSettingsService,
  resetSettingsServiceInstance,
} from '../src/services/SettingsService.js';

// ---------------------------------------------------------------------------
// localStorage mock helper
// ---------------------------------------------------------------------------

function makeLocalStorageMock(): Storage & { _store: Record<string, string> } {
  const _store: Record<string, string> = {};
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

describe('SettingsService', () => {
  beforeEach(() => {
    // Reset singleton before each test so state is isolated
    resetSettingsServiceInstance();
    // Clear any localStorage written by previous tests
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  // ── Basic defaults ──────────────────────────────────────────────────────

  it('provides default settings', () => {
    const service = getSettingsService();
    const settings = service.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a frozen settings object', () => {
    const service = getSettingsService();
    const settings = service.getSettings();
    expect(Object.isFrozen(settings)).toBe(true);
  });

  // ── Partial updates ─────────────────────────────────────────────────────

  it('updates partial settings and notifies subscribers', () => {
    const service = getSettingsService();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    service.updateSettings({ showVertices: true, overlayOpacity: 0.8 });

    expect(service.getSettings().showVertices).toBe(true);
    expect(service.getSettings().overlayOpacity).toBe(0.8);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('preserves unmodified fields when applying a partial update', () => {
    const service = getSettingsService();
    service.updateSettings({ showVertices: true });
    const s = service.getSettings();
    // All other fields must stay at their defaults
    expect(s.showTileBounds).toBe(DEFAULT_SETTINGS.showTileBounds);
    expect(s.antiAliasing).toBe(DEFAULT_SETTINGS.antiAliasing);
    expect(s.minSeverity).toBe(DEFAULT_SETTINGS.minSeverity);
  });

  // ── Reset ───────────────────────────────────────────────────────────────

  it('resets settings back to defaults', () => {
    const service = getSettingsService();
    service.updateSettings({ showVertices: true, autoFocusDiagnostics: false });
    expect(service.getSettings().showVertices).toBe(true);

    service.resetSettings();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('notifies subscribers on resetSettings()', () => {
    const service = getSettingsService();
    const listener = vi.fn();
    service.subscribe(listener);

    service.resetSettings();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  // ── Subscribe / unsubscribe ─────────────────────────────────────────────

  it('does not call listener after unsubscribe', () => {
    const service = getSettingsService();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    unsubscribe();
    service.updateSettings({ showVertices: true });

    expect(listener).not.toHaveBeenCalled();
  });

  it('calling unsubscribe twice does not throw', () => {
    const service = getSettingsService();
    const unsubscribe = service.subscribe(vi.fn());
    expect(() => {
      unsubscribe();
      unsubscribe(); // idempotent
    }).not.toThrow();
  });

  it('multiple independent subscribers each receive notifications', () => {
    const service = getSettingsService();
    const a = vi.fn();
    const b = vi.fn();
    service.subscribe(a);
    service.subscribe(b);

    service.updateSettings({ smoothZoom: false });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing one listener does not affect others', () => {
    const service = getSettingsService();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = service.subscribe(a);
    service.subscribe(b);

    unsubA();
    service.updateSettings({ showVertices: false });

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  // ── Numeric clamping ────────────────────────────────────────────────────

  it('clamps overlayOpacity to [0, 1]', () => {
    const service = getSettingsService();
    service.updateSettings({ overlayOpacity: 2.5 });
    expect(service.getSettings().overlayOpacity).toBe(1);

    service.updateSettings({ overlayOpacity: -0.5 });
    expect(service.getSettings().overlayOpacity).toBe(0);
  });

  it('clamps selectionThickness to [1, 6]', () => {
    const service = getSettingsService();
    service.updateSettings({ selectionThickness: 99 });
    expect(service.getSettings().selectionThickness).toBe(6);

    service.updateSettings({ selectionThickness: -1 });
    expect(service.getSettings().selectionThickness).toBe(1);
  });

  it('clamps hoverThickness to [1, 6]', () => {
    const service = getSettingsService();
    service.updateSettings({ hoverThickness: 10 });
    expect(service.getSettings().hoverThickness).toBe(6);

    service.updateSettings({ hoverThickness: 0 });
    expect(service.getSettings().hoverThickness).toBe(1);
  });

  // ── Rapid successive updates ────────────────────────────────────────────

  it('handles rapid successive updates correctly', () => {
    const service = getSettingsService();
    const listener = vi.fn();
    service.subscribe(listener);

    for (let i = 0; i < 20; i++) {
      service.updateSettings({ selectionThickness: (i % 6) + 1 });
    }

    // Each update should notify
    expect(listener).toHaveBeenCalledTimes(20);
    // Final value should reflect the last update: (19 % 6) + 1 = 2
    expect(service.getSettings().selectionThickness).toBe(2);
  });

  it('each rapid update produces a new frozen settings object', () => {
    const service = getSettingsService();
    const snapshots: object[] = [];

    for (let i = 0; i < 5; i++) {
      service.updateSettings({ overlayOpacity: i * 0.2 });
      snapshots.push(service.getSettings());
    }

    // All snapshots should be frozen
    for (const s of snapshots) {
      expect(Object.isFrozen(s)).toBe(true);
    }
    // Each should be a distinct object reference
    const unique = new Set(snapshots);
    expect(unique.size).toBe(5);
  });

  // ── localStorage persistence ────────────────────────────────────────────

  it('persists settings to localStorage on updateSettings', () => {
    // Install a mock localStorage
    const mockStorage = makeLocalStorageMock();
    const originalWindow = globalThis.window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();
    service.updateSettings({ showVertices: true });

    const stored = mockStorage.getItem('tileguard:inspector:settings:v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.showVertices).toBe(true);

    // Restore
    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  it('persists settings to localStorage on resetSettings', () => {
    const mockStorage = makeLocalStorageMock();
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    const originalWindow = (globalThis as any).window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();
    service.updateSettings({ showVertices: true });
    service.resetSettings();

    const stored = mockStorage.getItem('tileguard:inspector:settings:v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.showVertices).toBe(DEFAULT_SETTINGS.showVertices);

    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  it('loads previously persisted settings from localStorage on init', () => {
    const mockStorage = makeLocalStorageMock();
    // Pre-populate storage with a known value
    mockStorage.setItem(
      'tileguard:inspector:settings:v1',
      JSON.stringify({ showVertices: true, overlayOpacity: 0.5 }),
    );
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    const originalWindow = (globalThis as any).window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();
    const settings = service.getSettings();

    expect(settings.showVertices).toBe(true);
    expect(settings.overlayOpacity).toBe(0.5);
    // Un-persisted fields should fall back to defaults
    expect(settings.antiAliasing).toBe(DEFAULT_SETTINGS.antiAliasing);

    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  // ── Malformed / invalid stored data ────────────────────────────────────

  it('falls back to defaults when localStorage contains malformed JSON', () => {
    const mockStorage = makeLocalStorageMock();
    mockStorage.setItem(
      'tileguard:inspector:settings:v1',
      '{ this is : not valid json',
    );
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    const originalWindow = (globalThis as any).window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();

    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);

    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  it('falls back to defaults when localStorage contains an empty object', () => {
    const mockStorage = makeLocalStorageMock();
    mockStorage.setItem('tileguard:inspector:settings:v1', '{}');
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    const originalWindow = (globalThis as any).window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();

    // All keys should resolve to their defaults
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);

    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  it('clamps out-of-range numeric values loaded from storage', () => {
    const mockStorage = makeLocalStorageMock();
    mockStorage.setItem(
      'tileguard:inspector:settings:v1',
      JSON.stringify({ overlayOpacity: 5, selectionThickness: -2 }),
    );
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    const originalWindow = (globalThis as any).window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();

    expect(service.getSettings().overlayOpacity).toBe(1);
    expect(service.getSettings().selectionThickness).toBe(1);

    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  it('gracefully handles unknown keys in stored settings', () => {
    const mockStorage = makeLocalStorageMock();
    mockStorage.setItem(
      'tileguard:inspector:settings:v1',
      JSON.stringify({ unknownKey: 'surprise', showVertices: true }),
    );
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    const originalWindow = (globalThis as any).window;
    // biome-ignore lint/suspicious/noExplicitAny: test-only window stub
    (globalThis as any).window = { localStorage: mockStorage };

    resetSettingsServiceInstance();
    const service = getSettingsService();
    const settings = service.getSettings();

    expect(settings.showVertices).toBe(true);
    // Known keys should be present
    expect('showTileBounds' in settings).toBe(true);

    // biome-ignore lint/suspicious/noExplicitAny: test-only window restore
    (globalThis as any).window = originalWindow;
    resetSettingsServiceInstance();
  });

  // ── Listener error isolation ────────────────────────────────────────────

  it('continues notifying remaining listeners if one throws', () => {
    const service = getSettingsService();
    const throwing = vi.fn().mockImplementation(() => {
      throw new Error('listener error');
    });
    const safe = vi.fn();

    service.subscribe(throwing);
    service.subscribe(safe);

    // Should not propagate the error
    expect(() => service.updateSettings({ showVertices: true })).not.toThrow();
    expect(safe).toHaveBeenCalledTimes(1);
  });
});
