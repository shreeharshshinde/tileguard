import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getSettingsService,
} from '../src/services/SettingsService.js';

describe('SettingsService', () => {
  beforeEach(() => {
    // Reset service state to defaults before each test
    const service = getSettingsService();
    service.resetSettings();
  });

  it('provides default settings', () => {
    const service = getSettingsService();
    const settings = service.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

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

  it('resets settings back to defaults', () => {
    const service = getSettingsService();
    service.updateSettings({ showVertices: true, autoFocusDiagnostics: false });
    expect(service.getSettings().showVertices).toBe(true);

    service.resetSettings();
    expect(service.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
