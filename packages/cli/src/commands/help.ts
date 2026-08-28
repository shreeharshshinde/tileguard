/**
 * @tileguard/cli — `help` command
 *
 * Displays a comprehensive, well-formatted overview of all TileGuard CLI
 * commands, grouped by category. Inspired by `cargo`, `gh`, and `docker`.
 */

const HELP_TEXT = `
\x1b[1mTileGuard\x1b[0m — Automated quality gates for geospatial software.

\x1b[1mUSAGE\x1b[0m
  tileguard <command> [options]

\x1b[1mVALIDATION\x1b[0m
  check <sources...>          Validate tiles/styles against configured rules
  style <file>                Analyze a MapLibre style specification
  rules list                  List all available rules
  rules explain <ruleId>      Show detailed explanation for a rule

\x1b[1mANALYSIS\x1b[0m
  compare <before> <after>    Compare two vector tiles (structural diff)
  analyze <before> <after>    Full analysis: comparison + regression detection
  report <before> <after>     Generate an engineering report (MD/HTML/JSON)
  stats <file>                Display tile statistics (layers, geometry, counts)

\x1b[1mSETUP & DIAGNOSTICS\x1b[0m
  init                        Scaffold a tileguard.config.ts in your project
  doctor                      Health check: config, rules, parser, reporters
  ver                         Display version information

\x1b[1mGLOBAL OPTIONS\x1b[0m
  -c, --config <path>         Path to config file (auto-discovered if omitted)
  -v, --verbose               Verbose output
  --debug                     Debug-level output
  -q, --quiet                 Suppress progress output
  --json                      Machine-readable JSON output (where supported)
  -h, --help                  Show help for any command
  -V, --version               Show version number

\x1b[1mEXAMPLES\x1b[0m
  \x1b[2m# Validate a vector tile\x1b[0m
  tileguard check ./tile.pbf

  \x1b[2m# Lint a MapLibre style\x1b[0m
  tileguard check ./style.json

  \x1b[2m# Compare two tile versions with JSON output\x1b[0m
  tileguard compare ./v1.pbf ./v2.pbf --json

  \x1b[2m# Generate a Markdown report\x1b[0m
  tileguard report ./v1.pbf ./v2.pbf --format markdown

  \x1b[2m# Check everything in CI\x1b[0m
  tileguard check ./tiles/ ./styles/ --reporter json

\x1b[1mDOCUMENTATION\x1b[0m
  https://docs-tileguard.vercel.app/

\x1b[1mSOURCE\x1b[0m
  https://github.com/shreeharshshinde/tileguard
`;

export function runHelp(command?: string): {
  exitCode: number;
  message?: string;
  output?: string;
} {
  if (command) {
    // Delegate to Commander's built-in per-command help
    return {
      exitCode: 0,
      message: `Run \`tileguard ${command} --help\` for detailed usage.`,
    };
  }

  return {
    exitCode: 0,
    output: HELP_TEXT.trimStart(),
  };
}
