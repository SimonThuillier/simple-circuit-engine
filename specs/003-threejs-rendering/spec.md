# Feature Specification: 3D Circuit Scene Managers

**Feature Branch**: `003-threejs-rendering`
**Created**: 2025-12-02
**Updated**: 2025-12-04 (Phase 1-3 POC - Architectural refinements)
**Status**: In Progress (Phases 1-3 Complete)
**Input**: User description: "I need two three.js scene managers : one for Circuit specialized for managing circuit scene and editing, one for CircuitRunner providing an animation optimized scene for live simulated circuits. These should be two well separated submodules in src/scene with a third shared utilities module."

## Clarifications

### Session 2025-12-02

- Q: What is the exact scope boundary for these scene manager classes? → A: SceneManagers handle 3D scene construction and expose hookable callbacks for interactions, but don't implement actual mouse/keyboard event listeners or rendering orchestration.
- Q: What exactly should unit tests validate for these scene manager classes? → A: Test that scene managers correctly create/update 3D scene objects, materials, and geometries based on circuit data (mock Three.js).
- Q: What are the essential public methods each scene manager must provide? → A: constructor(factoryRegistry), initialize(container), setCircuit(circuit), update(), render(), dispose(), on(event, callback), getScene(), getCamera().
- Q: Who owns the animation frame loop and WebGLRenderer? → A: External consumer owns both the Three.js WebGLRenderer instance and the animation loop. SceneManager only manages the Scene and Camera. Consumer calls renderer.render(scene, camera) each frame.
- Q: Where does the component visual factory registry live and how is it structured? → A: Registry is injected into scene manager constructors; consumers build and pass their own registry instance.
- Q: How should scene manager classes handle and communicate errors? → A: Throw for initialization/constructor errors; emit error events via callbacks for runtime errors; log warnings for non-critical issues.
- Q: How does the simulation scene manager synchronize discrete simulation ticks with smooth real-time animation? → A: SceneManager interpolates visual state between simulation ticks based on elapsed real-time for smooth animations.
- Q: How do consumers control the camera? → A: Consumers directly access Three.js camera via getCamera() method.
- Q: What specific event types must scene managers support through the callback interface? → A: Core event set: 'hover', 'unhover', 'select', 'deselect', 'error', 'ready'.
- Q: What parameters does the update() method accept and when should it be called? → A: update(changedData?: object) with optional parameter for incremental updates; called when circuit topology or state changes.

### Session 2025-12-04 (Phase 1-3 POC)

- Q: Can scene managers be reused for multiple different circuits? → A: Yes, initialize once with container, then use setCircuit(circuit) to switch between circuits without re-initialization.
- Q: When is the Circuit/CircuitRunner provided to the scene manager? → A: After initialization via setCircuit() method, not in constructor. This allows scene manager reusability.
- Q: Who manages the Three.js WebGLRenderer instance? → A: Consumer creates and owns the WebGLRenderer. SceneManager only provides Scene and Camera via getScene()/getCamera(). Consumer calls webglRenderer.render(scene, camera) in their animation loop.

## Deliverable Scope

**IMPORTANT**: This specification defines the requirements for **scene manager class modules only**, not complete interactive web pages or applications. The deliverables are:

- Two TypeScript/JavaScript scene manager classes (CircuitSceneManager, CircuitRunnerSceneManager)
- One shared utilities module (scene helpers, factory registry, common geometry/materials/lighting/camera utils)
- Unit tests for all scene manager logic (mocking Three.js, no integration tests)

The scene manager classes expose programmatic APIs and hookable callbacks but **do NOT implement**:
- User interaction event handling (mouse/keyboard listeners)
- WebGL rendering orchestration (Three.js WebGLRenderer management)
- Animation loop control (requestAnimationFrame)

These responsibilities are delegated to the consumer. SceneManagers manage the Scene and Camera; consumers create their own WebGLRenderer, handle DOM events, and call renderer.render(scene, camera) in their animation loop.
Event emitter system is provided for consumers to hook into scene manager events.

The user stories below describe the **end-user experience** that these scene managers will enable when integrated into a complete application. They define the visual behaviors and interaction patterns the scene managers must support through their APIs, not what the scene manager classes directly implement.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Static Circuit Visualization (Priority: P1)

