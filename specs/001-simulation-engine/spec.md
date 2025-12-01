# Feature Specification: Discrete-Time Circuit Simulation Engine

**Feature Branch**: `001-simulation-engine`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "I need do develop the core Circuit's simulation engine. This engine will provides step by step discrete time of electrical states (voltage/current present or not) in wires, enodes and components and allow for delayed transitions in components. It should be optimized well enough for circuits of hundreds of components."

## Clarifications

### Session 2025-11-30

- Q: How should simultaneous events (same readyAtTick) be ordered when multiple components have delays expiring at the same step? → A: FIFO within same tick (first scheduled, first processed)
- Q: For voltage/current propagation through the circuit graph, should states spread in single-pass or iterative fashion? → A: Single-pass propagation with topological ordering
- Q: What granularity should DirtyTracker use for tracking changed elements? → A: Per-element dirty flags (component/wire/enode level)
- Q: When enableHistory is true, what limits should apply to prevent unbounded memory growth? → A: Configurable limit with default (e.g., 1000 steps)
- Q: How should new component types be added for extensibility? → A: Registry-based with type-specific behavior classes

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Basic Circuit State Simulation (Priority: P1)

Users need to simulate simple circuits to verify basic electrical behavior across connected components. The simulation tracks binary electrical states (powered/unpowered) through wires and components step by step.

**Why this priority**: This is the foundational capability - without basic state propagation, no circuit simulation is possible. This represents the minimal viable simulation engine.

**Independent Test**: Can be fully tested by creating a circuit with a battery and LED, running the simulation, and verifying that electrical state propagates from the battery through wires to the LED, causing it to activate.

**Acceptance Scenarios**:

1. **Given** a circuit with a battery connected to an LED via wires, **When** the simulation runs one step, **Then** the battery's output pin is marked as powered (voltage present)
2. **Given** a powered battery output pin, **When** the simulation propagates states, **Then** all wires and enodes connected to that pin are marked as powered
3. **Given** an LED with a powered input pin, **When** the simulation evaluates component states, **Then** the LED state becomes "on" (activated)
4. **Given** a circuit with disconnected components, **When** the simulation runs, **Then** unpowered components remain unpowered
5. **Given** a complete circuit path from battery to ground, **When** the simulation runs, **Then** all components and wires in the path are marked as powered

---

### User Story 2 - Switch and Interactive Component Behavior (Priority: P2)

Users need to simulate circuits with interactive components like switches that can change state and affect circuit behavior. When a switch opens or closes, the simulation must recalculate electrical states throughout the circuit.

**Why this priority**: Switches are the most common interactive component and enable users to test dynamic circuit behavior, which is essential for educational and design verification use cases.

**Independent Test**: Can be fully tested by creating a circuit with a battery, switch, and LED. Toggle the switch state, run the simulation, and verify that the LED only powers when the switch is closed, demonstrating state-dependent propagation.

**Acceptance Scenarios**:

1. **Given** a circuit with a closed switch in the path, **When** the simulation runs, **Then** electrical state propagates through the switch
2. **Given** a circuit with an open switch in the path, **When** the simulation runs, **Then** electrical state does not propagate through the switch and downstream components remain unpowered
3. **Given** a running simulation with a switch, **When** the switch state is toggled from open to closed, **Then** the next simulation step propagates state through the newly closed path
4. **Given** a powered circuit with a switch, **When** the switch state is toggled from closed to open, **Then** the next simulation step removes power from downstream components

---

### User Story 3 - Delayed Component Transitions (Priority: P3)

Users need to simulate components that have time-based behavior, such as transistors that take multiple simulation steps to fully activate or relays with switching delays. This allows realistic modeling of component behavior.

**Why this priority**: Many real-world components have propagation delays and transition times. This feature enables accurate simulations of simple digital circuits through time which is a core objective of this project.

**Independent Test**: Can be fully tested by creating a circuit with a transistor configured with a 3-step activation delay, applying power to the gate, and verifying that the transistor conducts only after 3 simulation steps have elapsed.

**Acceptance Scenarios**:

1. **Given** a transistor with a 3-step activation delay, **When** power is applied to the gate, **Then** the transistor state becomes "activating" with a delay counter of 3
2. **Given** an activating transistor with delay counter of 3, **When** each simulation step executes, **Then** the delay counter decrements by 1
3. **Given** an activating transistor with delay counter reaching 0, **When** the next simulation step executes, **Then** the transistor state becomes "active" and allows current flow
4. **Given** an active transistor with delay, **When** power is removed from the gate, **Then** the transistor deactivates after the configured delay period
5. **Given** multiple components with different delay values, **When** the simulation runs, **Then** each component transitions independently according to its configured delay

---

### User Story 4 - Performance for Large Circuits (Priority: P2)

Users need to simulate circuits with hundreds of components efficiently, with simulation steps completing quickly enough for interactive playback and step-by-step debugging.

**Why this priority**: Performance is critical for user experience and enables the tool to scale beyond toy examples to real educational and design scenarios. Without good performance, the tool becomes unusable for practical circuits.

**Independent Test**: Can be fully tested by creating a circuit with 300 components and 400 wires, running 1000 simulation steps, and measuring that each step completes in under 16 milliseconds (enabling 60 FPS playback).

**Acceptance Scenarios**:

