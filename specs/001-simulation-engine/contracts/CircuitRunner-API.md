# CircuitRunner API Contract

**Feature**: Discrete-Time Circuit Simulation Engine
**Date**: 2025-11-30
**Module**: `src/core/simulation/CircuitRunner.ts`

## Overview

`CircuitRunner` is the main orchestrator for circuit simulation. It manages the simulation lifecycle, state progression, event scheduling, and provides query APIs for current/historical states.

---

## Class: CircuitRunner

### Constructor

```typescript
constructor(circuit: Circuit, behaviorRegistry: BehaviorRegistry, options?: RunnerOptions)
```

**Description**: Creates a new simulation runner for the given circuit.

**Parameters**:
- `circuit: Circuit` - Immutable circuit topology to simulate. CircuitRunner references this object without modifying it.
- `behaviorRegistry: BehaviorRegistry` - Registry containing component behaviors for simulation
- `options?: RunnerOptions` - Optional configuration
  - `enableHistory?: boolean` - Enable state history tracking (default: false)
  - `historyLimit?: number` - Max history entries when enabled (default: 1000)

**Throws**:
- `RangeError` - If historyLimit is non-positive
- `Error` - If circuit contains components with unregistered behaviors (warning logged to console)

**Example**:
```typescript
const circuit = Circuit.fromJSON(circuitData);

// Create and populate behavior registry
const registry = new BehaviorRegistry();
registry.register(new BatteryBehavior());
registry.register(new SwitchBehavior());
registry.register(new SmallLEDBehavior()); // etc...

// Create runner
const runner = new CircuitRunner(circuit, registry, {
  enableHistory: true,
  historyLimit: 500
});
```

---

## Simulation Control Methods

### tick()

```typescript
tick(): RunnerResult
```

**Description**: Advance simulation by one discrete time step.

**Behavior**:
1. Process scheduled events ready at current tick + 1 (FIFO order)
2. Propagate electrical state via BFS conductivity propagation
3. Evaluate component behaviors (for components with changed pin states)
4. Process user commands queued for this tick
5. Update dirty tracker with changed elements
6. Advance to next tick
7. Store current state in history (if enabled)

**Returns**: `RunnerResult` object with metrics about the tick execution:
```typescript
{
  startTick: number,           // Tick at start
  endTick: number,             // Tick after execution
  componentUpdateCount: number, // Components that changed
  nodeUpdateCount: number,      // ENodes that changed
  wireUpdateCount: number,      // Wires that changed
  processedCommandCount: number, // Commands processed
  scheduledEventCount: number,  // New events scheduled
  firedEventCount: number       // Events that fired
}
```

**Throws**:
- Generally doesn't throw - invalid states logged as warnings

**Example**:
```typescript
const result = runner.tick();  // Tick 0 → 1
console.log(`Tick ${result.startTick} → ${result.endTick}`);
console.log(`Components updated: ${result.componentUpdateCount}`);

runner.tick();  // Tick 1 → 2
```

**Time Complexity**: O(V + E) where V = components + enodes, E = wires

---

### tickN()

```typescript
tickN(count: number): RunnerResult[]
```

**Description**: Execute multiple simulation ticks in sequence.

**Parameters**:
- `count: number` - Number of ticks to execute (must be ≥ 1)

**Returns**: Array of `RunnerResult` objects, one for each tick executed

**Throws**:
- `RangeError` - If count < 1

**Example**:
```typescript
const results = runner.tickN(10);  // Execute 10 ticks
console.log(`Executed ${results.length} ticks`);
console.log(`Final tick: ${results[results.length - 1].endTick}`);
```

**Time Complexity**: O(N * (V + E)) where N = count

---

### reset()

```typescript
reset(): void
```

**Description**: Reset simulation to initial state (tick 0).

**Behavior**:
- Clears all electrical states (unpowered)
- Resets all component states to initial values
- Clears event queue
- Clears command queue
- Clears history (if enabled)
- Resets dirty tracker

**Example**:
```typescript
runner.tick();  // Tick 1
runner.tick();  // Tick 2
runner.reset(); // Back to tick 0
```

---

## State Query Methods

### getCurrentTick()

```typescript
getCurrentTick(): number
```

**Description**: Get current simulation tick number.

**Returns**: Current tick (starts at 0)

**Example**:
```typescript
console.log(runner.getCurrentTick());  // 0
runner.tick();
console.log(runner.getCurrentTick());  // 1
```

---

### getComponentState()

```typescript
getComponentState(componentId: UUID): ComponentState | undefined
```

**Description**: Get current state of a component.

**Parameters**:
- `componentId: UUID` - Component identifier

**Returns**: Component state object, or `undefined` if component not found

