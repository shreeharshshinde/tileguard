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
import { runCheck } from './commands/check.js';
import { runInit } from './commands/init.js';
import { runRulesDocs, runRulesExplain, runRulesList } from './commands/rules.js';

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
function present(result: Awaited<ReturnType<typeof runCheck>>): never {
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
  .option('-c, --config <path>', 'Path to config file (auto-discovered if omitted)')
  .option('-r, --reporter <id>', 'Reporter to use: text | json')
  .option('--max-diagnostics <n>', 'Maximum total diagnostics to collect', (v: string) =>
    parseInt(v, 10),
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
  .option('-c, --config <path>', 'Path to config file (auto-discovered if omitted)')
  .option('-f, --format <format>', 'Output format: text | json', 'text')
  .action(async (flags) => {
    const result = await runRulesList(flags);
    present(result);
  });

// Reserved stubs — namespace declared now so --help output is stable (D2).
rules
  .command('explain <ruleId>')
  .description('Print detailed explanation for a rule (coming soon)')
  .action(async (ruleId: string) => {
    const result = await runRulesExplain(ruleId);
    present(result);
  });

rules
  .command('docs <ruleId>')
  .description('Open documentation for a rule (coming soon)')
  .action(async (ruleId: string) => {
    const result = await runRulesDocs(ruleId);
    present(result);
  });

program.parseAsync();