Users need to view and interact with circuit topology in a static, non-simulated state to understand the structure, verify connections, and identify components before running simulations.

**Why this priority**: This is the foundation for all circuit interaction. Users must be able to visualize circuits before editing or simulating them. It's the minimum viable visualization capability.

**Independent Test**: Can be fully tested by loading a circuit definition and rendering it in 3D space. Delivers immediate value by allowing users to see their circuit structure.

**Acceptance Scenarios**:

1. **Given** a valid circuit topology with components and connections, **When** the user loads the circuit for visualization, **Then** all components are rendered in 3D space with correct positions and orientations
2. **Given** a rendered static circuit, **When** the user rotates the view, **Then** the circuit remains visible and maintains visual coherence from all angles
3. **Given** a circuit with multiple components, **When** the user hovers over a component, **Then** the component is visually highlighted and identified
4. **Given** a circuit with multiple wires, **When** the user hovers over a wire, **Then** the wire is visually highlighted and identified
5. **Given** a circuit with multiple enodes, **When** the user hovers over a node, **Then** the node is visually highlighted and identified
6. **Given** a static circuit view, **When** the user zooms in or out, **Then** the visualization scales appropriately while maintaining visual clarity

---

### User Story 2 - Circuit Editing Interface (Priority: P2)
Users need to modify circuit topology by adding, removing, and reconnecting components within the visualization environment to design and refine their circuits.

**Why this priority:** After viewing circuits, users need editing capabilities to create and modify their designs. This builds upon the static visualization foundation.

**Independent Test:** Can be tested by enabling edit mode on a rendered circuit and performing add/remove/modify operations. Delivers value by allowing circuit design within the visual environment. Given the various natures of edits an active tool system is required.

**Acceptance Scenarios**:

1. **Given** a circuit in edit mode, He MUST be able to choose an active edit tool from the tool set : only one tool can be active at a time. **When** the user selects a tool, **Then** the tool becomes active and its cursor and event handlers are enabled
2. **Given** a circuit in edit mode **When** the *Select* tool is activated, **Then** the user can Click to select, drag to move, double-click to rotate components within the circuit
3. **Given** a circuit in edit mode **When** the *Place component* tool is activated, **Then** the user can click palette to choose type (only battery, switch and smallLED for now), click scene to place, scroll to rotate before placement
4. **Given** a circuit in edit mode **When** the *Wire* tool is activated, **Then** the user can Click source pin (or branching point), click target pin (or branching point), Escape to cancel mid-wire
5. **Given** a circuit in edit mode **When** the *Branching Point* tool is activated, **Then** the user Click on wire to split it and insert branching point at location
6. **Given** a circuit in edit mode **When** the *Delete* tool is activated, **Then** user can click component, wire, or branching point (pins can be deleted only if their component is) to delete. 
7. **Given** a circuit in edit mode, **When** the user validates any tool action, **Then** circuit visual must be updated to reflect the topology change
8. **Given** a circuit with multiple components in delete mode, **When** the user deletes a component, **Then** this component and pins are removed and the visualization updates
9. **Given** an editing operation, **When** the user attempts to place a component that exactly overlaps another component, **Then** the system prevents the action and provides feedback

---

### User Story 3 - Live Simulation Visualization (Priority: P1)

Users need to observe circuit behavior during simulation with real-time state updates (current flow, component states, signal propagation) to verify correct operation and debug issues.

**Why this priority**: This is equally critical to static visualization. The entire purpose of the simulation engine is to see circuits run, making live visualization essential for the MVP.

**Independent Test**: Can be fully tested by running a simulation and observing real-time visual feedback of circuit state changes. Delivers immediate value for understanding circuit behavior.

**Acceptance Scenarios**:

1. **Given** a running simulation, **When** current flows through a wire, **Then** the wire is visually animated to show current direction and magnitude
2. **Given** a component in a running simulation, **When** the component's state changes, **Then** the visual representation updates in real-time to reflect the new state
3. **Given** a simulation with multiple signal paths, **When** signals propagate through the circuit, **Then** users can visually trace signal flow from source to destination
4. **Given** a long-running simulation, **When** the circuit state updates rapidly, **Then** the visualization maintains smooth frame rates without jitter or lag
5. **Given** a simulation in progress, **When** the user pauses the simulation, **Then** the visualization freezes at the current state while remaining interactive for inspection

