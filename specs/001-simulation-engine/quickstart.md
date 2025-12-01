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
import { Circuit, CircuitRunner, BehaviorRegistry, BatteryBehavior, SmallLEDBehavior, ComponentType, Position, Rotation } from 'simple-circuit-engine';

// 1. Create circuit topology
const circuit = new Circuit('Simple LED Circuit');

const battery = circuit.addComponent(
  ComponentType.Battery,
  new Position(0, 0),
  new Rotation(0)
);

const led = circuit.addComponent(
  ComponentType.SmallLED,
  new Position(10, 0),
  new Rotation(0)
);

const wire1 = circuit.addWire(
  battery.pins[0],  // Battery cathode (voltage source)
  led.pins[0]       // LED anode
);
const wire2 = circuit.addWire(
  battery.pins[1],  // Battery anode (current source)
  led.pins[1]       // LED cathode
);

// 2. Create behavior registry and register behaviors
const registry = new BehaviorRegistry();
registry.register(new BatteryBehavior());
registry.register(new SmallLEDBehavior());

// 3. Create simulation runner
const runner = new CircuitRunner(circuit, registry);

// 4. Run one simulation step
const result = runner.tick();
console.log(`Tick ${result.startTick} → ${result.endTick}`);
console.log(`Components updated: ${result.componentUpdateCount}`);

// 5. Query LED state
const ledState = runner.getComponentState(led.id);
console.log(`LED state: ${ledState?.state}`);  // "goingOn" (transitioning)

// Run another tick for LED to fully turn on
runner.tick();
const ledStateAfter = runner.getComponentState(led.id);
console.log(`LED state: ${ledStateAfter?.state}`);  // "on"

const wireState = runner.getWireState(wire1.id);
console.log(`Wire has voltage: ${wireState?.hasVoltage}`);  // true
console.log(`Wire has current: ${wireState?.hasCurrent}`);  // false
```

**Result**: The battery powers the LED, which transitions to "on" state after delay.

---

## Common Use Cases

### 1. Interactive Components (Switch)

```typescript
import { Circuit, CircuitRunner, BehaviorRegistry, BatteryBehavior, SwitchBehavior, SmallLEDBehavior, ComponentType } from 'simple-circuit-engine';

// Create circuit: Battery → Switch → LED
const circuit = new Circuit();
const battery = circuit.addComponent(ComponentType.Battery, ...);
const switchComp = circuit.addComponent(ComponentType.Switch, ...);
const led = circuit.addComponent(ComponentType.SmallLED, ...);

circuit.addWire(battery.pins[0], switchComp.pins[0]);
circuit.addWire(switchComp.pins[1], led.pins[0]);
circuit.addWire(battery.pins[1], led.pins[1]);

// Create registry and runner
const registry = new BehaviorRegistry();
registry.registerAll([new BatteryBehavior(), new SwitchBehavior(), new SmallLEDBehavior()]);
const runner = new CircuitRunner(circuit, registry);

// Initial state: switch open, LED off
runner.tick();
const ledState1 = runner.getComponentState(led.id);
console.log(ledState1?.state);  // "off"

// Toggle switch to closed
runner.submitCommand({
  type: 'toggle_switch',
  targetId: switchComp.id,
  scheduledAtTick: runner.getCurrentTick(),
  parameters: null
});
runner.tick();  // Switch goes to "closing" state
runner.tick();  // Switch reaches "closed", LED starts "goingOn"
runner.tick();  // LED reaches "on"

// LED is now on
const ledState2 = runner.getComponentState(led.id);
console.log(ledState2?.state);  // "on"
```

---

### 2. History Tracking for Debugging

```typescript
import { Circuit, CircuitRunner, BehaviorRegistry } from 'simple-circuit-engine';

const circuit = /* ... create circuit ... */;
const registry = new BehaviorRegistry();
// ... register behaviors

// Enable history with 100-step limit
const runner = new CircuitRunner(circuit, registry, {
  enableHistory: true,
  historyLimit: 100
});

