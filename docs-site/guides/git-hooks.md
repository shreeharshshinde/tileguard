# Git Hooks

Automatically validate vector tiles before every commit with `tileguard hook`.
Only changed `.pbf` and `.mvt` files are checked, so it's fast.

## Install the Hook

Run this once from inside your git repository:

```bash
tileguard hook install
```

This writes a `pre-commit` hook into `.git/hooks/pre-commit`. After that, every
`git commit` will automatically run `tileguard check` on staged tile files before
the commit lands.

## How It Works

When you run `git commit`, the hook:

1. Collects all staged `.pbf` and `.mvt` files
2. Runs `tileguard check` on those files only
3. If any `error`-level diagnostics are found, the commit is **blocked**
4. If all checks pass (or no tile files are staged), the commit proceeds

```text
$ git commit -m "update city tiles"

tileguard pre-commit hook — checking 3 staged tile(s)...

✗ tile/vertex-budget
  Layer "roads" has 124,500 vertices (limit: 100,000).
  at tiles/14/8741/5476.pbf → layer: roads

──────────────────────────────────
  1 error in 1 file (42ms)

Commit blocked. Fix the errors above and try again.
```

A clean commit looks like:

```text
$ git commit -m "update city tiles"

tileguard pre-commit hook — checking 3 staged tile(s)...

✓ 3 files passed (89ms)

[main 3a1b2c4] update city tiles
```

## Check Hook Status

```bash
tileguard hook status
```

```text
✓ pre-commit hook installed
  Path: .git/hooks/pre-commit
  Version: tileguard v0.6.0
```

## Remove the Hook

```bash
tileguard hook uninstall
```

Removes the TileGuard hook from `.git/hooks/pre-commit`. If you have other hooks
in that file, TileGuard only removes its own section.

## Config Compatibility

The hook respects your `tileguard.config.ts`. If you have performance rules
enabled as `error` severity, they'll also block commits.

::: tip Skip the hook temporarily
Use `git commit --no-verify` to bypass the hook when needed (e.g. work-in-progress
commits). This is a standard Git mechanism, not specific to TileGuard.
:::

## Team Setup

To share the hook with your team, add it to your project's setup script or
`package.json`:

```json
{
  "scripts": {
    "prepare": "tileguard hook install"
  }
}
```

Running `npm install` (or `pnpm install`) will then automatically install the
hook for every new team member.

::: warning Git repo required
`tileguard hook install` must be run from inside a git repository root.
:::

---

## What Next?

- [**Quick Start →**](/getting-started/quick-start) — run TileGuard manually first
- [**CI / GitHub Actions →**](/guides/ci-github-actions) — enforce the same rules in CI
- [**Configuring Rules →**](/guides/configuring-rules) — control what the hook validates
