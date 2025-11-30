# Data Model: Simulation Engine

**Feature**: Discrete-Time Circuit Simulation Engine
**Date**: 2025-11-30

## Overview

This document defines the data structures and types for the circuit simulation engine. All types maintain the constitution's requirement for strict TypeScript with no `any` types and comprehensive JSDoc documentation.

---

## Core Entities

### 1. RunnerOptions

Configuration options for initializing a CircuitRunner instance.

```typescript
interface RunnerOptions {
  /**
   * Enable historical state tracking.
   * When true, past simulation states are preserved up to historyLimit.
   * When false (default), only current state is retained (better performance).
   * @default false
   */
  enableHistory?: boolean;

  /**
   * Maximum number of historical states to retain when enableHistory is true.
   * Uses circular buffer—oldest states are overwritten when limit is reached.
   * @default 1000
   */
  historyLimit?: number;
}
```

**Validation Rules**:
- `historyLimit` must be positive integer if specified
- `enableHistory: true` with `historyLimit: 0` should throw error

---

### 2. SimulationState

Complete snapshot of circuit electrical state at a specific simulation tick.

```typescript
class SimulationState {
  /**
   * Current simulation step number (starts at 0).
   * @readonly
   */
  readonly tick: number;

  /**
   * Electrical state for each ENode (component pins and branching points).
   * Key: ENode UUID
   * Value: NodeElectricalState (voltage + current booleans)
   * @readonly
   */
  readonly nodeStates: ReadonlyMap<UUID, NodeElectricalState>;

  /**
   * Electrical state for each Wire connecting ENodes.
   * Key: Wire UUID
   * Value: NodeElectricalState (voltage + current booleans)
   * @readonly
   */
  readonly wireStates: ReadonlyMap<UUID, NodeElectricalState>;

  /**
   * Component-specific state for each component.
   * Key: Component UUID
   * Value: ComponentState subclass (varies by component type)
   * @readonly
   */
  readonly componentStates: ReadonlyMap<UUID, ComponentState>;

  constructor(tick: number) {
    this.tick = tick;
    this.nodeStates = new Map();
    this.wireStates = new Map();
    this.componentStates = new Map();
  }

  /**
   * Create a shallow clone of this state for history storage.
   * Maps are cloned but their contents are shared (structural sharing).
   * @returns New SimulationState with same tick and cloned maps
   */
  clone(): SimulationState {
    const cloned = new SimulationState(this.tick);
    // Implementation clones maps but shares state objects
    return cloned;
  }
}
```

**Relationships**:
- References UUIDs from Circuit topology (Component, ENode, Wire)
- Owned by StateManager
- Consumed by rendering module via CircuitRunner API

---

### 3. NodeElectricalState

Binary electrical state for wires and enodes (connection points).

```typescript
interface NodeElectricalState {
  /**
   * True if voltage is present at this node (potential > 0V).
   * False if node is at ground potential or floating.
   */
  hasVoltage: boolean;

  /**
   * True if current is actively flowing through this node.
   * False if no current flow (open circuit or equilibrium).
   */
  hasCurrent: boolean;
}
```

**Usage**:
- Applied to both `ENode` (connection points) and `Wire` (connections)
- Updated during state propagation phase each tick
- Read by component behaviors to determine input conditions

**Validation Rules**:
- Both fields are required (never undefined)
- `hasCurrent: true` typically implies `hasVoltage: true` (but not enforced—allows modeling edge cases)

---

### 4. ComponentState

Base state for all component types. Extended by specific component implementations.

```typescript
abstract class ComponentState {
  /**
   * Component UUID this state belongs to.
   * @readonly
   */
  readonly componentId: UUID;

  /**
   * Current operational state (varies by component type).
   * Examples: "on", "off", "open", "closed", "activating", "active"
   */
  state: string;

  /**
   * For transitional states Tick when this transitional state started.
   * Null if no transition is in progress.
   * @readonly
   */
  readonly transitionStartTick: number | null;

  /**
   * Remaining delay steps before next state transition (0 = no delay).
   * Decremented each tick when > 0.
   * @default 0
   */
  delayCounter: number;

  constructor(componentId: UUID, initialState: string) {
    this.componentId = componentId;
    this.state = initialState;
    this.delayCounter = 0;
  }
}
```

**Example Subclasses**:

