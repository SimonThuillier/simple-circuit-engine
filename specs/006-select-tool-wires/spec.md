# Feature Specification: Select Tool & Wire Visual Improvements

**Feature Branch**: `006-select-tool-wires`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "The first circuit edit tool, Select which allows to select, drag/move, and rotate components on the scene must be implemented. In the same time wires visual management must be improved, first to target their pins (instead of the component currently) and to follow those pins as components move/rotate, and also to support multi lines wires (to handle intermediatePositions)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Select and Move a Component (Priority: P1)

A circuit designer needs to rearrange components on the scene to improve layout clarity. They click on a component to select it, then drag it to a new position. The component moves and all connected wires automatically update to follow the component's pins to their new locations.

**Why this priority**: Moving components is the most fundamental editing operation. Without the ability to reposition components, users cannot effectively design or refine circuits. This is the core interaction that makes the tool usable.

**Independent Test**: Can be fully tested by placing a component, selecting it, dragging to a new position, and verifying the component and its connected wires update correctly. Delivers immediate value for circuit layout editing.

**Acceptance Scenarios**:

1. **Given** a circuit with components on the scene and Select tool activated, **When** the user clicks on a component, **Then** the component becomes visually selected (highlighted) and ready for manipulation
2. **Given** a selected component and Select tool activated, **When** the user drags it to a new grid position, **Then** the component moves to the nearest grid cell and all connected wires update their endpoints to follow the component's pins
3. **Given** a selected component with multiple wire connections and Select tool activated, **When** the component is moved, **Then** all wires connected to any of the component's pins update their visual paths in real-time during the drag operation
4. **Given** a component is being dragged, **When** the user releases the mouse button, **Then** the component snaps to the nearest grid position and the component's position in the circuit data model is updated

---

### User Story 2 - Rotate a Selected Component (Priority: P2)

A circuit designer needs to change the orientation of a component to better align with the circuit layout. They select a component and use a rotation control to rotate it. The component rotates and all connected wires adjust to the new pin positions.

**Why this priority**: Rotation is essential for proper circuit layout but secondary to basic movement. Components often need specific orientations to create clean wire paths.

**Independent Test**: Can be fully tested by selecting a component, triggering rotation, and verifying the component rotates and wires follow pin positions. Delivers value for precise layout control.

**Acceptance Scenarios**:

1. **Given** Select tool activated and a selected component, **When** the user triggers a rotation action (via keyboard shortcut or mouse left double click), **Then** the component rotates by 90 degrees clockwise
2. **Given** Select tool activated and a rotated component with wire connections, **When** the rotation completes, **Then** all wires update their endpoints to match the new pin positions
3. **Given** Select tool activated a component being rotated, **When** rotation occurs, **Then** the visual rotation and wire updates happen immediately

---

### User Story 3 - Wire Endpoints Target Pins Instead of Components (Priority: P1)

Wire visuals must accurately connect to the specific pins of components rather than just pointing at the component center. When a wire connects two pins, its endpoints should be positioned at the actual pin locations on each component.

**Why this priority**: This is fundamental to correct wire visualization. Without pin-accurate endpoints, circuits appear incorrect and users cannot verify proper connections. This is foundational for all future other wire-related features.

**Independent Test**: Can be fully tested by creating a wire between two component pins and verifying the wire endpoints are at the pin positions, not component centers. Delivers accurate visual representation.

**Acceptance Scenarios**:

1. **Given** a wire connecting two component pins, **When** the wire is rendered, **Then** each endpoint is positioned at the actual pin location on its respective component (not at component center)
2. **Given** a wire connecting a pin to a branching point, **When** the wire is rendered, **Then** the pin endpoint is at the pin location and the branching point endpoint is at the branching point position
3. **Given** components with multiple pins (e.g., transistor with collector, base, emitter), **When** wires connect to different pins, **Then** each wire correctly targets its specific pin location

---

### User Story 4 - Wires Follow Pins During Component Movement (Priority: P1)

When a component is moved or rotated, all wires connected to its pins must dynamically update their endpoints to track the new pin positions. This ensures visual continuity during editing operations.

**Why this priority**: This is essential for the select/move tool to be usable. If wires don't follow components during movement, the editing experience is broken and users cannot see the result of their changes.

**Independent Test**: Can be fully tested by moving a component with connected wires and verifying wires update in real-time. Delivers seamless editing experience.

**Acceptance Scenarios**:

1. **Given** a component with connected wires, **When** the component is dragged to a new position, **Then** wire endpoints update continuously during the drag to follow the pin positions
2. **Given** a component with connected wires, **When** the component is rotated, **Then** wire endpoints update to match the rotated pin positions
3. **Given** multiple wires connected to different pins of the same component, **When** the component moves, **Then** all wires update independently based on their respective pin positions

---

### User Story 5 - Multi-Line Wire Rendering (Priority: P2)

