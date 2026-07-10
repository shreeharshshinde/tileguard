/**
 * @tileguard/core — Engine Unit Tests
 *
 * Tests the core engine pipeline using mock rules, mock providers, and a
 * mock reporter. No real geospatial logic or file I/O is involved.
 *
 * Test coverage:
 *   - Happy path: provider loads artifact, rule runs, diagnostics collected
 *   - No-provider case: artifact/no-provider diagnostic emitted
 *   - Load-failure case: artifact/load-failed diagnostic emitted
 *   - Rule crash: engine/rule-error diagnostic emitted, run continues
 *   - Multiple artifacts: each gets its own rule execution
 *   - Disabled rules ('off'): not executed
 *   - Non-recommended rules default to 'off'
 *   - Severity override via user config
 *   - Options forwarded to rule context
 *   - Diagnostic sorting: source → severity → ruleId → location
 *   - Reporter invoked with correct context
 *   - RunSummary counts (errors, warnings, infos, pass)
 *   - Async rules: Promise-returning create() is awaited
 *   - Duplicate plugin rule IDs throw at createEngine() time
 *   - maxDiagnostics cap: truncation diagnostic added
 *   - Reporter crash does not affect RunResult
 */

import { describe, expect, it } from 'vitest';
import type { Artifact, ArtifactProvider } from '../src/artifact.js';
import type { Diagnostic } from '../src/diagnostic.js';
import { createEngine } from '../src/engine.js';
import type { Plugin } from '../src/plugin.js';
import type { Reporter, ReporterContext } from '../src/reporter.js';
import type { Rule } from '../src/rule.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Creates a minimal in-memory artifact for a given type and content. */
function makeArtifact<C>(type: string, source: string, content: C): Artifact<string, C> {
  return {
    type,
    ref: { type, source },
    content,
  };
}

/** A provider that always handles sources matching a prefix. */
function makeProvider(
  id: string,
  artifactType: string,
  content: unknown = {},
  prefix = 'mock://',
): ArtifactProvider {
  return {
    id,
    artifactTypes: [artifactType],
    canHandle: (source) => source.startsWith(prefix),
    load: async (source) => makeArtifact(artifactType, source, content),
  };
}

/** A provider whose load() always rejects, handling sources matching a prefix. */
function makeFailingProvider(
  id: string,
  artifactType: string,
  prefix = 'bad://',
): ArtifactProvider {
  return {
    id,
    artifactTypes: [artifactType],
    canHandle: (source) => source.startsWith(prefix),
    load: async (_source) => {
      throw new Error('Simulated load failure');
    },
  };
}

/** A rule that always reports one diagnostic with the given message. */
function makeAlwaysFailRule(id: string, artifactType: string, message: string): Rule {
  return {
    id,
    meta: {
      description: `Test rule: ${id}`,
      defaultSeverity: 'error',
      recommended: true,
    },
    artifactTypes: [artifactType],
    create(context) {
      context.report({ message });
    },
  };
}

/** A rule that never reports any diagnostics. */
function makePassRule(id: string, artifactType: string): Rule {
  return {
    id,
    meta: {
      description: `Always-pass rule: ${id}`,
      defaultSeverity: 'error',
      recommended: true,
    },
    artifactTypes: [artifactType],
    create(_context) {
      // intentionally empty
    },
  };
}

/** A rule whose create() throws an unexpected exception. */
function makeCrashingRule(id: string, artifactType: string): Rule {
  return {
    id,
    meta: {
      description: `Crashing rule: ${id}`,
      defaultSeverity: 'error',
      recommended: true,
    },
    artifactTypes: [artifactType],
    create(_context) {
      throw new Error('Simulated rule crash');
    },
  };
}

/** A rule that is async and resolves after a microtask. */
function makeAsyncRule(id: string, artifactType: string, message: string): Rule {
  return {
    id,
    meta: {
      description: `Async rule: ${id}`,
      defaultSeverity: 'warning',
      recommended: true,
    },
    artifactTypes: [artifactType],
    async create(context) {
      await Promise.resolve();
      context.report({ message });
    },
  };
}

