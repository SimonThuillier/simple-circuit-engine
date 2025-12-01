# Data Model: Simulation Engine

**Feature**: Discrete-Time Circuit Simulation Engine
**Date**: 2025-12-01 (Updated to match implementation)

## Overview

This document defines the data structures and types for the circuit simulation engine as actually implemented. All types maintain the constitution's requirement for strict TypeScript with no `any` types and comprehensive JSDoc documentation.

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

  /**
   * True only if the node is locked from state changes at circuit build time
   * (ex: battery pins or other fixed-voltage/current sources).
   * Important: Those nodes should never have their electrical state modified by the simulation engine!
   * Always false for wires.
   */
  locked: boolean;
}
```

**Usage**:
- Applied to both `ENode` (connection points) and `Wire` (connections)
- Updated during state propagation phase each tick via `propagateConductivity()`
- Read by component behaviors to determine input conditions
- `locked` prevents simulation from overwriting source node states

**Validation Rules**:
- All three fields are required (never undefined)
- `hasCurrent: true` typically implies `hasVoltage: true` (but not enforced—allows modeling edge cases)
- `locked: true` only for source ENod es (battery pins, power supplies), never for wires

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
   * Examples: "on", "off", "open", "closed", "closing", "opening", "goingOn", "goingOff"
   */
  state: string;

  /**
   * Tick when the current state started.
   * Updated when state changes.
   */
  startTick: number;

  constructor(componentId: UUID, initialState: string) {
    this.componentId = componentId;
    this.state = initialState;
    this.startTick = 0;
  }

  hasSameComponent(other: ComponentState): boolean {
    return this.componentId === other.componentId;
  }
}
```

**Example Subclasses**:

```typescript
// Battery: Always outputs voltage on cathode pin, current on anode pin
class BatteryState extends ComponentState {
  constructor(componentId: UUID) {
    super(componentId, 'on');  // Always on
  }
}

// Switch: Can be open, closing, closed, or opening (with delayed transitions)
class SwitchState extends ComponentState {
  constructor(componentId: UUID, initialState: string = 'open') {
    super(componentId, initialState);  // Typically starts open
  }
}

// LED: Has off, goingOn, on, goingOff states (with delayed transitions)
class SmallLEDState extends ComponentState {
  constructor(componentId: UUID) {
    super(componentId, 'off');  // Starts off
  }
}
```

**Lifecycle**:
1. Created during CircuitRunner initialization via `behavior.createInitialState(component)`
2. Updated in-place by behavior methods (`onPinsChange`, `onUserCommand`, `onEventFiring`)
3. Persisted in SimulationState.componentStates map
4. Cloned (shallow) when history is enabled
5. `startTick` updated when state transitions occur

---

### 5. ComponentBehavior

Interface for defining component-specific simulation logic. Each component type implements this interface to define how it responds to electrical state changes, user commands, and scheduled events.