// Run simulation for 10 steps
for (let i = 0; i < 10; i++) {
  runner.tick();
}

// Query historical state at tick 5
const pastState = runner.getStateAtTick(5);
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

### 3. Optimized Rendering with Dirty Tracking

```typescript
import { Circuit, CircuitRunner, BehaviorRegistry } from 'simple-circuit-engine';

const circuit = /* ... */;
const registry = new BehaviorRegistry();
// ... register behaviors
const runner = new CircuitRunner(circuit, registry);

function renderLoop() {
  // Advance simulation
  const result = runner.tick();

  // Check if anything changed (via result metrics or dirty tracker)
  if (result.componentUpdateCount > 0 || result.nodeUpdateCount > 0 || result.wireUpdateCount > 0) {
    const dirty = runner.dirtyTracker.getDirtyElements();

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

### 4. Custom Component Behaviors

```typescript
import { BehaviorRegistry, ComponentBehavior, BehaviorResult, ComponentState, Component, ENodeSourceType } from 'simple-circuit-engine';

// Define custom resistor behavior (simple passthrough in boolean model)
class ResistorState extends ComponentState {
  constructor(componentId: UUID) {
    super(componentId, 'conducting');
  }
}

class ResistorBehavior implements ComponentBehavior {
  readonly componentType = 'resistor';

  createInitialState(component: Component): ComponentState {
    return new ResistorState(component.id);
  }

  // Allow conductivity through resistor in both directions
  allowConductivity(
    _component: Component,
    _state: ComponentState,
    _conductivityType: ENodeSourceType,
    _pinId: string,
    _otherPinId: string
  ): boolean {
    return true;  // Always conduct (simplified boolean model)
  }

  // Resistors don't change state based on pins in boolean model
  onPinsChange(
    _component: Component,
    state: ComponentState,
    _nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    _targetTick: number
  ): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: []
    };
  }

  // Resistors don't respond to commands
  onUserCommand(_component: Component, state: ComponentState, _command: UserCommand): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: []
    };
  }

  // Resistors don't have events
  onEventFiring(_component: Component, state: ComponentState, _event: ScheduledEvent): BehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      scheduledEvents: []
    };
  }
}

// Register behavior in registry
const registry = new BehaviorRegistry();
registry.register(new ResistorBehavior());
// ... register other behaviors

// Now circuits with resistors can be simulated
const circuit = /* ... circuit with resistor ... */;
const runner = new CircuitRunner(circuit, registry);
runner.tick();
```

---

## Integration with CircuitEngine Facade

**Note**: CircuitEngine facade integration is planned but not yet implemented. Currently, use CircuitRunner directly:

```typescript
import { Circuit, CircuitRunner, BehaviorRegistry } from 'simple-circuit-engine';

// Create circuit and registry
const circuit = /* ... */;
const registry = new BehaviorRegistry();
// ... register behaviors

// Create runner
const runner = new CircuitRunner(circuit, registry);

// Step simulation
const result = runner.tick();

// Get dirty elements for rendering
const dirty = runner.dirtyTracker.getDirtyElements();
// ... update visualization based on dirty elements

console.log(`Tick ${result.endTick}`);
```

---

## Performance Best Practices

### 1. Disable History for Production

```typescript
const registry = new BehaviorRegistry();
// ... register behaviors

// Development (with debugging)
const devRunner = new CircuitRunner(circuit, registry, {
  enableHistory: true,
  historyLimit: 1000
});

// Production (performance mode) - default
const prodRunner = new CircuitRunner(circuit, registry);  // History disabled by default
```

### 2. Batch Steps for Fast-Forward

```typescript
// Run 100 steps without rendering
const results = runner.tickN(100);

// Then update visuals once based on final state
const dirty = runner.dirtyTracker.getDirtyElements();
updateVisuals(dirty);

console.log(`Executed ${results.length} ticks`);
```

### 3. Use Dirty Tracking to Avoid Full Re-renders

```typescript
// ❌ BAD: Always re-render everything
runner.tick();
rerenderEntireCircuit();

