# Quickstart: Circuit Simulation Engine

**Feature**: Discrete-Time Circuit Simulation Engine
**Audience**: Developers integrating or extending the simulation engine
**Date**: 2025-11-30

## Overview

The Circuit Simulation Engine provides step-by-step discrete-time simulation of boolean electrical circuits. This guide demonstrates how to use the simulation engine for common scenarios.

---

## Prerequisites

- TypeScript project with `simple-circuit-engine` installed
- Familiarity with Circuit, Component, ENode, Wire classes
- Understanding of event-driven APIs

---

## Quick Example: Simulating a Battery → LED Circuit

```typescript
import { Circuit, CircuitRunner, ComponentType, Position, Rotation } from 'simple-circuit-engine';

// 1. Create circuit topology
const circuit = new Circuit('Simple LED Circuit');

const battery = circuit.addComponent(
  ComponentType.Battery,
  new Position(0, 0),
  new Rotation(0)
);

const led = circuit.addComponent(
  ComponentType.LED,
  new Position(10, 0),
  new Rotation(0)
);

const wire = circuit.addWire(
  battery.pins[0],  // Battery positive terminal
  led.pins[0]       // LED anode
);

// 2. Create simulation runner
const runner = new CircuitRunner(circuit);

// 3. Run one simulation step
runner.step();

// 4. Query LED state
const ledState = runner.getComponentState(led.id);
console.log(`LED state: ${ledState?.state}`);  // "on"

const wireState = runner.getWireState(wire.id);
console.log(`Wire has voltage: ${wireState?.hasVoltage}`);  // true
console.log(`Wire has current: ${wireState?.hasCurrent}`);  // true
```

**Result**: The battery powers the LED in a single step.

---

## Common Use Cases

### 1. Interactive Components (Switch)

```typescript
import { Circuit, CircuitRunner, ComponentType } from 'simple-circuit-engine';

// Create circuit: Battery → Switch → LED
const circuit = new Circuit();
const battery = circuit.addComponent(ComponentType.Battery, ...);
const switchComp = circuit.addComponent(ComponentType.Switch, ...);
const led = circuit.addComponent(ComponentType.LED, ...);

circuit.addWire(battery.pins[0], switchComp.pins[0]);
circuit.addWire(switchComp.pins[1], led.pins[0]);

// Create runner
const runner = new CircuitRunner(circuit);

// Initial state: switch open, LED off
runner.step();
const ledState1 = runner.getComponentState(led.id);
console.log(ledState1?.state);  // "off"

// Toggle switch to closed
runner.executeCommand('toggle_switch', switchComp.id);
runner.step();

// LED is now on
const ledState2 = runner.getComponentState(led.id);
console.log(ledState2?.state);  // "on"
```

---

### 2. Delayed Transitions (Transistor)

```typescript
import { Circuit, CircuitRunner, ComponentType } from 'simple-circuit-engine';

// Circuit with transistor (3-step activation delay)
const circuit = new Circuit();
const battery = circuit.addComponent(ComponentType.Battery, ...);
const transistor = circuit.addComponent(ComponentType.Transistor, ...);
const led = circuit.addComponent(ComponentType.LED, ...);

// Configure transistor with 3-step delay
transistor.config.set('activationDelay', '3');

circuit.addWire(battery.pins[0], transistor.pins[0]);  // Gate
circuit.addWire(transistor.pins[1], led.pins[0]);      // Collector → LED

const runner = new CircuitRunner(circuit);

// Step 0: Apply voltage to gate
runner.step();
let transistorState = runner.getComponentState(transistor.id);
console.log(transistorState?.state);  // "activating"
console.log(transistorState?.delayCounter);  // 3

// Step 1: Delay counter decrements
runner.step();
transistorState = runner.getComponentState(transistor.id);
console.log(transistorState?.delayCounter);  // 2

// Step 2: Delay counter continues
runner.step();
transistorState = runner.getComponentState(transistor.id);
console.log(transistorState?.delayCounter);  // 1

// Step 3: Transistor activates, LED turns on
runner.step();
transistorState = runner.getComponentState(transistor.id);
console.log(transistorState?.state);  // "active"

const ledState = runner.getComponentState(led.id);
console.log(ledState?.state);  // "on"
```

---

### 3. History Tracking for Debugging

```typescript
import { Circuit, CircuitRunner } from 'simple-circuit-engine';

const circuit = /* ... create circuit ... */;

// Enable history with 100-step limit
const runner = new CircuitRunner(circuit, {
  enableHistory: true,
  historyLimit: 100
});

// Run simulation for 10 steps
for (let i = 0; i < 10; i++) {
  runner.step();
}

// Query historical state at tick 5
const pastState = runner.getStateAt(5);
if (pastState) {
  console.log(`At tick ${pastState.tick}:`);
  pastState.componentStates.forEach((state, id) => {
    console.log(`  Component ${id}: ${state.state}`);
  });
}

// Current state
console.log(`Current tick: ${runner.getCurrentTick()}`);  // 10
```

