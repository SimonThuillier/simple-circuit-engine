# Feature Specification: Circuit Runner Controller

**Feature Branch**: `013-circuit-runner-controller`
**Created**: 2025-12-20
**Status**: Draft
**Input**: User description: "Complete CircuitRunnerController implementation so that it manages an already built circuit allowing to pause/play the simulation, animate components/wires/enodes according to their model CircuitRunner state/transition and click on some components (eg switch) to trigger them"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Control Simulation Playback (Priority: P1)

As a user viewing a circuit, I want to start, pause, and step through the simulation so that I can observe how electrical signals propagate through my circuit at my own pace.

**Why this priority**: Core functionality - without simulation controls, the controller has no way to advance the simulation state, making all other features inoperable.

**Independent Test**: Can be fully tested by loading a circuit, clicking play to start simulation, pause to stop it, and step to advance one tick at a time. Delivers immediate value by allowing users to control simulation timing.

**Acceptance Scenarios**:

1. **Given** a circuit is loaded and simulation is paused, **When** user triggers play, **Then** simulation begins advancing automatically at the configured tick interval
2. **Given** simulation is playing, **When** user triggers pause, **Then** simulation stops advancing and maintains current state
3. **Given** simulation is paused, **When** user triggers step, **Then** simulation advances exactly one tick and remains paused
4. **Given** simulation is playing, **When** user adjusts tick interval, **Then** simulation continues at the new speed

---

### User Story 2 - Animate Component State Changes (Priority: P1)

As a user watching a simulation, I want to see components visually update to reflect their current state so that I can understand what is happening in the circuit.

**Why this priority**: Essential for user comprehension - simulation without visual feedback provides no value to users observing circuit behavior.

**Independent Test**: Can be tested by running a simulation with a switch and LED circuit. When the switch closes, the LED should visually light up. Delivers value by providing immediate visual feedback of circuit state.

**Acceptance Scenarios**:

1. **Given** a switch component in open state, **When** simulation state shows switch is closed, **Then** switch visual animates to closed position
2. **Given** an LED component in off state, **When** simulation state shows LED is lit, **Then** LED visual displays illumination effect
3. **Given** any component changes state, **When** the change is detected, **Then** visual update occurs smoothly within one render frame

---

### User Story 3 - Visualize Wire Electrical State (Priority: P2)

As a user observing current flow, I want to see wires change appearance based on whether they carry voltage/current so that I can trace the electrical path through my circuit.

**Why this priority**: Important for understanding circuit behavior, but simulation is still useful without wire state visualization (component states alone provide value).

**Independent Test**: Can be tested by running a circuit with a battery connected to components. Wires connected to the battery should show their state (blue if hasCurrent, red if hasVoltage, white if idle). Delivers value by showing where electricity flows.

**Acceptance Scenarios**:

1. **Given** a wire with no voltage/current, **When** voltage begins flowing through it, **Then** wire visual changes to indicate energized state
2. **Given** an energized wire, **When** voltage/current stops flowing, **Then** wire visual returns to idle state
3. **Given** multiple wires in circuit, **When** simulation updates, **Then** only wires with changed state are visually updated

---

### User Story 4 - Visualize ENode Electrical State (Priority: P2)

As a user tracing connections, I want to see connection points (pins and branching points) reflect their electrical state so that I can understand signal propagation at junction points.

**Why this priority**: Complements wire visualization for complete electrical flow understanding.

**Independent Test**: Can be tested by observing pin colors on components during simulation. Pins receiving current (blue) or voltage (red) should change appearance. Delivers value by showing signal arrival at component terminals.

**Acceptance Scenarios**:

1. **Given** a pin with no voltage, **When** voltage arrives at the pin, **Then** pin visual indicates energized state
2. **Given** a branching point with no current, **When** current flows through it, **Then** branching point visual indicates current flow
3. **Given** simulation tick completes, **When** enode states have changed, **Then** only changed enodes update visually

---

### User Story 5 - Interact with Triggerable Components (Priority: P1)

As a user running a simulation, I want to click on interactive components like switches to toggle them so that I can interact with my circuit in real-time.

**Why this priority**: Essential for user interaction - allows users to experiment with their circuits rather than just observe static behavior.

**Independent Test**: Can be tested by clicking on a switch component during simulation. The switch should transition to opening/closing state and the circuit should respond accordingly (animation of the switch middle moving). Then when its state reach open/close and electrical states change circuit should respond. Delivers value by enabling interactive circuit experimentation.

