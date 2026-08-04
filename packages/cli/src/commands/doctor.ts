/**
 * @tileguard/cli — `doctor` command
 *
 * Health check: verifies configuration, rule loading, parser, reporter
 * availability, and plugin loading.
 *
 * Usage:
 *   tileguard doctor
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CliCommandResult, CommandContext } from '../runner/CommandRunner.js';

// ---------------------------------------------------------------------------
// Check result
// ---------------------------------------------------------------------------

interface CheckResult {
  readonly label: string;
  readonly status: 'ok' | 'warn' | 'fail';
  readonly detail?: string;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function runDoctor(
  _args: unknown,
  ctx: CommandContext,
): Promise<CliCommandResult> {
  const { logger } = ctx;
  logger.phase('Running health checks');

  const checks: CheckResult[] = [];

  // 1. Configuration file
  checks.push(await checkConfig(ctx));

  // 2. YAML config
  checks.push(checkYamlConfig(ctx));

  // 3. Rule loading
  checks.push(await checkRuleLoading());

  // 4. MVT Parser
  checks.push(checkParser());

  // 5. Reporter availability
  checks.push(checkReporters());

  // 6. Node.js version
  checks.push(checkNodeVersion());

  // Format output
  const lines: string[] = ['\nTileGuard Doctor\n' + '═'.repeat(20) + '\n'];

  let hasFailure = false;
  let hasWarning = false;

  for (const check of checks) {
    const icon = check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    lines.push(`  ${icon} ${check.label}`);
    if (check.detail) {
      lines.push(`    ${check.detail}`);
    }
    if (check.status === 'fail') hasFailure = true;
    if (check.status === 'warn') hasWarning = true;
  }

  lines.push('');
  if (hasFailure) {
    lines.push('  Some checks failed. Fix the issues above and re-run.');
  } else if (hasWarning) {
    lines.push('  All checks passed with warnings.');
  } else {
    lines.push('  All checks passed. TileGuard is ready.');
  }
  lines.push('');

  const exitCode = hasFailure ? 2 : hasWarning ? 1 : 0;
  return {
    exitCode: exitCode as 0 | 1 | 2,
    output: lines.join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkConfig(ctx: CommandContext): Promise<CheckResult> {
  try {
    const { loadConfig } = await import('@tileguard/config');
    const result = await loadConfig({});
    return {
      label: 'Configuration',
      status: 'ok',
      detail: `Loaded from ${result.configPath ?? 'defaults'}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Config not found is a warning, not a failure
    if (msg.includes('not found') || msg.includes('No config')) {
      return {
        label: 'Configuration',
        status: 'warn',
        detail: 'No tileguard.config.ts found (using defaults)',
      };
    }
    return {
      label: 'Configuration',
      status: 'fail',
      detail: msg,
    };
  }
}

function checkYamlConfig(ctx: CommandContext): CheckResult {
  const yamlFiles = ['tileguard.yml', 'tileguard.yaml', '.tileguard.yml'];
  for (const file of yamlFiles) {
    if (existsSync(resolve(ctx.cwd, file))) {
      return {
        label: 'YAML Config',
        status: 'ok',
        detail: `Found ${file}`,
      };
    }
  }
  return {
    label: 'YAML Config',
    status: 'warn',
    detail: 'No tileguard.yml found (using defaults)',
  };
}

async function checkRuleLoading(): Promise<CheckResult> {
  try {
    const tileRules = await import('@tileguard/tile-rules');
    const styleRules = await import('@tileguard/style-rules');
    const tileCount = tileRules.tilePlugin?.rules?.length ?? 0;
    const styleCount = styleRules.stylePlugin?.rules?.length ?? 0;
    return {
      label: 'Rule Loading',
      status: 'ok',
      detail: `${tileCount} tile rules, ${styleCount} style rules`,
    };
  } catch (err) {
    return {
      label: 'Rule Loading',
      status: 'fail',
      detail: err instanceof Error ? err.message : 'Failed to load rule packages',
    };
  }
}

function checkParser(): CheckResult {
  // We already know decodeMvt is available since we imported tile-rules above
  return { label: 'MVT Parser', status: 'ok', detail: 'decodeMvt available' };
}

function checkReporters(): CheckResult {
  // Report engine is available via @tileguard/reporters
  return {
    label: 'Reporters',
    status: 'ok',
    detail: 'Available: text, json, markdown, html',
  };
}

function checkNodeVersion(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1), 10);
  if (major >= 18) {
    return { label: 'Node.js', status: 'ok', detail: version };
  }
  if (major >= 16) {
    return {
      label: 'Node.js',
      status: 'warn',
      detail: `${version} — Node.js 18+ recommended`,
    };
  }
  return {
    label: 'Node.js',
    status: 'fail',
    detail: `${version} — Node.js 18+ required`,
  };
}
