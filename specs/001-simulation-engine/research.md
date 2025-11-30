# Research & Architectural Decisions

**Feature**: Discrete-Time Circuit Simulation Engine
**Date**: 2025-11-30

## Overview

This document captures key architectural decisions, algorithms, and patterns selected for the simulation engine based on performance requirements (300+ components @ 60 FPS), extensibility goals (easy addition of component types), and constitutional constraints (dependency-free core module).

---

## 1. State Propagation Algorithm

### Decision: Single-Pass Topological Ordering

**Rationale**:
- Binary electrical states (powered/unpowered) propagate deterministically from voltage sources
- Topological sort from voltage sources ensures each node is evaluated exactly once per step
- O(V + E) complexity scales linearly with circuit size (ideal for 300+ component target)
- No convergence iterations needed (unlike analog circuit solvers)

**Implementation Approach**:
1. At initialization, identify all voltage source pins (batteries, power supplies)
2. Build adjacency graph: ENode → connected ENod es via Wires
3. Each step:
   - Clear all electrical states (assume unpowered)
   - BFS/DFS from voltage sources, marking connected nodes as powered
   - Topological ordering ensures upstream components evaluated before downstream

**Alternatives Considered**:
- **Iterative propagation until stable**: Would require multiple passes per step, degrading performance. Rejected because binary states don't need convergence.
- **Event-driven delta propagation**: Would add complexity tracking state changes. Rejected in favor of clean-slate approach combined with dirty tracking for rendering.

**Best Practices**:
- Cache topological order across steps (only rebuild when circuit topology changes)
- Use bit vectors for electrical state (compact, cache-friendly)
- Leverage existing Circuit graph structure (no duplicate data structures)

---

## 2. Event Scheduling for Delayed Transitions

### Decision: Min-Heap Priority Queue with FIFO Ordering

**Rationale**:
- Components with delays (transistors, relays) schedule future state transitions
- Min-heap provides O(log N) insertion and extraction of earliest event
- FIFO ordering within same tick ensures deterministic execution
- Scalable to hundreds of pending events without performance impact

**Implementation Approach**:
```typescript
class EventQueue {
  private heap: ScheduledEvent[];  // Min-heap ordered by readyAtTick

  schedule(event: ScheduledEvent): void {
    // Insert with O(log N) complexity
    // For same readyAtTick, preserve FIFO order (tie-break by scheduledAtTick)
  }

  getReadyEvents(currentTick: number): ScheduledEvent[] {
    // Extract all events with readyAtTick <= currentTick
    // Return in FIFO order (events with same readyAtTick)
  }
}
```

**Alternatives Considered**:
- **Sorted array**: O(N) insertion, rejected due to poor write performance
- **Multiple queues per tick**: Memory overhead, complex management, rejected
- **JavaScript Map<tick, Event[]>**: Good for sparse ticks but poor worst-case performance

**Best Practices**:
- Use standard binary heap implementation (widely understood, cache-friendly)
- Include both `scheduledAtTick` and `readyAtTick` to enable FIFO tie-breaking
- Prune expired events to prevent memory growth

---

## 3. Dirty Tracking for Rendering Optimization

### Decision: Per-Element Dirty Flags (BitSet Pattern)

**Rationale**:
- Rendering module needs to know which components/wires/enodes changed state
- Per-element granularity minimizes unnecessary rendering work
- BitSet or Map<UUID, boolean> provides O(1) mark and query
- Memory overhead is minimal (1 bit per element ~= 50 bytes for 300 components)

**Implementation Approach**:
```typescript
class DirtyTracker {
  private dirtyComponents: Set<UUID>;
  private dirtyWires: Set<UUID>;
  private dirtyEnodes: Set<UUID>;

  markDirty(type: 'component' | 'wire' | 'enode', id: UUID): void {
    // O(1) insertion into appropriate set
  }

  getDirtyElements(): { components: UUID[], wires: UUID[], enodes: UUID[] } {
    // Return and clear dirty sets each step
  }

  clear(): void {
    // Reset all dirty flags after rendering consumes them
  }
}
```

**Alternatives Considered**:
- **Global dirty flag**: Would force renderer to check all elements. Rejected—inefficient for large circuits.
- **Spatial dirty regions**: Adds complexity for grid-based tracking. Rejected—overkill for discrete components.
- **No dirty tracking**: Would require full scene re-render every step. Rejected—violates 60 FPS goal.

