# Implementation Plan: CircuitEngine Unified Facade

**Branch**: `014-circuit-engine` | **Date**: 2025-12-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-circuit-engine/spec.md`

## Summary

Implement a `CircuitEngine` facade class that unifies `CircuitController` (static editing) and `CircuitRunnerController` (live simulation) into a single API. The facade manages shared resources (scene, camera, visual object maps) and enables seamless mode switching without visual recreation. This aligns with the constitution's requirement for a "Single `CircuitEngine` facade class as main entry point."

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (scene, camera, controls, Line2)
**Storage**: N/A (in-memory circuit model, no persistence in this feature)
**Testing**: Vitest 4.0+
**Target Platform**: ES2022+ modern browsers
**Project Type**: Single library project
**Performance Goals**: Mode switch < 500ms for circuits with up to 100 components
**Constraints**: Zero visual recreation on mode switch; shared resources between controllers
**Scale/Scope**: Circuits with ~100 components typical, up to ~500 max

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | ✅ PASS | Pure TypeScript, accepts HTMLElement, event-driven API |
| Modular Separation | ✅ PASS | CircuitEngine in scene/ layer, depends only on core/ |
| Discrete Boolean Model | ✅ PASS | No changes to simulation model |
| Data-Driven Circuits | ✅ PASS | No changes to circuit loading |
| Spec-Driven Development | ✅ PASS | Tests required for all features |
| Developer Experience | ✅ PASS | Single import, 5-line integration, JSDoc required |
| Module Rules | ✅ PASS | scene/ imports core/, no playback imports |
| Public API Shape | ✅ PASS | Single CircuitEngine facade, event-based, chainable |
| Resource Management | ✅ PASS | dispose() cleans all resources, no global state |
| Quality Standards | ✅ PASS | No `any` types, JSDoc on public APIs, 60%+ coverage target |

**Gate Result**: All principles pass. Proceeding with design.

## Project Structure

### Documentation (this feature)

```text
specs/014-circuit-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── core/                    # (unchanged) Simulation logic
│   └── simulation/
│       └── CircuitRunner.ts
├── scene/
│   ├── shared/              # Shared abstractions
│   │   ├── AbstractCircuitController.ts
│   │   ├── EventEmitter.ts
│   │   ├── types.ts         # Add EngineMode, CircuitEngineEventMap
│   │   └── ...
│   ├── static/
│   │   └── CircuitController.ts  # (may need refactoring for shared resources)
│   ├── simulation/
│   │   └── CircuitRunnerController.ts  # (may need refactoring for shared resources)
│   └── CircuitEngine.ts     # NEW: Unified facade class
├── CircuitEngine.ts         # Re-export from scene/ for top-level import
└── index.ts                 # Add CircuitEngine to exports

tests/
├── scene/
│   └── CircuitEngine.test.ts  # NEW: Facade tests
└── ...
```

**Structure Decision**: Single library project. CircuitEngine is the new public facade placed at `src/scene/CircuitEngine.ts` with a re-export at `src/CircuitEngine.ts` for convenience. Shared types added to `src/scene/shared/types.ts`.

## Complexity Tracking

No constitution violations requiring justification. Design uses composition pattern (facade wrapping existing controllers) rather than introducing new abstractions or dependencies.

## Post-Design Constitution Re-Check

_Re-evaluated after Phase 1 design artifacts generated._

| Principle | Status | Verification |
|-----------|--------|--------------|
| Framework Agnosticism | ✅ PASS | ICircuitEngine interface accepts HTMLElement, no framework deps |
| Modular Separation | ✅ PASS | CircuitEngine in scene/, imports core/ only |
| Discrete Boolean Model | ✅ PASS | No changes to simulation model |
| Data-Driven Circuits | ✅ PASS | setCircuit() accepts Circuit objects |
| Spec-Driven Development | ✅ PASS | Contracts defined, tests planned |
| Developer Experience | ✅ PASS | Quickstart shows 5-line integration |
| Module Rules | ✅ PASS | Verified in contracts - no playback imports |
| Public API Shape | ✅ PASS | Single facade, event-based, methods can chain |
| Resource Management | ✅ PASS | dispose() defined in ICircuitEngine |
| Quality Standards | ✅ PASS | No any types in contracts, JSDoc included |

**Post-Design Gate Result**: All principles still pass. Ready for task generation.

## Generated Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| Research | [research.md](./research.md) | Architectural decisions for shared resources |
| Data Model | [data-model.md](./data-model.md) | Entity definitions and state transitions |
| Contracts | [contracts/types.ts](./contracts/types.ts) | TypeScript interface contracts |
| Quickstart | [quickstart.md](./quickstart.md) | Developer integration guide |

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
