# Architecture Overview

Simple Circuit Engine follows a **Model-Controller** architecture with clear separation between:
- **Core module** (`src/core/`): Pure TypeScript domain model and simulation engine (no dependencies)
- **Scene module** (`src/scene/`): Three.js visualization layer with editing tools and controllers

This is NOT a hexagonal/ports-and-adapters architecture. The design prioritizes simplicity and clear data flow over strict layering.

## High-Level Architecture

```
                    +-----------------------+
                    |    CircuitEngine      |  <-- Unified facade for edit/simulation
                    |  (Mode Switching)     |
                    +-----------+-----------+
                                |
            +-------------------+-------------------+
            |                                       |
  +---------v---------+                   +---------v---------+
  | CircuitController |                   | CircuitRunner-    |
  |   (Edit Mode)     |                   | Controller        |
  |                   |                   | (Simulation Mode) |
  +---------+---------+                   +---------+---------+
            |                                       |
            |     +--------------------+            |
            +---->|  Shared Resources  |<-----------+
                  |  (Scene, Camera,   |
                  |   Factories, etc.) |
                  +---------+----------+
                            |
            +---------------+---------------+
            |               |               |
  +---------v-----+  +------v------+  +-----v-------+
  | WireVisual-   |  | Factory-    |  | Hover-      |
  | Manager       |  | Registry    |  | Manager     |
  +---------+-----+  +------+------+  +-----+-------+
            |               |               |
            +-------+-------+-------+-------+
                    |               |
          +---------v-----+  +------v------+
          |  Circuit      |  | CircuitRunner|
          |  (Core Model) |  | (Simulation) |
          +---------------+  +-------------+
```

## Module Structure

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

## Design Patterns

### 1. Registry Pattern

Both behaviors and visual factories use registries for extensibility:

```typescript
// Core: Behavior Registry
const behaviorRegistry = new BehaviorRegistry();
behaviorRegistry.register(new SwitchBehavior());
behaviorRegistry.register(new BatteryBehavior());

// Scene: Factory Registry
const factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
factoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
factoryRegistry.register(ComponentType.Battery, new BatteryVisualFactory());
```

This allows:
- Adding new component types without modifying existing code
- Custom behaviors/visuals for specific applications
- Fallback handling for unknown types

### 2. State Machine Pattern

The `BuildTool` implements a state machine for unified editing:

```
                    +-------+
                    | idle  |
                    +---+---+
                        |
        +---------------+---------------+
        |               |               |
        v               v               v
+-------+-----+  +------+------+  +-----+-------+
|wire_creation|  |component_drag|  | wire_drag  |
+-------------+  +-------------+  +-------------+

State Transitions:
- idle -> wire_creation:   Click on enode (pin/branching point)
- idle -> component_drag:  Pointerdown on selected component
- idle -> wire_drag:       Click on wire intermediate point
- * -> idle:               Pointerup, Escape, or operation complete
```

Each state has associated data:
- `WireCreationState`: sourceEnodeId, previewWire, etc.
- `ComponentDragState`: componentId, initialPosition
- `WireDragState`: wireId, pointIndex, originalPositions

### 3. Event Emitter Pattern

Type-safe event emission for decoupled communication:

```typescript
interface ControllerEventMap {
  ready: { controllerType: 'static' | 'simulation' | 'engine' };
  hover: { objectId: UUID; objectType: CircuitSceneObjectType; userData?: HitboxUserData };
  circuitElementAction: { type: HoverableType; action: ModelEditAction; id?: UUID };
  simulationTick: { tick: number; dirty: unknown };
  // ... more events
}

class Controller extends EventEmitter<ControllerEventMap> {
  // Type-safe emit and subscribe
  this.emit('hover', { objectId: id, objectType: 'component' });
}
```

### 4. Facade Pattern

`CircuitEngine` provides a unified interface for mode switching:

```typescript
const renderer = new THREE.WebGLRenderer({ antialias: true });
const engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
engine.initialize(container, renderer);
container.appendChild(renderer.domElement);
engine.setCircuit(circuit);

// Switch modes
engine.setMode('edit');       // Editing tools active
engine.setMode('simulation'); // Simulation playback active

// Unified event handling
engine.on('modeChanged', ({ mode, previousMode }) => {
  console.log(`Switched from ${previousMode} to ${mode}`);
});
```

### 5. Factory Pattern

Visual factories create Three.js representations:

```typescript
abstract class ComponentVisualFactoryBase implements IComponentVisualFactory {
  abstract createVisual(component: Component): THREE.Object3D;

  // Shared methods
  applyHover(object3D: THREE.Object3D): void { /* emissive glow */ }
  removeHover(object3D: THREE.Object3D): void { /* remove glow */ }
  updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void { /* override */ }
}
```