**Acceptance Scenarios**:

1. **Given** a switch in open state during simulation, **When** user clicks on the switch, **Then** a toggle command is submitted to the simulation and switch begins closing
2. **Given** a switch in closed state during simulation, **When** user clicks on the switch, **Then** a toggle command is submitted and switch begins opening
3. **Given** user clicks a non-interactive component, **When** click is processed, **Then** no command is submitted (click is ignored for simulation purposes)

---

### Edge Cases

- What happens when user clicks play on an empty circuit (no components)?
  - Simulation should handle gracefully without errors, ticks process with no state changes
- What happens when simulation is disposed while playing?
  - Simulation loop must be stopped and cleaned up properly to prevent memory leaks
- How does system handle rapid play/pause toggling?
  - Each action should be processed correctly, no race conditions or duplicate loops
- What happens when user clicks a component multiple times quickly?
  - Only one command per component per tick should be accepted (existing behavior in CircuitRunner)
- What happens when circuit runner is replaced while simulation is playing?
  - Previous simulation should be stopped, new circuit should be loaded fresh

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a method to start automatic simulation playback
- **FR-002**: System MUST provide a method to pause/stop automatic simulation playback
- **FR-003**: System MUST provide a method to advance simulation by exactly one tick (step)
- **FR-004**: System MUST allow configuring the simulation tick interval (speed control)
- **FR-005**: System MUST update component visuals when component state changes (using factory updateAnimation method)
- **FR-006**: System MUST update wire visuals to reflect electrical state (voltage/current presence)
- **FR-007**: System MUST update enode visuals to reflect electrical state (voltage/current presence)
- **FR-008**: System MUST only update visuals for elements marked as dirty by the simulation (optimization)
- **FR-009**: System MUST accept click events on components during simulation
- **FR-010**: System MUST submit toggle commands to CircuitRunner when interactive components (Switch) are clicked
- **FR-011**: System MUST emit events for simulation state changes (started, paused, stepped)
- **FR-012**: System MUST properly dispose simulation loop resources when controller is disposed or circuit is replaced
- **FR-013**: System MUST expose current simulation state (playing/paused, current tick) for external query
- **FR-014**: System MUST initialize simulation in paused state when a circuit is loaded (user must explicitly trigger play)

### Key Entities

- **CircuitRunner**: The simulation engine that manages state, ticks, and commands - already exists
- **SimulationState**: Snapshot of component/wire/enode states at a given tick - already exists
- **DirtyElements**: Set of element IDs that changed during last tick - used for optimized updates
- **UserCommand**: Command structure for user interactions (e.g., toggle_switch) - already exists
- **InterpolationController**: Manages smooth animation transitions between discrete states - already exists
- **AbstractCircuitController**: Base class for CircuitRunnerController that already scene creation, common logic and hovering - already exists

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Simulation can be started, paused, and stepped without errors or visual glitches
- **SC-002**: Component state changes are reflected visually within one render frame after tick completion
- **SC-003**: Wire and enode electrical states are visually distinguishable (user can identify energized vs idle)
- **SC-004**: User can toggle a switch by clicking on it, and the circuit responds within the next simulation tick
- **SC-005**: Simulation runs smoothly at configurable intervals from 50ms to 2000ms per tick
- **SC-006**: No memory leaks when starting/stopping simulation repeatedly or when switching circuits
- **SC-007**: Performance remains acceptable with circuits containing 50+ components (no visible lag)

## Clarifications

### Session 2025-12-20

- Q: When a circuit is first loaded, should simulation auto-play or start paused? → A: Paused - user must explicitly trigger play
- Q: What color for wires/enodes when both voltage AND current present? → A: Blue (current takes priority)

## Assumptions

- The CircuitRunner and its related simulation infrastructure (StateManager, BehaviorRegistry, DirtyTracker) are fully implemented and working correctly
- Visual factories (SwitchVisualFactory, SmallLEDVisualFactory, etc.) have working updateAnimation methods
- The WireVisualManager can accept different material states for visualizing electrical flow
- Default tick interval is 500ms (reasonable for observing state changes)
- Electrical state visualization uses color scheme: blue for hasCurrent, red for hasVoltage only, white for idle; when both voltage and current are present, current (blue) takes priority
- Only Switch components are interactive/clickable for P1 scope; other interactive components can be added later
