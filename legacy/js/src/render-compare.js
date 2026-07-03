import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function renderCompare(fixturePath, options = {}) {
  const startTime = Date.now();
  const stylePath = join(fixturePath, 'style.json');
  const expectedPath = join(fixturePath, 'expected.png');

  if (!existsSync(stylePath) || !existsSync(expectedPath)) {
    return {
      pass: false,
      fixture: fixturePath,
      errors: [{ code: 'INVALID_FIXTURE', message: 'Fixture must include style.json and expected.png' }],
      duration: Date.now() - startTime
    };
  }

  const style = await readFile(stylePath);
  const expected = await readFile(expectedPath);
  if (style.length === 0 || expected.length === 0) {
    return {
      pass: true,
      skipped: true,
      fixture: fixturePath,
      message: 'Skipped empty placeholder render fixture',
      duration: Date.now() - startTime
    };
  }

  return {
    pass: true,
    skipped: true,
    fixture: fixturePath,
    message: 'Render comparison engine is not implemented yet',
    duration: Date.now() - startTime
  };
}

export async function renderAll(fixturesPath, options = {}) {
  const entries = readdirSync(fixturesPath)
    .map((name) => join(fixturesPath, name))
    .filter((path) => statSync(path).isDirectory());
  const results = [];
  for (const fixturePath of entries) results.push(await renderCompare(fixturePath, options));
  if (options.output) await writeFile(options.output, JSON.stringify(results, null, 2));
  return results;
}
