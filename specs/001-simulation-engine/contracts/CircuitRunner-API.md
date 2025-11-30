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
constructor(circuit: Circuit, options?: RunnerOptions)
```

**Description**: Creates a new simulation runner for the given circuit.

**Parameters**:
- `circuit: Circuit` - Immutable circuit topology to simulate. CircuitRunner references this object without modifying it.
- `options?: RunnerOptions` - Optional configuration
  - `enableHistory?: boolean` - Enable state history tracking (default: false)
  - `historyLimit?: number` - Max history entries when enabled (default: 1000)

**Throws**:
- `TypeError` - If historyLimit is non-positive
- `Error` - If circuit contains components with unregistered behaviors

**Example**:
```typescript
const circuit = Circuit.fromJSON(circuitData);
const runner = new CircuitRunner(circuit, {
  enableHistory: true,
  historyLimit: 500
});
```

---

## Simulation Control Methods

### tick()

```typescript
step(): void
```

**Description**: Advance simulation by one discrete time step.

**Behavior**:
1. Increment tick counter
2. Process user commands queued for this tick
3. Process scheduled events ready at this tick (FIFO order)
4. Propagate electrical state via topological ordering
5. Evaluate component behaviors (for components with changed inputs)
6. Update dirty tracker with changed elements
7. Store current state in history (if enabled)

**Throws**:
- `Error` - If simulation encounters invalid state

**Example**:
```typescript
runner.tick();  // Tick 0 → 1
runner.tick();  // Tick 1 → 2
```

**Time Complexity**: O(V + E) where V = components + enodes, E = wires

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

### getStateAt()

```typescript
getStateAt(tick: number): SimulationState | undefined
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
const runner = new CircuitRunner(circuit, { enableHistory: true });
runner.tick();  // Tick 1
runner.tick();  // Tick 2

const pastState = runner.getStateAt(1);
console.log(pastState?.tick);  // 1
```

---

## Command Methods

### queueCommand()

```typescript
queueCommand(command: UserCommand): void
```

**Description**: Schedule a user command to execute at a future tick.

**Parameters**:
- `command: UserCommand` - Command to queue
  - `commandType: string` - Type of command (e.g., "toggle_switch")
  - `targetComponentId: UUID` - Target component
  - `params?: Record<string, unknown>` - Optional parameters
  - `tick: number | null` - Tick when command should execute : if left null, executes at next tick

**Throws**:
- `RangeError` - If command tick is in the past

**Example**:
```typescript
runner.queueCommand({
  tick: 10,
  commandType: 'toggle_switch',
  targetComponentId: switchId,
  params: undefined
});
```

---

### executeCommand()

```typescript
executeCommand(commandType: string, targetComponentId: UUID, params?: Record<string, unknown>): void
```

**Description**: Execute a command immediately (at current tick).

**Parameters**:
- `commandType: string` - Type of command
- `targetComponentId: UUID` - Target component
- `params?: Record<string, unknown>` - Optional parameters

**Example**:
```typescript
// Toggle switch immediately
runner.executeCommand('toggle_switch', switchId);
```

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

## Event Handling

### Events Emitted

CircuitRunner extends EventEmitter and emits the following events:

#### `tick`

```typescript
runner.on('tick', (tick: number) => void)
```

**Description**: Fired after each step completes.

**Parameters**:
- `tick: number` - New current tick number

**Example**:
```typescript
runner.on('tick', (tick) => {
  console.log(`Simulation at tick ${tick}`);
});
```

---

#### `state-changed`

```typescript
runner.on('state-changed', (changes: {
  components: UUID[];
  wires: UUID[];
  enodes: UUID[];
}) => void)
```

**Description**: Fired when any element states change.

**Parameters**:
- `changes` - Object with arrays of changed element UUIDs

**Example**:
```typescript
runner.on('state-changed', (changes) => {
  console.log(`${changes.components.length} components changed`);
});
```

---

#### `command-executed`

```typescript
runner.on('command-executed', (command: UserCommand) => void)
```

**Description**: Fired when a user command is processed.

**Parameters**:
- `command: UserCommand` - The executed command

**Example**:
```typescript
runner.on('command-executed', (cmd) => {
  console.log(`Command ${cmd.commandType} executed at tick ${cmd.tick}`);
});
```

---

## Behavior Registry Methods

### registerBehavior()

```typescript
static registerBehavior(type: ComponentType, behavior: ComponentBehavior): void
```

**Description**: Register a custom component behavior globally.

**Parameters**:
- `type: ComponentType` - Component type enum value
- `behavior: ComponentBehavior` - Behavior implementation

**Throws**:
- `TypeError` - If behavior already registered for this type

**Usage**: Called before creating CircuitRunner instances to add custom components.

**Example**:
```typescript
class CustomGateBehavior implements ComponentBehavior {
  createInitialState(component: Component): ComponentState {
    return new CustomGateState(component.id);
  }

  evaluate(component, state, inputs, tick) {
    // Custom logic
    return [];
  }
}

CircuitRunner.registerBehavior(ComponentType.CustomGate, new CustomGateBehavior());
```

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
const wire = circuit.addWire(battery.pins[0], led.pins[0]);

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