/** A rule that reads its options and reports them in the message. */
function makeOptionsRule(id: string, artifactType: string): Rule<{ label: string }> {
  return {
    id,
    meta: {
      description: `Options rule: ${id}`,
      defaultSeverity: 'error',
      recommended: true,
    },
    artifactTypes: [artifactType],
    create(context) {
      const label = context.options?.label ?? '(no options)';
      context.report({ message: `label is: ${label}` });
    },
  };
}

/** A reporter that captures calls for assertion. */
function makeMockReporter(): {
  reporter: Reporter;
  calls: Array<{
    diagnostics: readonly Diagnostic[];
    context: ReporterContext;
  }>;
} {
  const calls: Array<{
    diagnostics: readonly Diagnostic[];
    context: ReporterContext;
  }> = [];

  const reporter: Reporter = {
    id: 'mock',
    report(diagnostics, context) {
      calls.push({ diagnostics, context });
    },
  };

  return { reporter, calls };
}

/** Builds a minimal plugin with one provider and one rule. */
function makePlugin(id: string, provider: ArtifactProvider, rules: Rule[]): Plugin {
  return { id, providers: [provider], rules };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createEngine', () => {
  it('throws synchronously if two plugins register the same rule ID', () => {
    const ruleA = makeAlwaysFailRule('mock/duplicate', 'MockArtifact', 'from A');
    const ruleB = makeAlwaysFailRule('mock/duplicate', 'MockArtifact', 'from B');
    const provider = makeProvider('p', 'MockArtifact');

    expect(() =>
      createEngine({
        plugins: [
          { id: 'plugin-a', providers: [provider], rules: [ruleA] },
          { id: 'plugin-b', rules: [ruleB] },
        ],
      }),
    ).toThrow(/Duplicate rule ID "mock\/duplicate"/);
  });
});

