# Implementation Plan: Discrete-Time Circuit Simulation Engine

**Branch**: `001-simulation-engine` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-simulation-engine/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements a performant, event-driven circuit simulation engine that:
- Tracks binary electrical states (voltage/current present or not) through wires, enodes, and components
- Uses single-pass topological ordering for O(n) state propagation efficiency
- Supports delayed component transitions with min-heap event scheduling (FIFO ordering within same tick)
- Optimizes rendering updates via per-element dirty tracking
- Provides configurable history storage (default 1000 steps) for debugging
- Enables extensible component behaviors via registry-based pattern
- Targets 300+ component circuits at 60 FPS (16ms per step)

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: None for core simulation module (dependency-free per constitution)
**Storage**: N/A (simulation engine is stateless; history stored in-memory when enabled)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+), Node.js 18+ (headless mode)
**Project Type**: Single library project (core module within existing simple-circuit-engine)
**Performance Goals**:
- 60 FPS simulation (≤16ms per step) for 300 components, 400 wires
- State queries in <1ms for circuits up to 500 components
- Zero performance degradation over 10,000+ steps
**Constraints**:
- Must integrate with existing Circuit, Component, ENode, Wire classes
- Core module cannot depend on Three.js, rendering, or playback modules
- Event-driven architecture with min-heap scheduling
- Single-pass topological propagation (no iterative convergence)
**Scale/Scope**:
- Support circuits up to 500 components efficiently
- Extensible to dozens of component types via registry pattern
- Minimal API surface (integrate into existing CircuitEngine facade)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Framework Agnosticism ✅
- Simulation engine is pure TypeScript with no UI framework dependencies
- Communicates via event-driven API (compatible with any consumer)
- Can be used in headless Node.js environments

### Modular Separation ✅
- All simulation code resides in `src/core/simulation/`
- No dependencies on `rendering/` or `playback/` modules
- Maintains hexagonal architecture (core is innermost, dependency-free layer)
- Can be published separately for server-side or headless use

### Discrete Boolean Model ✅
- Binary electrical states (voltage present/absent, current flowing/not flowing)
- Discrete time steps (tick-based simulation)
- Component delays measured in integer step counts
- Deterministic propagation via topological ordering
- No analog values, capacitance, or inductance

### Data-Driven Circuits ✅
- Simulation engine operates on existing Circuit JSON model
- Component configurations (delays, behaviors) stored in component data
- No hard-coded circuit logic

### Specification-Driven Development ✅
- Detailed spec with testable acceptance criteria already defined
- Will follow TDD: interfaces → tests → implementation
- 80% test coverage target for core module

### Developer Experience First ✅
- All public APIs will have JSDoc documentation
- Integration with existing CircuitEngine facade minimizes breaking changes
- Registry-based component extension pattern is straightforward for contributors
- Examples will be added to demo application

### Module Rules ✅
- `core/` imports: nothing (✅ no dependencies)
- `core/` DOM access: ❌ (simulation is headless-compatible)
- All Three.js internals remain hidden (simulation doesn't touch rendering)

### Resource Management ✅
- No WebGL resources in simulation engine
- Optional history can be garbage-collected when disabled
- All state scoped to CircuitRunner instance (no globals)
- Will integrate with existing CircuitEngine.dispose() lifecycle

**Status**: ✅ ALL GATES PASS - No constitution violations

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── simulation/                    # NEW: Simulation engine (this feature)
│   │   ├── CircuitRunner.ts           # Main simulation orchestrator
│   │   ├── SimulationState.ts         # Complete state snapshot
│   │   ├── StateManager.ts            # State + optional history management
│   │   ├── EventQueue.ts              # Min-heap scheduled events
│   │   ├── DirtyTracker.ts            # Per-element change tracking
│   │   ├── behaviors/                 # Component behavior registry
│   │   │   ├── ComponentBehavior.ts   # Interface
│   │   │   ├── BehaviorRegistry.ts    # Registry implementation
│   │   │   ├── BatteryBehavior.ts     # Example: voltage source
│   │   │   ├── SwitchBehavior.ts      # Example: interactive component
│   │   │   ├── LEDBehavior.ts         # Example: state-based component
│   │   │   └── index.ts               # Exports
│   │   ├── states/                    # State type definitions
│   │   │   ├── NodeElectricalState.ts # Voltage + current booleans
│   │   │   ├── ComponentState.ts      # Base component state
│   │   │   └── index.ts               # Exports
│   │   ├── types/                     # Simulation-specific types
│   │   │   ├── RunnerOptions.ts       # Configuration
│   │   │   ├── UserCommand.ts         # User interactions
│   │   │   ├── ScheduledEvent.ts      # Delayed transitions
│   │   │   └── index.ts               # Exports
│   │   └── index.ts                   # Public exports
│   ├── Circuit.ts                     # Existing (unchanged)
│   ├── Component.ts                   # Existing (may extend with state)
│   ├── ENode.ts                       # Existing (may extend with state)
│   ├── Wire.ts                        # Existing (may extend with state)
│   └── index.ts                       # Update to export simulation
├── CircuitEngine.ts                   # Update to integrate CircuitRunner
└── index.ts                           # Existing main export

tests/
├── core/
│   ├── simulation/                    # NEW: Simulation tests
│   │   ├── CircuitRunner.test.ts      # Orchestration tests
│   │   ├── StateManager.test.ts       # State + history tests
│   │   ├── EventQueue.test.ts         # Event scheduling tests
│   │   ├── DirtyTracker.test.ts       # Change tracking tests
│   │   ├── behaviors/                 # Behavior tests
│   │   │   ├── BatteryBehavior.test.ts
│   │   │   ├── SwitchBehavior.test.ts
│   │   │   └── LEDBehavior.test.ts
│   │   ├── integration/               # End-to-end simulation tests
│   │   │   ├── basic-circuit.test.ts  # Battery → LED
│   │   │   ├── switch-circuit.test.ts # Interactive switching
│   │   │   ├── delayed-transitions.test.ts # Delayed components
│   │   │   └── performance.test.ts    # 300 component benchmarks
│   │   └── example.test.ts            # Update existing placeholder
│   └── [existing test files...]
└── [other test modules...]
```

**Structure Decision**: Single project structure, extending existing `src/core/` module with new `simulation/` subdirectory. This maintains the constitution's modular separation (core → rendering → playback) and keeps simulation logic dependency-free.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. All gates pass.