```typescript
/**
 * Result returned by component behavior evaluation.
 */
interface BehaviorResult {
  /** Updated component state (mutated in-place) */
  readonly componentState: ComponentState;

  /** True if component state changed */
  hasChanged: boolean;

  /** Events to schedule for future ticks */
  readonly scheduledEvents: ReadonlyArray<ScheduledEvent>;
}

/**
 * Component behavior interface for registry-based extensibility.
 */
interface ComponentBehavior {
  /** Component type this behavior handles (e.g., "battery", "switch", "led") */
  readonly componentType: ComponentType;

  /**
   * Create initial state for a component instance.
   * Called when simulation is initialized.
   *
   * @param component - The component to initialize
   * @returns Initial ComponentState for this component
   */
  createInitialState(component: Component): ComponentState;

  /**
   * Determine if conductivity (voltage/current) is allowed between two pins.
   * Called during reachability analysis in propagateConductivity().
   *
   * @param component - Component being evaluated
   * @param state - Current component state
   * @param conductivityType - Voltage or Current source type
   * @param pinId - Starting pin
   * @param otherPinId - Destination pin
   * @returns True if conductivity allowed from pinId to otherPinId
   *
   * @example
   * // Switch allows conductivity only when closed
   * allowConductivity(component, state, conductivityType, pinId, otherPinId) {
   *   return state.state === 'closed' || state.state === 'opening';
   * }
   */
  allowConductivity(
    component: Component,
    state: ComponentState,
    conductivityType: ENodeSourceType,
    pinId: string,
    otherPinId: string
  ): boolean;

  /**
   * Define component state change in response to pin state changes.
   * Called after propagateConductivity() for components with updated pin states.
   *
   * @param component - Component being evaluated
   * @param state - Current component state (mutated in-place)
   * @param nodeStates - Electrical states of all ENodes
   * @param targetTick - Target tick for this evaluation
   * @returns BehaviorResult with hasChanged flag and scheduled events
   *
   * @example
   * // LED turns on when both pins have different electrical states
   * onPinsChange(component, state, nodeStates, targetTick) {
   *   const pin0 = nodeStates.get(component.pins[0]);
   *   const pin1 = nodeStates.get(component.pins[1]);
   *   const shouldBeOn = pin0.hasVoltage && pin1.hasCurrent;
   *
   *   if (shouldBeOn && state.state === 'off') {
   *     state.state = 'goingOn';
   *     state.startTick = targetTick;
   *     return {
   *       componentState: state,
   *       hasChanged: true,
   *       scheduledEvents: [{
   *         targetId: component.id,
   *         type: 'GoingOnEnd',
   *         scheduledAtTick: targetTick,
   *         readyAtTick: targetTick + 1
   *       }]
   *     };
   *   }
   *   return { componentState: state, hasChanged: false, scheduledEvents: [] };
   * }
   */
  onPinsChange(
    component: Component,
    state: ComponentState,
    nodeStates: ReadonlyMap<UUID, NodeElectricalState>,
    targetTick: number
  ): BehaviorResult;

  /**
   * Define component state change in response to a user command.
   * Called when user interacts with component (e.g., toggle switch).
   *
   * @param component - Component being commanded
   * @param state - Current component state (mutated in-place)
   * @param command - UserCommand to process
   * @returns BehaviorResult with hasChanged flag and scheduled events
   */
  onUserCommand(
    component: Component,
    state: ComponentState,
    command: UserCommand
  ): BehaviorResult;

  /**
   * Define component state change when a scheduled event fires.
   * Called when event's readyAtTick is reached.
   *
   * @param component - Component receiving the event
   * @param state - Current component state (mutated in-place)
   * @param event - ScheduledEvent that is firing
   * @returns BehaviorResult with hasChanged flag and scheduled events
   */
  onEventFiring(
    component: Component,
    state: ComponentState,
    event: ScheduledEvent
  ): BehaviorResult;
}
```

**Implementation Notes**:
- Registered per component type string in BehaviorRegistry (e.g., "battery", "switch")
- Behaviors are stateless - all state stored in ComponentState
- Methods mutate `state` parameter in-place for performance
- Return `BehaviorResult` with `hasChanged` flag for dirty tracking and metrics
- Schedule future events by returning them in `scheduledEvents` array

---

### 6. ScheduledEvent

Represents a future event targeting a component to occur at a specific tick. 
Events are processed by the component's behavior `onEventFiring()` method which define how their state is affected by the event depending on component's current state.

```typescript
interface ScheduledEvent {
  /**
   * UUID of target component.
   * @readonly
   */
  readonly targetId: UUID;

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
   * Indicates the type of this event, e.g. 'ClosingEnd', 'OpeningEnd', 'GoingOnEnd', 'GoingOffEnd'
   * Interpreted by component behavior's onEventFiring() method.
   * @readonly
   */
  readonly type: string;

  /**
   * Optional extra parameters associated with this event.
   * @readonly
   */
  readonly parameters?: Map<string, string> | undefined;
}
```

**Example Usage**:

```typescript
// Switch closing - schedule end of closing transition
const event: ScheduledEvent = {
  targetId: switchComponent.id,
  scheduledAtTick: 10,          // Created at tick 10
  readyAtTick: 11,              // Fire at tick 11 (1 tick delay)
  type: 'ClosingEnd',           // Behavior interprets this type
  parameters: undefined
};

// LED going on - schedule end of transition with delay
const ledEvent: ScheduledEvent = {
  targetId: ledComponent.id,
  scheduledAtTick: 5,
  readyAtTick: 6,               // 1 tick transition
  type: 'GoingOnEnd',
  parameters: undefined
};
```

**Ordering Rules**:
- Events sorted by `readyAtTick` (min-heap priority queue)
- Events with same `readyAtTick` processed in FIFO order (sorted by `scheduledAtTick`)
- Events fire only for components (not wires/enodes directly)

---

