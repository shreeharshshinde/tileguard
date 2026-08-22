# ADR-002: Local-First Processing

**Status:** Accepted · **Date:** 2026-07-02

## Context

Validation tools can be architected as:

1. **Client-server**: upload tiles to a service, get results back (like SonarQube)
2. **Local-first**: all processing happens on the developer's machine or CI runner (like ESLint)

Geospatial data is often large (tiles can be multi-MB), sensitive (proprietary map data), and needs fast feedback (developer inner loop).

## Decision

TileGuard processes all data locally. There is no TileGuard server, no cloud upload, no network dependency for validation.

### What this means concretely:

- The CLI runs entirely on the local machine or CI runner
- The Inspector runs in the browser with local file system access
- No tile data leaves the user's environment
- No account, API key, or subscription required
- Works offline
- Works in air-gapped environments

## Consequences

**Positive:**
- **Zero data privacy concerns**: proprietary tile data never leaves the organization
- **No latency**: validation is as fast as the local CPU (typically <100ms per tile)
- **No vendor lock-in**: no service dependency, no account, MIT licensed
- **CI-friendly**: runs in any environment with Node.js ≥ 20
- **Offline capable**: no network required after installation
- **Predictable costs**: no per-tile pricing or usage metering

**Negative:**
- **No shared dashboards** (yet)
teams can't view aggregate quality metrics without building custom tooling on top of JSON output
- **No server-side caching**: each CI run re-validates from scratch
- **No automatic updates**: users must update the package manually

## Alternatives Considered

| Alternative | Why rejected |
|:------------|:------------|
| SaaS validation service | Data privacy concerns for enterprise users; adds latency; requires connectivity |
| Hybrid (local validation, cloud reporting) | Adds complexity without clear value for v1; JSON output enables custom reporting |
| Browser-only (no CLI) | Can't run in CI pipelines; CLI is essential for automation |

## Future Considerations

- A **reporting dashboard** could aggregate JSON output from multiple CI runs without requiring tile upload
- A **GitHub App** could post validation results as PR comments using only the JSON output
- These additions would not require changing the local-first validation architecture
