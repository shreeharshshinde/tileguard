import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

import { existsSync, readFileSync } from 'node:fs';
import { loadYamlConfig, getDefaultConfig } from '../src/config/ConfigLoader.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe('getDefaultConfig', () => {
  it('returns expected shape with all sections', () => {
    const config = getDefaultConfig();
    expect(config).toHaveProperty('comparison');
    expect(config).toHaveProperty('regression');
    expect(config).toHaveProperty('report');
    expect(config).toHaveProperty('output');
  });

  it('has empty stableProperties array', () => {
    const config = getDefaultConfig();
    expect(config.comparison.stableProperties).toEqual([]);
  });

  it('has minConfidence of 0.6', () => {
    const config = getDefaultConfig();
    expect(config.regression.minConfidence).toBe(0.6);
  });

  it('has markdown as default report format', () => {
    const config = getDefaultConfig();
    expect(config.report.format).toBe('markdown');
  });

  it('has current directory as default output directory', () => {
    const config = getDefaultConfig();
    expect(config.output.directory).toBe('.');
  });
});

describe('loadYamlConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns defaults and null configPath when no file exists', () => {
    mockExistsSync.mockReturnValue(false);
    const result = loadYamlConfig({ cwd: '/tmp/nowhere' });
    expect(result.configPath).toBeNull();
    expect(result.config).toEqual(getDefaultConfig());
  });

  it('throws when explicit path does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(() =>
      loadYamlConfig({ configPath: '/nonexistent/tileguard.yml' }),
    ).toThrow(/not found/i);
  });

  it('parses comparison.stableProperties array', () => {
    const yaml = 'comparison:\n  stableProperties:\n    - osm_id\n    - name\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.comparison.stableProperties).toEqual(['osm_id', 'name']);
  });

  it('parses comparison.stableProperties inline array', () => {
    const yaml = 'comparison:\n  stableProperties: [osm_id, name]\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.comparison.stableProperties).toEqual(['osm_id', 'name']);
  });

  it('parses regression.minConfidence number', () => {
    const yaml = 'regression:\n  minConfidence: 0.85\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.regression.minConfidence).toBe(0.85);
  });

  it('parses report.format string', () => {
    const yaml = 'report:\n  format: html\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.report.format).toBe('html');
  });

  it('parses output.directory string', () => {
    const yaml = 'output:\n  directory: ./reports\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.output.directory).toBe('./reports');
  });

  it('auto-discovers tileguard.yml', () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path) === resolve('/project', 'tileguard.yml');
    });
    mockReadFileSync.mockReturnValue('report:\n  format: json\n');
    const { config, configPath } = loadYamlConfig({ cwd: '/project' });
    expect(configPath).toBe(resolve('/project', 'tileguard.yml'));
    expect(config.report.format).toBe('json');
  });

  it('auto-discovers tileguard.yaml', () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path) === resolve('/project', 'tileguard.yaml');
    });
    mockReadFileSync.mockReturnValue('output:\n  directory: dist\n');
    const { config, configPath } = loadYamlConfig({ cwd: '/project' });
    expect(configPath).toBe(resolve('/project', 'tileguard.yaml'));
    expect(config.output.directory).toBe('dist');
  });

  it('auto-discovers .tileguard.yml', () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path) === resolve('/project', '.tileguard.yml');
    });
    mockReadFileSync.mockReturnValue('regression:\n  minConfidence: 0.9\n');
    const { config, configPath } = loadYamlConfig({ cwd: '/project' });
    expect(configPath).toBe(resolve('/project', '.tileguard.yml'));
    expect(config.regression.minConfidence).toBe(0.9);
  });

  it('ignores YAML comments', () => {
    const yaml = '# This is a comment\nregression:\n  # inline\n  minConfidence: 0.75 # trailing\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.regression.minConfidence).toBe(0.75);
  });

  it('ignores unknown keys without error', () => {
    const yaml = 'unknownSection:\n  foo: bar\nregression:\n  minConfidence: 0.5\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    expect(() => loadYamlConfig({ configPath: '/fake/tileguard.yml' })).not.toThrow();
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.regression.minConfidence).toBe(0.5);
  });

  it('returns defaults for empty YAML file', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('');
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config).toEqual(getDefaultConfig());
  });

  it('falls back to defaults for invalid format values', () => {
    const yaml = 'report:\n  format: invalid_format\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.report.format).toBe('markdown');
  });

  it('falls back to defaults for invalid minConfidence type', () => {
    const yaml = 'regression:\n  minConfidence: not-a-number\n';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(yaml);
    const { config } = loadYamlConfig({ configPath: '/fake/tileguard.yml' });
    expect(config.regression.minConfidence).toBe(0.6);
  });

  it('prefers tileguard.yml over tileguard.yaml in discovery order', () => {
    mockExistsSync.mockImplementation((path) => {
      const p = String(path);
      return (
        p === resolve('/project', 'tileguard.yml') ||
        p === resolve('/project', 'tileguard.yaml')
      );
    });
    mockReadFileSync.mockReturnValue('report:\n  format: html\n');
    const { configPath } = loadYamlConfig({ cwd: '/project' });
    expect(configPath).toBe(resolve('/project', 'tileguard.yml'));
  });
});