### 7. UserCommand

Represents user interaction that modifies circuit behavior during simulation. Commands are submitted via `CircuitRunner.submitCommand()` and processed during the tick execution.

```typescript
interface UserCommand {
  /**
   * Type of command. Currently only 'toggle_switch' is implemented.
   * @readonly
   */
  readonly type: 'toggle_switch';

  /**
   * UUID of target component.
   * @readonly
   */
  readonly targetId: UUID;

  /**
   * Tick when this command was scheduled.
   * Set automatically when command is submitted.
   */
  scheduledAtTick: number;

  /**
   * Optional extra parameters associated with this command.
   * @readonly
   */
  readonly parameters?: Map<string, string> | null;
}
```

**Example Usage**:

```typescript
// Toggle a switch
const toggleCmd: UserCommand = {
  type: 'toggle_switch',
  targetId: switchComponent.id,
  scheduledAtTick: 0,  // Will be set by CircuitRunner
  parameters: null
};

runner.submitCommand(toggleCmd);
runner.tick();  // Command executes during this tick
```

**Processing**:
- Commands submitted via `CircuitRunner.submitCommand()`
- Only one command per component per tick allowed (subsequent commands for same component discarded)
- Processed during `tick()` after event firing, before state propagation
- Component's `onUserCommand()` method handles the command
- May trigger immediate state changes and/or schedule future events
- Commands cleared after processing each tick

---

### 8. RunnerResult

Result object returned by `CircuitRunner.tick()` and `CircuitRunner.tickN()` containing metrics about the tick execution.

```typescript
interface RunnerResult {
  /** Tick number at start of execution */
  startTick: number;

  /** Tick number after execution completes */
  endTick: number;

  /** Number of components that changed state */
  componentUpdateCount: number;

  /** Number of enodes that changed electrical state */
  nodeUpdateCount: number;

  /** Number of wires that changed electrical state */
  wireUpdateCount: number;

  /** Number of user commands processed this tick */
  processedCommandCount: number;

  /** Number of new events scheduled this tick */
  scheduledEventCount: number;

  /** Number of events that fired this tick */
  firedEventCount: number;
}
```

**Usage**:
- Returned by `tick()` to provide visibility into simulation activity
- `tickN(count)` returns array of RunnerResult for each tick
- Useful for debugging, performance monitoring, and UI updates

**Example**:
```typescript
const result = runner.tick();
console.log(`Tick ${result.startTick} → ${result.endTick}`);
console.log(`Components updated: ${result.componentUpdateCount}`);
console.log(`Events fired: ${result.firedEventCount}`);
console.log(`Events scheduled: ${result.scheduledEventCount}`);
```

---

### 9. ReachabilityResult

Internal type used by `computeReachability()` to track which nodes and wires are reachable from voltage/current sources during conductivity propagation.

```typescript
type ReachabilityResult = {
  /** Set of ENode UUIDs reachable from sources */
  nodes: Set<UUID>;

  /** Set of Wire UUIDs reachable from sources */
  wires: Set<UUID>;
};
```

**Usage**:
- Internal to `CircuitRunner.propagateConductivity()`
- Not exposed in public API
- Used during BFS traversal from voltage/current sources

---

## Supporting Classes

### 10. StateManager

Manages current simulation state and optional historical states using a circular buffer.

