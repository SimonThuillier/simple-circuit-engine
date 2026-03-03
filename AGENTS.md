# simple-circuit-engine

Educational electronic / computer circuit Build & Simulation engine with THREE.js 3D visualization.

- **Install**: `npm install simple-circuit-engine three lil-gui`
- **Imports**: `simple-circuit-engine/core` (model/simulation) | `simple-circuit-engine/scene` (Three.js visuals)
- **TypeScript**: Full type support, strict mode compatible

## Quick Start

```typescript
import { WebGLRenderer } from 'three';
import {
  Circuit,
  CircuitOptions,
  BehaviorRegistry,
  registerBasicComponentsBehaviors,
  registerGatesComponentsBehaviors,
} from 'simple-circuit-engine/core';
import {
  CircuitEngine,
  engineOptions,
  GroupedFactoryRegistry,
  DefaultVisualFactory,
  registerBasicComponentsFactories,
  registerGatesComponentsFactories,
} from 'simple-circuit-engine/scene';

// Create component factory registry and behavior registry with basic components
const componentsFactoryRegistry = registerBasicComponentsFactories(
  new GroupedFactoryRegistry(new DefaultVisualFactory())
);
registerGatesComponentsFactories(componentsFactoryRegistry); //... other groups of components if needed

const behaviorRegistry = registerBasicComponentsBehaviors(new BehaviorRegistry());
registerGatesComponentsBehaviors(behaviorRegistry); //... other groupsof components  if needed

// Instanciate and Initialize CircuitEngine (it creates and uses a new Circuit by default)
const engine = new CircuitEngine(componentsFactoryRegistry, behaviorRegistry);
const container = document.getElementById('canvas-container')!;
engine.initialize(container, engineOptions());
// set engine circuit to a new empty circuit
engine.setCircuit(new Circuit(new CircuitOptions()));

// Rendering
const renderer = new WebGLRenderer();
const width = window.innerWidth,
  height = window.innerHeight;
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Append renderer to DOM
container.appendChild(renderer.domElement);
// Animation loop to animate the circuit scene in the canvas container
function animate() {
  requestAnimationFrame(animate);
  engine.getControls().update();
  renderer.render(engine.getScene(), engine.getCamera());
}
animate();
```

## Core Module (`simple-circuit-engine/core`)

### Domain Model

- `Circuit` - Central container: components, enodes, wires
- `Component` - Electrical component (battery, switch, LED, etc.)
- `ENode` - Connection point (Component Pin or BranchingPoint)
- `Wire` - Connection between two ENodes
- `Position` - 2D grid coordinates
- `Rotation` - Discrete rotation enum

### Simulation

- `CircuitRunner` - Tick-based simulation orchestrator
- `SimulationState` - Circuit state at a given tick
- `BehaviorRegistry` - Maps ComponentType → behavior logic
- `registerBasicComponentsBehaviors()` - Registers basic components built-in behaviors

### Types

- `ComponentType` - Enum: Battery, Switch, Transistor, etc.
- `UUID` - String type alias for identifiers

## Scene Module (`simple-circuit-engine/scene`)

### Main Classes

- `CircuitEngine` - Unified facade with edit/simulation mode switching
- `CircuitController` - Edit mode: component placement, wiring, selection
- `CircuitRunnerController` - Simulation mode: animation, interaction

### Visual Factories

- `GroupedFactoryRegistry` - Register groups of components referencing types and their visual factories
- `DefaultVisualFactory` - Fallback factory for unknown types
- `registerBasicComponentsFactories()` - Registers basic components built-in factories

### Tools (Edit Mode)

- `BuildTool` - Primary unified editing tool (add/drag/move/rotate/remove/wire/copy-cut/paste one element)
- `MultiSelectTool` - Rectangle selection + bulk ops (drag, copy-cut/paste, remove multiple elements)

### Widgets

- `ComponentPicketWidget` - Widget for selecting component to add in BuildTool (edit mode)
- `ConfigPanelWidget.ts` - Widget for editing components configuration (edit mode)

### Managers

- `HoverManager` - Raycasting hover detection
- `SelectionManager` - Tracks selected elements
- `WireVisualManager` - Wire Line2 visuals

## Common Patterns

### Initialize Engine

```typescript
const engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
engine.initialize(container, engineOptions());
engine.setCircuit(new Circuit());

// Add Component Programmatically
const battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0));
const led = circuit.addComponent(ComponentType.SmallLED, new Position(2, 0));

// Connect Components
const wire = circuit.addWire(battery.pins[0], led.pins[1]);

// Switch Modes
engine.setMode('simulation'); // Start simulation
engine.setMode('edit');       // Back to editing

// Listen to Events
engine.on('componentAdded', (component) => { ... });
engine.on('simulationTick', (state) => { ... });
```

## Non-Goals / Limitations

### Non-Goals

- **NOT realistic physics**: This is a discrete graph model, not SPICE
- **No analog simulation**: No voltage drops, current limiting, etc.
- **Circuit states are boolean**: Tension/current are on/off, not continuous values
- **NOT for production circuits**: Educational purposes only

### Do NOT

- Attempt to add analog physics simulation
- Expect continuous voltage/current values
- Use for real circuit design validation

## Required Peer Dependencies

```json
{
  "three": "^0.181.0",
  "lil-gui": "^0.21.0"
}
```