**Example**:
```typescript
const switchState = runner.getComponentState(switchId) as SwitchState;
console.log(switchState.state);  // "open" or "closed"
```

---

### getEnodeState()

```typescript
getEnodeState(enodeId: UUID): NodeElectricalState | undefined
```

**Description**: Get current electrical state of an ENode.

**Parameters**:
- `enodeId: UUID` - ENode identifier

**Returns**: Electrical state (voltage + current), or `undefined` if not found

**Example**:
```typescript
const state = runner.getEnodeState(pinId);
console.log(state?.hasVoltage);  // true/false
console.log(state?.hasCurrent);  // true/false
```

---

### getWireState()

```typescript
getWireState(wireId: UUID): NodeElectricalState | undefined
```

**Description**: Get current electrical state of a wire.

**Parameters**:
- `wireId: UUID` - Wire identifier

**Returns**: Electrical state (voltage + current), or `undefined` if not found

**Example**:
```typescript
const state = runner.getWireState(wireId);
if (state?.hasVoltage) {
  console.log('Wire is powered');
}
```

---

### getStateAtTick()

```typescript
getStateAtTick(tick: number): SimulationState | undefined
```

**Description**: Get complete simulation state at a specific historical tick.

**Parameters**:
- `tick: number` - Tick number to retrieve

**Returns**: Complete state snapshot, or `undefined` if:
  - History is disabled
  - Tick is outside history window (circular buffer wrapped)
  - Tick is in the future

**Example**:
```typescript
const registry = new BehaviorRegistry();
// ... register behaviors
const runner = new CircuitRunner(circuit, registry, { enableHistory: true });
runner.tick();  // Tick 0 → 1
runner.tick();  // Tick 1 → 2

const pastState = runner.getStateAtTick(1);
console.log(pastState?.tick);  // 1
```

---

## Command Methods

### submitCommand()

```typescript
submitCommand(command: UserCommand): boolean
```

**Description**: Submit a user command to execute at the next tick. Only one command per component per tick is allowed.

**Parameters**:
- `command: UserCommand` - Command to submit
  - `type: 'toggle_switch'` - Type of command (currently only toggle_switch supported)
  - `targetId: UUID` - Target component UUID
  - `scheduledAtTick: number` - Will be set automatically to current tick
  - `parameters?: Map<string, string> | null` - Optional parameters

**Returns**:
- `true` - Command accepted
- `false` - Command rejected (another command already queued for this component this tick)

**Throws**:
- `Error` - If target component ID is not found in circuit

**Example**:
```typescript
// Submit command to toggle switch at next tick
const accepted = runner.submitCommand({
  type: 'toggle_switch',
  targetId: switchId,
  scheduledAtTick: 0,  // Will be set by runner
  parameters: null
});

if (accepted) {
  runner.tick();  // Command processes during this tick
} else {
  console.log('Command rejected - duplicate for this component this tick');
}
```

**Notes**:
- Commands are processed during `tick()` after event firing but before state propagation
- Only one command per component per tick allowed (subsequent commands discarded)
- `scheduledAtTick` is set automatically by the runner to the current tick
- Commands are cleared after each tick

---

## Dirty Tracking Methods

### getDirtyElements()

```typescript
getDirtyElements(): {
  components: UUID[];
  wires: UUID[];
  enodes: UUID[];
}
```

**Description**: Get elements that changed state during last step.

**Returns**: Object with arrays of dirty UUIDs (cleared after retrieval)

**Usage**: Called by rendering module to optimize visual updates.

**Example**:
```typescript
runner.tick();
const dirty = runner.getDirtyElements();
// Render only dirty.components, dirty.wires, dirty.enodes
```

---

### hasDirtyElements()

```typescript
hasDirtyElements(): boolean
```

**Description**: Check if any elements changed during last step.

**Returns**: `true` if changes occurred, `false` if state is stable

**Example**:
```typescript
runner.tick();
if (runner.hasDirtyElements()) {
  // Update visualization
}
```

---

## Behavior Registry Methods

### hasBehavior()

```typescript
hasBehavior(componentType: string): boolean
```

**Description**: Check if a component behavior is registered in the behavior registry.

**Parameters**:
- `componentType: string` - Component type to check (e.g., "battery", "switch", "led")

**Returns**: `true` if behavior is registered, `false` otherwise

**Example**:
```typescript
if (runner.hasBehavior('switch')) {
  console.log('Switch behavior is registered');
}

if (!runner.hasBehavior('custom_gate')) {
  console.warn('Custom gate behavior not found');
}
```

**Notes**:
- This delegates to the BehaviorRegistry passed to the constructor
- Useful for validation before creating circuits with specific component types

---

## Performance Characteristics