```typescript
// Battery: Always outputs voltage, no delay
class BatteryState extends ComponentState {
  constructor(componentId: UUID) {
    super(componentId, 'active');  // Always active
  }
}

// Switch: Can be open or closed, opening or closing
class SwitchState extends ComponentState {
  constructor(componentId: UUID, initialOpen: boolean) {
    super(componentId, initialOpen ? 'open' : 'closed');
  }
}

// LED: Lights up when powered, immediate response
class LEDState extends ComponentState {
  constructor(componentId: UUID) {
    super(componentId, 'off');  // Starts off
  }
}

// Transistor: inactive, activating, active: deactivating configurable Delayed activation/deactivation (e.g., 3 steps to activate)
class TransistorState extends ComponentState {
  constructor(componentId: UUID, activationDelay: number) {
    super(componentId, 'inactive');
    this.delayCounter = 0;  // Set during transition
  }
}
```

**Lifecycle**:
1. Created during CircuitRunner initialization for each component
2. Updated by ComponentBehavior.evaluate() each tick
3. Persisted in SimulationState.componentStates map
4. Cloned when history is enabled

---

### 5. ComponentBehavior

Interface for defining component-specific simulation logic.

```typescript
interface ComponentBehavior {
  /**
   * Evaluate component state based on current input pin states.
   * Called once per tick for components with changed inputs.
   *
   * @param component - Component from topology
   * @param currentState - Current component state (mutable)
   * @param inputStates - Electrical states of component's input pins
   * @param tick - Current simulation tick
   * @returns Array of scheduled events (empty if no delays)
   *
   * @example
   * // LED behavior: Turn on if any input pin has voltage
   * evaluate(component, state, inputs, tick) {
   *   const powered = inputs.some(input => input.hasVoltage);
   *   state.state = powered ? 'on' : 'off';
   *   return [];  // No delayed transitions
   * }
   */
  evaluate(
    component: Component,
    currentState: ComponentState,
    inputStates: NodeElectricalState[],
    tick: number
  ): ScheduledEvent[];

  /**
   * Create initial state for a component of this type.
   * Called during CircuitRunner initialization.
   *
   * @param component - Component from topology
   * @returns New ComponentState subclass instance
   */
  createInitialState(component: Component): ComponentState;
}
```

**Implementation Notes**:
- Registered per ComponentType in BehaviorRegistry
- Mutates `currentState` in-place (for performance)
- Returns ScheduledEvents for delayed transitions
- Must be side-effect free (no external state modification)

---

### 6. ScheduledEvent

Represents a future state transition scheduled to occur at a specific tick.

```typescript
interface ScheduledEvent {
  /**
   * Tick when this event was scheduled (for FIFO ordering).
   * @readonly
   */
  readonly scheduledAtTick: number;

  /**
   * Tick when this event should be processed.
   * @readonly
   */
  readonly readyAtTick: number;

  /**
   * Type of target element.
   */
  readonly targetType: 'component' | 'enode' | 'wire';

  /**
   * UUID of target element.
   */
  readonly targetId: UUID;

  /**
   * New state to apply when event fires.
   * Structure depends on targetType (ComponentState for components, etc.)
   */
  readonly newState: Partial<ComponentState> | Partial<NodeElectricalState>;
}
```

**Example Usage**:

```typescript
// Transistor activates after 3-step delay
const event: ScheduledEvent = {
  scheduledAtTick: 10,          // Created at tick 10
  readyAtTick: 13,              // Fire at tick 13 (10 + 3)
  targetType: 'component',
  targetId: transistor.id,
  newState: { state: 'active', delayCounter: 0 }
};
```

**Ordering Rules**:
- Events sorted by `readyAtTick` (min-heap)
- Events with same `readyAtTick` processed in FIFO order (by `scheduledAtTick`)

---

### 7. UserCommand

Represents user interaction that modifies circuit behavior during simulation.

```typescript
interface UserCommand {
  /**
   * Type of command.
   */
  readonly commandType: 'toggle_switch' | 'set_component_state' | 'modify_config';

  /**
   * UUID of target component.
   */
  readonly targetComponentId: UUID;

  /**
   * Command-specific parameters.
   * For toggle_switch: undefined (no params)
   * For set_component_state: { state: string }
   * For modify_config: { key: string, value: string }
   */
  readonly params?: Record<string, unknown>;

    /**
     * Optional Tick when command should be applied. If left null, applies at next tick (most common case).
     */
    readonly tick: number | null;
}
```

**Example Usage**:

```typescript
// Toggle a switch at tick 50
const toggleCmd: UserCommand = {
  tick: 50,
  commandType: 'toggle_switch',
  targetComponentId: switchComponent.id,
  params: undefined
};
```