// ✅ GOOD: Only update what changed (via result metrics)
const result = runner.tick();
if (result.componentUpdateCount > 0 || result.nodeUpdateCount > 0) {
  const dirty = runner.dirtyTracker.getDirtyElements();
  updateOnlyDirtyElements(dirty);
}
```

### 4. Limit History Size for Long Simulations

```typescript
const registry = new BehaviorRegistry();
// ... register behaviors

// For 10,000+ step simulations, limit history
const runner = new CircuitRunner(circuit, registry, {
  enableHistory: true,
  historyLimit: 100  // Only keep last 100 steps
});

// Or disable history entirely (default)
const runner = new CircuitRunner(circuit, registry);
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
const registry = new BehaviorRegistry();
// ... register behaviors

// ❌ State doesn't change without stepping
const runner = new CircuitRunner(circuit, registry);
runner.submitCommand({
  type: 'toggle_switch',
  targetId: switchId,
  scheduledAtTick: 0,
  parameters: null
});
const ledState = runner.getComponentState(ledId);
console.log(ledState?.state);  // Still "off" - command hasn't been processed!

// ✅ Step to propagate changes
runner.submitCommand({
  type: 'toggle_switch',
  targetId: switchId,
  scheduledAtTick: 0,
  parameters: null
});
runner.tick();  // Now command takes effect
const ledState = runner.getComponentState(ledId);
console.log(ledState?.state);  // Changed based on command
```

### ❌ Accessing History When Disabled

```typescript
const registry = new BehaviorRegistry();
// ... register behaviors

const runner = new CircuitRunner(circuit, registry);  // History disabled by default
runner.tick();
runner.tick();

const pastState = runner.getStateAtTick(0);
console.log(pastState);  // undefined - history not enabled!

// ✅ Enable history if needed
const runner = new CircuitRunner(circuit, registry, { enableHistory: true });
```

---

## Testing Simulation Logic

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { Circuit, CircuitRunner, BehaviorRegistry, BatteryBehavior, SmallLEDBehavior, ComponentType } from 'simple-circuit-engine';

describe('CircuitRunner - Basic Simulation', () => {
  it('should power LED from battery', () => {
    // Arrange
    const circuit = new Circuit();
    const battery = circuit.addComponent(ComponentType.Battery, ...);
    const led = circuit.addComponent(ComponentType.SmallLED, ...);
    const wire1 = circuit.addWire(battery.pins[0], led.pins[0]);
    const wire2 = circuit.addWire(battery.pins[1], led.pins[1]);

    const registry = new BehaviorRegistry();
    registry.registerAll([new BatteryBehavior(), new SmallLEDBehavior()]);
    const runner = new CircuitRunner(circuit, registry);

    // Act
    runner.tick();  // LED goes to "goingOn"
    runner.tick();  // LED reaches "on"

    // Assert
    const ledState = runner.getComponentState(led.id);
    expect(ledState?.state).toBe('on');

    const wireState = runner.getWireState(wire1.id);
    expect(wireState?.hasVoltage).toBe(true);
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
    const led = circuit.addComponent(ComponentType.SmallLED, ...);
    circuit.addWire(battery.pins[0], switchComp.pins[0]);
    circuit.addWire(switchComp.pins[1], led.pins[0]);
    circuit.addWire(battery.pins[1], led.pins[1]);

    const registry = new BehaviorRegistry();
    registry.registerAll([new BatteryBehavior(), new SwitchBehavior(), new SmallLEDBehavior()]);
    const runner = new CircuitRunner(circuit, registry);

    // Act: Step with switch open
    runner.tick();
    const ledStateOff = runner.getComponentState(led.id);

    // Act: Close switch
    runner.submitCommand({
      type: 'toggle_switch',
      targetId: switchComp.id,
      scheduledAtTick: runner.getCurrentTick(),
      parameters: null
    });
    runner.tick();  // Switch closing
    runner.tick();  // Switch closed, LED going on
    runner.tick();  // LED on
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
