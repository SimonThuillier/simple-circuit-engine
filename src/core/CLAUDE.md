# Core Module (`src/core`)

Dependency-free TypeScript package providing digital electronic circuit topology modeling and discrete-time boolean simulation.
Imported as `simple-circuit-engine/core`.

## Naming Conventions

- Interfaces/types: prefixed with `I` (e.g., `IUserCommand`, `IRunnerOptions`, `ICircuit`)
- Enums: prefixed with `E` only when ambiguity exists; otherwise plain (`ComponentType`, `ENodeType`, `ENodeSourceType`)
- Each subdirectory consolidates its types in a single `types.ts` file

## Package Structure

### `topology/` — Circuit Model

The circuit graph: components, electrical nodes (ENodes), and wires.

- **Circuit** — Central container. Manages add/remove of components, ENodes, and wires with cascade deletion and orphan cleanup. Use `Circuit.fromJSON()` / `toJSON()` for serialization.
- **Component** — Electrical part (battery, switch, LED, gate...). Has a `ComponentType`, `pins` (list of ENode IDs), and a `config` Map for runtime parameters.
- **ENode** — Electrical node. Either a component `Pin` or a `BranchingPoint` (wire junction).
- **Wire** — Connection between two ENodes (`node1`, `node2`).
- **CircuitMetadata** — File metadata. Constructor: `(version, circuitOptions, size, divisions, cameraOptions)`. The supported circuit files `version` parameter is `CIRCUIT_FILE_VERSION`.
- **`types.ts`** — `ComponentType` enum, `COMPONENT_TYPE_METADATA` (pin definitions and default configs per type), `ENodeType`, `ENodeSourceType`, `LogicFamily`, and all topology interfaces.
- **`delays.ts`** — `computeTransitionSpan`, `classifyGate`, `computeGateDelay` for logic family timing.

**Important:** `Circuit.addComponent()` merges custom config into the type's default config (from `COMPONENT_TYPE_METADATA`), it does not replace it. This preserves defaults like `transitionSpan`.

### `simulation/` — Simulation Engine

Tick-based boolean simulation with state propagation, event scheduling and dirty tracking for optimization.

- **CircuitRunner** — Orchestrator. Call `tick()` / `tickN(n)` to advance, `submitCommand()` to inject user actions. Holds the `SimulationState` and `DirtyTracker`.
- **StateManager** — Manages `SimulationState` updates during ticks.
- **EventQueue** — Priority queue for delayed transitions (e.g., switch closing over N ticks).
- **DirtyTracker** — Tracks which components/enodes/wires changed, for efficient scene updates.
- **`types.ts`** — `IUserCommand`, `IRunnerOptions`, `IScheduledEvent`, `SIMULATION_SPEED`, `TRANSITION_DEFAULTS`.

### `simulation/states/` — Component States

Contains component states dataclasses

Components are organized within groups:

- basic (switches, lights, relays...)
- logic gates
- Future Upper level components (encoders/decoders, flip-flops, ...)

### `simulation/behaviors/` — Component Behaviors

Stateless strategy objects implementing `IComponentBehavior`. Registered in `BehaviorRegistry` by `ComponentType`.

Each behavior implements:

- `createInitialState(component)` — initial `ComponentState`
- `allowConductivity(component, state, type, pinId, otherPinId)` — whether a pin pair conducts
- `onPinsChange(component, state, nodeStates, targetTick)` — react to electrical input changes
- `onUserCommand(component, state, command)` — react to user commands (e.g., toggle switch)
- `onEventFiring(component, state, event)` — react to scheduled event firing

All return `IBehaviorResult` with updated state, `hasChanged` flag, and `scheduledEvents`.

**Caution:** Method names follow the interface exactly (`onUserCommand`, not `onIUserCommand`). The `I` prefix convention applies only to type/interface names, never to method names.

### `utils/` — Utilities

- **Position** / **Position3D** / **Rotation** — Grid geometry primitives
- **CameraOptions** — Camera setup data
- **`types.ts`** — `UUID`, `IPosition`, `IPosition3D`, `ICameraOptions`
- `generateUUID()` — RFC 4122 v4 UUID generation

### `setup.ts`

Helper to register all built-in behaviors at once. Used by consuming applications.

## Simulation Tick Lifecycle

1. `CircuitRunner.tick()` increments the tick counter
2. Pending commands are processed → behaviors' `onUserCommand()` called
3. Scheduled events that are ready fire → behaviors' `onEventFiring()` called
4. Conductivity is propagated through the circuit graph
5. Pin changes are detected → behaviors' `onPinsChange()` called
6. `DirtyTracker` records all mutations for the scene layer to consume

## Quality Gate

Being the foundational domain package, `core` requested unit test coverage is 80% minimum.