describe('engine.run', () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns an empty diagnostic list and pass=true when all rules pass', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makePassRule('mock/pass', 'MockArtifact');
    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
    });

    const result = await engine.run(['mock://tile.pbf']);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.summary.pass).toBe(true);
    expect(result.summary.errors).toBe(0);
    expect(result.summary.sourceCount).toBe(1);
    expect(result.summary.artifactCount).toBe(1);
    expect(result.summary.ruleExecutions).toBe(1);
  });

  it('collects diagnostics and sets pass=false when a rule reports an error', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAlwaysFailRule('mock/fail', 'MockArtifact', 'Something is wrong');
    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
    });

    const result = await engine.run(['mock://tile.pbf']);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('mock/fail');
    expect(result.diagnostics[0]?.message).toBe('Something is wrong');
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.summary.pass).toBe(false);
    expect(result.summary.errors).toBe(1);
  });

  // ── No-provider ───────────────────────────────────────────────────────────

  it('emits artifact/no-provider when no provider handles the source', async () => {
    const engine = createEngine({ plugins: [] });

    const result = await engine.run(['unknown://something.xyz']);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('artifact/no-provider');
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.summary.artifactCount).toBe(0);
    expect(result.summary.pass).toBe(false);
  });

  // ── Load failure ──────────────────────────────────────────────────────────

  it('emits artifact/load-failed and continues when provider.load() throws', async () => {
    const failingProvider = makeFailingProvider('fail-p', 'MockArtifact', 'bad://');
    const passingProvider = makeProvider('pass-p', 'MockArtifact', {}, 'good://');
    const rule = makePassRule('mock/pass', 'MockArtifact');

    const engine = createEngine({
      plugins: [
        { id: 'p1', providers: [failingProvider], rules: [] },
        { id: 'p2', providers: [passingProvider], rules: [rule] },
      ],
    });

    const result = await engine.run(['bad://will-fail', 'good://will-pass']);

    // One load-failed diagnostic for the bad source
    const loadFailed = result.diagnostics.filter((d) => d.ruleId === 'artifact/load-failed');
    expect(loadFailed).toHaveLength(1);
    expect(loadFailed[0]?.message).toContain('Simulated load failure');

    // The good source was still processed
    expect(result.summary.artifactCount).toBe(1);
    expect(result.summary.sourceCount).toBe(2);
  });

  // ── Rule crash ────────────────────────────────────────────────────────────

  it('emits engine/rule-error when a rule throws, and continues other rules', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const crashRule = makeCrashingRule('mock/crash', 'MockArtifact');
    const passRule = makePassRule('mock/pass', 'MockArtifact');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [crashRule, passRule])],
    });

    const result = await engine.run(['mock://tile.pbf']);

    const ruleErrors = result.diagnostics.filter((d) => d.ruleId === 'engine/rule-error');
    expect(ruleErrors).toHaveLength(1);
    expect(ruleErrors[0]?.message).toContain('mock/crash');
    expect(ruleErrors[0]?.message).toContain('Simulated rule crash');

    // Summary counts an error from the rule crash diagnostic
    expect(result.summary.errors).toBeGreaterThanOrEqual(1);
    // Both rules were attempted (rule executions = 2, even though crash happened)
    expect(result.summary.ruleExecutions).toBe(2);
  });

  // ── Rule disabled ─────────────────────────────────────────────────────────

  it('skips a rule configured as "off"', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAlwaysFailRule('mock/fail', 'MockArtifact', 'Should not appear');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      rules: { 'mock/fail': 'off' },
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.summary.pass).toBe(true);
  });

  // ── Non-recommended rules default to 'off' ────────────────────────────────

  it('does not run non-recommended rules unless explicitly configured', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const nonRecommendedRule: Rule = {
      id: 'mock/optional',
      meta: {
        description: 'Optional rule',
        defaultSeverity: 'warning',
        recommended: false, // <-- not recommended
      },
      artifactTypes: ['MockArtifact'],
      create(context) {
        context.report({ message: 'Optional finding' });
      },
    };

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [nonRecommendedRule])],
    });

    const result = await engine.run(['mock://tile.pbf']);
    // Should not have run because recommended is false and no user override
    expect(result.diagnostics).toHaveLength(0);
  });

  it('runs a non-recommended rule when explicitly configured', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const nonRecommendedRule: Rule = {
      id: 'mock/optional',
      meta: {
        description: 'Optional rule',
        defaultSeverity: 'warning',
        recommended: false,
      },
      artifactTypes: ['MockArtifact'],
      create(context) {
        context.report({ message: 'Optional finding' });
      },
    };

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [nonRecommendedRule])],
      rules: { 'mock/optional': 'warning' },
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('mock/optional');
  });

  // ── Severity override ─────────────────────────────────────────────────────

  it('uses the user-configured severity, overriding the rule default', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAlwaysFailRule('mock/fail', 'MockArtifact', 'Downgraded');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      rules: { 'mock/fail': 'warning' }, // override from 'error'
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.diagnostics[0]?.severity).toBe('warning');
    expect(result.summary.errors).toBe(0);
    expect(result.summary.warnings).toBe(1);
    expect(result.summary.pass).toBe(true); // warnings don't fail the run
  });

  // ── Options forwarding ────────────────────────────────────────────────────

  it('forwards user options to the rule context', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeOptionsRule('mock/opts', 'MockArtifact');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      rules: { 'mock/opts': ['error', { label: 'hello-from-config' }] },
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.diagnostics[0]?.message).toBe('label is: hello-from-config');
  });

  // ── Path-specific overrides ───────────────────────────────────────────────

  it('applies path overrides only to matching sources', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAlwaysFailRule('mock/fail', 'MockArtifact', 'Finding');
    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      overrides: [
        {
          files: ['mock://fixtures/**'],
          rules: { 'mock/fail': 'off' },
        },
      ],
    });

    const result = await engine.run([
      'mock://fixtures/ignored.pbf',
      'mock://production/checked.pbf',
    ]);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.artifact.source).toBe('mock://production/checked.pbf');
    expect(result.summary.ruleExecutions).toBe(1);
  });

  it('applies later matching overrides last, including rule options', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeOptionsRule('mock/opts', 'MockArtifact');
    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      overrides: [
        {
          files: ['mock://fixtures/**'],
          rules: { 'mock/opts': ['warning', { label: 'first' }] },
        },
        {
          files: ['mock://fixtures/**/*.pbf'],
          rules: { 'mock/opts': ['info', { label: 'later' }] },
        },
      ],
    });

    const result = await engine.run(['mock://fixtures/tile.pbf']);

    expect(result.diagnostics[0]?.severity).toBe('info');
    expect(result.diagnostics[0]?.message).toBe('label is: later');
  });

  it('can enable a non-recommended rule for matching sources', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule: Rule = {
      id: 'mock/optional-override',
      meta: {
        description: 'Optional rule',
        defaultSeverity: 'warning',
        recommended: false,
      },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        ctx.report({ message: 'Enabled by override' });
      },
    };
    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      overrides: [
        {
          files: ['mock://experimental/**'],
          rules: { 'mock/optional-override': 'error' },
        },
      ],
    });

    const result = await engine.run(['mock://stable/tile.pbf', 'mock://experimental/tile.pbf']);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.diagnostics[0]?.artifact.source).toBe('mock://experimental/tile.pbf');
  });

  // ── Async rules ───────────────────────────────────────────────────────────

  it('awaits async rule create() before collecting diagnostics', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAsyncRule('mock/async', 'MockArtifact', 'Async finding');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toBe('Async finding');
    expect(result.diagnostics[0]?.severity).toBe('warning');
  });

  // ── Multiple artifacts ────────────────────────────────────────────────────

  it('runs rules against each artifact independently', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAlwaysFailRule('mock/fail', 'MockArtifact', 'Found an issue');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
    });

    const result = await engine.run([
      'mock://tile-a.pbf',
      'mock://tile-b.pbf',
      'mock://tile-c.pbf',
    ]);

    expect(result.diagnostics).toHaveLength(3);
    expect(result.summary.artifactCount).toBe(3);
    expect(result.summary.ruleExecutions).toBe(3);
    expect(result.summary.errors).toBe(3);
  });

  // ── Diagnostic sorting ────────────────────────────────────────────────────

  it('sorts diagnostics by source, then severity, then rule ID', async () => {
    const providerA = makeProvider('pa', 'TypeA', {}, 'a://');
    const providerB = makeProvider('pb', 'TypeB', {}, 'b://');

    const errorRule: Rule = {
      id: 'check/error-rule',
      meta: { description: 'Error rule', defaultSeverity: 'error', recommended: true },
      artifactTypes: ['TypeA'],
      create(ctx) {
        ctx.report({ message: 'Error finding' });
      },
    };

    const warnRule: Rule = {
      id: 'check/warn-rule',
      meta: { description: 'Warn rule', defaultSeverity: 'warning', recommended: true },
      artifactTypes: ['TypeA'],
      create(ctx) {
        ctx.report({ message: 'Warning finding' });
      },
    };

    const bRule: Rule = {
      id: 'check/b-rule',
      meta: { description: 'B rule', defaultSeverity: 'error', recommended: true },
      artifactTypes: ['TypeB'],
      create(ctx) {
        ctx.report({ message: 'B finding' });
      },
    };

    const engine = createEngine({
      plugins: [
        { id: 'pa', providers: [providerA], rules: [errorRule, warnRule] },
        { id: 'pb', providers: [providerB], rules: [bRule] },
      ],
    });

    // Run sources out of alphabetical order to verify sorting
    const result = await engine.run(['b://tile.pbf', 'a://tile.pbf']);

    expect(result.diagnostics).toHaveLength(3);

    // a:// comes before b:// alphabetically
    const sources = result.diagnostics.map((d) => d.artifact.source);
    expect(sources[0]).toBe('a://tile.pbf');
    expect(sources[1]).toBe('a://tile.pbf');
    expect(sources[2]).toBe('b://tile.pbf');

    // Within a://, error before warning
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.diagnostics[1]?.severity).toBe('warning');
  });

  // ── Reporter invocation ───────────────────────────────────────────────────

  it('invokes the reporter exactly once with all diagnostics and run context', async () => {
    const { reporter, calls } = makeMockReporter();
    const provider = makeProvider('p', 'MockArtifact');
    const rule = makeAlwaysFailRule('mock/fail', 'MockArtifact', 'A problem');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      reporter,
    });

    const result = await engine.run(['mock://tile.pbf']);

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.diagnostics).toHaveLength(1);
    expect(call.diagnostics).toEqual(result.diagnostics);
    expect(call.context.sources).toEqual(['mock://tile.pbf']);
    expect(call.context.artifactCount).toBe(1);
    expect(call.context.summary.errors).toBe(1);
    expect(call.context.summary.pass).toBe(false);
  });

  it('returns the correct RunResult even if the reporter throws', async () => {
    const crashReporter: Reporter = {
      id: 'crash-reporter',
      report(_diagnostics, _context) {
        throw new Error('Reporter exploded');
      },
    };

    const provider = makeProvider('p', 'MockArtifact');
    const rule = makePassRule('mock/pass', 'MockArtifact');

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
      reporter: crashReporter,
    });

    // Must not throw — reporter errors are silently swallowed
    const result = await engine.run(['mock://tile.pbf']);
    expect(result.summary.pass).toBe(true);
  });

  // ── Summary statistics ────────────────────────────────────────────────────

  it('counts errors, warnings, and infos correctly', async () => {
    const provider = makeProvider('p', 'MockArtifact');

    const errorRule: Rule = {
      id: 'mock/err',
      meta: { description: 'Error', defaultSeverity: 'error', recommended: true },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        ctx.report({ message: 'E' });
      },
    };
    const warnRule: Rule = {
      id: 'mock/warn',
      meta: { description: 'Warning', defaultSeverity: 'warning', recommended: true },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        ctx.report({ message: 'W' });
      },
    };
    const infoRule: Rule = {
      id: 'mock/info',
      meta: { description: 'Info', defaultSeverity: 'info', recommended: true },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        ctx.report({ message: 'I' });
      },
    };

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [errorRule, warnRule, infoRule])],
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.summary.errors).toBe(1);
    expect(result.summary.warnings).toBe(1);
    expect(result.summary.infos).toBe(1);
    expect(result.summary.pass).toBe(false); // has an error
  });

  // ── maxDiagnostics cap ────────────────────────────────────────────────────

  it('stops collecting diagnostics after maxDiagnostics and adds a truncation notice', async () => {
    const provider = makeProvider('p', 'MockArtifact');

    // A rule that emits 5 diagnostics
    const spammyRule: Rule = {
      id: 'mock/spammy',
      meta: { description: 'Spammy', defaultSeverity: 'error', recommended: true },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        for (let i = 0; i < 5; i++) {
          ctx.report({ message: `Finding ${i}` });
        }
      },
    };

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [spammyRule])],
      options: { maxDiagnostics: 3 }, // cap at 3
    });

    const result = await engine.run(['mock://tile.pbf']);

    // The notice is included in the hard cap: 2 findings + 1 notice.
    expect(result.diagnostics).toHaveLength(3);
    expect(result.diagnostics.filter((d) => d.ruleId === 'mock/spammy')).toHaveLength(2);
    const truncation = result.diagnostics.find((d) => d.ruleId === 'engine/max-diagnostics');
    expect(truncation).toBeDefined();
  });

  it('applies maxDiagnostics to infrastructure diagnostics', async () => {
    const failingProvider = makeFailingProvider('fail-p', 'MockArtifact', 'bad://');
    const engine = createEngine({
      plugins: [{ id: 'p', providers: [failingProvider], rules: [] }],
      options: { maxDiagnostics: 3 },
    });

    const result = await engine.run([
      'unknown://no-provider',
      'bad://first-load-failure',
      'bad://second-load-failure',
      'bad://must-not-be-loaded',
    ]);

    expect(result.diagnostics).toHaveLength(3);
    expect(result.diagnostics.some((d) => d.ruleId === 'artifact/no-provider')).toBe(true);
    expect(result.diagnostics.some((d) => d.ruleId === 'artifact/load-failed')).toBe(true);
    expect(result.diagnostics.some((d) => d.ruleId === 'engine/max-diagnostics')).toBe(true);
  });

  // ── Empty run ─────────────────────────────────────────────────────────────

  it('returns pass=true and zero counts when no sources are provided', async () => {
    const engine = createEngine({ plugins: [] });
    const result = await engine.run([]);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.summary.pass).toBe(true);
    expect(result.summary.sourceCount).toBe(0);
    expect(result.summary.artifactCount).toBe(0);
    expect(result.summary.ruleExecutions).toBe(0);
  });

  // ── Rule targeting correct artifact type ──────────────────────────────────

  it('does not apply rules to artifact types they do not declare', async () => {
    const tileProvider = makeProvider('tp', 'VectorTile', {}, 'tile://');
    const styleProvider = makeProvider('sp', 'StyleSpec', {}, 'style://');

    const tileRule = makeAlwaysFailRule('tile/check', 'VectorTile', 'Tile issue');
    const styleRule = makeAlwaysFailRule('style/check', 'StyleSpec', 'Style issue');

    const engine = createEngine({
      plugins: [
        { id: 'tile-plugin', providers: [tileProvider], rules: [tileRule] },
        { id: 'style-plugin', providers: [styleProvider], rules: [styleRule] },
      ],
    });

    // Only run a tile source — the style rule should NOT fire
    const result = await engine.run(['tile://my-tile.pbf']);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/check');
  });

  // ── Duration in summary ───────────────────────────────────────────────────

  it('includes a non-negative duration in the RunSummary', async () => {
    const engine = createEngine({ plugins: [] });
    const result = await engine.run([]);
    expect(result.summary.duration).toBeGreaterThanOrEqual(0);
  });

  // ── docsUrl enrichment ────────────────────────────────────────────────────

  it('attaches docsUrl from rule.meta to diagnostics', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule: Rule = {
      id: 'mock/docs-rule',
      meta: {
        description: 'Rule with docs',
        defaultSeverity: 'error',
        recommended: true,
        docsUrl: 'https://tileguard.dev/rules/mock/docs-rule',
      },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        ctx.report({ message: 'Documented finding' });
      },
    };

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
    });

    const result = await engine.run(['mock://tile.pbf']);
    expect(result.diagnostics[0]?.docsUrl).toBe('https://tileguard.dev/rules/mock/docs-rule');
  });

  // ── Location and suggestion forwarding ───────────────────────────────────

  it('forwards location and suggestion from DiagnosticDescriptor to Diagnostic', async () => {
    const provider = makeProvider('p', 'MockArtifact');
    const rule: Rule = {
      id: 'mock/located',
      meta: {
        description: 'Rule with location',
        defaultSeverity: 'error',
        recommended: true,
      },
      artifactTypes: ['MockArtifact'],
      create(ctx) {
        ctx.report({
          message: 'Layer is missing',
          location: { layer: 'buildings', featureIndex: 3 },
          suggestion: 'Add a buildings layer.',
        });
      },
    };

    const engine = createEngine({
      plugins: [makePlugin('mock', provider, [rule])],
    });

    const result = await engine.run(['mock://tile.pbf']);
    const d = result.diagnostics[0]!;
    expect(d.location?.layer).toBe('buildings');
    expect(d.location?.featureIndex).toBe(3);
    expect(d.suggestion).toBe('Add a buildings layer.');
  });
});
