# simple-circuit-engine — Claude Memory

## Project Overview

TypeScript circuit simulation library. Model-Controller architecture:

- `src/core/` — Pure TypeScript domain model (no deps)
- `src/scene/` — Three.js visualization layer

## Key Architecture

- `Circuit.ts` — Central container for components, enodes, wires + metadata
- `CircuitMetadata` — Holds grid settings + `defaultLogicFamily`
- `ComponentType.ts` — Enum + metadata (pins, default configs) for all component types
- `CircuitWriter.ts` — Scene → model write operations (pattern: save*, cycle*)
- `ConfigPanelWidget.ts` — lil-gui config panel for component editing
- Gate visual factories inherit from `NandGateVisualFactory` or `NorGateVisualFactory` (parent classes)

## Logic Family System (US-3 & US-4, completed)

- `src/core/types/delays.ts`: `LogicFamily` type, `computeGateDelay()`, `classifyGate()`
- Gate metadata in `ComponentType.ts` now includes `defaultLogicFamily` and `transitionSpan` keys
- `Circuit.resolveTransitionSpan(component)`: recomputes `transitionSpan` from defaultLogicFamily + activationLogic
- Called in `addComponent()` and `CircuitWriter.saveEditComponentConfig()` / `cycleComponentConfig()`
- `CircuitMetadata.defaultLogicFamily` defaults to `'CMOS1'`; new gates inherit it if their `defaultLogicFamily` is empty
- Gate visual factories: `getConfigFormDefinition(config?)` signature accepts optional config for `disabled` state
- `ConfigPanelWidget` rebuilds GUI on `defaultLogicFamily` or `activationLogic` changes
- Tests: `tests/core/types/LogicFamily.test.ts`, `tests/core/CircuitLogicFamily.test.ts`

## Commands

- `npm test` — run all tests (vitest)
- `npm run lint` — TypeScript type check only

## Coding Conventions

- Strict TypeScript ES2022
- Guard clauses / early returns to minimize nesting
- Tests use vitest, import from `simple-circuit-engine/core` or `simple-circuit-engine/scene`
- No comments added to unchanged code