---

### 4. Optimized Rendering with Dirty Tracking

```typescript
import { Circuit, CircuitRunner } from 'simple-circuit-engine';

const circuit = /* ... */;
const runner = new CircuitRunner(circuit);

function renderLoop() {
  // Advance simulation
  runner.step();

  // Check if anything changed
  if (runner.hasDirtyElements()) {
    const dirty = runner.getDirtyElements();

    // Update only changed visuals
    dirty.components.forEach(id => {
      updateComponentVisual(id, runner.getComponentState(id));
    });

    dirty.wires.forEach(id => {
      updateWireVisual(id, runner.getWireState(id));
    });

    dirty.enodes.forEach(id => {
      updateEnodeVisual(id, runner.getEnodeState(id));
    });
  }

  requestAnimationFrame(renderLoop);
}

renderLoop();
```

---

### 5. Event-Driven Updates

```typescript
import { Circuit, CircuitRunner } from 'simple-circuit-engine';

const circuit = /* ... */;
const runner = new CircuitRunner(circuit);

// Listen for state changes
runner.on('state-changed', (changes) => {
  console.log(`${changes.components.length} components changed`);
  console.log(`${changes.wires.length} wires changed`);
  console.log(`${changes.enodes.length} enodes changed`);
});

// Listen for each tick
runner.on('tick', (tick) => {
  console.log(`Simulation advanced to tick ${tick}`);
});

// Listen for commands
runner.on('command-executed', (cmd) => {
  console.log(`Command ${cmd.commandType} executed on ${cmd.targetComponentId}`);
});

// Run simulation
runner.step();  // Triggers events
```

---

### 6. Scheduled Commands (Future Interactions)

```typescript
import { Circuit, CircuitRunner } from 'simple-circuit-engine';

const circuit = /* ... */;
const runner = new CircuitRunner(circuit);

// Schedule switch toggle at tick 10
runner.queueCommand({
  tick: 10,
  commandType: 'toggle_switch',
  targetComponentId: switchId,
  params: undefined
});

// Schedule another toggle at tick 20
runner.queueCommand({
  tick: 20,
  commandType: 'toggle_switch',
  targetComponentId: switchId,
  params: undefined
});

// Run simulation - commands execute automatically at scheduled ticks
for (let i = 0; i < 25; i++) {
  runner.step();
}
```

---

### 7. Custom Component Behaviors

```typescript
import { CircuitRunner, ComponentBehavior, ComponentState, Component } from 'simple-circuit-engine';

// Define custom AND gate behavior
class ANDGateState extends ComponentState {
  constructor(componentId: UUID) {
    super(componentId, 'off');
  }
}

class ANDGateBehavior implements ComponentBehavior {
  createInitialState(component: Component): ComponentState {
    return new ANDGateState(component.id);
  }

  evaluate(
    component: Component,
    currentState: ComponentState,
    inputStates: NodeElectricalState[],
    tick: number
  ): ScheduledEvent[] {
    // AND gate: output on if ALL inputs have voltage
    const allInputsHigh = inputStates.every(input => input.hasVoltage);
    currentState.state = allInputsHigh ? 'on' : 'off';
    return [];  // No delayed transitions
  }
}

// Register behavior globally before creating runners
CircuitRunner.registerBehavior(
  ComponentType.ANDGate,
  new ANDGateBehavior()
);

// Now circuits with AND gates can be simulated
const circuit = /* ... circuit with AND gate ... */;
const runner = new CircuitRunner(circuit);
runner.step();
```

---

## Integration with CircuitEngine Facade

```typescript
import { CircuitEngine } from 'simple-circuit-engine';

const engine = new CircuitEngine(document.getElementById('canvas'));

// Load circuit (internally creates CircuitRunner)
engine.loadCircuit(circuitData);

// Step simulation (delegates to CircuitRunner)
engine.step();

// Get dirty elements for rendering
const dirty = engine.getDirtyElements();
// ... update Three.js scene based on dirty elements

// Events propagate from CircuitRunner
engine.on('tick', (tick) => {
  console.log(`Tick ${tick}`);
});
```

---

## Performance Best Practices

### 1. Disable History for Production

```typescript
// Development (with debugging)
const devRunner = new CircuitRunner(circuit, {
  enableHistory: true,
  historyLimit: 1000
});

// Production (performance mode)
const prodRunner = new CircuitRunner(circuit, {
  enableHistory: false  // Default, saves memory
});
```

### 2. Batch Steps for Fast-Forward

```typescript
// Run 100 steps without rendering
for (let i = 0; i < 100; i++) {
  runner.step();
}

// Then update visuals once
const dirty = runner.getDirtyElements();
updateVisuals(dirty);
```

### 3. Use Dirty Tracking to Avoid Full Re-renders

