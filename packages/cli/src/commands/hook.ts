/**
 * @tileguard/cli — `hook` command
 *
 * Manages a pre-commit git hook that runs `tileguard check` on staged `.pbf`
 * files before each commit — the fastest possible feedback loop.
 *
 * Subcommands:
 *   tileguard hook install   — Add TileGuard block to pre-commit hook
 *   tileguard hook uninstall — Remove TileGuard block from pre-commit hook
 *   tileguard hook status    — Show whether the hook is installed
 *
 * Features:
 *  - Detects Husky (`.husky/` dir) and writes there instead of `.git/hooks/`
 *  - Appends a delimited block to existing hooks; never overwrites them
 *  - Marks hook file executable after install
 *  - Idempotent: double-install detects and reports as already installed
 *
 * Exit codes (install):
 *   0 — hook installed successfully
 *   1 — already installed (idempotent — not an error, but distinct)
 *   2 — no git repository found
 */

import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CliCommandResult } from '../runner/CommandRunner.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOOK_BEGIN_MARKER = '# --- tileguard-hook-begin ---';
const HOOK_END_MARKER = '# --- tileguard-hook-end ---';

const HOOK_SCRIPT_BLOCK = `${HOOK_BEGIN_MARKER}
# TileGuard pre-commit hook (added by \`tileguard hook install\`)
STAGED_TILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\\.pbf$')
if [ -n "$STAGED_TILES" ]; then
  echo "$STAGED_TILES" | xargs tileguard check
fi
${HOOK_END_MARKER}`;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface HookArgs {
  readonly action: 'install' | 'uninstall' | 'status';
}

// ---------------------------------------------------------------------------
// Git root detection
// ---------------------------------------------------------------------------

/**
 * Walk upward from `cwd` to find the nearest directory containing `.git/`.
 * Returns `null` if no git repo is found before reaching the filesystem root.
 */
function findGitRoot(cwd: string): string | null {
  let dir = cwd;
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

// ---------------------------------------------------------------------------
// Hook file path resolution
// ---------------------------------------------------------------------------

/**
 * Determine the pre-commit hook file path.
 *
 * Priority:
 *   1. `.husky/pre-commit` if `.husky/` directory exists at git root
 *   2. `.git/hooks/pre-commit` otherwise
 */
function resolveHookPath(gitRoot: string): { path: string; isHusky: boolean } {
  const huskyDir = join(gitRoot, '.husky');
  if (existsSync(huskyDir)) {
    return { path: join(huskyDir, 'pre-commit'), isHusky: true };
  }
  return { path: join(gitRoot, '.git', 'hooks', 'pre-commit'), isHusky: false };
}

// ---------------------------------------------------------------------------
// Block detection helpers
// ---------------------------------------------------------------------------

function isHookInstalled(content: string): boolean {
  return content.includes(HOOK_BEGIN_MARKER);
}

// ---------------------------------------------------------------------------
// install
// ---------------------------------------------------------------------------

function install(cwd: string): CliCommandResult {
  const gitRoot = findGitRoot(cwd);
  if (gitRoot === null) {
    return {
      exitCode: 2,
      message:
        '✗ No git repository found. Run `git init` first, then retry `tileguard hook install`.',
    };
  }

  const { path: hookPath, isHusky } = resolveHookPath(gitRoot);

  // Ensure hooks directory exists (e.g., fresh clone may not have .git/hooks/)
  const hooksDir = dirname(hookPath);
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  // Read existing hook content (or start with shebang)
  let existing = '';
  if (existsSync(hookPath)) {
    existing = readFileSync(hookPath, 'utf-8');
  }

  // Idempotency check
  if (isHookInstalled(existing)) {
    return {
      exitCode: 1,
      message: `ℹ TileGuard hook is already installed at: ${hookPath}`,
    };
  }

  // Build new content: ensure shebang header, append TileGuard block
  let newContent = existing;
  if (!newContent.startsWith('#!/')) {
    newContent = `#!/bin/sh\n${newContent}`;
  }
  if (!newContent.endsWith('\n')) {
    newContent += '\n';
  }
  newContent += `\n${HOOK_SCRIPT_BLOCK}\n`;

  writeFileSync(hookPath, newContent, 'utf-8');
  // Mark executable (chmod +x)
  chmodSync(hookPath, 0o755);

  const location = isHusky
    ? `${hookPath} (Husky)`
    : hookPath;

  return {
    exitCode: 0,
    message: `✔ TileGuard pre-commit hook installed at: ${location}\n  Staged .pbf files will be checked before each commit.`,
  };
}

// ---------------------------------------------------------------------------
// uninstall
// ---------------------------------------------------------------------------

function uninstall(cwd: string): CliCommandResult {
  const gitRoot = findGitRoot(cwd);
  if (gitRoot === null) {
    return {
      exitCode: 2,
      message: '✗ No git repository found.',
    };
  }

  const { path: hookPath } = resolveHookPath(gitRoot);

  if (!existsSync(hookPath)) {
    return {
      exitCode: 0,
      message: `ℹ No pre-commit hook found at: ${hookPath}`,
    };
  }

  const content = readFileSync(hookPath, 'utf-8');
  if (!isHookInstalled(content)) {
    return {
      exitCode: 0,
      message: `ℹ TileGuard hook is not installed in: ${hookPath}`,
    };
  }

  // Remove the TileGuard block (begin marker through end marker, inclusive)
  const blockRegex = new RegExp(
    `\\n?${escapeRegex(HOOK_BEGIN_MARKER)}[\\s\\S]*?${escapeRegex(HOOK_END_MARKER)}\\n?`,
    'g',
  );
  const cleaned = content.replace(blockRegex, '\n').trimEnd();
  const finalContent = cleaned.length > 0 ? `${cleaned}\n` : '';

  writeFileSync(hookPath, finalContent, 'utf-8');

  return {
    exitCode: 0,
    message: `✔ TileGuard pre-commit hook removed from: ${hookPath}`,
  };
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

function status(cwd: string): CliCommandResult {
  const gitRoot = findGitRoot(cwd);
  if (gitRoot === null) {
    return {
      exitCode: 2,
      message: '✗ No git repository found.',
    };
  }

  const { path: hookPath, isHusky } = resolveHookPath(gitRoot);

  if (!existsSync(hookPath)) {
    return {
      exitCode: 0,
      output: `TileGuard hook status\n${'─'.repeat(40)}\n  Not installed\n  Hook file: ${hookPath} (does not exist)\n`,
    };
  }

  const content = readFileSync(hookPath, 'utf-8');
  const installed = isHookInstalled(content);
  const type = isHusky ? 'Husky' : 'Git';

  return {
    exitCode: 0,
    output:
      `TileGuard hook status\n${'─'.repeat(40)}\n` +
      `  Status: ${installed ? '✔ Installed' : '✗ Not installed'}\n` +
      `  Type:   ${type}\n` +
      `  File:   ${hookPath}\n`,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export async function runHook(
  args: HookArgs,
  ctx: { cwd: string },
): Promise<CliCommandResult> {
  switch (args.action) {
    case 'install':
      return install(ctx.cwd);
    case 'uninstall':
      return uninstall(ctx.cwd);
    case 'status':
      return status(ctx.cwd);
    default: {
      const exhaustive: never = args.action;
      return {
        exitCode: 1,
        message: `Unknown hook action: "${exhaustive as string}". Use install, uninstall, or status.`,
      };
    }
  }
}