**Processing**:
- Commands queued in CircuitRunner
- Processed at start of matching tick (before state propagation)
- May trigger immediate state changes or scheduled events

---

## Supporting Classes

### 8. StateManager

Manages current simulation state and optional historical states.

```typescript
class StateManager {
  private currentState: SimulationState;
  private history: SimulationState[] | null;
  private readonly historyLimit: number;

  constructor(options: RunnerOptions) {
    this.currentState = new SimulationState(0);
    this.historyLimit = options.historyLimit ?? 1000;
    this.history = options.enableHistory
      ? new Array(this.historyLimit).fill(null)
      : null;
  }

  /**
   * Get current simulation state.
   * @returns Current SimulationState
   */
  getCurrentState(): SimulationState {
    return this.currentState;
  }

  /**
   * Advance to next tick with new state.
   * If history enabled, stores previous state in circular buffer.
   * @param newState - State for next tick
   */
  advance(newState: SimulationState): void {
    if (this.history) {
      const index = this.currentState.tick % this.historyLimit;
      this.history[index] = this.currentState.clone();
    }
    this.currentState = newState;
  }

  /**
   * Retrieve historical state at specific tick.
   * @param tick - Tick number to retrieve
   * @returns State at that tick, or undefined if not in history
   */
  getState(tick: number): SimulationState | undefined {
    if (tick === this.currentState.tick) {
      return this.currentState;
    }
    if (!this.history) {
      return undefined;
    }
    const index = tick % this.historyLimit;
    const state = this.history[index];
    // Validate not overwritten by later tick
    return state?.tick === tick ? state : undefined;
  }

  /**
   * Clear all historical states (keeps current state).
   * Useful to free memory during long simulations.
   */
  clearHistory(): void {
    if (this.history) {
      this.history.fill(null);
    }
  }
}
```

---

### 9. EventQueue

Min-heap priority queue for scheduled events.

```typescript
class EventQueue {
  private heap: ScheduledEvent[];

  constructor() {
    this.heap = [];
  }

  /**
   * Schedule a future event.
   * @param event - Event to schedule
   */
  schedule(event: ScheduledEvent): void {
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Get all events ready to fire at or before current tick.
   * Returns events in FIFO order for same readyAtTick.
   * @param currentTick - Current simulation tick
   * @returns Array of ready events (removed from queue)
   */
  getReadyEvents(currentTick: number): ScheduledEvent[] {
    const ready: ScheduledEvent[] = [];
    while (this.heap.length > 0 && this.heap[0].readyAtTick <= currentTick) {
      ready.push(this.extractMin()!);
    }
    // Sort by scheduledAtTick for FIFO within same readyAtTick
    ready.sort((a, b) => a.scheduledAtTick - b.scheduledAtTick);
    return ready;
  }

  /**
   * Check if any events are pending.
   * @returns True if queue contains events
   */
  hasEvents(): boolean {
    return this.heap.length > 0;
  }

  /**
   * Clear all pending events.
   */
  clear(): void {
    this.heap = [];
  }

  private bubbleUp(index: number): void {
    // Standard min-heap bubble-up logic
  }

  private bubbleDown(index: number): void {
    // Standard min-heap bubble-down logic
  }

  private extractMin(): ScheduledEvent | undefined {
    // Standard min-heap extraction
  }
}
```

---

### 10. DirtyTracker

Tracks which elements changed state during current tick.

```typescript
class DirtyTracker {
  private dirtyComponents: Set<UUID>;
  private dirtyWires: Set<UUID>;
  private dirtyEnodes: Set<UUID>;

  constructor() {
    this.dirtyComponents = new Set();
    this.dirtyWires = new Set();
    this.dirtyEnodes = new Set();
  }

  /**
   * Mark a component as dirty (state changed this tick).
   * @param id - Component UUID
   */
  markComponentDirty(id: UUID): void {
    this.dirtyComponents.add(id);
  }

  /**
   * Mark a wire as dirty (electrical state changed this tick).
   * @param id - Wire UUID
   */
  markWireDirty(id: UUID): void {
    this.dirtyWires.add(id);
  }

  /**
   * Mark an enode as dirty (electrical state changed this tick).
   * @param id - ENode UUID
   */
  markEnodeDirty(id: UUID): void {
    this.dirtyEnodes.add(id);
  }

  /**
   * Get all dirty elements and clear internal state.
   * Should be called once per tick after state propagation.
   * @returns Object with arrays of dirty UUIDs
   */
  getDirtyElements(): {
    components: UUID[];
    wires: UUID[];
    enodes: UUID[];
  } {
    const result = {
      components: Array.from(this.dirtyComponents),
      wires: Array.from(this.dirtyWires),
      enodes: Array.from(this.dirtyEnodes)
    };
    this.clear();
    return result;
  }

  /**
   * Clear all dirty flags.
   */
  clear(): void {
    this.dirtyComponents.clear();
    this.dirtyWires.clear();
    this.dirtyEnodes.clear();
  }

  /**
   * Check if any elements are dirty.
   * @returns True if any changes occurred this tick
   */
  hasDirtyElements(): boolean {
    return (
      this.dirtyComponents.size > 0 ||
      this.dirtyWires.size > 0 ||
      this.dirtyEnodes.size > 0
    );
  }
}
```

