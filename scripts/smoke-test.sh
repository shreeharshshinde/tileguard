#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# TileGuard Smoke Test
#
# Validates that TileGuard works end-to-end after build/pack.
# Run from the monorepo root after `pnpm build`.
#
# Exit codes:
#   0 — All checks pass
#   1 — One or more checks failed
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} ${name}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} ${name}"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║       TileGuard Smoke Test (v0.5.0-rc.1)       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Build ─────────────────────────────────────────────────────────────────────
echo "Build:"
check "pnpm build succeeds" pnpm build

# ── Tests ─────────────────────────────────────────────────────────────────────
echo ""
echo "Tests:"
check "pnpm test passes" pnpm test

# ── CLI ───────────────────────────────────────────────────────────────────────
echo ""
echo "CLI:"
CLI="node packages/cli/dist/bin.js"
check "tileguard --version" $CLI --version
check "tileguard --help" $CLI --help
check "tileguard doctor" bash -c "$CLI doctor 2>&1 | grep -qi 'checks passed'"
check "tileguard check (valid tile)" $CLI check fixtures/good/valid-tile.pbf
check "tileguard check (valid style)" $CLI check fixtures/good/valid-style.json
check "tileguard stats (tile)" $CLI stats fixtures/real-tiles/tokyo.pbf
check "tileguard style (style)" $CLI style fixtures/good/valid-style.json
check "tileguard rules" bash -c "$CLI rules list 2>&1 | grep -qi 'tile/\|style/'"

# ── Packaging ─────────────────────────────────────────────────────────────────
echo ""
echo "Packaging:"
check "npm pack @tileguard/core" bash -c "cd packages/core && npm pack --dry-run 2>&1 | grep -q 'tileguard-core'"
check "npm pack @tileguard/cli" bash -c "cd packages/cli && npm pack --dry-run 2>&1 | grep -q 'tileguard-cli'"
check "No src/ in core tarball" bash -c "cd packages/core && npm pack --dry-run 2>&1 | grep -v 'src/' | grep -q 'dist/'"
check "No tests/ in cli tarball" bash -c "cd packages/cli && npm pack --dry-run 2>&1 | grep -cv 'tests/'"

# ── Reports ───────────────────────────────────────────────────────────────────
echo ""
echo "Reports:"
check "tileguard compare produces output" bash -c "$CLI compare fixtures/good/valid-tile.pbf fixtures/good/valid-tile.pbf 2>&1 | grep -qi 'identical\\|comparison\\|features'"
check "tileguard report --format markdown" bash -c "$CLI report fixtures/good/valid-tile.pbf fixtures/good/valid-tile.pbf --format markdown 2>&1 | grep -qi 'engineering\\|report\\|summary'"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────"
TOTAL=$((PASS + FAIL))
echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${TOTAL} total"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "  ${RED}SMOKE TEST FAILED${NC}"
  exit 1
else
  echo -e "  ${GREEN}ALL CHECKS PASSED ✓${NC}"
  echo ""
  echo "  TileGuard v0.5.0-rc.1 is ready for release."
  exit 0
fi
