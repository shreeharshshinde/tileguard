#!/usr/bin/env bash
#
# scripts/check-rule-tests.sh
#
# Enforces the rule from IMPLEMENTATION_GUIDELINES.md, Section 6
# ("Coverage Expectations") and the CI gate documented in Section 18
# ("Missing Test File Detection"):
#
#   Every file in packages/{tile-rules,style-rules}/src/rules/*.ts
#   must have a corresponding test file at
#   packages/{same}/tests/rules/{same-name}.test.ts
#
# A rule shipped without a test is not "done" per the project's own
# Definition of Done (IMPLEMENTATION_GUIDELINES.md, Section 16).
#
# Usage: bash scripts/check-rule-tests.sh
# Exit code: 0 if every rule has a test, 1 if any is missing.

set -euo pipefail

RULE_PACKAGES=("tile-rules" "style-rules")
missing=0
checked=0

for pkg in "${RULE_PACKAGES[@]}"; do
  rules_dir="packages/${pkg}/src/rules"
  tests_dir="packages/${pkg}/tests/rules"

  if [[ ! -d "$rules_dir" ]]; then
    echo "ℹ️  ${rules_dir} does not exist yet — skipping ${pkg}."
    continue
  fi

  for rule_file in "$rules_dir"/*.ts; do
    # Handle the case where the glob matches nothing (empty rules dir)
    [[ -e "$rule_file" ]] || continue

    rule_name=$(basename "$rule_file" .ts)
    test_file="${tests_dir}/${rule_name}.test.ts"
    checked=$((checked + 1))

    if [[ ! -f "$test_file" ]]; then
      echo "❌ MISSING TEST: expected ${test_file} for rule ${rules_dir}/${rule_name}.ts"
      missing=$((missing + 1))
    fi
  done
done

echo ""
if [[ "$missing" -gt 0 ]]; then
  echo "❌ ${missing} rule(s) are missing a test file (checked ${checked} total)."
  echo "See IMPLEMENTATION_GUIDELINES.md, Section 16 — a rule is not done without tests."
  exit 1
fi

echo "✓ All ${checked} rule file(s) have a matching test file."
exit 0
