# simple-circuit-engine Development Guidelines

Provide a simple and easy-to-use electronic circuit simulation library for educational purposes.
It allows users to create, edit and simulate electronic circuits in a web environment.
The library should be easily importable and usable in client applications and follow open-source typeScript libraries good practices.

Last updated: 2026-01-18

## Active Technologies

- TypeScript 5.9+ (strict mode), targeting ES2022
- Three.js 0.181+ (scene, camera, controls, 3D objects, Line2)
- lil-gui as helper for small interactive modal forms
- in-memory circuit model, optional loading/saving from/to a JSON file

## Project Structure

Simple Circuit Engine follows a **Model-Controller** architecture with clear separation between:
- **Core module** (`src/core/`): Pure TypeScript domain **Model** and simulation engine (no dependencies)
- **Scene module** (`src/scene/`): Three.js visualization layer with editing **Controllers** and tools


### Core Module (`src/core/`)

The core module is **dependency-free** and contains all domain logic:

```
src/core/
  +-- Circuit.ts           # Central model: manages the three elements of the circuit : components, enodes, and wires
  +-- Component.ts         # Electrical component (battery, switch, LED, etc.)
  +-- ENode.ts             # Electrical node (Pin or BranchingPoint)
  +-- Wire.ts              # Connection between two enodes
  +-- Position.ts          # 2D grid position
  +-- Rotation.ts          # Discrete rotation
  +--  types/
  |     +-- ComponentType.ts      # Component type enum and metadata
  |     +-- ENodeSourceType.ts    # Voltage/Current source types
  |     +-- ENodeType.ts          # Pin vs BranchingPoint
  |     +-- Identifier.ts         # UUID type alias
  +-- simulation/
  |     +-- CircuitRunner.ts      # Tick-based simulation orchestrator
  |     +-- DirtyTracker.ts       # Utility used by CircuitRunner to keep tracks of simulation changed components (optimization)
  |     +-- EventQueue.ts         # Used by CircuitRunner to queue simulation delayed transitions events
  |     +-- SimulationState.ts    # Data Class representing the simulation state of entire circuit at a given time
  |     +-- StateManager.ts       # Utility used by CircuitRunner to manage SimulationState updates   
  |     +-- states/
  |           +-- ComponentState.ts  # Abstract class for component state
  |           +-- ...                # Components states
  |     +-- behaviors/
  |           +-- BehaviorRegistry.ts   # Maps component types to behaviors
  |           +-- ComponentBehavior.ts  # Interface for component logic
  |           +-- SwitchBehavior.ts     # Switch toggle logic
  |           +-- ...                   # Other components behaviors
  |     +-- types/  # Various enums, data classes ...
  +-- setup.ts             # Helper to register behaviors
  +-- index.ts             # Public API exports
```

### Scene Module (`src/scene/`)

The scene module handles Three.js visualization and user interaction:

```
src/scene/
  +-- CircuitEngine.ts           # Unified facade with mode switching
  +-- static/
  |     +-- CircuitController.ts # Edit mode controller
  |     +-- CircuitWriter.ts     # Writes scene changes to core model
  |     +-- SelectionManager.ts  # Tracks selected elements
  |     +-- tools/
  |           +-- BuildTool.ts       # Unified edit tool (state machine)
  |           +-- MultiSelectTool.ts # Rectangle selection + bulk operations
  |           +-- AddComponentTool.ts # Component placement tool
  +-- simulation/
  |     +-- CircuitRunnerController.ts  # Simulation mode controller
  +-- shared/
  |     +-- AbstractCircuitController.ts # Base controller class
  |     +-- EventEmitter.ts              # Type-safe event system
  |     +-- HoverManager.ts              # Raycasting hover detection
  |     +-- WireVisualManager.ts         # Wire Line2 visuals
  |     +-- BranchingPointVisualFactory.ts # BP visuals
  |     +-- components/
  |     |     +-- ComponentVisualFactory.ts  # Interface + base class
  |     |     +-- FactoryRegistry.ts         # Maps types to factories
  |     |     +-- ...                        # Components factories
  |     +-- types.ts             # Shared type definitions
  |     +-- utils/               # Geometry, camera, lighting utilities
  +-- setup.ts                   # Helper to register factories
  +-- index.ts                   # Public API exports
```

## Testing strategy

Unit tests are divided between core `tests/core` and scene `tests/scene`.
Coverage goals are : 
- 80% on `core`: this module is the foundation of the model and simulation logic, hence it must be thoroughly tested
- 60% on `scene`: coverage goal deliberately less strict to allow for more visualization tinkering

## Commands

npm test && npm run lint

## Code Style

TypeScript (strict mode), targeting ES2022: Follow standard conventions
When possible level of nested conditional structures should be minimized by using guard clauses and early returns. Examples below:
```typescript
/**
 * GOOD practice for minimizing nested conditionals
 * DO that because clearer, reduced learning/debugging overhead
 * @param input
 */
function goodExample(input: number | null): string {
  if (input === null) {
    // early return in this case  
    return 'No input provided';
  }
  // process securized input
  // Main logic (possibly big) continues here without additional nesting
  let output = input * 2;

  return `Output is ${output}`;
}
/**
 * BAD practice that increases nested conditionals
 * DON'T do that because less clear, increased learning/debugging overhead
 * @param input
 */
function badExample(input: number | null): string {
  if (input !== null) {
    // Main logic (possibly big) embedded under an if : 
    let output = input * 2;
    return `Output is ${output}`;
  }
  else {
    return 'No input provided';  
  }
}
```