---

### User Story 4 - Performance Optimization for Complex Circuits (Priority: P3)

Users working with large circuits (hundreds of components) need responsive visualization that handles scale without degradation.

**Why this priority**: While important for power users, most initial users will work with smaller circuits. This can be optimized after core functionality is proven.

**Independent Test**: Can be tested by loading progressively larger circuits and measuring frame rates and interaction responsiveness. Delivers value for advanced use cases.

**Acceptance Scenarios**:

1. **Given** a circuit with 500 components, **When** the user navigates the view, **Then** the frame rate remains above 30 FPS
2. **Given** a large circuit, **When** only a portion is visible in the viewport, **Then** the renderer optimizes by reducing detail for off-screen elements
3. **Given** a simulation with many simultaneous state changes, **When** the visualization updates, **Then** only changed elements are re-rendered

---

### Edge Cases

- Q: What happens when a circuit contains no components (empty circuit)? A: the base scene with its grid is created without nothing rendered.
- Q: How does the renderer handle components with invalid or missing position data? A: circuit and circuit runner validation and integrity are performed in core module only and out of scope of this spec.
- Q: What occurs when simulation state updates faster or slower than the display refresh rate? A: CircuitRunner time is a discrete integer tick incrementing once at a time. Simulation renderer should allow smooth coupling between real time and this tick. 
- Q: How does the system behave when switching between static and simulation renderers for the same circuit? A: A CircuitWorkspace instance will bridge the two renderers and ensure only one is active at a time. Switching will dispose the inactive renderer scene and initialize the active one.
- Q: What happens when users attempt to edit a circuit while a simulation is running? A: it will always be impossible to edit live circuits. CircuitRunner instances have a read-only static topology.
- Q: How does the renderer handle very long wires or connections that extend beyond typical viewport bounds? A: both renderer should use circuit metadata size and division to create a bounded grid. It won't be possible to extend or shrink it dynamically.
- Q: What occurs when component visual assets fail to load or are missing? A: A registry of renderers factory should be used. If a specific componentType isn't found a default factory returning a placeholder geometry/material (eg a 1 squared cube) will be returned for missing assets.
- Q: Can components be placed in top of each other during editing? A: No, overlapping components are not allowed. All components vertical (z) coordinates will be 0 (placed on a plan grid). The static renderer must prevent this during edit operations.
- Q: What exactly is an overlap ? A: for this MVP, two components overlap if their bounding boxes intersect on the X and Y axis.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide two independent scene manager modules: one for static circuits at build and one for live circuits
- **FR-002**: System MUST maintain a shared utilities module containing common scene construction functionality used by both scene managers
- **FR-003**: Static scene manager MUST display all circuit components in 3D space based on their topology definitions
- **FR-004**: SceneManagers MUST expose the Three.js camera via getCamera() method for direct consumer manipulation (rotation, zoom, pan)
- **FR-004a**: SceneManagers MUST expose the Three.js scene via getScene() method. Consumer is responsible for creating and managing their own WebGLRenderer instance and calling renderer.render(scene, camera) in their animation loop.
- **FR-005**: Static scene manager MUST provide interactive component selection and highlighting
- **FR-006**: Static scene manager MUST support read-only view AND edit mode through a editMode flag. When edit mode is enabled, the scene manager activates the tool system (FR-025) allowing topology manipulation. When edit mode is disabled, all tools are deactivated and tool state is reset.
- **FR-007**: Static scene manager tools (FR-029) MUST perform tool-specific validation (FR-032) before operations. For circuit-specific validation (e.g., pin connection rules, electrical constraints), scene manager MUST delegate to core Circuit API methods. SceneManager MUST NOT implement circuit domain logic.
- **FR-008**: Simulation scene manager MUST display real-time state changes for all circuit elements during simulation
- **FR-009**: Simulation scene manager MUST visually distinguish between different component states (e.g., active/inactive, high/low voltage)
- **FR-010**: Simulation scene manager MUST animate current flow through wires and connections
- **FR-011**: Simulation scene manager MUST synchronize visualization updates with simulation step timing by interpolating visual state between discrete simulation ticks based on elapsed real-time for smooth animations
- **FR-012**: Both scene managers MUST handle circuit topology changes without requiring full re-initialization. SceneManagers support circuit switching via setCircuit(circuit | null) method after initialization.
- **FR-013**: Both scene managers MUST maintain consistent visual styling for the same component types
- **FR-014**: System MUST organize scene managers as separate submodules under `src/scene` directory structure
- **FR-015**: Shared utilities module MUST provide common geometry, material, and camera utilities
- **FR-016**: A CircuitWorkspace allowing to bridge between both renderers should be created
- **FR-017**: SceneManagers MUST support seamless switching between static and simulation views of the same circuit
- **FR-018**: SceneManagers MUST throw exceptions for initialization and constructor errors (fail-fast); emit error events via on('error', callback) for runtime rendering errors; log console warnings for non-critical degraded rendering
- **FR-019**: Both scene manager classes MUST expose the following public API methods: constructor(factoryRegistry), initialize(container, options?), setCircuit(circuit | null), clearVisuals(), update(changedData?), render(), dispose(), on(event, callback), getScene(), getCamera(). Additionally, CircuitSceneManager MUST expose tool-related methods: setEditMode(enabled), setActiveTool(toolType), getActiveTool(), cancelCurrentToolOperation(), handleToolClick(worldPosition), handleToolHover(worldPosition), handleToolScroll(delta).
- **FR-019a**: The update() method MUST accept an optional changedData parameter for incremental updates; if no parameter provided, scene manager MUST perform full update from source circuit data
- **FR-019b**: The setCircuit(circuit | null) method allows switching between circuits without re-initialization. Passing null clears the current circuit. This enables scene manager reusability across multiple circuits.
- **FR-019c**: The clearVisuals() method removes all circuit visuals from the scene but does not dispose the scene manager, allowing it to be reused with a different circuit via setCircuit().
- **FR-020**: SceneManager constructors MUST accept ONLY a component visual factory registry instance as a parameter. Circuit/CircuitRunner are provided after initialization via setCircuit() method, not in constructor. This separation enables scene manager reusability.
- **FR-021**: SceneManagers MUST expose hookable callbacks for the following events via on(event, callback): 'hover', 'unhover', 'select', 'deselect', 'error', 'ready'; scene managers MUST NOT implement mouse/keyboard event listeners. Note: Consumer implements event listeners and translates them to scene manager tool API calls (FR-028). SceneManager exposes tool interaction methods and emits tool-related events (FR-034).
- **FR-022**: SceneManagers MUST be callable from external animation loops (render() method called by consumer); scene managers MUST NOT manage their own requestAnimationFrame loops OR WebGLRenderer instances
- **FR-023**: Shared utilities module MUST provide a component visual factory registry interface and default placeholder factory
- **FR-024**: Component visual factory registry MUST return a default placeholder geometry/material (e.g., 1-unit cube) for unregistered component types
- **FR-025**: System MUST provide a tool registry interface that allows consumers to register editing tool implementations. Each tool MUST implement a common interface defining: onActivate() (called when tool becomes active), onDeactivate() (called when tool is deactivated), getCursorType() (returns cursor style for this tool), getPreviewState() (returns current preview objects if any).
- **FR-026**: Static scene manager MUST enforce that only one editing tool can be active at a time. When a new tool is activated, the previously active tool MUST be deactivated first.
- **FR-027**: Static scene manager MUST maintain tool state (active tool reference, tool-specific operation state) and provide methods to query current tool state. Tool state MUST be reset when edit mode is disabled.
- **FR-028**: Static scene manager MUST expose setActiveTool(toolType) method for consumers to activate tools programmatically. SceneManager MUST emit 'toolActivated' event with tool type when activation succeeds. Only tools can be activated when edit mode is enabled (FR-006). Switching tools is allowed when the active tool is idle (no operation in progress).
- **FR-029**: Static scene manager MUST provide built-in implementations for 5 core editing tools: Select (click to select, drag to move, double-click to rotate), PlaceComponent (palette choose type, click to place, scroll to rotate before placement), Wire (click source pin/branching point, click target, Escape to cancel), BranchingPoint (click on wire to split and insert branching point), Delete (click component/wire/branching point to delete). Each tool MUST implement the interface defined in FR-025.
- **FR-030**: Static scene manager MUST render visual previews for tools that require them: PlaceComponent (ghost preview with rotation), Wire (path preview from source to cursor). Preview objects MUST be visually distinct from actual circuit elements (e.g., semi-transparent, different color).
- **FR-031**: Tools that support multi-step operations (Wire: click source, click target) MUST support cancellation. SceneManager MUST expose tool cancellation through a consumer-triggered method (e.g., cancelCurrentToolOperation()). Wire tool MUST cancel mid-wire operations when cancellation is triggered.
- **FR-032**: Each tool MUST validate its operations before applying changes: PlaceComponent (bounding box overlap check on X/Y axis per Edge Case definition), Wire (endpoint must be valid pin or branching point), BranchingPoint (target must be valid wire), Delete (component deletion must cascade to pins). Tool validation failures MUST emit 'toolValidationError' event with error details but MUST NOT throw exceptions.
- **FR-033**: Tools MUST delegate all circuit topology modifications to core Circuit API methods. SceneManager MUST NOT implement circuit logic directly. After successful tool operation, scene manager MUST call update(changedData) with appropriate delta to refresh visualization.
- **FR-034**: CircuitSceneManager MUST emit the following tool-related events via on(event, callback): 'toolActivated' ({ toolType: string }), 'toolDeactivated' ({ toolType: string }), 'toolOperationStarted' ({ toolType: string, operationData: object }), 'toolOperationCompleted' ({ toolType: string, operationData: object, changedData: ChangedData }), 'toolOperationCancelled' ({ toolType: string }), 'toolValidationError' ({ toolType: string, errorMessage: string }).
- **FR-035**: When a tool is activated, scene manager MUST emit 'cursorChangeRequested' event with cursor type (e.g., 'pointer', 'crosshair', 'move', 'not-allowed'). SceneManager MUST emit cursor changes during tool operations (e.g., 'not-allowed' when hovering over invalid placement location).
- **FR-036**: When tool validation prevents an operation (per FR-032), scene manager MUST provide visual feedback by: briefly highlighting the conflicting elements (e.g., overlapping component), showing preview in error state (e.g., red tint), emitting 'toolValidationError' event for consumer to show UI message.
- **FR-037**: After a tool successfully completes an operation that modifies circuit topology, scene manager MUST: (1) Apply the change via core Circuit API, (2) Construct appropriate ChangedData delta object, (3) Call internal update(changedData) to refresh visualization, (4) Emit 'toolOperationCompleted' event. This update MUST complete within 100ms to meet SC-005 performance target.

