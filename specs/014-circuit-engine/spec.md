# Feature Specification: CircuitEngine Unified Facade

**Feature Branch**: `014-circuit-engine`
**Created**: 2025-12-22
**Status**: Draft
**Input**: User description: "CircuitEngine must be implemented: it should manage integration of CircuitController (for editing static circuits) and CircuitRunnerController (for simulating live circuits) into a unified facade, allowing seamless switch between edition and simulation modes."

## Clarifications

### Session 2025-12-22

- Q: What should happen to visual state during mode switch? → A: Share visual object maps between controllers (no visual recreation on switch)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Switch from Edit Mode to Simulation Mode (Priority: P1)

A user is editing a circuit using the BuildTool, adding components, connecting wires, and adjusting positions. They want to test their circuit by running a simulation. The user clicks "Run Simulation" and the application seamlessly transitions from edit mode to simulation mode, loading the current circuit state into the simulation engine. The simulation begins playing and the user can see current flow and component state changes animated in real-time.

**Why this priority**: This is the core value proposition - enabling users to iterate between design and testing without manual data transfer or context switching. It represents the minimum viable integration that makes both controllers useful together.

**Independent Test**: Can be fully tested by loading a circuit in edit mode, making a modification, switching to simulation mode, and verifying the simulation reflects the edited circuit state.

**Acceptance Scenarios**:

1. **Given** a circuit is loaded in edit mode with components and wires, **When** user initiates simulation mode via the unified facade, **Then** the same circuit is loaded into the simulation controller and simulation controls become available
2. **Given** edit mode is active with unsaved tool state (e.g., wire creation in progress), **When** user switches to simulation mode, **Then** any pending operations are cancelled gracefully before transition
3. **Given** simulation mode is active, **When** user attempts to access edit-only operations, **Then** the operation is rejected with appropriate feedback

---

### User Story 2 - Switch from Simulation Mode to Edit Mode (Priority: P1)

A user has been running a simulation and notices a design flaw in their circuit. They want to pause the simulation and make corrections. The user clicks "Edit Circuit" and the application transitions back to edit mode, stopping the simulation. The circuit state reflects the original design (not the runtime simulation state), and all editing tools become available again.

**Why this priority**: This is the complementary half of the core workflow. Users must be able to return to editing after testing, otherwise the iteration loop is broken.

**Independent Test**: Can be fully tested by running a simulation, pausing, switching to edit mode, and verifying edit tools are functional and the circuit is in its designed (not simulated) state.

**Acceptance Scenarios**:

1. **Given** simulation is playing, **When** user initiates edit mode via the unified facade, **Then** simulation is stopped automatically and editing tools become available
2. **Given** simulation is paused mid-tick, **When** user switches to edit mode, **Then** the circuit reverts to its design state (pre-simulation), not the runtime state
3. **Given** edit mode is active, **When** user attempts to access simulation-only operations (play/pause/step), **Then** the operation is rejected with appropriate feedback

---

### User Story 3 - Unified Initialization and Container Management (Priority: P2)

A developer integrates CircuitEngine into their application. They provide a single DOM container element, and the engine handles all Three.js scene setup, camera management, and controller lifecycle. The developer receives events about mode changes and can query the current mode at any time.

**Why this priority**: Simplifies API consumption for developers by providing a single entry point instead of managing two separate controllers. This enables clean integration but is secondary to the mode-switching functionality.

**Independent Test**: Can be tested by initializing CircuitEngine with a container, verifying scene/camera are created, loading a circuit, and confirming events are emitted correctly.

**Acceptance Scenarios**:

1. **Given** a valid HTMLElement container, **When** CircuitEngine is initialized, **Then** the underlying controller is set up and a 'ready' event is emitted
2. **Given** CircuitEngine is initialized, **When** a circuit is loaded, **Then** the circuit is rendered in the current mode and a 'circuitLoaded' event is emitted
3. **Given** CircuitEngine is in edit mode, **When** the mode is switched to simulation, **Then** a 'modeChanged' event is emitted with the new mode

---

### User Story 4 - Unified Event System (Priority: P2)

A developer wants to respond to events from both editing and simulation modes without managing separate event subscriptions. They subscribe to CircuitEngine events once and receive notifications regardless of which mode is active, with events clearly indicating their source mode.

**Why this priority**: Reduces complexity for consumers by providing a single event stream. Important for clean integration but secondary to core mode-switching.

**Independent Test**: Can be tested by subscribing to events, switching modes, triggering mode-specific actions in each mode, and verifying all events are received through the unified interface.

**Acceptance Scenarios**:

