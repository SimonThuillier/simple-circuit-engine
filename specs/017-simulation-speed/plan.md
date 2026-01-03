# Implementation Plan: Simulation Speed Control & Component Transition Timing

**Branch**: `017-simulation-speed` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-simulation-speed/spec.md`

## Summary

Enable runtime-adjustable simulation speed (1-20 TPS) via a slider under the play/pause button, and add configurable transition timing: `transitionSpan` (ticks) for relays/transistors, `transitionUserSpan` (ms) for switches with dynamic tick computation. Leverages existing `tickInterval` property on CircuitRunnerController and event-driven state transition system.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (scene/UI), core simulation is dependency-free
**Storage**: N/A (in-memory ComponentState map within CircuitRunner)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+), Node 18+ for tests
**Project Type**: Single project (library with demo)
**Performance Goals**: Speed adjustment < 100ms latency, tick rate accuracy within 10% of target
**Constraints**: No breaking changes to existing circuits with default config values
**Scale/Scope**: Educational circuit simulator, 100s of components typical

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | ✅ PASS | Speed slider uses native DOM/lil-gui, no framework deps |
| Modular Separation | ✅ PASS | Transition logic in core/ behaviors, UI in scene/ controller |
| core/ imports nothing | ✅ PASS | Transition timing computed in behaviors, no Three.js deps |
| scene/ imports only core | ✅ PASS | CircuitRunnerController already imports CircuitRunner |
| Discrete Boolean Model | ✅ PASS | Time remains discrete (ticks), transitions counted in ticks |
| Data-Driven Circuits | ✅ PASS | Config params (transitionSpan, transitionUserSpan) in JSON |
| No `any` types | ✅ PASS | Will use typed interfaces for transition state |
| Public APIs have JSDoc | ✅ PASS | New methods will be documented |
| dispose() cleanup | ✅ PASS | No new WebGL resources, interval already managed |

**Post-Design Verification** (2025-12-29): All gates remain ✅ PASS. Design artifacts (data-model.md, contracts/) maintain modular separation and discrete boolean model.

## Project Structure

### Documentation (this feature)

```text
specs/017-simulation-speed/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── simulation/
│       ├── behaviors/
│       │   ├── RelayBehavior.ts      # Add transitionSpan support
│       │   ├── TransistorBehavior.ts # Add transitionSpan support
│       │   └── SwitchBehavior.ts     # Add transitionUserSpan + tickCount computation
│       ├── states/
│       │   ├── RelayState.ts         # (no changes needed - uses startTick)
│       │   ├── TransistorState.ts    # (no changes needed - uses startTick)
│       │   └── SwitchState.ts        # (no changes needed - uses startTick)
│       ├── types/
│       │   └── UserCommand.ts        # Document tickCount in parameters
│       └── CircuitRunner.ts          # Add getSimulationSpeed() helper
├── scene/
│   └── simulation/
│       └── CircuitRunnerController.ts # Add speed slider UI, TPS getter/setter
└── CircuitEngine.ts                   # Add simulationSpeed getter/setter facade

tests/
├── core/
│   └── simulation/
│       ├── RelayBehavior.test.ts     # Test transitionSpan
│       ├── TransistorBehavior.test.ts# Test transitionSpan
│       └── SwitchBehavior.test.ts    # Test transitionUserSpan + speed-adaptive timing
└── scene/
    └── CircuitRunnerController.test.ts # Test speed slider integration
```

**Structure Decision**: Single project structure. Changes span core/ (behavior logic) and scene/ (UI controller), following existing modular separation.

## Complexity Tracking

> No constitution violations. All gates passed.
