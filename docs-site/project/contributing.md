# Contributing

Thank you for your interest in contributing to TileGuard! The most common contribution is a new validation rule — typically under 25 lines of TypeScript.

## Ways to Contribute

- **Write a new rule**: the primary extension point
- **Improve diagnostics**: better error messages, suggestions
- **Add test fixtures**: real `.pbf` tiles that exercise edge cases
- **Improve documentation**: corrections, examples, guides
- **Report bugs**: with a minimal reproduction

## Writing a Rule

A rule is a plain TypeScript object:

```typescript
import type { Rule } from '@tileguard/core';

export const myRule: Rule = {
  id: 'tile/my-check',
  meta: {
    description: 'Validates something specific.',
    defaultSeverity: 'warning',
    recommended: true,
  },
  artifactTypes: ['VectorTile'],
  create(context) {
    const content = context.artifact.content;
    // Validate, then report findings
    context.report({
      message: 'Something is wrong.',
      location: { layer: 'buildings', featureIndex: 0 },
      suggestion: 'Fix it by doing X.',
    });
  },
};
```

### Rule Checklist

- [ ] Rule ID follows `domain/name` convention (e.g., `tile/required-layers`)
- [ ] Rule has `meta.description` (one sentence)
- [ ] Rule has `meta.defaultSeverity`
- [ ] Rule is registered in the plugin's rule array
- [ ] At least 3 test cases (pass, fail, edge)
- [ ] Tests use real fixture files, not mocked artifacts
- [ ] Rule is documented

## Pull Request Process

1. Fork the repository and create your branch from `main`
2. Write your code with tests
3. Run `pnpm build && pnpm test` — all must pass
4. Write a clear PR description explaining what and why
5. Request review

### PR Title Format

```text
feat(tile-rules): add unclosed-ring detection
fix(cli): handle empty file paths gracefully
docs: update installation instructions
test(reporters): add edge case for empty diagnostics
```

### What Makes a Good PR

- **Focused**: one concern per PR
- **Tested**: new tests for new behavior
- **Documented**: update docs if behavior changes
- **Small**: prefer multiple small PRs over one large PR

## Architecture Guidelines

- Dependencies flow inward — Core depends on nothing
- Rules are pure functions — no I/O, no side effects
- Diagnostics are the universal currency
- Composition over inheritance — plain objects, not class hierarchies
- Explicit over clever — clear error messages, no implicit behavior

## Good First Issues

Approachable contributions for newcomers:

- Adding a new validation rule
- Improving error messages or suggestions
- Adding test fixtures for edge cases
- Documentation improvements
- CLI help text improvements

## License

By contributing to TileGuard, you agree that your contributions will be licensed under the [MIT License](https://github.com/shreeharshshinde/tileguard/blob/main/LICENSE).
