#!/usr/bin/env node
/**
 * @tileguard/cli — Binary entry point
 *
 * This is the ONLY file in the entire package that calls `process.exit()` and
 * the ONLY file responsible for writing command output to the terminal streams.
 * All command logic lives in pure functions that return `CommandResult` objects;
 * this file reads those fields and acts on them.
 *
 * Responsibilities:
 *   - Declare all commands and flags via commander.
 *   - Parse `process.argv`.
 *   - Await the appropriate command function.
 *   - Write `result.message` to stderr (if present).
 *   - Write `result.output` to stdout (if present).
 *   - Call `process.exit(result.exitCode)`.
 *
 * Nothing else. Any logic that belongs to a command belongs in
 * `src/commands/`, not here.
 *
 * See Decision D3 in the CLI implementation plan.
 */

import { Command } from 'commander';
import { runAnalyze } from './commands/analyze.js';
import { runCheck } from './commands/check.js';
import { runCompare } from './commands/compare.js';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runReport } from './commands/report.js';
import {
  runRulesDocs,
  runRulesExplain,
  runRulesList,
} from './commands/rules.js';
import { runStats } from './commands/stats.js';
import { runStyle } from './commands/style.js';
import { runVersion } from './commands/version.js';
import { loadYamlConfig } from './config/ConfigLoader.js';
import type { LogLevel } from './logging/Logger.js';
import { createLogger } from './logging/Logger.js';
import type { CommandContext } from './runner/CommandRunner.js';
import { runCommand } from './runner/CommandRunner.js';

/**
 * Presents the result of any command to the terminal, then exits the process.
 *
 * Stream routing:
 *   result.message → stderr  (error descriptions, success notices, status lines)
 *   result.output  → stdout  (primary data payload: rule listings, etc.)
 *
 * This is the single location in the package where streams are written to and
 * where `process.exit` is called.
 */
function present(result: {
  exitCode: number;
  message?: string;
  output?: string;
}): never {
  if (result.message !== undefined) {
    process.stderr.write(`${result.message}\n`);
  }
  if (result.output !== undefined) {
    process.stdout.write(result.output);
  }
  process.exit(result.exitCode);
}

const program = new Command();

program
  .name('tileguard')
  .description('Quality analysis framework for geospatial artifacts')
  .version('0.5.0');

// ── check ─────────────────────────────────────────────────────────────────
program
  .command('check')
  .description('Validate geospatial artifacts against configured rules')
  .argument('<sources...>', 'Files, directories, globs, or "." to validate')
  .option(
    '-c, --config <path>',
    'Path to config file (auto-discovered if omitted)',
  )
  .option('-r, --reporter <id>', 'Reporter to use: text | json')
  .option(
    '--max-diagnostics <n>',
    'Maximum total diagnostics to collect',
    (v: string) => parseInt(v, 10),
  )
  .action(async (sources: string[], flags) => {
    const result = await runCheck(sources, flags);
    present(result);
  });

// ── init ──────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Create a starter tileguard.config.ts in the current directory')
  .option('--force', 'Overwrite an existing config file')
  .action(async (flags) => {
    const result = await runInit(flags);
    present(result);
  });

// ── rules (command group) ─────────────────────────────────────────────────
const rules = program.command('rules').description('Inspect configured rules');

rules
  .command('list')
  .description(
    'List all rules from configured plugins ' +
      "(shows default severities as declared by plugins, not your config's overrides)",
  )
  .option(
    '-c, --config <path>',
    'Path to config file (auto-discovered if omitted)',
  )
  .option('-f, --format <format>', 'Output format: text | json', 'text')
  .action(async (flags) => {
    const result = await runRulesList(flags);
    present(result);
  });

// Reserved stubs — namespace declared now so --help output is stable (D2).
rules
  .command('explain <ruleId>')
  .description('Print detailed explanation for a rule')
  .action(async (ruleId: string) => {
    const result = await runRulesExplain(ruleId);
    present(result);
  });

rules
  .command('docs <ruleId>')
  .description('Open documentation for a rule in the browser')
  .action(async (ruleId: string) => {
    const result = await runRulesDocs(ruleId);
    present(result);
  });