1. **Given** a circuit with 100 components and 150 wires, **When** a simulation step executes, **Then** the step completes in under 10 milliseconds
2. **Given** a circuit with 300 components and 400 wires, **When** a simulation step executes, **Then** the step completes in under 16 milliseconds
3. **Given** a running simulation, **When** 1000 consecutive steps are executed, **Then** average step time remains consistent without degradation
4. **Given** a circuit with complex topology (multiple branching points and loops), **When** the simulation runs, **Then** state propagation completes without redundant calculations

---

### Edge Cases

- Q: What happens when a circuit has loops (e.g., wire path from A → B → C → A)? A: this will typically occurs in real circuits, the simulation engine must handle them gracefully without infinite recursion or crashes.
- Q: How does the system handle floating nodes (components with no path to voltage source or ground)? A: these nodes should remain unpowered (no voltage/current flow) throughout the simulation.
- Q: What happens when a component has conflicting states (e.g., multiple voltage sources with different values) A: voltage or current levels are boolean, no conflicts should arise, but the system must define a clear precedence rule if needed.
- Q: How does simulation behave when a circuit has no voltage sources or current sources? A: nothing happens, all components remain unpowered.
- Q: What happens when components are added/removed during an active simulation? A: this feature is out of scope. For the initial version, circuit topology is static during simulation.
- Q: How does the system handle invalid component configurations (e.g., short circuit)? A: system shouldn't handle electrical risks: for example a wire between the two pins of battery will simply be considered under voltage with current flowing.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST maintain two binary electrical state (voltage or not and current flowing or not) for each ENode in the circuit
- **FR-002**: System MUST maintain two binary electrical state (voltage or not and current flowing or not) for each Wire in the circuit
- **FR-003**: System MUST maintain component-specific state for each Component (e.g., switch opening/open/closing/closed, transistor inactive/activating/active/deactivating ...)
- **FR-004**: System MUST identify voltage source pins at simulation initialization based on component type and configuration
- **FR-005**: System MUST propagate electrical state from voltage sources through connected wires and enodes using single-pass topological ordering in each simulation step
- **FR-006**: System MUST evaluate each component's behavior based on its input pin states and update component state accordingly
- **FR-007**: System MUST support component state transitions that occur immediately (same step as input change)
- **FR-008**: System MUST support component state transitions that occur after a configured delay (integer N steps after input change)
- **FR-009**: System MUST track delay counters for components with delayed transitions and decrement them each step
- **FR-010**: System MUST allow querying the current state of any component, wire, or enode at any simulation step
- **FR-011**: System MUST allow advancing simulation by one discrete time step
- **FR-012**: System MUST complete each simulation step for circuits with up to 300 components and 400 wires in under 16 milliseconds
- **FR-013**: System MUST avoid redundant state recalculations when circuit state has not changed
- **FR-014**: System MUST support headless operation (simulation without visualization)
- **FR-015**: System MUST process scheduled events with the same readyAtTick in FIFO order (first scheduled, first processed)

### Key Entities _(include if feature involves data)_

- **CircuitRunner**: Core simulation engine that manages the simulation lifecycle, including initialization, stepping through time, and state querying. Attributes include currentTick (simulation step), a readonly Circuit, a CommandQueue handling user interactions (switches), an EventQueue handling transitional electrical events, and a StateManager handling state and optionally history.

- **RunnerOptions**: Configuration options for CircuitRunner, including enableHistory (boolean) to track past states or not (allowing user to prefer performance or debugging at choice), and historyLimit (optional number) specifying maximum number of past states to retain when history is enabled (default: 1000 steps).

- **SimulationState**: Represents the complete electrical state of the circuit at a specific time step. Attributes include tick (current step number), state maps for identifier -> State for components/wires/enodes.

- **NodeElectricalState**: With Two Binary representing under voltage or not and current flowing or not for wires and enodes.

- **ComponentState**: Base state for all components, extended by specific component types.

- **ComponentBehavior**: Interface allowing the definition of component-specific logic for state evaluation and transition handling. New component types are added via a registry-based pattern where behavior classes are registered by component type in a map/registry, allowing extension without modifying core engine code.

- **UserCommand**: Represents user interactions that affect the circuit (e.g., toggling a switch). Attributes include tick of action, commandType, targetComponentId, and optional parameters.

- **ScheduledEvent**: Represents internal events scheduled to occur at future simulation steps (e.g., delayed transitions). Attributes include scheduledAtTick, readyAtTick, targetType, targetId, and new state. Events with the same readyAtTick are processed in FIFO order (first scheduled, first processed).

- **StateManager**: Manages current and optionally historical simulation states, providing methods to get current state, advance steps, and optionally query past states.

- **DirtyTracker**: Utility to track which components/wires/enodes have changed state in the current step at per-element granularity (individual dirty flag for each component, wire, and enode), enabling optimized rendering updates.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can simulate a basic battery-LED circuit and observe correct state propagation in a single step
- **SC-002**: Users can simulate circuits with switches and verify that opening/closing the switch correctly affects downstream components within one simulation step
- **SC-003**: Circuits with 300 components and 400 wires simulate at 60 steps per second (16ms per step) or faster
- **SC-004**: Users can configure component transition delays and verify that delayed components activate after the specified number of steps
- **SC-005**: Simulation state queries return results instantly (under 1ms) for circuits of any size up to 500 components
- **SC-006**: Users can run 10,000 consecutive simulation steps without performance degradation or memory leaks
- **SC-007**: Users can integrate the simulation engine into the existing CircuitEngine facade with minimal code changes
