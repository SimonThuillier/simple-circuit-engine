# Feature Specification: Map Controls and Hovering Detection

**Feature Branch**: `004-map-controls-hovering`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "I need to integrate a MapControls in CircuitController and CircuitRunnerController and implement hovering detection which will be foundational for future tools and user edition/interaction capabilities. Hovering should follow the priority enode > component > wire and should be optimized."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navigate Circuit with Map Controls (Priority: P1)

Users need to pan, zoom, and navigate the circuit visualization using intuitive map-style controls. This includes click-and-drag panning, scroll wheel zooming, and smooth camera movements to explore circuits of any size.

**Why this priority**: Map navigation is essential for any circuit exploration. Without the ability to pan and zoom, users cannot view different parts of their circuits, making the application unusable for any non-trivial circuit.

**Independent Test**: Can be fully tested by loading any circuit and verifying that click-drag pans the view and scroll wheel zooms in/out, delivering immediate navigation value.

**Acceptance Scenarios**:

1. **Given** a circuit is loaded in the scene controllerType, **When** the user clicks and drags on the canvas, **Then** the camera pans smoothly following the drag direction
2. **Given** a circuit is loaded in the scene controllerType, **When** the user scrolls the mouse wheel, **Then** the camera zooms in or out centered on the cursor position
3. **Given** a circuit is loaded in the scene controllerType, **When** the user right-click, **Then** mouse positions changes rotate the camera around the current center point
4. **Given** map controls are active, **When** the user stops interacting, **Then** the camera smoothly decelerates with damping

NB : this is the default beahvior of already installed three/addons/controls/MapControls.js, no need to re-implement it, just integrate and configure it properly.

---

### User Story 2 - Detect Hovered Elements (Priority: P1)

Users need visual feedback when their cursor hovers over circuit elements. The system must detect which element is under the cursor following priority: enode > component > wire. This enables future selection, editing, and tool interactions.

**Why this priority**: Hovering detection is the foundation for all user interactions. Without knowing what's under the cursor, users cannot position, edit, or interact with any circuit element.

**Independent Test**: Can be fully tested by moving the cursor over different circuit elements and observing that the correct element is detected and reported, enabling downstream hover effects.

**Acceptance Scenarios**:

1. **Given** a circuit with components, wires, and enodes is loaded, **When** the user moves the cursor over an enode, **Then** the system emits a hover event identifying the enode
2. **Given** multiple elements overlap under the cursor, **When** an enode and a component are both under the cursor, **Then** the enode is reported as hovered (enode has priority)
3. **Given** a component and wire overlap under the cursor, **When** only a component and wire are present, **Then** the component is reported as hovered (component has priority over wire)
4. **Given** an element is hovered, **When** the cursor moves away from all elements, **Then** the system emits an unhover event for the previously hovered element
5. **Given** hovering detection is active, **When** the cursor moves rapidly across elements, **Then** hover/unhover events are emitted correctly without missed transitions

---

### User Story 3 - Simultaneous Navigation and Hover Detection (Priority: P2)

Users need hover detection to work alongside map controls without interference. During navigation (panning/zooming), hover detection should remain responsive and accurate.

**Why this priority**: This ensures a cohesive user experience where navigation and interaction work together. Less critical than individual features but necessary for usability.

**Independent Test**: Can be tested by panning the view while observing that hover detection continues to work and updates to reflect the new camera position.

**Acceptance Scenarios**:

1. **Given** the user is panning the view, **When** elements move under the cursor during the pan, **Then** hover events are emitted for the newly-hovered elements
2. **Given** the user is zooming, **When** the zoom changes which element is closest to the cursor, **Then** hover detection reflects the updated proximity

---

### User Story 4 - Performance-Optimized Hover Detection (Priority: P2)

The hover detection system must perform efficiently, even for circuits with many elements (200). This ensures smooth interaction regardless of circuit complexity.

**Why this priority**: Performance is essential for usability but becomes critical only with larger circuits. The basic functionality must work first before optimization matters.

**Independent Test**: Can be tested by loading a circuit with 100+ elements and verifying that cursor movement remains responsive without frame drops.

**Acceptance Scenarios**:

1. **Given** a circuit with 100+ components, wires, and enodes, **When** the user moves the cursor, **Then** hover detection responds within a single animation frame
2. **Given** multiple overlapping elements, **When** determining priority, **Then** the system uses efficient spatial queries rather than checking every element

---

### Edge Cases

- What happens when the circuit is empty (no elements to hover)?
  - The system emits no hover events; cursor detection returns null/empty
