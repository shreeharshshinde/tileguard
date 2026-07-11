# TileGuard Architecture Handbook

> The permanent engineering reference for the TileGuard framework.
> Every document here describes *what* we are building, *why* each decision was made,
> which alternatives were considered, and what trade-offs exist.

---

## How to Read This Handbook
<!-- TODO: INSERT DIAGRAM 1: Monorepo Package Dependencies -->

**Image Description / Generation Prompt:** A UML Component Diagram representing the monorepo package dependency structure of TileGuard. Draw the following components as boxes: `tileguard (cli)` (at the top), `@tileguard/config` (middle-left), `@tileguard/core` (middle-right), `@tileguard/reporters` (middle-bottom), `@tileguard/tile-rules` (bottom-left), `@tileguard/style-rules` (bottom-right), and `@tileguard/shared` (bottom-middle). Draw solid arrows pointing from `tileguard (cli)` to `@tileguard/config`, `@tileguard/core`, `@tileguard/reporters`, `@tileguard/tile-rules`, and `@tileguard/style-rules`. Draw solid arrows pointing from `@tileguard/tile-rules` and `@tileguard/style-rules` to `@tileguard/core` and `@tileguard/shared`. Draw arrows pointing from `@tileguard/config` and `@tileguard/reporters` to `@tileguard/core`. Draw an arrow pointing from `@tileguard/shared` to `@tileguard/core`. Mark the arrows indicating that imports flow strictly inward, showing `@tileguard/core` as the independent kernel at the core of the dependency graph.


Start with the **Architecture Overview** to understand the full system. Then read the
**Diagnostic Model** — it is the single most important abstraction and influences
every other component. From there, read any subsystem document in whatever order
suits your interest.

Architecture Decision Records (ADRs) capture specific fork-in-the-road decisions.
They are referenced from the subsystem documents where relevant.

---

## Documents
<!-- TODO: INSERT DIAGRAM 2: CLI-to-Output Flow -->

**Image Description / Generation Prompt:** A UML Sequence Diagram visualizing the end-to-end execution pipeline of TileGuard. The actors/objects from left to right are: `User/Shell`, `cli.ts (CLI Entrypoint)`, `loadConfig() (@tileguard/config)`, `Engine (@tileguard/core)`, `RulesRunner (Execution Loop)`, and `Reporters (@tileguard/reporters)`. The execution steps flow sequentially:
1. `User/Shell` runs the CLI check command.
2. `cli.ts` invokes `loadConfig()` to find and parse configuration files.
3. `loadConfig()` returns the validated `TileGuardConfig` object to `cli.ts`.
4. `cli.ts` instantiates the `Engine` with the resolved configuration.
5. `cli.ts` calls `engine.run(sources)`.
6. The `Engine` initializes the `RulesRunner` check loop.
7. The `RulesRunner` fetches and decodes tile/style artifacts, executing matching active rules for each.
8. Rules call `context.report()` to append diagnostics back to the engine.
9. The `Engine` collects all diagnostics and invokes `reporters.report(diagnostics)`.
10. `Reporters` format the diagnostic outputs and write them to the terminal or JSON file.
11. `cli.ts` exits with code 1 if errors were found, or code 0 if none.


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

### Guidelines & Operations

| Directory | Documents | Description |
|:----------|:----------|:------------|
| `../guides/` | [Development Guide](../guides/development-guide.md) | How to write rules, plugins, providers, reporters; Testing and Performance strategies |
| `../governance/` | [Project Governance](../governance/project-governance.md) | Release process, Versioning policy, Deprecation policy, RFC process, Security policy |
| `../contributing/` | [Contributor Guide](../contributing/contributor-guide.md) | Onboarding, coding standards, PR workflows, maintenance guidelines |
| `../ecosystem/` | [Future Vision](../ecosystem/future-vision.md) | Long-term planning beyond v1.0 (LSP, Auto-fix, 3rd party plugins) |
| `../engineering/` | [Codebase Assessment](../engineering/CURRENT_CODEBASE_ASSESSMENT.md) | Audit of the pre-redesign prototype, reusable algorithms, and file-by-file action plan |

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
