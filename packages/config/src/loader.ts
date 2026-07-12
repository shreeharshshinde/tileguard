/**
 * @tileguard/config — Config File Loader
 *
 * Loads configuration files from disk using the appropriate strategy
 * for each format:
 *
 *   .json       — fs.readFileSync + JSON.parse
 *   .ts/.js/.mjs — jiti (runtime TypeScript/ESM loader)
 *
 * Returns the raw config object and a flag indicating whether the source
 * was JSON, so the validator can enforce JSON-specific constraints (plugins
 * cannot be imported from a .json file).
 *
 * All failure modes are wrapped in ConfigLoadError: execution throws, no
 * default export, non-object default export, JSON parse failure.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { createJiti } from 'jiti';
import { ConfigLoadError } from './errors.js';

/**
 * The raw result of loading a config file before validation.
 */
export interface LoadedConfig {
  /** The raw config object extracted from the file. */
  readonly raw: Record<string, unknown>;

  /** Whether the config was loaded from a .json file. */
  readonly isJson: boolean;
}

/**
 * Module-level jiti instance — created once and reused across loads.
 * `moduleCache: false` prevents stale results when config files are edited
 * and reloaded within the same process (e.g., watch mode).
 * `interopDefault: true` synthesises a default export for CommonJS modules
 * that use `module.exports = { ... }`.
 */
const jiti = createJiti(import.meta.url, {
  moduleCache: false,
  interopDefault: true,
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SUPPORTED_EXTENSIONS = ['.ts', '.js', '.mjs', '.json'];

/**
 * Loads and extracts the raw config object from a config file.
 *
 * @param configPath - Absolute path to the config file.
 * @returns The raw config object and format metadata.
 * @throws {ConfigLoadError} When the file cannot produce a config object.
 */
export async function loadConfigFile(configPath: string): Promise<LoadedConfig> {
  const ext = extname(configPath);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new ConfigLoadError(
      configPath,
      new Error(
        `Unsupported config file extension "${ext}". Expected one of: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      ),
    );
  }

  const isJson = ext === '.json';

  if (isJson) {
    return loadJsonConfig(configPath);
  }

  return loadModuleConfig(configPath);
}

function loadJsonConfig(configPath: string): LoadedConfig {
  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (cause) {
    throw new ConfigLoadError(configPath, cause);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (cause) {
    throw new ConfigLoadError(configPath, cause);
  }

  if (!isPlainObject(parsed)) {
    throw new ConfigLoadError(
      configPath,
      new Error(
        `Expected default export to be a plain object, got ${parsed === null ? 'null' : typeof parsed}`,
      ),
    );
  }

  return { raw: parsed, isJson: true };
}

async function loadModuleConfig(configPath: string): Promise<LoadedConfig> {
  let moduleNamespace: unknown;
  try {
    moduleNamespace = await jiti.import(configPath);
  } catch (cause) {
    throw new ConfigLoadError(configPath, cause);
  }

  // Extract the default export. jiti returns the module namespace object,
  // so we check for a 'default' property explicitly rather than relying
  // on interopDefault — this lets us distinguish "no default export" from
  // "default export is an object" reliably.
  if (!isPlainObject(moduleNamespace) || !('default' in moduleNamespace)) {
    throw new ConfigLoadError(
      configPath,
      new Error('Configuration file has no default export. Add: export default { ... }'),
    );
  }

  const defaultExport = moduleNamespace.default;

  if (!isPlainObject(defaultExport)) {
    throw new ConfigLoadError(
      configPath,
      new Error(
        defaultExport === undefined || defaultExport === null
          ? 'Configuration file has no default export. Add: export default { ... }'
          : `Expected default export to be a plain object, got ${typeof defaultExport}`,
      ),
    );
  }

  return { raw: defaultExport, isJson: false };
}
