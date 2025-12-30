# Feature Specification: Simulation Speed Control & Component Transition Timing

**Feature Branch**: `017-simulation-speed`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Speed of simulation must be adjustable during an ongoing simulation ranging from 1 to 20 ticks per second. Relays and transistors must have a new config parameter transitionSpan, stating how much ticks are necessary for them to change state while switches toggle command must have a new tickCount : number of ticks for the switch state to change following this command."

## Clarifications

### Session 2025-12-29

- Q: How should switch transition timing work? → A: Switch has `transitionUserSpan` config (ms), toggle command receives current simulation speed, SwitchBehavior computes tick count dynamically to maintain user-perceived timing regardless of simulation speed.
- Q: What UI mechanism for simulation speed adjustment? → A: Slider positioned directly under the play/pause button.
- Q: Where should component transition state be stored? → A: In ComponentState map within CircuitRunner.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Adjust Simulation Speed During Runtime (Priority: P1)

As a user running a circuit simulation, I want to adjust the simulation speed (ticks per second) while the simulation is running so that I can slow down to observe behavior in detail or speed up to see long-term patterns quickly.

**Why this priority**: This is the core feature enabling dynamic control over simulation timing. Without this, users cannot observe circuit behavior at different time scales during a single session.

**Independent Test**: Can be fully tested by starting a simulation and using a speed control to change from default speed to minimum (1 TPS) and maximum (20 TPS), observing that the tick rate changes accordingly.

**Acceptance Scenarios**:

1. **Given** a simulation is running at default speed, **When** the user adjusts the speed slider to 1 TPS, **Then** the simulation slows down to execute approximately 1 tick per second
2. **Given** a simulation is running at 5 TPS, **When** the user adjusts the speed slider to 20 TPS, **Then** the simulation speeds up to execute approximately 20 ticks per second
3. **Given** a simulation is paused, **When** the user adjusts the speed setting, **Then** the new speed takes effect when the simulation resumes

---

### User Story 2 - Configure Relay/Transistor Transition Timing (Priority: P2)

As a user designing circuits with relays and transistors, I want to configure a transitionSpan (in ticks) for each component so that I can model realistic switching delays and observe timing-dependent circuit behavior.

**Why this priority**: This enables more realistic circuit modeling where component switching is not instantaneous, allowing users to study race conditions and timing-dependent behavior.

**Independent Test**: Can be fully tested by placing a relay with transitionSpan=3, activating it, and verifying that the output only changes after 3 simulation ticks have elapsed.

**Acceptance Scenarios**:

1. **Given** a relay with transitionSpan=5, **When** the relay coil receives power, **Then** the relay contacts change state only after 5 simulation ticks have elapsed
2. **Given** a transistor with transitionSpan=2, **When** the base/gate signal changes, **Then** the transistor output changes only after 2 simulation ticks have elapsed
3. **Given** a relay with transitionSpan=3 that is currently transitioning (tick 2 of 3), **When** the coil power is removed, **Then** the transition is cancelled and the relay remains in its original state
4. **Given** a relay or transistor, **When** the user opens the component configuration, **Then** a transitionSpan field is available with a default value of 1 (instant transition)

---

### User Story 3 - Speed-Adaptive Switch Transition Timing (Priority: P3)

As a user interacting with switches during simulation, I want switch transitions to maintain consistent user-perceived timing regardless of simulation speed, so that my interaction rhythm stays natural even when observing circuits at different simulation speeds.

**Why this priority**: Switches are the only user-commandable components during simulation. By computing tick counts from a configurable real-world time (`transitionUserSpan` in ms) and the current simulation speed, users can maintain a natural interaction pace while automated components (relays, transistors) operate at simulation-dependent speeds. This creates an adjustable ratio between user action speed and automated component speed.

**Independent Test**: Can be fully tested by configuring a switch with transitionUserSpan=500ms, toggling at 10 TPS (expects 5 ticks), then toggling at 20 TPS (expects 10 ticks), verifying both take approximately 500ms wall-clock time.

**Acceptance Scenarios**:

1. **Given** a switch with transitionUserSpan=500ms and simulation running at 10 TPS, **When** the user toggles the switch, **Then** SwitchBehavior computes tickCount = ceil(500 × 10 / 1000) = 5 ticks, and the switch transitions over 5 ticks (~500ms wall-clock)
2. **Given** a switch with transitionUserSpan=500ms and simulation running at 20 TPS, **When** the user toggles the switch, **Then** SwitchBehavior computes tickCount = ceil(500 × 20 / 1000) = 10 ticks, and the switch transitions over 10 ticks (~500ms wall-clock)
3. **Given** a switch with transitionUserSpan=100ms and simulation running at 5 TPS, **When** the user toggles the switch, **Then** SwitchBehavior computes tickCount = ceil(100 × 5 / 1000) = 1 tick (minimum), ensuring at least one tick for transition
4. **Given** a switch with a pending toggle (mid-transition), **When** the user issues another toggle command, **Then** the old pending command prevails and the new command is ignored (current behavior)
5. **Given** a switch, **When** the user opens the component configuration, **Then** a transitionUserSpan field is available with a default value (e.g., 200ms)

---

### Edge Cases

- What happens when transitionSpan is set to 0? System treats it as instant transition (equivalent to 1).
- How does the system handle rapid speed changes while components are mid-transition? Transitions are measured in ticks, not wall-clock time, so they continue correctly regardless of speed changes.
- What happens when computed switch tick count is less than 1? System uses minimum of 1 tick to ensure valid transition.
- What happens when the simulation is stopped (not paused) while transitions or scheduled toggles are pending? All pending transitions and scheduled toggles are cleared.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow adjusting simulation speed from 1 to 20 ticks per second (inclusive) during an ongoing simulation
- **FR-001a**: Speed control MUST be a slider positioned directly under the play/pause button
- **FR-002**: System MUST apply speed changes immediately without restarting the simulation
- **FR-003**: Relays MUST have a configurable transitionSpan parameter specifying the number of ticks required for state change
- **FR-004**: Transistors MUST have a configurable transitionSpan parameter specifying the number of ticks required for state change
- **FR-005**: transitionSpan parameter MUST default to 1 tick when not explicitly configured
- **FR-006**: System MUST track transition progress for each relay/transistor individually
- **FR-007**: System MUST cancel a component's pending transition if the trigger signal is removed before transition completes
- **FR-008**: Switches MUST have a configurable transitionUserSpan parameter specifying the transition duration in milliseconds
- **FR-009**: Switch toggle command MUST receive the current simulation speed as a parameter at toggle time
- **FR-010**: SwitchBehavior MUST compute the tick count for transition using formula: ceil(transitionUserSpan × simulationSpeed / 1000), with minimum of 1 tick
- **FR-011**: transitionUserSpan parameter MUST default to a reasonable value (e.g., 500ms) when not explicitly configured
- **FR-012**: System MUST conserve any pending switch toggle command when a new toggle command is issued, and discard the new command if one is already pending
- **FR-013**: System MUST clear all pending transitions and scheduled toggles when simulation is stopped (not paused)
- **FR-014**: System MUST preserve pending transitions and scheduled toggles when simulation is paused, resuming countdown when simulation resumes

### Key Entities _(include if feature involves data)_

- **SimulationSpeed**: Current speed setting in ticks per second (1-20), affects timing of tick execution
- **TransitionSpan**: Configuration parameter on relays and transistors, integer value representing ticks required for state change
- **TransitionUserSpan**: Configuration parameter on switches, integer value in milliseconds representing user-perceived transition duration
- **TransitionState**: Runtime state tracking for components mid-transition (current tick count, target state), stored in ComponentState map within CircuitRunner

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Speed adjustment takes effect within 100ms of user interaction
- **SC-002**: Tick rate accuracy is within 10% of target (e.g., 20 TPS setting produces 18-22 actual TPS under normal conditions)
- **SC-003**: Relay/transistor transitions complete exactly at the specified tick count (no off-by-one errors)
- **SC-004**: Switch transitions maintain consistent wall-clock duration (within 10% tolerance) across different simulation speeds
- **SC-005**: All existing circuit functionality continues to work correctly with default settings (transitionSpan=1, transitionUserSpan=200ms)
