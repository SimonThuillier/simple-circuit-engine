# Implementation Plan: Circuit Runner Controller

**Branch**: `013-circuit-runner-controller` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-circuit-runner-controller/spec.md`

## Summary

Complete the CircuitRunnerController implementation to provide simulation playback control (play/pause/step), visual state updates for components/wires/enodes based on CircuitRunner state transitions, and interactive component triggering (click to toggle switches). The controller manages an already-built circuit and uses dirty tracking for optimized visual updates.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (for 3D scene interaction and Line2 wire rendering)
**Storage**: N/A (in-memory circuit model, no persistence changes)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single TypeScript library
**Performance Goals**: 60 fps rendering, smooth animations at tick intervals 50ms-2000ms
**Constraints**: No memory leaks on repeated play/pause or circuit switching, handle 50+ components without lag
**Scale/Scope**: Extends existing CircuitRunnerController class, integrates with existing CircuitRunner simulation engine

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | ✅ PASS | Controller accepts HTMLElement, uses event-driven API, no framework dependencies |
| II. Modular Separation | ✅ PASS | CircuitRunnerController is in `scene/` module, depends only on `core/` (CircuitRunner, DirtyTracker, etc.) |
| III. Discrete Boolean Model | ✅ PASS | Uses existing boolean electrical states (hasVoltage, hasCurrent), discrete tick-based simulation |
| IV. Data-Driven Circuits | ✅ PASS | Loads circuits via CircuitRunner, no code-embedded circuits |
| V. Specification-Driven Development | ✅ PASS | Spec written first, implementation follows |
| VI. Developer Experience First | ✅ PASS | Public methods will have JSDoc, events are well-defined |
| Module Rules | ✅ PASS | `scene/` imports `core/` and `three` only, no `playback/` imports |
| Resource Management | ✅ PASS | dispose() cleans up simulation loop, no global state |

**Gate Result**: PASS - No violations, proceed to Phase 0.

### Post-Design Re-Check

| Principle | Status | Design Impact |
|-----------|--------|---------------|
| I. Framework Agnosticism | ✅ PASS | Controller uses events, no framework bindings |
| II. Modular Separation | ✅ PASS | All new code in `scene/simulation/`, uses `core/` APIs |
| III. Discrete Boolean Model | ✅ PASS | Visual colors map to boolean hasVoltage/hasCurrent |
| IV. Data-Driven Circuits | ✅ PASS | No code-embedded circuits |
| V. Specification-Driven | ✅ PASS | Spec → Research → Data Model → Tasks flow |
| VI. Developer Experience | ✅ PASS | JSDoc on public API, quickstart guide created |
| Resource Management | ✅ PASS | dispose() clears interval, removes handlers |

**Post-Design Gate Result**: PASS - Design complies with constitution.

## Project Structure

### Documentation (this feature)

```text
specs/013-circuit-runner-controller/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── simulation/
│       ├── CircuitRunner.ts          # Existing - simulation engine
│       ├── DirtyTracker.ts           # Existing - tracks changed elements
│       ├── types/
│       │   └── UserCommand.ts        # Existing - toggle_switch command
│       └── states/
│           ├── ComponentState.ts     # Existing - base state class
│           ├── SwitchState.ts        # Existing - switch open/closed
│           └── SmallLEDState.ts      # Existing - LED on/off
├── scene/
│   ├── shared/
│   │   ├── AbstractCircuitController.ts  # Existing - base class
│   │   ├── InterpolationController.ts    # Existing - animation smoothing
│   │   ├── WireVisualManager.ts          # Existing - wire rendering
│   │   └── components/
│   │       ├── ComponentVisualFactory.ts # Existing - updateAnimation interface
│   │       ├── SwitchVisualFactory.ts    # Existing - switch animation
│   │       └── SmallLEDVisualFactory.ts  # Existing - LED animation
│   └── simulation/
│       └── CircuitRunnerController.ts    # TARGET - complete implementation

tests/
├── scene/
│   └── simulation/
│       └── CircuitRunnerController.test.ts  # New - controller tests
```

**Structure Decision**: Single TypeScript library structure. Implementation focuses on completing the existing `CircuitRunnerController.ts` file which already has scaffolding code. All core simulation infrastructure exists.

## Complexity Tracking

> No violations - table not needed.
