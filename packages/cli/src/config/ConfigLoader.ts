/**
 * @tileguard/cli — YAML Configuration Loader
 *
 * Loads and validates tileguard.yml for comparison/regression/report settings.
 * Falls back to defaults when no config file is found.
 *
 * This is separate from @tileguard/config (which handles tileguard.config.ts
 * for rule/plugin configuration). This YAML config controls CLI behavior:
 * comparison settings, regression thresholds, and report output options.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Config shape
// ---------------------------------------------------------------------------

export interface TileguardYamlConfig {
  readonly comparison: ComparisonConfig;
  readonly regression: RegressionConfig;
  readonly report: ReportConfig;
  readonly output: OutputConfig;
}

export interface ComparisonConfig {
  /** Properties used for stable feature matching (e.g., osm_id). */
  readonly stableProperties: readonly string[];
}

export interface RegressionConfig {
  /** Minimum confidence to consider a feature a regression candidate. */
  readonly minConfidence: number;
}

export interface ReportConfig {
  /** Default report format. */
  readonly format: 'markdown' | 'html' | 'json';
}

export interface OutputConfig {
  /** Output directory for generated reports and artifacts. */
  readonly directory: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: TileguardYamlConfig = {
  comparison: {
    stableProperties: [],
  },
  regression: {
    minConfidence: 0.6,
  },
  report: {
    format: 'markdown',
  },
  output: {
    directory: '.',
  },
};

// ---------------------------------------------------------------------------
// YAML parser (minimal — no dependency required for simple flat YAML)
// ---------------------------------------------------------------------------

/**
 * Minimal YAML parser sufficient for tileguard.yml.
 * Handles nested keys (one level), string values, number values,
 * and arrays (inline or indented with `-`).
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, Record<string, unknown>> = {};
  let currentSection = '';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (line.trim() === '') continue;

    // Top-level key (no leading whitespace, ends with `:`)
    const topMatch = line.match(/^(\w[\w-]*):\s*$/);
    if (topMatch) {
      currentSection = topMatch[1]!;
      if (result[currentSection] === undefined) {
        result[currentSection] = {};
      }
      continue;
    }

    // Top-level key with inline value
    const topValueMatch = line.match(/^(\w[\w-]*):\s+(.+)$/);
    if (topValueMatch && !line.startsWith(' ')) {
      currentSection = topValueMatch[1]!;
      result[currentSection] = { _value: parseValue(topValueMatch[2]!) };
      continue;
    }

    // Nested key with value
    const nestedMatch = line.match(/^\s+(\w[\w-]*):\s*(.*)$/);
    if (nestedMatch && currentSection) {
      const key = nestedMatch[1]!;
      const rawValue = nestedMatch[2]!.trim();
      if (result[currentSection] === undefined) {
        result[currentSection] = {};
      }
      result[currentSection]![key] = parseValue(rawValue);
      continue;
    }

    // Array item (- value)
    const arrayMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayMatch && currentSection) {
      // Find the last key in current section and append
      const keys = Object.keys(result[currentSection] ?? {});
      const lastKey = keys[keys.length - 1];
      if (lastKey !== undefined && result[currentSection]) {
        const existing = result[currentSection]![lastKey];
        if (Array.isArray(existing)) {
          existing.push(parseValue(arrayMatch[1]!));
        } else if (
          existing === '' ||
          existing === undefined ||
          existing === null
        ) {
          result[currentSection]![lastKey] = [parseValue(arrayMatch[1]!)];
        }
      }
    }
  }

  return result;
}

function parseValue(raw: string): string | number | boolean | string[] {
  if (raw === '') return '';
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Inline array: [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter((s) => s.length > 0);
  }

  const num = Number(raw);
  if (!Number.isNaN(num) && raw.length > 0) return num;

  // Strip quotes
  return raw.replace(/^['"]|['"]$/g, '');
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

const CONFIG_FILENAMES = ['tileguard.yml', 'tileguard.yaml', '.tileguard.yml'];

export interface LoadYamlConfigOptions {
  /** Explicit path to the YAML config file. */
  readonly configPath?: string;
  /** Working directory for auto-discovery. Defaults to process.cwd(). */
  readonly cwd?: string;
}

export interface LoadYamlConfigResult {
  readonly config: TileguardYamlConfig;
  /** Path to the loaded config file, or null if defaults were used. */
  readonly configPath: string | null;
}

/**
 * Load tileguard.yml configuration.
 * Returns defaults if no config file is found (not an error).
 */
export function loadYamlConfig(
  options: LoadYamlConfigOptions = {},
): LoadYamlConfigResult {
  // Explicit path
  if (options.configPath) {
    const abs = resolve(options.configPath);
    if (!existsSync(abs)) {
      throw new Error(`Configuration file not found: ${abs}`);
    }
    const content = readFileSync(abs, 'utf-8');
    return { config: mergeWithDefaults(content), configPath: abs };
  }

  // Auto-discover
  const cwd = options.cwd ?? process.cwd();
  for (const filename of CONFIG_FILENAMES) {
    const candidate = resolve(cwd, filename);
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, 'utf-8');
      return { config: mergeWithDefaults(content), configPath: candidate };
    }
  }

  // No config found — use defaults
  return { config: DEFAULT_CONFIG, configPath: null };
}

function mergeWithDefaults(yamlContent: string): TileguardYamlConfig {
  const parsed = parseSimpleYaml(yamlContent);

  const comparison = parsed.comparison as Record<string, unknown> | undefined;
  const regression = parsed.regression as Record<string, unknown> | undefined;
  const report = parsed.report as Record<string, unknown> | undefined;
  const output = parsed.output as Record<string, unknown> | undefined;

  return {
    comparison: {
      stableProperties: Array.isArray(comparison?.stableProperties)
        ? (comparison.stableProperties as string[])
        : DEFAULT_CONFIG.comparison.stableProperties,
    },
    regression: {
      minConfidence:
        typeof regression?.minConfidence === 'number'
          ? (regression.minConfidence as number)
          : DEFAULT_CONFIG.regression.minConfidence,
    },
    report: {
      format: isReportFormat(report?.format)
        ? report.format
        : DEFAULT_CONFIG.report.format,
    },
    output: {
      directory:
        typeof output?.directory === 'string'
          ? (output.directory as string)
          : DEFAULT_CONFIG.output.directory,
    },
  };
}

function isReportFormat(value: unknown): value is 'markdown' | 'html' | 'json' {
  return value === 'markdown' || value === 'html' || value === 'json';
}

/** Get the default configuration (for use when no file exists). */
export function getDefaultConfig(): TileguardYamlConfig {
  return DEFAULT_CONFIG;
}
