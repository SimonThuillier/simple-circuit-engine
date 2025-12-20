# Quickstart: Circuit Runner Controller

**Date**: 2025-12-20
**Feature**: 013-circuit-runner-controller

## Overview

This guide explains how to use the CircuitRunnerController to run and visualize circuit simulations with interactive components.

## Basic Usage

### 1. Create and Initialize Controller

```typescript
import { CircuitRunnerController } from 'simple-circuit-engine/scene/simulation';
import { FactoryRegistry } from 'simple-circuit-engine/scene/shared';

// Create factory registry with component visual factories
const factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
factoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
factoryRegistry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());
factoryRegistry.register(ComponentType.Battery, new BatteryVisualFactory());

// Create controller
const controller = new CircuitRunnerController(factoryRegistry);

// Initialize with DOM container
const container = document.getElementById('circuit-view');
controller.initialize(container);
```

### 2. Load a Circuit with Simulation

```typescript
import { CircuitRunner } from 'simple-circuit-engine/core/simulation';
import { BehaviorRegistry } from 'simple-circuit-engine/core/simulation/behaviors';

// Load circuit from JSON
const circuit = Circuit.fromJSON(circuitData);

// Create behavior registry
const behaviorRegistry = new BehaviorRegistry();
behaviorRegistry.register(ComponentType.Switch, new SwitchBehavior());
behaviorRegistry.register(ComponentType.SmallLED, new SmallLEDBehavior());
behaviorRegistry.register(ComponentType.Battery, new BatteryBehavior());

// Create runner
const runner = new CircuitRunner(circuit, behaviorRegistry);

// Load into controller (starts paused)
controller.setCircuitRunner(runner);
```

### 3. Control Simulation Playback

```typescript
// Start simulation
controller.play();

// Pause simulation
controller.pause();

// Step one tick (useful for debugging)
controller.step();

// Adjust simulation speed (ms between ticks)
controller.tickInterval = 250;  // Faster: 4 ticks/second
controller.tickInterval = 1000; // Slower: 1 tick/second
```

### 4. Query Simulation State

```typescript
// Check if playing
if (controller.isPlaying) {
  console.log('Simulation is running');
}

// Get current tick
console.log(`Current tick: ${controller.currentTick}`);
```

### 5. Listen for Events

```typescript
// Simulation started
controller.on('simulationStarted', ({ tick }) => {
  console.log(`Simulation started at tick ${tick}`);
});

// Simulation paused
controller.on('simulationPaused', ({ tick }) => {
  console.log(`Simulation paused at tick ${tick}`);
});

// Each tick during playback
controller.on('simulationTick', ({ tick, dirty }) => {
  console.log(`Tick ${tick}: ${dirty.components.size} components changed`);
});

// Single step completed
controller.on('simulationStepped', ({ tick, result }) => {
  console.log(`Stepped to tick ${tick}`);
});
```

### 6. Interactive Components

Switches can be toggled by clicking on them during simulation:

```typescript
// No special setup needed - clicks are handled automatically
// When user clicks a Switch component:
// 1. Controller detects click on Switch
// 2. Submits toggle_switch command to CircuitRunner
// 3. Switch begins state transition on next tick
// 4. Visual updates automatically via updateAnimation
```

## Visual State Guide

### Wire Colors

| State | Color | Meaning |
|-------|-------|---------|
| White | No electrical activity | Wire is idle |
| Red | Voltage present, no current | Connected to voltage source but circuit incomplete |
| Blue | Current flowing | Complete circuit with current (takes priority over red) |

### ENode (Pin) Indicators

| Visual | Meaning |
|--------|---------|
| Bronze (no glow) | No electrical activity |
| Red glow | Voltage present |
| Blue glow | Current flowing (takes priority) |

### Component Animations

- **Switch**: Contactor rotates between open/closed positions
- **LED**: Emissive yellow glow when lit

## Complete Example

```typescript
import {
  CircuitRunnerController,
  FactoryRegistry,
  SwitchVisualFactory,
  SmallLEDVisualFactory,
  BatteryVisualFactory,
  DefaultVisualFactory,
} from 'simple-circuit-engine/scene';

import {
  Circuit,
  CircuitRunner,
  BehaviorRegistry,
  SwitchBehavior,
  SmallLEDBehavior,
  BatteryBehavior,
} from 'simple-circuit-engine/core';

// Setup
const factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
factoryRegistry.register('Switch', new SwitchVisualFactory());
factoryRegistry.register('SmallLED', new SmallLEDVisualFactory());
factoryRegistry.register('Battery', new BatteryVisualFactory());

const controller = new CircuitRunnerController(factoryRegistry);
controller.initialize(document.getElementById('app'));

// Load circuit
const circuit = await fetch('/circuits/switch-led.json')
  .then(r => r.json())
  .then(Circuit.fromJSON);

const behaviorRegistry = new BehaviorRegistry();
behaviorRegistry.register('Switch', new SwitchBehavior());
behaviorRegistry.register('SmallLED', new SmallLEDBehavior());
behaviorRegistry.register('Battery', new BatteryBehavior());

const runner = new CircuitRunner(circuit, behaviorRegistry);
controller.setCircuitRunner(runner);

// UI Controls
document.getElementById('play-btn').onclick = () => controller.play();
document.getElementById('pause-btn').onclick = () => controller.pause();
document.getElementById('step-btn').onclick = () => controller.step();

document.getElementById('speed-slider').oninput = (e) => {
  controller.tickInterval = parseInt(e.target.value);
};

// Status display
controller.on('simulationTick', ({ tick }) => {
  document.getElementById('tick-display').textContent = `Tick: ${tick}`;
});

// Start simulation
controller.play();
```

## Cleanup

```typescript
// Always dispose when done
controller.dispose();
```

This properly cleans up:
- Simulation loop (stops interval)
- Three.js resources
- Event listeners
- DOM references