```typescript
// ❌ BAD: Always re-render everything
runner.step();
rerenderEntireCircuit();

// ✅ GOOD: Only update what changed
runner.step();
if (runner.hasDirtyElements()) {
  const dirty = runner.getDirtyElements();
  updateOnlyDirtyElements(dirty);
}
```

### 4. Limit History Size for Long Simulations

```typescript
// For 10,000+ step simulations, limit history
const runner = new CircuitRunner(circuit, {
  enableHistory: true,
  historyLimit: 100  // Only keep last 100 steps
});

// Or disable history entirely
const runner = new CircuitRunner(circuit);
```

---

## Common Pitfalls

### ❌ Modifying Circuit During Simulation

```typescript
const runner = new CircuitRunner(circuit);
runner.step();

// ❌ DON'T: Modify circuit topology during simulation
circuit.addComponent(...);  // Undefined behavior!

// ✅ DO: Reset or create new runner
runner.reset();
circuit.addComponent(...);
const newRunner = new CircuitRunner(circuit);
```

### ❌ Forgetting to Step

```typescript
// ❌ State doesn't change without stepping
const runner = new CircuitRunner(circuit);
runner.executeCommand('toggle_switch', switchId);
const ledState = runner.getComponentState(ledId);
console.log(ledState?.state);  // Still "off" - command hasn't propagated!

// ✅ Step to propagate changes
runner.executeCommand('toggle_switch', switchId);
runner.step();  // Now command takes effect
const ledState = runner.getComponentState(ledId);
console.log(ledState?.state);  // "on"
```

### ❌ Accessing History When Disabled

```typescript
const runner = new CircuitRunner(circuit);  // History disabled by default
runner.step();
runner.step();

const pastState = runner.getStateAt(0);
console.log(pastState);  // undefined - history not enabled!

// ✅ Enable history if needed
const runner = new CircuitRunner(circuit, { enableHistory: true });
```

---

## Testing Simulation Logic

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { Circuit, CircuitRunner, ComponentType } from 'simple-circuit-engine';

describe('CircuitRunner - Basic Simulation', () => {
  it('should power LED from battery', () => {
    // Arrange
    const circuit = new Circuit();
    const battery = circuit.addComponent(ComponentType.Battery, ...);
    const led = circuit.addComponent(ComponentType.LED, ...);
    circuit.addWire(battery.pins[0], led.pins[0]);

    const runner = new CircuitRunner(circuit);

    // Act
    runner.step();

    // Assert
    const ledState = runner.getComponentState(led.id);
    expect(ledState?.state).toBe('on');

    const wireState = runner.getWireState(wire.id);
    expect(wireState?.hasVoltage).toBe(true);
    expect(wireState?.hasCurrent).toBe(true);
  });
});
```

### Integration Test Example

```typescript
describe('CircuitRunner - Switch Circuit', () => {
  it('should control LED with switch', () => {
    // Arrange
    const circuit = new Circuit();
    const battery = circuit.addComponent(ComponentType.Battery, ...);
    const switchComp = circuit.addComponent(ComponentType.Switch, ...);
    const led = circuit.addComponent(ComponentType.LED, ...);
    circuit.addWire(battery.pins[0], switchComp.pins[0]);
    circuit.addWire(switchComp.pins[1], led.pins[0]);

    const runner = new CircuitRunner(circuit);

    // Act: Step with switch open
    runner.step();
    const ledStateOff = runner.getComponentState(led.id);

    // Act: Close switch
    runner.executeCommand('toggle_switch', switchComp.id);
    runner.step();
    const ledStateOn = runner.getComponentState(led.id);

    // Assert
    expect(ledStateOff?.state).toBe('off');
    expect(ledStateOn?.state).toBe('on');
  });
});
```

---

## Next Steps

1. **Read the full API**: See [CircuitRunner-API.md](./contracts/CircuitRunner-API.md)
2. **Explore data model**: See [data-model.md](./data-model.md)
3. **Understand architecture**: See [research.md](./research.md)
4. **Try examples**: Check `demo/` directory for interactive examples
5. **Write tests**: Follow TDD for implementing new component behaviors

---

## Troubleshooting

### Issue: Performance degradation after many steps

**Solution**: Disable history or reduce history limit
```typescript
const runner = new CircuitRunner(circuit, { enableHistory: false });
```

### Issue: Component behavior not registered

**Error**: "Component with unregistered behavior"

**Solution**: Register behavior before creating runner
```typescript
CircuitRunner.registerBehavior(ComponentType.MyComponent, new MyBehavior());
```

### Issue: Commands not executing

**Cause**: Commands queued for future ticks don't execute until those ticks

**Solution**: Step simulation to reach command tick
```typescript
runner.queueCommand({ tick: 10, ... });
for (let i = 0; i <= 10; i++) {
  runner.step();  // Command executes at tick 10
}
```

---

## Resources

- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [CircuitRunner API](./contracts/CircuitRunner-API.md)
- [Research & Architecture](./research.md)
- [Constitution](./../../../.specify/memory/constitution.md)

---

**Last Updated**: 2025-11-30