### Testing Strategy

- **TS-001**: Unit tests MUST validate that scene managers correctly create and update 3D scene objects, materials, and geometries based on circuit data
- **TS-002**: Unit tests MUST mock Three.js dependencies to test scene manager logic in isolation
- **TS-003**: Unit tests MUST NOT perform integration testing with actual rendering output or browser DOM
- **TS-004**: Unit tests MUST verify all public API methods (constructor, initialize, setCircuit, clearVisuals, update, render, dispose, on, getScene, getCamera, and CircuitSceneManager tool-related methods per FR-019)
- **TS-005**: Unit tests MUST verify callback registration and invocation through the on(event, callback) interface
- **TS-006**: Unit tests MUST verify component factory registry injection and fallback to placeholder geometry
- **TS-007**: Unit tests MUST verify tool system functionality: tool activation/deactivation (FR-026), single-active-tool constraint (FR-026), tool state management (FR-027), tool preview rendering (FR-030), tool operation cancellation (FR-031), tool-specific validation (FR-032), and tool event emission (FR-034)
- **TS-008**: Unit tests MUST verify each of the 5 core editing tools (FR-029) in isolation: Select tool (selection, drag, rotation), PlaceComponent tool (preview, rotation, placement, overlap validation), Wire tool (source selection, path preview, target selection, cancellation), BranchingPoint tool (wire targeting, insertion), Delete tool (component cascade, wire, branching point deletion)

