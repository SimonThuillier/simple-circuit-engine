# Feature Specification: Line2 Wire Refactor

**Feature Branch**: `007-line2-wire-refactor`
**Created**: 2025-12-11
**Status**: Draft
**Input**: User description: "Scene wires must be refactored so that each individual wire be integrated into the scene as a single Line2 (three add-on) - no matter how much intermediate points it has - instead of a Map of BasicLines. WireVisualManager and all use of wires across scene module and test must be updated accordingly."

## Clarifications

### Session 2025-12-11

- Q: Should all wires be consolidated into a single Line2 or one Line2 per wire? → A: One Line2 per wire (N wires = N Line2 objects). Each wire renders as its own Line2 regardless of intermediate point count.
- Q: Should CircuitRunnerController be included in this refactor? → A: No, exclude CircuitRunnerController (only refactor WireVisualManager).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Wire Rendering with Consistent Line Width (Priority: P1)

As a developer using the circuit visualization system, I need each wire to be rendered as a single Line2 from three/addons so that wire lines display with consistent, pixel-accurate width regardless of camera zoom level or viewing angle.

**Why this priority**: This is the core rendering change that enables all other benefits. Line2 provides GPU-accelerated line rendering with proper width support, which is essential for the visual quality of circuit diagrams.

**Independent Test**: Can be fully tested by rendering a circuit with wires and verifying that wire widths remain visually consistent when zooming in/out or rotating the view.

**Acceptance Scenarios**:

1. **Given** a circuit with N wires, **When** the scene is rendered, **Then** N Line2 objects are added to the scene (one per wire)
2. **Given** a rendered scene with wires, **When** the camera zooms in or out, **Then** wire line width remains visually consistent in screen pixels
3. **Given** a wire with multiple intermediate positions, **When** it is rendered, **Then** the full path (start → intermediate points → end) displays as a single Line2 object

---

### User Story 2 - One Line2 Per Wire (Priority: P1)

As a developer, I need each wire to be represented by exactly one Line2 Three.js object so that wires can be individually managed, styled, and selected.

**Why this priority**: The architectural change from Map<UUID, THREE.Line> to Map<UUID, Line2> maintains individual wire identity while upgrading the rendering approach.

**Independent Test**: Can be tested by creating a circuit with N wires and verifying that exactly N Line2 objects are added to the scene.

**Acceptance Scenarios**:

1. **Given** a circuit with 10 wires, **When** WireVisualManager renders them, **Then** exactly 10 Line2 objects are added to the scene
2. **Given** a circuit with no wires, **When** WireVisualManager initializes, **Then** no Line2 objects are added to the scene
3. **Given** a wire with 5 intermediate points, **When** rendered, **Then** it appears as a single Line2 object with all segments connected

---

### User Story 3 - Dynamic Wire Updates (Priority: P2)

As a developer, I need individual Line2 objects to update efficiently when wires are added, removed, or modified so that circuit editing remains responsive.

**Why this priority**: Dynamic updates are essential for interactive circuit editing but depend on the core Line2 infrastructure being in place first.

**Independent Test**: Can be tested by adding/removing wires programmatically and verifying that the corresponding Line2 objects are created/removed correctly.

**Acceptance Scenarios**:

1. **Given** an existing scene with wires rendered, **When** a new wire is added to the circuit, **Then** a new Line2 object is created and added to the scene
2. **Given** a scene with rendered wires, **When** a wire is removed from the circuit, **Then** the corresponding Line2 object is removed from the scene and disposed
3. **Given** a component connected by wires, **When** the component is moved, **Then** all connected wire Line2 geometries update to reflect new endpoint positions

---

### User Story 4 - Wire Material Configuration (Priority: P2)

As a developer, I need each Line2 to use LineMaterial from three/addons so that wire appearance (color, width, dashing) can be configured properly.

**Why this priority**: LineMaterial is required for Line2 to function and provides the visual customization capabilities needed for wire styling.

**Independent Test**: Can be tested by creating wires with different color/width settings and verifying they render correctly.

**Acceptance Scenarios**:

1. **Given** a Line2 with LineMaterial, **When** the material color is set to white (0xffffff), **Then** the wire renders in white
2. **Given** a Line2 with LineMaterial, **When** linewidth is set to 2, **Then** the wire renders with 2-pixel width on screen
3. **Given** LineMaterial requires resolution, **When** the window resizes, **Then** the material resolution is updated to maintain proper rendering

---

### User Story 5 - Test Suite Compatibility (Priority: P3)

As a developer, I need all existing WireVisualManager tests to pass after the refactor so that the change does not break existing functionality guarantees.

**Why this priority**: Tests ensure the refactor maintains behavioral compatibility, but they depend on the implementation being complete first.

**Independent Test**: Can be verified by running the existing test suite and confirming all tests pass (with necessary adaptations for the new API).

**Acceptance Scenarios**:

1. **Given** the refactored WireVisualManager, **When** existing unit tests are run, **Then** all tests pass (updated to work with Line2 API)
2. **Given** integration tests using CircuitController, **When** wire-related tests execute, **Then** they verify correct wire rendering behavior
3. **Given** the test file at tests/scene/shared/WireVisualManager.test.ts, **When** reviewed after refactor, **Then** it covers wire add, remove, update, and component move scenarios

---

### Edge Cases

- What happens when a circuit has zero wires? No Line2 objects should be created.
- What happens when all wires are removed from a scene that previously had wires? All Line2 objects should be removed and disposed.
- How does the system handle a wire with invalid node references during rendering? It should skip that wire and log a warning rather than failing entirely.
- What happens when LineMaterial resolution is not updated after window resize? Lines may render incorrectly; the system must handle resize events.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST use Line2 from `three/addons/lines/Line2.js` for rendering each circuit wire
- **FR-002**: System MUST use LineGeometry from `three/addons/lines/LineGeometry.js` to define each wire's segment positions
- **FR-003**: System MUST use LineMaterial from `three/addons/lines/LineMaterial.js` for wire styling
- **FR-004**: System MUST create one Line2 object per wire (N wires = N Line2 objects in the scene)
- **FR-005**: Each wire with multiple intermediate points MUST render as a single Line2 containing all path segments
- **FR-006**: WireVisualManager MUST maintain a Map<UUID, Line2> to track wire-to-Line2 associations
- **FR-007**: System MUST update individual Line2 geometry when its wire is modified
- **FR-008**: System MUST update wire endpoints when connected components move or rotate
- **FR-009**: LineMaterial resolution MUST be updated when the renderer/window size changes
- **FR-010**: System MUST properly dispose of Line2, LineGeometry, and LineMaterial resources on cleanup
- **FR-011**: CircuitController and any other Controllers using WireVisualManager MUST be updated to work with the new Line2 approach

### Key Entities

- **Line2**: A Three.js add-on object representing a single wire. One Line2 per wire in the scene.
- **LineGeometry**: Stores position data for a wire's path (all segments from start through intermediate points to end).
- **LineMaterial**: Material providing consistent line width rendering. Requires resolution to be set.
- **WirePath**: Existing interface representing a single wire's path (wireId + points array). Used to build LineGeometry.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All existing WireVisualManager tests pass after refactor (with necessary API adaptations)
- **SC-002**: Scene contains exactly N Line2 objects when N wires exist in the circuit
- **SC-003**: Wire line width appears consistent when viewed at different zoom levels
- **SC-004**: Adding or removing a wire updates the visual in under 16ms (maintaining 60fps interactivity)
- **SC-005**: No memory leaks when repeatedly adding/removing wires (geometry properly disposed)
- **SC-006**: All integration tests using CircuitController continue to pass

## Assumptions

- Line2, LineGeometry, and LineMaterial from `three/addons` are available in Three.js 0.181+ (already installed in the project)
- The current wire styling (white color, 2-pixel width) will be preserved as the default
- The refactor scope is limited to WireVisualManager only; CircuitRunnerController (simulation) wire rendering is explicitly out of scope and will not be modified
- Visual quality (consistent line width) is the primary motivation for this refactor
- The existing WirePath interface and computeWirePath logic will be retained for computing wire paths