| Operation           | Time Complexity | Space Complexity | Notes                                 |
| ------------------- | --------------- | ---------------- | ------------------------------------- |
| `tick()`            | O(V + E)        | O(1)             | Linear in circuit size                |
| `getComponentState` | O(1)            | O(1)             | Map lookup                            |
| `getEnodeState`     | O(1)            | O(1)             | Map lookup                            |
| `getWireState`      | O(1)            | O(1)             | Map lookup                            |
| `getStateAt`        | O(1)            | O(1)             | Array index (if in history window)    |
| `queueCommand`      | O(1)            | O(1)             | Array append                          |
| `getDirtyElements`  | O(D)            | O(D)             | D = number of dirty elements          |
| History (enabled)   | O(1) per step   | O(H \* S)        | H = history limit, S = state size     |

---

## Integration with CircuitEngine Facade

```typescript
class CircuitEngine {
  private runner?: CircuitRunner;

  loadCircuit(circuitData: unknown): this {
    const circuit = Circuit.fromJSON(circuitData);
    this.runner = new CircuitRunner(circuit, {
      enableHistory: false  // Performance mode
    });
    return this;
  }

  tick(): this {
    this.runner?.tick();
    this.emit('tick', this.runner?.getCurrentTick());
    return this;
  }

  play(): this {
    // Start interval calling tick() repeatedly
    return this;
  }

  // ... other facade methods
}
```

---

## Example: Complete Workflow

```typescript
import { Circuit, CircuitRunner, ComponentType } from '@/core';

// 1. Create circuit
const circuit = new Circuit();
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
const wire1 = circuit.addWire(battery.pins[0], led.pins[0]);
const wire2 = circuit.addWire(battery.pins[1], led.pins[1]);

// 2. Create runner
const runner = new CircuitRunner(circuit, {
  enableHistory: true,
  historyLimit: 100
});

// 3. Set up event listeners
runner.on('tick', (tick) => {
  console.log(`Tick ${tick}`);
});

runner.on('state-changed', (changes) => {
  if (changes.components.includes(led.id)) {
    const ledState = runner.getComponentState(led.id);
    console.log(`LED is ${ledState?.state}`);
  }
});

// 4. Run simulation
runner.tick();  // Battery powers LED
runner.tick();  // LED remains on
runner.tick();  // LED remains on

// 5. Query state
const ledState = runner.getComponentState(led.id);
console.log(ledState?.state);  // "on"

const wireState = runner.getWireState(wire.id);
console.log(wireState?.hasVoltage);  // true

// 6. Access history
const tick0State = runner.getStateAt(0);
console.log(tick0State?.tick);  // 0
```

---

## Error Handling

| Error Type   | Condition                                            | Example                                             |
| ------------ | ---------------------------------------------------- | --------------------------------------------------- |
| `TypeError`  | Invalid options (negative historyLimit)              | `new CircuitRunner(circuit, { historyLimit: -1 })`  |
| `Error`      | Component with unregistered behavior                 | Circuit contains unimplemented component type       |
| `RangeError` | Command tick in past                                 | `queueCommand({ tick: -5, ... })`                   |
| `Error`      | Invalid component state transition (behavior-specific) | Component behavior throws during evaluate()         |

---

## Thread Safety

CircuitRunner is **NOT thread-safe**. All methods must be called from the same execution context (e.g., main browser thread). Do not access from Web Workers without proper synchronization.

---

## Memory Management

- History is stored as **shallow-cloned** SimulationState objects (structural sharing)
- Disable history (`enableHistory: false`) for long-running simulations to conserve memory
- Call `reset()` to clear history and free memory
- Event listeners should be removed when runner is disposed

---

## Testing Contracts

### Unit Test Coverage

- ✅ Constructor validates options
- ✅ `tick()` increments tick
- ✅ `tick()` propagates electrical state correctly
- ✅ `tick()` processes scheduled events in FIFO order
- ✅ `reset()` returns to initial state
- ✅ State getters return correct values
- ✅ History enabled stores past states
- ✅ History disabled returns undefined for past ticks
- ✅ Commands execute at correct tick
- ✅ Dirty tracking marks changed elements
- ✅ Events are emitted correctly

### Integration Test Scenarios

- ✅ Battery → LED circuit (basic propagation)
- ✅ Battery → Switch → LED (interactive component)
- ✅ Transistor with delay (event scheduling)
- ✅ 300 component circuit under 16ms per step (performance)
- ✅ 10,000 step simulation without degradation (memory stability)

---

## Version History

| Version | Date       | Changes                     |
| ------- | ---------- | --------------------------- |
| 1.0.0   | 2025-11-30 | Initial API design          |

---

## Next Steps

1. Implement CircuitRunner class
2. Write unit tests for each method
3. Create integration tests with sample circuits
4. Add performance benchmarks
5. Document in quickstart.md
