/**
 * @tileguard/cli — `rules` command group
 *
 * Implements `rules list` and reserves `rules explain` / `rules docs` as
 * named stubs for a future release.
 *
 * `rules list` reads plugin definitions directly from the loaded config —
 * it does NOT call `createEngine()` or touch the engine's internal rule
 * index. This keeps the command fast (no engine setup) and ensures the
 * output reflects what the user configured, not engine internals.
 *
 * Deliberate v0.5.0 scope limit: `rules list` shows rules as defined in
 * the `plugins` array, before user severity overrides from `config.rules`
 * are applied. A rule configured as `'tile/no-empty': 'off'` still appears
 * in the list. This is documented in the README and in `--help` text.
 *
 * This function is pure with respect to all I/O — it never calls
 * `process.exit()`, and it never writes to stdout or stderr. The rule
 * listing is returned in `result.output`; the informational header is
 * returned in `result.message`. `bin.ts` routes both to the appropriate
 * terminal streams. See Decision D3 and Proposal 2.
 *
 * See Decisions D2 and D6 in the CLI implementation plan.
 */

import { loadConfig } from '@tileguard/config';
import { toUsageResult } from '../exit.js';
import type { CommandResult, RulesListFlags } from '../types.js';

/**
 * Executes `tileguard rules list`.
 *
 * Lists every rule contributed by all configured plugins. Output format is
 * determined by `flags.format`: `'text'` (default) returns the listing in
 * `result.output` for stdout, with an informational header in `result.message`
 * for stderr; `'json'` returns a JSON array in `result.output` with no
 * `result.message` so stderr is silent.
 *
 * Always returns exit code 0 — listing rules cannot itself "fail". Config
 * errors produce exit code 2 via `toUsageResult`.
 *
 * @param flags - Parsed CLI flags.
 * @returns A `CommandResult` with exit code 0 (always) or 2 (config error).
 */
export async function runRulesList(flags: RulesListFlags): Promise<CommandResult> {
  // Load config to discover which plugins are active.
  let config;
  try {
    const loadOptions = flags.config !== undefined ? { configPath: flags.config } : {};
    ({ config } = await loadConfig(loadOptions));
  } catch (err) {
    return toUsageResult(err);
  }

  // Collect all rules from all plugins in declaration order.
  const rules: Array<{
    id: string;
    description: string;
    defaultSeverity: string;
    recommended: boolean;
    plugin: string;
  }> = [];

  for (const plugin of config.plugins ?? []) {
    for (const rule of plugin.rules ?? []) {
      rules.push({
        id: rule.id,
        description: rule.meta.description,
        defaultSeverity: rule.meta.defaultSeverity,
        recommended: rule.meta.recommended ?? false,
        plugin: plugin.id,
      });
    }
  }

  if (flags.format === 'json') {
    // JSON output: returned in result.output — bin.ts writes it to stdout.
    // No result.message so stderr is completely silent (safe for piping to `jq`).
    return {
      exitCode: 0,
      output: JSON.stringify(rules, null, 2) + '\n',
    };
  }

  // Text output: informational header → result.message (→ stderr via bin.ts)
  //              rule listing         → result.output  (→ stdout via bin.ts)
  if (rules.length === 0) {
    return {
      exitCode: 0,
      message: 'No rules found. Ensure plugins are configured in your config file.',
    };
  }

  const lines: string[] = [];
  for (const rule of rules) {
    const badge = rule.recommended ? ' ✓' : '';
    lines.push(
      `  ${rule.id}${badge}\n` +
        `    ${rule.description}\n` +
        `    Default: ${rule.defaultSeverity} | Plugin: ${rule.plugin}\n`,
    );
  }

  return {
    exitCode: 0,
    message: `Found ${rules.length} rule(s):`,
    output: '\n' + lines.join('\n') + '\n',
  };
}

/**
 * Stub for `tileguard rules explain <ruleId>`.
 *
 * Returns a "coming soon" message in `result.message` (→ stderr via bin.ts)
 * and exit code 0. Extracted as a pure function so the explain/docs subcommands
 * follow the same CommandResult pattern as every other command, even as stubs.
 * When this feature ships, the implementation lives here — bin.ts is untouched.
 *
 * @param _ruleId - The rule ID argument (unused until the feature is implemented).
 */
export async function runRulesExplain(_ruleId: string): Promise<CommandResult> {
  return {
    exitCode: 0,
    message: 'tileguard rules explain: coming in a future release.',
  };
}

/**
 * Stub for `tileguard rules docs <ruleId>`.
 *
 * Returns a "coming soon" message in `result.message` (→ stderr via bin.ts)
 * and exit code 0. Same rationale as `runRulesExplain`.
 *
 * @param _ruleId - The rule ID argument (unused until the feature is implemented).
 */
export async function runRulesDocs(_ruleId: string): Promise<CommandResult> {
  return {
    exitCode: 0,
    message: 'tileguard rules docs: coming in a future release.',
  };
}