// ── Shared context builder ────────────────────────────────────────────────
function buildContext(flags: {
  verbose?: boolean;
  debug?: boolean;
  quiet?: boolean;
  config?: string;
}): CommandContext {
  const level: LogLevel = flags.debug
    ? 'debug'
    : flags.verbose
      ? 'verbose'
      : flags.quiet
        ? 'quiet'
        : 'normal';
  const logger = createLogger({ level });
  const { config } = loadYamlConfig(
    flags.config ? { configPath: flags.config } : {},
  );
  return { logger, config, cwd: process.cwd() };
}

// ── compare ───────────────────────────────────────────────────────────────
program
  .command('compare')
  .description('Compare two vector tiles and report structural differences')
  .argument('<before>', 'Path to the baseline tile')
  .argument('<after>', 'Path to the updated tile')
  .option('--json', 'Output as JSON')
  .option('-o, --output <path>', 'Write output to file')
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug output')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-c, --config <path>', 'Path to tileguard.yml')
  .action(async (before: string, after: string, flags) => {
    const ctx = buildContext(flags);
    const result = await runCommand({
      name: 'compare',
      args: {
        before,
        after,
        format: flags.json ? 'json' : 'text',
        output: flags.output,
      },
      ctx,
      fn: runCompare,
    });
    present(result);
  });

// ── analyze ───────────────────────────────────────────────────────────────
program
  .command('analyze')
  .description('Run full analysis: comparison + regression investigation')
  .argument('<before>', 'Path to the baseline tile')
  .argument('<after>', 'Path to the updated tile')
  .option('--json', 'Output as JSON')
  .option('-o, --output <path>', 'Write output to file')
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug output')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-c, --config <path>', 'Path to tileguard.yml')
  .action(async (before: string, after: string, flags) => {
    const ctx = buildContext(flags);
    const result = await runCommand({
      name: 'analyze',
      args: {
        before,
        after,
        format: flags.json ? 'json' : 'text',
        output: flags.output,
      },
      ctx,
      fn: runAnalyze,
    });
    present(result);
  });

// ── report ────────────────────────────────────────────────────────────────
program
  .command('report')
  .description('Generate an engineering report (Markdown / HTML / JSON)')
  .argument('<before>', 'Path to the baseline tile')
  .argument('<after>', 'Path to the updated tile')
  .option(
    '-f, --format <format>',
    'Report format: markdown | html | json',
    'markdown',
  )
  .option('-o, --output <path>', 'Write report to file')
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug output')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-c, --config <path>', 'Path to tileguard.yml')
  .action(async (before: string, after: string, flags) => {
    const ctx = buildContext(flags);
    const result = await runCommand({
      name: 'report',
      args: {
        before,
        after,
        format: flags.format ?? 'markdown',
        output: flags.output,
      },
      ctx,
      fn: runReport,
    });
    present(result);
  });

// ── stats ─────────────────────────────────────────────────────────────────
program
  .command('stats')
  .description('Display tile statistics: layers, geometry, diagnostics')
  .argument('<file>', 'Path to a vector tile')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug output')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-c, --config <path>', 'Path to tileguard.yml')
  .action(async (file: string, flags) => {
    const ctx = buildContext(flags);
    const result = await runCommand({
      name: 'stats',
      args: { file, format: flags.json ? 'json' : 'text' },
      ctx,
      fn: runStats,
    });
    present(result);
  });

// ── doctor ────────────────────────────────────────────────────────────────
program
  .command('doctor')
  .description(
    'Health check: verify configuration, rules, parser, and reporters',
  )
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug output')
  .option('-c, --config <path>', 'Path to tileguard.yml')
  .action(async (flags) => {
    const ctx = buildContext(flags);
    const result = await runCommand({
      name: 'doctor',
      args: {},
      ctx,
      fn: runDoctor,
    });
    present(result);
  });

// ── style ─────────────────────────────────────────────────────────────────
program
  .command('style')
  .description(
    'Analyze a MapLibre style specification: parse, validate, report',
  )
  .argument('<file>', 'Path to a style.json file')
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--debug', 'Debug output')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-c, --config <path>', 'Path to tileguard.yml')
  .action(async (file: string, flags) => {
    const ctx = buildContext(flags);
    const result = await runCommand({
      name: 'style',
      args: { file, format: flags.json ? 'json' : 'text' },
      ctx,
      fn: runStyle,
    });
    present(result);
  });

// ── version (extended) ────────────────────────────────────────────────────
program
  .command('ver')
  .description('Display detailed version information')
  .option('--json', 'Output as JSON')
  .action((flags) => {
    const result = runVersion({ format: flags.json ? 'json' : 'text' });
    present(result);
  });

program.parseAsync();