---

### 11. BehaviorRegistry

Registry for component type → behavior mappings.

```typescript
class BehaviorRegistry {
  private behaviors: Map<ComponentType, ComponentBehavior>;

  constructor() {
    this.behaviors = new Map();
    this.registerDefaultBehaviors();
  }

  /**
   * Register a behavior for a component type.
   * @param type - Component type enum value
   * @param behavior - Behavior implementation
   * @throws TypeError if behavior already registered for this type
   */
  register(type: ComponentType, behavior: ComponentBehavior): void {
    if (this.behaviors.has(type)) {
      throw new TypeError(`Behavior already registered for type: ${type}`);
    }
    this.behaviors.set(type, behavior);
  }

  /**
   * Get behavior for a component type.
   * @param type - Component type enum value
   * @returns Behavior implementation, or undefined if not registered
   */
  getBehavior(type: ComponentType): ComponentBehavior | undefined {
    return this.behaviors.get(type);
  }

  /**
   * Check if a behavior is registered for a type.
   * @param type - Component type enum value
   * @returns True if behavior exists
   */
  hasBehavior(type: ComponentType): boolean {
    return this.behaviors.has(type);
  }

  /**
   * Register default behaviors for standard component types.
   * Called during constructor.
   */
  private registerDefaultBehaviors(): void {
    // Register Battery, Switch, LED, etc.
  }
}
```

---

## Type Hierarchy

```
RunnerOptions (config)
│
CircuitRunner (orchestrator)
├── Circuit (topology, readonly)
├── StateManager
│   ├── SimulationState (current)
│   │   ├── Map<UUID, NodeElectricalState> (nodes)
│   │   ├── Map<UUID, NodeElectricalState> (wires)
│   │   └── Map<UUID, ComponentState> (components)
│   └── SimulationState[] (history, optional)
├── EventQueue
│   └── ScheduledEvent[]
├── DirtyTracker
│   ├── Set<UUID> (components)
│   ├── Set<UUID> (wires)
│   └── Set<UUID> (enodes)
├── BehaviorRegistry
│   └── Map<ComponentType, ComponentBehavior>
└── UserCommand[] (command queue)
```

---

## Validation Rules Summary

| Entity              | Rule                                         | Error Type  |
| ------------------- | -------------------------------------------- | ----------- |
| RunnerOptions       | historyLimit > 0 if specified                | TypeError   |
| RunnerOptions       | Cannot enable history with limit 0          | TypeError   |
| SimulationState     | tick >= 0                                    | RangeError  |
| ComponentState      | delayCounter >= 0                            | RangeError  |
| ScheduledEvent      | readyAtTick >= scheduledAtTick               | RangeError  |
| UserCommand         | tick >= 0                                    | RangeError  |
| BehaviorRegistry    | No duplicate registrations                   | TypeError   |
| CircuitRunner       | All components must have registered behavior | Error       |

---

## Memory Footprint Estimates

For 300 component, 400 wire circuit:
- **SimulationState**: ~50KB per snapshot (maps + state objects)
- **History (1000 steps)**: ~50MB (manageable for modern browsers)
- **EventQueue**: ~1KB per 100 events (typically <10KB)
- **DirtyTracker**: ~5KB (Set overhead for 700 elements)
- **Total (with history)**: ~50-60MB
- **Total (without history)**: ~100KB

Performance impact: Negligible for target use case.

---

## Next Steps

1. Implement TypeScript interfaces and classes
2. Write unit tests for each entity
3. Define CircuitRunner API in contracts/
4. Create integration tests with sample circuits
