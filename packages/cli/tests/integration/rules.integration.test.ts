/**
 * Integration tests for the `rules` command group.
 *
 * Covers `rules list` in both text and JSON output formats, the empty-plugins
 * edge case, and the reserved stub subcommands (`explain`, `docs`) that print
 * a "coming soon" notice and exit 0.
 *
 * These tests also serve as the integration-level verification for the
 * Proposal 1 and Proposal 2 architectural refinements: `runRulesList` no
 * longer writes to any stream directly — it returns a `CommandResult` with
 * `result.message` and `result.output`, and `bin.ts` routes those fields to
 * stderr and stdout respectively via its `present()` helper. The assertions
 * below confirm that stream routing works end-to-end through the real binary:
 *
 *   result.message → stderr  (informational header, "No rules found" notice)
 *   result.output  → stdout  (the rule listing, JSON array)
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BIN_PATH = join(import.meta.dirname, '../../dist/bin.js');
const FIXTURE_DIR = join(import.meta.dirname, '../fixtures/integration-rules');

describe('CLI Integration: rules', () => {
  beforeEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
    mkdirSync(FIXTURE_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  function runRules(args: string[]) {
    const result = spawnSync('node', [BIN_PATH, 'rules', ...args], {
      cwd: FIXTURE_DIR,
      encoding: 'utf8',
    });
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }

  describe('list', () => {
    it('exits 0 and reports no rules when plugins are not configured', () => {
      writeFileSync(join(FIXTURE_DIR, 'tileguard.config.json'), JSON.stringify({}));

      const result = runRules(['list']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No rules found');
    });

    it('routes "No rules found" to stderr, not stdout — Proposal 2 stream routing', () => {
      // runRulesList returns { message: 'No rules found...' } with no output.
      // bin.ts present() writes result.message to stderr; stdout must be empty.
      writeFileSync(join(FIXTURE_DIR, 'tileguard.config.json'), JSON.stringify({}));

      const result = runRules(['list']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No rules found');
      expect(result.stdout).toBe('');
    });

    it('outputs a valid empty JSON array when format is json and no plugins are configured', () => {
      writeFileSync(join(FIXTURE_DIR, 'tileguard.config.json'), JSON.stringify({}));

      const result = runRules(['list', '--format', 'json']);

      expect(result.exitCode).toBe(0);
      // JSON format: result.message is undefined → no stderr output.
      // result.output (the JSON array) is routed to stdout only.
      expect(result.stderr).toBe('');
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  describe('explain (reserved stub — D2)', () => {
    it('prints a "coming soon" notice to stderr and exits 0', () => {
      const result = runRules(['explain', 'tile/no-empty']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('coming in a future release');
    });
  });

  describe('docs (reserved stub — D2)', () => {
    it('prints a "coming soon" notice to stderr and exits 0', () => {
      const result = runRules(['docs', 'tile/no-empty']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('coming in a future release');
    });
  });
});