1. **Given** a 'hover' event subscription on CircuitEngine, **When** user hovers over an element in either mode, **Then** the event is forwarded from the active controller
2. **Given** a 'simulationTick' event subscription, **When** simulation runs, **Then** tick events are forwarded; **When** in edit mode, **Then** no tick events are emitted
3. **Given** a 'toolActivated' event subscription, **When** a tool is activated in edit mode, **Then** the event is forwarded; **When** in simulation mode, **Then** no tool events are emitted

---

### User Story 5 - Resource Cleanup and Disposal (Priority: P3)

A developer needs to unmount the circuit editor/simulator from the DOM. They call dispose() on CircuitEngine and all WebGL resources, event listeners, and internal state from both controllers are properly cleaned up without memory leaks.

**Why this priority**: Essential for production applications but only relevant during teardown. Lower priority than core functionality.

**Independent Test**: Can be tested by initializing, switching modes multiple times, disposing, and verifying no memory leaks or lingering event handlers (using browser dev tools or memory profiling).

**Acceptance Scenarios**:

1. **Given** CircuitEngine is initialized with a circuit loaded, **When** dispose() is called, **Then** all Three.js resources are released and no event listeners remain attached
2. **Given** CircuitEngine was in simulation mode when disposed, **When** dispose completes, **Then** simulation loop is stopped and runner is dereferenced
3. **Given** CircuitEngine was in edit mode when disposed, **When** dispose completes, **Then** all tools are deactivated and selection is cleared

---

### Edge Cases

- What happens when user switches modes with no circuit loaded? Mode switches, but no visual changes occur. Subsequent circuit load respects current mode.
- What happens when CircuitEngine is disposed while a mode switch is in progress? Disposal completes immediately, cancelling any pending operations.
- What happens when the underlying circuit is modified externally (direct Circuit API access)? Changes are reflected on next mode switch or explicit refresh call. No automatic synchronization.
- What happens when attempting to switch to the same mode that's already active? No-op, no events emitted, returns immediately.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a unified `CircuitEngine` class that encapsulates both `CircuitController` and `CircuitRunnerController`
- **FR-002**: System MUST expose a `mode` property indicating current mode ('edit' | 'simulation')
- **FR-003**: System MUST provide a `setMode(mode)` method to switch between edit and simulation modes
- **FR-004**: System MUST automatically stop simulation when switching from simulation to edit mode
- **FR-005**: System MUST automatically cancel any active tool operations when switching from edit to simulation mode
- **FR-006**: System MUST emit a 'modeChanged' event when mode transitions complete, indicating the new mode
- **FR-007**: System MUST forward all events from the active controller through a unified event interface
- **FR-008**: System MUST provide `setCircuit(circuit)` method that loads circuit in both controllers (new CircuitRunner of this circuit for simulation mode)
- **FR-009**: System MUST provide access to underlying controllers via `getEditController()` and `getSimulationController()` for advanced use cases
- **FR-010**: System MUST provide a single `initialize(container, options)` method that sets up both controllers
- **FR-011**: System MUST share the same container and Three.js scene, camera, grid, mapControls, between both controllers to enable seamless visual transition
- **FR-012**: System MUST share the same factoryRegistry, branchingPointVisualFactory, wireVisualManager, HoverManager, and visual object maps (componentObject3Ds, enodeObject3Ds, wireObject3Ds) between both controllers to avoid redundant resource usage and enable zero-recreation mode switching
- **FR-013**: System MUST provide a single `dispose()` method that cleans up both controllers and all shared resources
- **FR-014**: System MUST reject mode-specific operations when in the wrong mode with an appropriate error
- **FR-015**: System MUST expose simulation playback controls (play, pause, step, stop) that delegate to the simulation controller
- **FR-016**: System MUST expose edit mode controls (setActiveTool, setEditMode) that delegate to the edit controller

### Key Entities

- **CircuitEngine**: Unified facade managing lifecycle and mode switching for both controllers
- **EngineMode**: Union type representing current mode ('edit' | 'simulation')
- **CircuitController**: Existing controller for static circuit editing (wrapped by facade)
- **CircuitRunnerController**: Existing controller for live simulation (wrapped by facade)
- **CircuitEngineEventMap**: Combined event type map forwarding events from both controllers plus engine-specific events

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can switch between edit and simulation modes in under 500ms for circuits with up to 100 components
- **SC-002**: All existing CircuitController tests continue to pass when accessed through CircuitEngine
- **SC-003**: All existing CircuitRunnerController tests continue to pass when accessed through CircuitEngine
- **SC-004**: Memory usage remains stable after 50 mode switches (no cumulative leaks)
- **SC-005**: Developers can integrate CircuitEngine with a single import and 5 or fewer lines of initialization code
- **SC-006**: 100% of events from underlying controllers are forwarded through the unified event interface
