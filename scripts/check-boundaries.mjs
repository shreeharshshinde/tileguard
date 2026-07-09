import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The allowed dependency graph, straight from CORE_CONTRACTS.md Section 2.
const ALLOWED = {
  '@tileguard/core': [],
  '@tileguard/shared': ['@tileguard/core'],
  '@tileguard/reporters': ['@tileguard/core'],
  '@tileguard/tile-rules': ['@tileguard/core', '@tileguard/shared'],
  '@tileguard/style-rules': ['@tileguard/core', '@tileguard/shared'],
  tileguard: [
    '@tileguard/core',
    '@tileguard/shared',
    '@tileguard/reporters',
    '@tileguard/tile-rules',
    '@tileguard/style-rules',
  ],
};

const violations = [];

for (const dir of readdirSync('packages')) {
  const pkgPath = join('packages', dir, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    continue; // no package.json in this dir, skip
  }

  const name = pkg.name;
  if (!(name in ALLOWED)) continue; // unknown package, skip (or fail — your call)

  const deps = {
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.devDependencies,
  };

  for (const dep of Object.keys(deps)) {
    if (!dep.startsWith('@tileguard/') && dep !== 'tileguard') continue;
    if (!ALLOWED[name].includes(dep)) {
      violations.push(`${name} declares forbidden dependency on ${dep}`);
    }
  }
}

if (violations.length > 0) {
  console.error('❌ Dependency boundary violations found:\n');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log('✓ All package dependencies respect the allowed graph.');