**Best Practices**:
- Clear dirty flags immediately after rendering consumes them (avoid stale state)
- Expose dirty tracker as optional (headless mode doesn't need it)
- Use Set<UUID> instead of array for O(1) membership test

---

## 4. Component Behavior Extensibility

### Decision: Registry-Based Behavior Pattern

**Rationale**:
- New component types should be addable without modifying core engine code
- Each component type needs custom logic (e.g., battery always outputs voltage, switch toggles on command)
- Registry pattern decouples behavior definitions from simulation loop
- Scales to dozens of component types without code bloat

**Implementation Approach**:
```typescript
interface ComponentBehavior {
  // Evaluate component state based on input pin states
  evaluate(component: Component, inputStates: NodeElectricalState[]): ComponentState;

  // Handle delayed transitions (optional)
  scheduleTransition?(component: Component, event: ScheduledEvent): ScheduledEvent | null;
}

class BehaviorRegistry {
  private behaviors = new Map<ComponentType, ComponentBehavior>();

  register(type: ComponentType, behavior: ComponentBehavior): void {
    this.behaviors.set(type, behavior);
  }

  getBehavior(type: ComponentType): ComponentBehavior | undefined {
    return this.behaviors.get(type);
  }
}
```

**Alternatives Considered**:
- **Inheritance-based**: `class BatteryComponent extends Component`. Rejected—tight coupling, hard to extend externally.
- **Strategy pattern with factory**: Over-engineered for this use case. Rejected—registry is simpler.
- **Configuration-driven (JSON DSL)**: Poor performance for 300+ component loops. Rejected—favor code over config.

**Best Practices**:
- Register all standard behaviors at CircuitRunner initialization
- Allow user-defined behaviors via `runner.registerBehavior(type, customBehavior)`
- Provide base behaviors (e.g., `PassthroughBehavior` for simple wires)
- Validate all behaviors implement required interface

---

## 5. State Management with Optional History

### Decision: Circular Buffer for History with Configurable Limit

**Rationale**:
- History is optional (disabled by default for performance)
- When enabled, limit to recent N steps (default 1000) to prevent memory growth
- Circular buffer provides O(1) append and O(1) access to recent states
- Garbage collection handles evicted states automatically

**Implementation Approach**:
```typescript
class StateManager {
  private currentState: SimulationState;
  private history: SimulationState[] | null;  // null when disabled
  private historyLimit: number;

  constructor(options: RunnerOptions) {
    this.currentState = new SimulationState(0);
    this.history = options.enableHistory
      ? new Array(options.historyLimit ?? 1000)
      : null;
    this.historyLimit = options.historyLimit ?? 1000;
  }

  advance(newState: SimulationState): void {
    if (this.history) {
      const index = newState.tick % this.historyLimit;
      this.history[index] = this.currentState;  // Overwrite oldest
    }
    this.currentState = newState;
  }

  getState(tick: number): SimulationState | undefined {
    if (tick === this.currentState.tick) return this.currentState;
    if (!this.history) return undefined;

    const index = tick % this.historyLimit;
    const state = this.history[index];
    return state?.tick === tick ? state : undefined;  // Validate not overwritten
  }
}
```

**Alternatives Considered**:
- **Unlimited history**: Memory leak for long simulations. Rejected.
- **Fixed circular buffer (100 steps)**: Too rigid. Rejected—user should configure.
- **Compression/delta encoding**: Complexity doesn't justify savings for 1000 steps. Rejected.

**Best Practices**:
- Default to history disabled (performance first)
- Document history limit in RunnerOptions
- Provide `clearHistory()` method for manual eviction
- Consider structural sharing if deep cloning becomes bottleneck

---

## 6. Integration with Existing Circuit Model

### Decision: Non-Destructive Augmentation (Parallel State Maps)

**Rationale**:
- Existing Circuit, Component, ENode, Wire classes are immutable topology containers
- Simulation state (electrical states, component states) is mutable and changes every step
- Parallel state maps (UUID → State) avoid polluting topology classes
- Enables multiple simultaneous simulations of same circuit (if needed)

**Implementation Approach**:
```typescript
class SimulationState {
  readonly tick: number;
  readonly nodeStates: Map<UUID, NodeElectricalState>;      // ENode ID → voltage/current
  readonly wireStates: Map<UUID, NodeElectricalState>;      // Wire ID → voltage/current
  readonly componentStates: Map<UUID, ComponentState>;      // Component ID → state

  constructor(tick: number) {
    this.tick = tick;
    this.nodeStates = new Map();
    this.wireStates = new Map();
    this.componentStates = new Map();
  }
}
```

**Alternatives Considered**:
- **Mutate existing objects**: `enode.voltage = true`. Rejected—violates immutability, breaks multiple simulations.
- **Subclass with state**: `class SimulatedComponent extends Component`. Rejected—type explosion, inheritance issues.
- **WeakMap for state**: Clever but harder to serialize/debug. Rejected—explicit maps are clearer.

**Best Practices**:
- Use Map<UUID, State> for O(1) lookups
- Shallow-clone state maps for history (structural sharing where possible)
- Provide getters on CircuitRunner: `getComponentState(id)`, `getEnodeState(id)`
- Keep Circuit class unchanged (backward compatibility)

---

## 7. Performance Optimization Strategies

### Decisions

1. **Avoid redundant propagation**: If no user commands and no scheduled events ready, state doesn't change—skip propagation
2. **Cache topological order**: Build once, reuse across steps (invalidate only if topology changes)
3. **Use TypedArrays for state**: Consider Uint8Array for boolean states (compact, cache-friendly)
4. **Batch dirty tracking**: Mark dirty in bulk during propagation, query once at end
5. **Lazy component evaluation**: Only evaluate component behaviors for components with changed inputs

**Benchmarking Targets**:
- Basic circuit (10 components): <1ms per step
- Medium circuit (100 components, 150 wires): <10ms per step
- Large circuit (300 components, 400 wires): <16ms per step (60 FPS)
- Stress test (500 components): <50ms per step

**Profiling Plan**:
- Use `performance.now()` to measure step duration
- Identify hotspots: propagation, behavior evaluation, dirty tracking
- Optimize critical path first (propagation likely bottleneck)

---

## 8. TypeScript Patterns and Best Practices

### Strict Type Safety

```typescript
// Use discriminated unions for state types
type NodeElectricalState = {
  hasVoltage: boolean;
  hasCurrent: boolean;
};

// Use branded types for different ID categories (if needed)
type EnodeID = UUID & { __brand: 'EnodeID' };
type ComponentID = UUID & { __brand: 'ComponentID' };

// Readonly where immutability is guaranteed
interface SimulationState {
  readonly tick: number;
  readonly nodeStates: ReadonlyMap<UUID, NodeElectricalState>;
}
```

### Error Handling

- Throw TypeErrors for invalid configurations (e.g., negative historyLimit)
- Throw RangeErrors for out-of-bounds operations (e.g., accessing tick beyond history)
- Use Error subclasses for simulation-specific errors (e.g., `CircuitTopologyError`)

### Documentation Standards

All public APIs must have JSDoc including:
- `@param` for each parameter
- `@returns` for return value
- `@throws` for possible exceptions
- `@example` with realistic usage code

---

## Summary of Key Technologies

| Concern                  | Technology / Pattern                | Rationale                                    |
| ------------------------ | ----------------------------------- | -------------------------------------------- |
| State Propagation        | Topological Sort (BFS/DFS)          | O(n) single-pass, deterministic              |
| Event Scheduling         | Min-Heap Priority Queue             | O(log n) insertion, FIFO ordering            |
| Dirty Tracking           | Set<UUID> per element type          | O(1) mark/query, minimal memory              |
| Component Behaviors      | Registry-based Strategy Pattern     | Extensible without core code changes         |
| History Storage          | Circular Buffer with limit          | Configurable, bounded memory                 |
| State Management         | Parallel Maps (UUID → State)        | Non-destructive, supports multiple instances |
| Type Safety              | TypeScript strict mode              | Catch errors at compile time                 |
| Testing                  | Vitest with integration benchmarks  | Fast, modern, supports performance tests     |
| Documentation            | JSDoc for all public APIs           | IDE autocomplete, generated docs             |
| Performance Optimization | Caching, lazy eval, TypedArrays     | Achieve 60 FPS for 300+ components           |

---

## Next Steps

1. **Phase 1**: Define data model (SimulationState, NodeElectricalState, ComponentState, etc.)
2. **Phase 1**: Design API contracts (CircuitRunner public interface)
3. **Phase 2**: Implement core classes with TDD (write tests first)
4. **Phase 2**: Integrate with CircuitEngine facade
5. **Phase 2**: Add performance benchmarks
6. **Phase 3**: Write developer documentation and examples