### Key Entities

- **CircuitSceneManager (Static)**: Responsible for visualizing circuit topology in a non-simulated state, supporting view manipulation and editing interactions. Circuit instances are provided via setCircuit() after initialization, not in constructor. Accepts component factory registry via constructor. Exposes hookable callbacks but does not implement event listeners or manage WebGLRenderer. Manages tool system for editing operations (FR-025 to FR-037). Can be reused across multiple circuits via setCircuit().
- **SimulationCircuitSceneManager**: Responsible for visualizing circuit state during active simulation, displaying real-time updates, animations, and state changes. CircuitRunner instances are provided via setCircuit() after initialization. Accepts component factory registry via constructor. Exposes hookable callbacks but does not implement event listeners or manage WebGLRenderer.
- **Component Visual Factory Registry**: Registry of factory functions that create 3D representations for each component type. Injected into scene manager constructors. Provides fallback to default placeholder geometry (1-unit cube) for unregistered component types.
- **Editing Tool**: Abstraction for circuit editing operations (Select, PlaceComponent, Wire, BranchingPoint, Delete). Each tool implements common interface (onActivate, onDeactivate, getCursorType, getPreviewState) and manages tool-specific operation state. Tools delegate circuit modifications to core Circuit API.
- **Tool State**: Runtime state for active tool including operation-in-progress tracking, preview objects, and tool-specific data (e.g., wire source endpoint, component placement rotation). Reset when edit mode is disabled.
- **Shared Scene Utilities**: Common functionality including camera management, geometry generation, material definitions, lighting setups, scene utilities, and the component factory registry interface. Shared across both scene manager types.
- **Three.js Scene**: The 3D visualization environment containing camera, lights, and rendered circuit elements. Each scene manager maintains its own Scene and Camera. External consumers create WebGLRenderer and call renderer.render(scene, camera) each frame; scene managers do not manage rendering orchestration.
- **Visual Component**: The 3D representation of a circuit component, including geometry, materials, and state-dependent visual properties. Created by component factory functions.
- **Connection Visual**: The 3D representation of circuit connections (wires), including path geometry and optional animation state for current flow.
- **Tool Preview**: Visual representation of tool operations in progress (PlaceComponent ghost preview, Wire path preview). Rendered semi-transparently and visually distinct from actual circuit elements. Updated on tool hover interactions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can load and view circuits with up to 50 components with rendering completing in under 2 seconds
- **SC-002**: Static circuit visualization maintains 60 FPS or near during camera navigation and interaction
- **SC-003**: Simulation visualization maintains 30 FPS minimum during active simulation with real-time state updates
- **SC-004**: Users can identify individual components and their connections within 10 seconds of viewing a small circuit (<20 components)
- **SC-005**: Single Edit operations (add, move, delete components, wire, delete wire, add/delete wire path, add/delete branching point) complete with visual feedback in under 100ms
- **SC-006**: Users can visually trace signal flow through at least 10 connected components during simulation
- **SC-007**: Circuit topology changes reflect in the visualization within 100ms
- **SC-008**: Both renderers share at least 40% of common rendering code through the utilities module
- **SC-009**: 95% of users can successfully perform basic view manipulation (zoom, rotate, pan) without instruction
- **SC-010**: System handles switching between static and simulation views in under 1 second

### Assumptions

- Three.js 3D rendering library will be available and properly integrated into the project
- Circuit and CircuitRunner classes expose sufficient topology and state information for rendering
- The existing simulation engine provides state update callbacks or polling mechanisms
- Standard web-capable hardware with GPU acceleration is available
- Circuits are primarily 2D layouts that can be visualized in 3D space with appropriate camera positioning
- Default camera perspectives and lighting will be sufficient for initial implementation (custom lighting setups can be added later)
- Component visual representations can be standardized (spheres, cylinders, boxes) initially before adding custom geometries
- Performance targets are based on typical development workstation capabilities, not mobile devices
