/**
 * Unit tests for src/commands/rules.ts
 *
 * Tests runRulesList() as a pure function by mocking the @tileguard/config
 * dependency. No subprocess is spawned — this exercises the path Decision D3
 * was designed to enable.
 *
 * Coverage:
 *   - Empty plugins: exits 0, "No rules found" in result.message, no output
 *   - Real plugin data (tilePlugin): exits 0, rule IDs in result.output
 *   - JSON format with real plugin: parses cleanly, contains expected fields
 *   - Config load error: exits 2
 *   - process.exit is never called (D3 enforcement)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

// ── Module mock — must be declared before any imports that use them ───────
vi.mock('@tileguard/config', () => ({
  loadConfig: vi.fn(),
}));

import { loadConfig } from '@tileguard/config';
import { tilePlugin } from '@tileguard/tile-rules';
import { runRulesList } from '../src/commands/rules.js';

const mockLoadConfig = loadConfig as Mock;

// ── Test suite ────────────────────────────────────────────────────────────

describe('runRulesList', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Exit code 2: config errors ───────────────────────────────────────

  it('returns exitCode 2 when loadConfig throws', async () => {
    mockLoadConfig.mockRejectedValueOnce(new Error('config not found'));

    const result = await runRulesList({});

    expect(result.exitCode).toBe(2);
    expect(result.message).toContain('config not found');
  });

  // ── Empty plugins case ───────────────────────────────────────────────

  it('returns exitCode 0 with "No rules found" when plugins is absent', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: {} });

    const result = await runRulesList({});

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('No rules found');
    expect(result.output).toBeUndefined();
  });

  it('returns exitCode 0 with "No rules found" when plugins is empty array', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { plugins: [] } });

    const result = await runRulesList({});

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain('No rules found');
  });

  it('returns empty JSON array when format is json and plugins are absent', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: {} });

    const result = await runRulesList({ format: 'json' });

    expect(result.exitCode).toBe(0);
    expect(result.message).toBeUndefined(); // json format suppresses stderr
    const parsed = JSON.parse(result.output!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(0);
  });

  // ── Happy-path: real tilePlugin data ────────────────────────────────
  //
  // This is the core untested path: iterating config.plugins[].rules[] with
  // a real plugin that actually contains rules. tilePlugin contributes 10
  // rules; we assert the expected IDs, structure, and count.

  it('returns exitCode 0 and lists rules from tilePlugin in text format', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { plugins: [tilePlugin] } });

    const result = await runRulesList({});

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(`Found ${tilePlugin.rules.length} rule(s)`);
    expect(result.output).toBeDefined();

    // Known rule IDs that must appear in the output
    expect(result.output).toContain('tile/no-empty');
    expect(result.output).toContain('tile/coordinate-range');
    expect(result.output).toContain('tile/self-intersection');
  });

  it('includes plugin id in each rule entry in text output', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { plugins: [tilePlugin] } });

    const result = await runRulesList({});

    // Plugin id "tile-rules" must appear in the listing for attribution
    expect(result.output).toContain('tile-rules');
  });

  it('lists all 10 tilePlugin rules in JSON format with correct fields', async () => {
    mockLoadConfig.mockResolvedValueOnce({ config: { plugins: [tilePlugin] } });

    const result = await runRulesList({ format: 'json' });

    expect(result.exitCode).toBe(0);
    expect(result.message).toBeUndefined(); // json: no stderr output

    const parsed = JSON.parse(result.output!) as Array<{
      id: string;
      description: string;
      defaultSeverity: string;
      recommended: boolean;
      plugin: string;
    }>;

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(tilePlugin.rules.length);

    // Every entry must have the required fields
    for (const entry of parsed) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.startsWith('tile/')).toBe(true);
      expect(typeof entry.description).toBe('string');
      expect(typeof entry.defaultSeverity).toBe('string');
      expect(typeof entry.recommended).toBe('boolean');
      expect(entry.plugin).toBe('tile-rules');
    }

    // Spot-check a specific rule: tile/no-empty should be recommended
    const noEmpty = parsed.find((r) => r.id === 'tile/no-empty');
    expect(noEmpty).toBeDefined();
    expect(noEmpty!.recommended).toBe(true);
    expect(noEmpty!.defaultSeverity).toBe('warning');
  });

  it('correctly concatenates rules from two plugins when both are configured', async () => {
    // Use tilePlugin twice as a second "plugin" stand-in.
    // A real fixture plugin with its own id would be ideal, but tilePlugin
    // repeated exercises the multi-plugin concatenation code path reliably.
    const secondPlugin = { ...tilePlugin, id: 'tile-rules-extra' };
    mockLoadConfig.mockResolvedValueOnce({
      config: { plugins: [tilePlugin, secondPlugin] },
    });

    const result = await runRulesList({ format: 'json' });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output!) as Array<{ plugin: string }>;

    // Both plugins must be represented
    const fromFirst = parsed.filter((r) => r.plugin === 'tile-rules');
    const fromSecond = parsed.filter((r) => r.plugin === 'tile-rules-extra');
    expect(fromFirst.length).toBe(tilePlugin.rules.length);
    expect(fromSecond.length).toBe(tilePlugin.rules.length);
    expect(parsed.length).toBe(tilePlugin.rules.length * 2);
  });

  // ── D3: process lifecycle ────────────────────────────────────────────

  it('never calls process.exit (D3 enforcement)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit must not be called from runRulesList');
    });

    mockLoadConfig.mockResolvedValueOnce({ config: { plugins: [tilePlugin] } });

    await runRulesList({});

    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
