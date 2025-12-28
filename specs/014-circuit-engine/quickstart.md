# Quickstart: CircuitEngine Integration

**Feature**: 014-circuit-engine
**Date**: 2025-12-22

## Overview

CircuitEngine is the unified entry point for simple-circuit-engine. It combines circuit editing (static) and simulation (live) capabilities into a single, easy-to-use facade.

## Installation

```bash
npm install simple-circuit-engine
```

## Basic Usage (5 Lines)

```typescript
import { CircuitEngine, FactoryRegistry, DefaultVisualFactory, BehaviorRegistry } from 'simple-circuit-engine';

const engine = new CircuitEngine(new FactoryRegistry(new DefaultVisualFactory()), new BehaviorRegistry());
engine.initialize(document.getElementById('canvas-container')!);
engine.setCircuit(myCircuit);
// Ready to use! Engine starts in edit mode by default.
```

## Rendering Loop

CircuitEngine does not include its own render loop. You must provide one:

```typescript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  engine.getControls()?.update(); // Update MapControls (required for damping)
  renderer.render(engine.getScene(), engine.getCamera());
}
animate();
```

## Mode Switching

### Switch to Simulation Mode

```typescript
// From edit mode → simulation mode
engine.setMode('simulation');

// Start playback
engine.play();

// Or step through manually
engine.step();

// Pause
engine.pause();

// Stop and reset
engine.stop();
```

### Switch Back to Edit Mode

```typescript
// From simulation mode → edit mode
engine.setMode('edit');

// Activate a tool
engine.setActiveTool('build');
```

## Event Handling

Subscribe to events once - works across both modes:

```typescript
// Listen for mode changes
engine.on('modeChanged', ({ mode, previousMode }) => {
  console.log(`Mode changed: ${previousMode} → ${mode}`);
});

// Listen for hover events (works in both modes)
engine.on('hover', ({ objectId, objectType }) => {
  console.log(`Hovering: ${objectType} ${objectId}`);
});

// Listen for simulation ticks (only fires in simulation mode)
engine.on('simulationTick', ({ tick, dirty }) => {
  console.log(`Tick ${tick}: ${dirty.components.size} components updated`);
});

// Listen for tool changes (only fires in edit mode)
engine.on('toolActivated', ({ toolType }) => {
  console.log(`Tool activated: ${toolType}`);
});
```

## Full Example

```typescript
import * as THREE from 'three';
import {
  CircuitEngine,
  FactoryRegistry,
  DefaultVisualFactory,
  BehaviorRegistry,
  Circuit
} from 'simple-circuit-engine';

// Setup container
const container = document.getElementById('circuit-container')!;

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Create engine
const factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
const behaviorRegistry = new BehaviorRegistry();
const engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

// Initialize with options
engine.initialize(container, {
  initialMode: 'edit',
  mapControls: {
    enableRotate: false, // 2D-only view
    maxDistance: 50
  }
});

// Subscribe to events
engine.on('ready', () => console.log('Engine ready!'));
engine.on('modeChanged', ({ mode }) => updateUI(mode));
engine.on('circuitLoaded', ({ name }) => console.log(`Loaded: ${name}`));

// Load a circuit
const circuit = Circuit.fromJSON(circuitData);
engine.setCircuit(circuit);

// Render loop
function animate() {
  requestAnimationFrame(animate);
  engine.getControls()?.update();
  renderer.render(engine.getScene(), engine.getCamera());
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height);
  engine.onContainerResize(width, height);
});

// UI handlers
function startSimulation() {
  engine.setMode('simulation');
  engine.play();
}

function stopSimulation() {
  engine.setMode('edit');
}

// Cleanup on unmount
function cleanup() {
  engine.dispose();
  renderer.dispose();
}
```

## Advanced: Direct Controller Access

For advanced use cases, you can access the underlying controllers:

```typescript
// Edit controller - for custom tool integration
const editCtrl = engine.getEditController();
editCtrl.addComponent('resistor', position, rotation);
editCtrl.removeWire(wireId);

// Simulation controller - for custom simulation control
const simCtrl = engine.getSimulationController();
simCtrl.tickInterval = 250; // Faster ticks
```

**Warning**: Direct controller manipulation may conflict with facade state management. Prefer facade methods when possible.

## API Reference

### Constructor

```typescript
new CircuitEngine(factoryRegistry: IFactoryRegistry, behaviorRegistry: BehaviorRegistry)
```

### Lifecycle Methods

| Method | Description |
|--------|-------------|
| `initialize(container, options?)` | Initialize with DOM container |
| `dispose()` | Clean up all resources |

### Mode Management

| Property/Method | Description |
|-----------------|-------------|
| `mode` | Current mode ('edit' \| 'simulation') |
| `setMode(mode)` | Switch modes |

### Circuit Management

| Method | Description |
|--------|-------------|
| `setCircuit(circuit)` | Load a circuit |
| `getCircuit()` | Get loaded circuit |

### Edit Mode Operations

| Method | Description |
|--------|-------------|
| `setActiveTool(type)` | Activate an editing tool |
| `getActiveTool()` | Get active tool |
| `setEditModeEnabled(bool)` | Enable/disable edit mode |

### Simulation Mode Operations

| Method | Description |
|--------|-------------|
| `play()` | Start playback |
| `pause()` | Pause playback |
| `step()` | Single tick |
| `stop()` | Stop and reset |
| `isPlaying` | Playback state |
| `currentTick` | Current tick number |
| `tickInterval` | Tick interval (ms) |

### Three.js Access

| Method | Description |
|--------|-------------|
| `getScene()` | Three.js scene |
| `getCamera()` | Perspective camera |
| `getControls()` | MapControls |
| `onContainerResize(w?, h?)` | Handle resize |