### 6. Command Pattern (Simulation)

User interactions during simulation are modeled as commands:

```typescript
interface UserCommand {
  type: 'toggle_switch' | 'set_value' | ...;
  targetId: UUID;
  scheduledAtTick: number;
  parameters?: Map<string, string>;
}

// Submit to runner
runner.submitCommand({
  type: 'toggle_switch',
  targetId: switchId,
  scheduledAtTick: runner.getCurrentTick(),
  parameters: new Map([['tickCount', '5']]),
});
```

## Data Flow

### Edit Mode Flow

```
User Input (mouse/keyboard)
        |
        v
   BuildTool (or other editing tool)
        |
        v
   CircuitWriter (scene -> core conversion)
        |
        v
   Circuit (core model update)
        |
        v
   Event emission (circuitElementAction)
        |
        v
   Visual update (WireVisualManager, etc.)
```

### Simulation Mode Flow

```
   CircuitRunner.tick()
        |
        v
   ConductivitySolver (propagate electrical state)
        |
        v
   Behaviors.onPinsChange() / onEventFiring()
        |
        v
   DirtyTracker (track changed elements)
        |
        v
   CircuitRunnerController._updateDirty*()
        |
        v
   Visual updates (updateAnimation, wire colors, etc.)
```

### Mode Switching Flow

```
   engine.setMode('simulation')
        |
        v
   CircuitController.setActive(false)
   - Deactivates tools
   - Saves current state
        |
        v
   CircuitRunnerController.setActive(true)
   - Creates new CircuitRunner
   - Full visual update from simulation state
   - Ready for play/pause/step
```

## Key Abstractions

### Circuit (Core)

Central domain model containing:
- `components: Map<UUID, Component>` - All circuit components
- `wires: Map<UUID, Wire>` - All wire connections
- `enodes: Map<UUID, ENode>` - All electrical nodes
- `metadata: CircuitMetadata` - Name, size, camera settings

Key methods:
- `addComponent()`, `removeComponent()` - Component CRUD
- `addWire()`, `removeWire()` - Wire CRUD
- `addBranchingPoint()`, `removeBranchingPoint()` - BP CRUD
- `splitWire()` - Insert branching point into wire

### AbstractCircuitController (Scene)

Base class providing:
- Three.js scene, camera, controls management
- HoverManager integration
- Visual object tracking maps
- Event emission infrastructure

### CircuitController (Edition)

Manages edit mode:
- `registerTool()` - Add custom editing tools
- `setActiveTool()` - Enable/disable editing tools
- `getSelectedElements()` - Query current selection
- `circuitWriter` - Access to scene-to-core synchronization

### CircuitRunner (Simulation)

Orchestrates tick-based simulation:
- `tick()` - Advance simulation by one step
- `submitCommand()` - Queue user interaction
- `getComponentState()` - Query current state
- `dirtyTracker` - Access changed elements

### CircuitEngine (Unified Facade)

Combines edit and simulation controllers allowing to seamlessly switch modes by efficiently managing shared resources:
- `setMode('edit' | 'simulation')` - Switch between modes

### SharedResources

Resources shared between edit and simulation controllers When they are used beneath CircuitEngine:
- `scene: THREE.Scene`
- `camera: THREE.PerspectiveCamera`
- `mapControls: MapControls`
- `factoryRegistry: IFactoryRegistry`
- `wireVisualManager: WireVisualManager`
- `hoverManager: HoverManager`
- Object tracking maps : maps from core model IDs to Three.js Object3D group objects

## Dependency Direction

```
   scene module
       |
       | depends on
       v
   core module
```

The core module has NO knowledge of the scene module. This allows:
- Core logic to be used without visualization
- Headless testing of simulation
- Alternative UI implementations

## Extension Points

1. **New Component Types**
   - Add to `ComponentType` enum
   - Create behavior class implementing `ComponentBehavior`
   - Create visual factory extending `ComponentVisualFactoryBase`
   - Register both in respective registries

2. **Custom Tools**
   - Implement `IEditingTool` interface
   - Register with `CircuitController.registerTool()`

3. **Additional Events**
   - Extend `ControllerEventMap` interface
   - Use `emit()` and `on()` with new event types

4. **Custom Visuals**
   - Override `ComponentVisualFactoryBase` methods
   - Use Three.js primitives or imported models

## Thread Safety Considerations

The engine is designed for single-threaded browser execution:
- No concurrent access to core model
- Event handlers execute synchronously
- Animation frames are serialized via `requestAnimationFrame`