- What happens when the cursor moves outside the canvas?
  - Hover detection is disabled; any hovered element receives an unhover event
- How does the system handle elements at the exact same screen position?
  - Priority rules apply: enode > component > wire; among same-type elements, the one rendered last (frontmost) takes precedence
- What happens when an element is removed while hovered?
  - An unhover event is emitted for the removed element
- How does zoom level affect hover detection accuracy?
  - Hover detection uses world-space positions and remains accurate regardless of zoom level

## Requirements _(mandatory)_

### Functional Requirements

**Map Controls:**
- **FR-001**: Both CircuitController and CircuitRunnerController MUST integrate MapControls for camera navigation
- **FR-002**: MapControls MUST support panning (click-and-drag), zooming (scroll wheel), and rotation (right-click drag)
- **FR-003**: MapControls MUST provide damping (smooth deceleration) for natural-feeling navigation
- **FR-004**: System MUST provide configuration options to enable/disable specific controls (pan, zoom, rotate)

**Hitbox Layer System:**
- **FR-005**: Each element type (enode, component, wire) MUST have dedicated invisible hitbox meshes for hover detection
- **FR-006**: Hitbox meshes MUST be assigned to specific rendering layers (one layer per element type)
- **FR-007**: Hitbox meshes MUST be invisible (not rendered) but raycastable
- **FR-008**: Hitbox meshes MUST be sized appropriately to provide comfortable hover targets (larger than visual representation for thin elements like wires). Hitbox definition is the responsability of each element visual factory.
- **FR-009**: Hitbox meshes MUST store reference to their parent element (id and type) in userData

**Hover Detection:**
- **FR-010**: System MUST perform raycasting against hitbox layers only (not visual meshes)
- **FR-011**: Raycasting MUST query layers in priority order: enode layer first, then component layer, then wire layer
- **FR-012**: Hover detection MUST return the first hit from the highest-priority layer
- **FR-013**: System MUST emit hover events when cursor enters an element's hitbox
- **FR-014**: System MUST emit unhover events when cursor leaves an element's hitbox
- **FR-015**: System MUST track the currently hovered element to prevent duplicate hover events
- **FR-016**: Hover detection MUST work independently of edit mode state (always active when initialized)
- **FR-017**: System MUST provide a method to query the currently hovered element without events
- **FR-018**: Hover detection MUST update on mouse move events and after camera changes

**Lifecycle:**
- **FR-019**: System MUST dispose MapControls and hover detection listeners on scene controllerType disposal
- **FR-020**: Hitbox meshes MUST be created/removed in sync with their parent visual elements

### Key Entities

- **MapControls**: Already installed Three.js addon providing map-style camera navigation (pan, zoom, rotate) with damping
- **Raycaster**: Three.js utility for performing raycasting to detect intersected objects under the cursor
- **Hitbox Layer**: Three.js layer assigned to invisible hitbox meshes; separate layers for enodes, components, and wires enable priority-based raycasting
- **Hitbox Mesh**: Invisible mesh (larger than visual element) used for hover detection; contains userData linking to parent element
- **HoverManager**: Internal component handling raycasting against hitbox layers, priority resolution, and hover state tracking
- **HoveredElement**: Data structure representing the currently hovered element (id, type, object reference)
- **HoverEvent/UnhoverEvent**: Event payloads emitted when hover state changes (already defined in types.ts)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can navigate (pan and zoom) any loaded circuit within 16ms frame budget (60fps)
- **SC-002**: Hover detection identifies the correct element under cursor in under 5ms for circuits with up to 500 elements
- **SC-003**: Hover priority (enode > component > wire) is correctly applied in 100% of overlapping element scenarios
- **SC-004**: Zero memory leaks occur after 1000 hover/unhover cycles
- **SC-005**: All hover events are correctly paired (every hover has a corresponding unhover before a new hover on a different element)
- **SC-006**: Camera navigation and hover detection work simultaneously without blocking or lag

## Assumptions

- Three.js MapControls addon is available and suitable for the project's Three.js version (0.181+)
- Circuit elements (components, wires, enodes) already have appropriate Three.js meshes with userData containing element IDs
- The existing event system (EventEmitter with ControllerEventMap) is sufficient for hover events
- The existing types.ts hover/unhover events are sufficient; no new event types are needed
- Three.js layers 1, 2, 3 are available and not used by other systems (will be assigned to enode, component, wire hitboxes respectively)
- Layer 0 remains the default layer for visual rendering
