# TileGuard Architecture Handbook

> The permanent engineering reference for the TileGuard framework.
> Every document here describes *what* we are building, *why* each decision was made,
> which alternatives were considered, and what trade-offs exist.

---

## How to Read This Handbook

Start with the **Architecture Overview** to understand the full system. Then read the
**Diagnostic Model** — it is the single most important abstraction and influences
every other component. From there, read any subsystem document in whatever order
suits your interest.

Architecture Decision Records (ADRs) capture specific fork-in-the-road decisions.
They are referenced from the subsystem documents where relevant.

---

## Documents

### Subsystem Specifications

| # | Document | Description |
|:--|:---------|:------------|
| 01 | [Architecture Overview](./01-overview.md) | System-level design, principles, component map, dependency rules |
| 02 | [Diagnostic Model](./02-diagnostic-model.md) | The universal contract: severity, location, identity, immutability |
| 03 | [Artifact Model](./03-artifact-model.md) | Artifacts, providers, the source/decoder separation |
| 04 | [Rule System](./04-rule-system.md) | Rule interface, context, registry, lifecycle, configuration |
| 05 | [Reporter System](./05-reporter-system.md) | Reporter interface, built-in reporters, formatting pipeline |
| 06 | [Configuration](./06-configuration.md) | Config schema, resolution, rule overrides |
| 07 | [Engine](./07-engine.md) | Core orchestration: the run pipeline |
| 08 | [Package Structure](./08-package-structure.md) | Monorepo layout, dependency graph, build tooling |
| 09 | [Implementation Roadmap](./09-implementation-roadmap.md) | Phased milestones with dependency ordering |

### Architecture Decision Records

| ADR | Decision |
|:----|:---------|
| [ADR-001](./adr/001-typescript-reference-implementation.md) | TypeScript as the single reference implementation |
| [ADR-002](./adr/002-rule-based-architecture.md) | Rule-based validation over procedural validators |
| [ADR-003](./adr/003-diagnostic-as-contract.md) | Structured diagnostics as the universal interface contract |
| [ADR-004](./adr/004-direct-artifact-access.md) | Direct artifact access over visitor pattern |
| [ADR-005](./adr/005-flat-configuration.md) | Flat configuration over cascading config resolution |

---

## Conventions

- **Interface definitions** in this handbook are authoritative TypeScript. They will be
  copied into the `@tileguard/core` package when implementation begins.
- **Mermaid diagrams** are used for component relationships and data flow.
- **Alternatives Considered** sections appear in every document. They are as important
  as the chosen approach — they explain the design space.
- Documents describe **architecture**, not implementation. How the TypeScript source
  files are organized is a separate concern from how the abstractions relate to each other.

---

*Handbook version: 1.0 · Established: 2026-07-02*