Wires with intermediate positions (waypoints) should render as connected line segments passing through each waypoint, creating multi-line wire paths for complex routing around components.

**Why this priority**: Multi-line wires enable cleaner circuit layouts by allowing wires to route around obstacles. While not strictly necessary for basic editing, it significantly improves layout quality.

**Independent Test**: Can be fully tested by creating a wire with intermediate positions and verifying it renders as connected segments through all waypoints. Delivers improved layout flexibility.

**Acceptance Scenarios**:

1. **Given** a wire with intermediatePositions defined, **When** the wire is rendered, **Then** the wire displays as connected line segments from start pin through each waypoint to end pin
2. **Given** a wire with multiple intermediate positions, **When** the connected component moves, **Then** only the endpoint at that component updates while intermediate positions remain fixed
3. **Given** a wire with no intermediate positions, **When** the wire is rendered, **Then** it displays as a single straight line between the two pin endpoints

---

### User Story 6 - Deselect Component (Priority: P2)

A user needs to deselect a currently selected component to stop editing it or to select a different component. They can click on empty space or press Escape to clear the selection.

**Why this priority**: Deselection is necessary for proper selection state management but is secondary to the core select/move/rotate functionality.

**Independent Test**: Can be fully tested by selecting a component, then clicking empty space or pressing Escape, and verifying the selection is cleared. Delivers complete selection workflow.

**Acceptance Scenarios**:

1. **Given** a selected component, **When** the user clicks on empty scene space, **Then** the component is deselected and no component is selected
2. **Given** a selected component, **When** the user presses the Escape key, **Then** the component is deselected
3. **Given** a selected component, **When** the user clicks on a different component, **Then** the first component is deselected and the clicked component becomes selected

---

### Edge Cases

- What happens when a component is dragged outside the visible scene bounds? The component should be constrained to valid grid positions within scene limits.
- What is the nearest grid component when components can be placed ? A: components or branching points can only be placed at {x: integer, y: 0, z: integer} positions (ex {1, 0, 2} or {5,0 , -9}). For a given mouse position the nearest position is the one with the closest x and z integer values, and y=0 (ex {1.256, 0, 4.569} -> {1,0,5}.
- How does the system handle a component that cannot be moved due to collision with another component? Components should be allowed to overlap; collision detection is out of scope.

- How does selection behave during an ongoing drag operation? Once a drag starts, the selection is locked until the drag completes.
- What happens when a wire has intermediate positions and both connected components move? Only the endpoints update; intermediate positions are static.
- What happens when rotating a component with wires that have intermediate positions? The pin endpoint moves to the new rotated position; intermediate waypoints remain unchanged.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to select a component by clicking on it
- **FR-002**: System MUST provide visual feedback indicating which component is currently selected using a different emissive color (e.g., orange or yellow glow) distinct from the blue hover glow
- **FR-003**: System MUST allow users to drag a selected component to a new grid position
- **FR-004**: System MUST snap dragged components to the nearest grid cell when released
- **FR-005**: System MUST update the component's position in the circuit data model after a move operation
- **FR-006**: System MUST allow users to rotate a selected component by 90-degree increments
- **FR-007**: System MUST update the component's rotation in the circuit data model after a rotation operation
- **FR-008**: System MUST render wire endpoints at actual pin positions (derived from component position, rotation, and pin offset)
- **FR-009**: System MUST update wire visuals in real-time when connected components are moved
- **FR-010**: System MUST update wire visuals when connected components are rotated
- **FR-011**: System MUST render wires with intermediate positions as connected multi-segment lines through all waypoints
- **FR-012**: System MUST allow users to deselect a component by clicking on empty space
- **FR-013**: System MUST allow users to deselect a component by pressing the Escape key
- **FR-014**: System MUST support only single-component selection (no multi-select in this feature)
- **FR-015**: System MUST distinguish between hover state (temporary) and selected state (persistent until deselected)

### Key Entities

- **SelectionState**: Represents the currently selected component (if any), managed by the scene/interaction layer
- **Pin Position**: The derived world position of a component pin based on component position, rotation, and pin-specific offset
- **Wire Path**: The complete visual path of a wire, including start pin position, intermediate waypoints, and end pin position

## Clarifications

### Session 2025-12-09

- Q: How should the selected state visually differ from hover? → A: Different emissive color (e.g., orange or yellow glow) distinct from the blue hover glow

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can select, move, and release a component in under 2 seconds for a simple repositioning operation
- **SC-002**: Wire endpoints are visually positioned within 0.1 grid units of actual pin centers
- **SC-003**: Wire visuals update within the same frame as component position changes during drag operations (no visible lag)
- **SC-004**: 100% of wires connected to a moved component correctly update their endpoints
- **SC-005**: Multi-segment wires render correctly for wires with 1 to 10 intermediate positions
- **SC-006**: Users can complete a select-move-rotate workflow without any stuck or inconsistent visual states
