/**
 * @tileguard/inspector — ExportService tests (Milestone 6 — Step 4)
 *
 * Tests the Step 4 architecture stub:
 *   - getSupportedFormats() returns an empty array
 *   - export() always rejects with ExportNotImplementedError
 *   - ExportNotImplementedError carries the correct name and message
 *   - Multiple createExportService() calls return independent instances
 */

import { describe, expect, it } from 'vitest';
import {
  ExportNotImplementedError,
  createExportService,
  type ExportFormat,
} from '../src/services/ExportService.js';

describe('ExportService (Step 4 stub)', () => {
  // ── getSupportedFormats() ──────────────────────────────────────────────

  it('getSupportedFormats() returns an empty readonly array', () => {
    const svc = createExportService();
    const formats = svc.getSupportedFormats();
    expect(formats).toHaveLength(0);
  });

  it('getSupportedFormats() does not include png, json, or markdown yet', () => {
    const svc = createExportService();
    const formats = svc.getSupportedFormats();
    expect(formats).not.toContain('png');
    expect(formats).not.toContain('json');
    expect(formats).not.toContain('markdown');
  });

  it('getSupportedFormats() returns the same empty result on repeated calls', () => {
    const svc = createExportService();
    expect(svc.getSupportedFormats()).toHaveLength(0);
    expect(svc.getSupportedFormats()).toHaveLength(0);
  });

  // ── export() — rejection for every format ─────────────────────────────

  it('export() rejects with ExportNotImplementedError for png', async () => {
    const svc = createExportService();
    await expect(svc.export({ format: 'png' })).rejects.toThrow(
      ExportNotImplementedError,
    );
  });

  it('export() rejects with ExportNotImplementedError for json', async () => {
    const svc = createExportService();
    await expect(svc.export({ format: 'json' })).rejects.toThrow(
      ExportNotImplementedError,
    );
  });

  it('export() rejects with ExportNotImplementedError for markdown', async () => {
    const svc = createExportService();
    await expect(svc.export({ format: 'markdown' })).rejects.toThrow(
      ExportNotImplementedError,
    );
  });

  it('export() passes along export options without modifying them', async () => {
    const svc = createExportService();
    let thrownError: ExportNotImplementedError | null = null;
    try {
      await svc.export({ format: 'json', selectedOnly: true });
    } catch (err) {
      if (err instanceof ExportNotImplementedError) thrownError = err;
    }
    expect(thrownError).not.toBeNull();
  });

  // ── ExportNotImplementedError ──────────────────────────────────────────

  it('ExportNotImplementedError has name "ExportNotImplementedError"', () => {
    const err = new ExportNotImplementedError('png');
    expect(err.name).toBe('ExportNotImplementedError');
  });

  it('ExportNotImplementedError is an instance of Error', () => {
    expect(new ExportNotImplementedError('png')).toBeInstanceOf(Error);
  });

  it('ExportNotImplementedError message mentions the format', () => {
    for (const fmt of ['png', 'json', 'markdown'] as ExportFormat[]) {
      const err = new ExportNotImplementedError(fmt);
      expect(err.message).toContain(fmt);
    }
  });

  it('ExportNotImplementedError message mentions Milestone 7', () => {
    const err = new ExportNotImplementedError('png');
    expect(err.message).toMatch(/milestone 7/i);
  });

  // ── export() error shape when using await/catch ────────────────────────

  it('the rejection error contains the correct format in its message', async () => {
    const svc = createExportService();
    let caught: Error | undefined;
    try {
      await svc.export({ format: 'markdown' });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain('markdown');
  });

  // ── Factory creates independent instances ──────────────────────────────

  it('each createExportService() call returns a distinct instance', () => {
    const a = createExportService();
    const b = createExportService();
    expect(a).not.toBe(b);
  });
});
