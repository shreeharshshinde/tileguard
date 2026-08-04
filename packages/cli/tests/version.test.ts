/**
 * Tests for the `version` command.
 */

import { describe, expect, it } from 'vitest';
import { runVersion, getVersion } from '../src/commands/version.js';

describe('version command', () => {
  it('getVersion() returns a semver string', () => {
    const version = getVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('runVersion() returns exitCode 0', () => {
    const result = runVersion();
    expect(result.exitCode).toBe(0);
  });

  it('text output includes tileguard version', () => {
    const result = runVersion();
    expect(result.output).toContain('tileguard');
    expect(result.output).toContain(getVersion());
  });

  it('text output includes node version', () => {
    const result = runVersion();
    expect(result.output).toContain(process.version);
  });

  it('text output includes platform', () => {
    const result = runVersion();
    expect(result.output).toContain(process.platform);
  });

  it('text output lists all packages', () => {
    const result = runVersion();
    expect(result.output).toContain('@tileguard/core');
    expect(result.output).toContain('@tileguard/tile-rules');
    expect(result.output).toContain('@tileguard/style-rules');
    expect(result.output).toContain('@tileguard/reporters');
    expect(result.output).toContain('@tileguard/config');
    expect(result.output).toContain('@tileguard/cli');
  });

  it('json format returns valid JSON', () => {
    const result = runVersion({ format: 'json' });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output!);
    expect(parsed.tileguard).toBe(getVersion());
    expect(parsed.node).toBe(process.version);
    expect(parsed.platform).toBe(process.platform);
  });

  it('json format includes packages object', () => {
    const result = runVersion({ format: 'json' });
    const parsed = JSON.parse(result.output!);
    expect(parsed.packages).toBeDefined();
    expect(parsed.packages.core).toBeDefined();
    expect(parsed.packages['tile-rules']).toBeDefined();
  });
});