```typescript
class StateManager {
  private currentState: SimulationState;
  private history: SimulationState[];
  private readonly historyEnabled: boolean;
  private readonly historyLimit: number;
  private historyWriteIndex: number;

  constructor(enableHistory: boolean = false, historyLimit: number = 1000) {
    if (historyLimit < 1) {
      throw new RangeError(`historyLimit must be at least 1 (got ${historyLimit})`);
    }

    this.historyEnabled = enableHistory;
    this.historyLimit = historyLimit;
    this.currentState = new SimulationState(0);
    this.history = [];
    this.historyWriteIndex = 0;
  }

  /**
   * Get the current simulation state (mutable for simulation engine use).
   * @returns Current state
   */
  getCurrentState(): SimulationState {
    return this.currentState;
  }

  /**
   * Get current tick number.
   * @returns Current simulation tick
   */
  getCurrentTick(): number {
    return this.currentState.tick;
  }

  /**
   * Advance to next tick, optionally saving current state to history.
   * Mutates current state's tick in-place (doesn't create new state).
   * @returns Current state (now at next tick)
   */
  advanceToNextTick(): SimulationState {
    const nextTick = this.currentState.tick + 1;

    // Save current state to history if enabled
    if (this.historyEnabled) {
      this.saveToHistory(this.currentState.clone());
    }

    // Update current state to new tick (in-place)
    this.currentState.tick = nextTick;

    return this.currentState;
  }

  /**
   * Get a historical state by tick number.
   * Only works if history is enabled.
   * @param tick - Tick number to retrieve
   * @returns State at that tick, or undefined if not available
   */
  getStateAtTick(tick: number): SimulationState | undefined {
    if (!this.historyEnabled) {
      return undefined;
    }

    return this.history.find((state) => state.tick === tick);
  }

  /**
   * Get all available historical states.
   * Returns empty array if history is disabled.
   * @returns Array of historical states, sorted by tick (oldest first)
   */
  getHistory(): ReadonlyArray<SimulationState> {
    if (!this.historyEnabled) {
      return [];
    }

    // Return sorted copy
    return [...this.history].sort((a, b) => a.tick - b.tick);
  }

  /**
   * Clear all history.
   */
  clearHistory(): void {
    this.history = [];
    this.historyWriteIndex = 0;
  }

  /**
   * Reset to tick 0, clearing current state and all history.
   */
  reset(): void {
    this.currentState = new SimulationState(0);
    this.clearHistory();
  }

  /**
   * Check if history tracking is enabled.
   * @returns True if history is enabled
   */
  isHistoryEnabled(): boolean {
    return this.historyEnabled;
  }

  /**
   * Save a state to history using circular buffer.
   * Private helper for advanceToNextTick.
   * @param state - State to save
   */
  private saveToHistory(state: SimulationState): void {
    if (this.history.length < this.historyLimit) {
      // History not yet full, just append
      this.history.push(state);
    } else {
      // Circular buffer: overwrite oldest entry
      this.history[this.historyWriteIndex] = state;
      this.historyWriteIndex = (this.historyWriteIndex + 1) % this.historyLimit;
    }
  }
}
```

---

### 11. EventQueue

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

### 12. DirtyTracker

Tracks which circuit elements have changed state during the current tick to optimize uages (rendering process, animations ...) of clients

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

### 13. BehaviorRegistry

Registry for component type → behavior mappings. Maps component type strings to their behavior implementations.

```typescript
class BehaviorRegistry {
  private behaviors: Map<string, ComponentBehavior>;

  constructor() {
    this.behaviors = new Map();
  }

  /**
   * Register a behavior for a component type.
   * Overwrites any existing behavior for the same type.
   * @param behavior - The component behavior to register
   * @throws TypeError if behavior is null/undefined or componentType is empty
   */
  register(behavior: ComponentBehavior): void {
    if (!behavior) {
      throw new TypeError('Behavior cannot be null or undefined');
    }

    if (!behavior.componentType || behavior.componentType.trim() === '') {
      throw new TypeError('Behavior componentType cannot be empty');
    }

    this.behaviors.set(behavior.componentType, behavior);
  }

  /**
   * Register multiple behaviors at once.
   * Convenience method for bulk registration.
   * @param behaviors - Array of behaviors to register
   */
  registerAll(behaviors: ComponentBehavior[]): void {
    behaviors.forEach((behavior) => this.register(behavior));
  }

  /**
   * Get the behavior for a component type.
   * @param componentType - Type identifier (e.g., "battery", "led", "switch")
   * @returns The registered behavior, or undefined if not found
   */
  get(componentType: string): ComponentBehavior | undefined {
    return this.behaviors.get(componentType);
  }

  /**
   * Check if a behavior is registered for a component type.
   * @param componentType - Type identifier to check
   * @returns True if behavior is registered
   */
  has(componentType: string): boolean {
    return this.behaviors.has(componentType);
  }

  /**
   * Unregister a behavior for a component type.
   * @param componentType - Type identifier to unregister
   * @returns True if behavior was found and removed
   */
  unregister(componentType: string): boolean {
    return this.behaviors.delete(componentType);
  }

  /**
   * Clear all registered behaviors.
   */
  clear(): void {
    this.behaviors.clear();
  }

  /**
   * Get all registered component types.
   * @returns Array of component type identifiers
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.behaviors.keys());
  }

  /**
   * Get count of registered behaviors.
   * @returns Number of registered behaviors
   */
  size(): number {
    return this.behaviors.size;
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
