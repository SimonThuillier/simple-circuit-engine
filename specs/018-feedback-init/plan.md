# Implementation Plan: Feedback Loop Initialization

**Branch**: `018-feedback-init` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-feedback-init/spec.md`

## Summary

Enhance CircuitRunner's `initializeState()` to disambiguate initial states for circuits with feedback loops by processing components sequentially according to their `initializationPriority` config parameter. This models tiny power-up delays, allowing earlier-initialized components to influence later ones and producing one deterministic stable state among possible equilibria.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (scene/UI), core simulation is dependency-free
**Storage**: N/A (in-memory ComponentState map within CircuitRunner)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+), Node 18+
**Project Type**: Single library project
**Performance Goals**: Initialization within 100ms for standard feedback circuits (SC-001)
**Constraints**: No new dependencies in core module; preserve backward compatibility
**Scale/Scope**: Typical circuits have <100 components; feedback loops usually involve 2-6 components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | PASS | Changes are in core/ module only, no UI framework dependencies |
| II. Modular Separation | PASS | All changes in `src/core/simulation/`, no imports from scene/playback |
| III. Discrete Boolean Model | PASS | Sequential initialization models tiny delays, consistent with discrete-time simulation |
| IV. Data-Driven Circuits | PASS | `initializationPriority` stored in component config (JSON-serializable) |
| V. Specification-Driven Development | PASS | Will write tests before implementation |
| VI. Developer Experience First | PASS | Public API unchanged; new config parameter documented |
| No `any` types | PASS | All new types will be strongly typed |
| Core module 80% coverage | PASS | Will add tests for new functionality |

## Project Structure

### Documentation (this feature)

```text
specs/018-feedback-init/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for this feature - internal API only)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── simulation/
│   │   ├── CircuitRunner.ts          # Modified: enhance initializeState()
│   │   ├── behaviors/
│   │   │   ├── TransistorBehavior.ts # Modified: use initializationPriority in createInitialState
│   │   │   └── RelayBehavior.ts      # Modified: use initializationPriority in createInitialState
│   │   └── states/
│   │       └── (unchanged - states already support open/closed)
│   └── types/
│       └── ComponentType.ts          # Modified: add initializationPriority to Transistor/Relay config

tests/
├── core/
│   └── simulation/
│       ├── CircuitRunner.test.ts     # Modified: add feedback initialization tests
│       └── feedback-init/            # New: dedicated test directory
│           └── FeedbackInitialization.test.ts
```

**Structure Decision**: Single project structure using existing `src/core/simulation/` hierarchy. Changes are minimal and localized to CircuitRunner.initializeState() and Transistor/Relay behaviors.

## Design Approach

### Key Insight: Sequential Processing Model

The existing `initializeState()` iterates components in arbitrary order. For feedback loops, this produces non-deterministic results because mutually-dependent components can't all initialize simultaneously.

**Solution**: Process initialization in priority-sorted passes:
1. Sort components with explicit `initializationPriority` (higher number = processed first)
2. Process each component sequentially, letting its initial state affect subsequent propagation
3. Components without priority (null → default 0) processed last within their group
4. Ties broken by UUID alphabetical order (ascending) for determinism

### Minimal Changes Required

1. **ComponentType.ts**: Add `initializationPriority` to Transistor and Relay default config (value: empty string = null)

2. **TransistorBehavior.createInitialState()**: Read `initializationPriority` from config, set initial state based on `initialState` config if present (existing pattern from Switch)

3. **RelayBehavior.createInitialState()**: Same as transistor

4. **CircuitRunner.initializeState()**:
   - After creating all component states, sort components by initializationPriority (descending), then UUID (ascending)
   - Run propagateConductivity() after each priority group to let early components influence later ones
   - This is the key change: instead of one propagation at the end, do incremental propagation

### Why This Works

Consider an RS flip-flop with two transistors (T1, T2) in a feedback loop:
- Without priority: Both start `open`, propagation sees no voltage anywhere, both stay open → undefined state
- With priority (T1=2, T2=1): T1 processed first, if configured with `initialState: closed`, it closes. Propagation runs. Now T2 sees voltage at its base from T1's output and reacts accordingly → deterministic state

## Complexity Tracking

No constitution violations. The approach is minimal:
- No new classes or files (except tests)
- No architectural changes
- Only modifies existing initialization flow
