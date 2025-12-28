# Feature Specification: Wire Tool & Branching Point Visual

**Feature Branch**: `008-wire-tool-branching`
**Created**: 2025-12-15
**Status**: Draft
**Input**: User description: "Branching points (enodes non associated with a components) must be rendered as cones and WireTool must be implemented which will handles both wires and branching points actions"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Wire Between Two Pins (Priority: P1)

A user wants to connect two component pins with a wire to form an electrical connection. They activate the wire tool, click on a source pin (enode on a component), then click on a target pin on another component, and the wire is created.

**Why this priority**: Wire creation between component pins is the fundamental operation for building circuits. Without it, no circuit can function.

**Independent Test**: Can be fully tested by placing two components, activating wire tool, clicking source pin, clicking target pin, and verifying wire exists in circuit model and renders visually.

**Acceptance Scenarios**:

1. **Given** two components exist with visible pins, **When** user activates wire tool, clicks first pin, then clicks second pin, **Then** wire is created connecting both pins and renders as a line between them.
2. **Given** user has selected a source pin, **When** user moves cursor toward target pin, **Then** a preview line shows from source to cursor position.
3. **Given** user has selected a source pin, **When** user presses Escape, **Then** wire creation is cancelled and no wire is created.

---

### User Story 2 - Visual Display of Branching Points (Priority: P1)

A user needs to see branching points (junction nodes where multiple wires meet) clearly distinguished from component pins. Branching points must render as cone shapes to visually differentiate them from component pins which render as hemispheres.

**Why this priority**: Visual distinction between pins and branching points is essential for users to understand circuit topology. Without clear visuals, users cannot identify where wire junctions occur.

**Independent Test**: Can be fully tested by creating a circuit with a branching point and verifying it renders as a cone shape at the correct position.

**Acceptance Scenarios**:

1. **Given** a branching point exists in the circuit, **When** scene renders, **Then** branching point displays as a cone shape at its grid position.
2. **Given** a branching point is hovered, **When** user moves cursor over it, **Then** cone shows hover feedback (color change).
3. **Given** a branching point is selected, **When** user clicks on it, **Then** cone shows selection feedback (color change).

---

### User Story 3 - Create Branching Point on Existing Wire (Priority: P2)

A user wants to create a junction point on an existing wire to split it and connect additional wires. They activate the wire tool, hover over an existing wire segment, double-click to insert a branching point, which splits the wire into two new wires connected at the new branching point.

**Why this priority**: Creating branching points enables complex circuit topologies with wire junctions. This extends the basic wire functionality.

**Independent Test**: Can be fully tested by creating a wire between two pins, activating wire tool, double-clicking on the wire, and verifying a branching point is created at click location with original wire split into two.

**Acceptance Scenarios**:

1. **Given** a wire exists, **When** user hovers over wire in wire tool mode, **Then** cursor indicates wire is targetable.
2. **Given** user is hovering over a wire, **When** user double-clicks, **Then** a branching point is created at the clicked position and the original wire is split into two wires.
3. **Given** user creates a branching point on a wire, **When** creation completes, **Then** the circuit model contains the new branching point enode and two wires (replacing the original one).

### User Story 3b - Drag Intermediate Points on Wire (Priority: P2)

A user wants to adjust the visual routing of an existing wire by dragging intermediate points (visual waypoints). They activate the wire tool, single-click on a wire to start dragging, and move an intermediate point to reshape the wire path.

**Why this priority**: Wire routing flexibility allows users to create cleaner, more readable circuit layouts.

**Independent Test**: Can be fully tested by creating a wire, single-clicking on it to start drag, moving cursor to new position, releasing, and verifying wire geometry updated with new intermediate point.

**Acceptance Scenarios**:

1. **Given** a wire exists, **When** user single-clicks on wire segment, **Then** drag state is initiated.
2. **Given** drag state is active and an intermediate point is near click position, **When** user drags, **Then** the existing intermediate point moves with cursor.
3. **Given** drag state is active and no intermediate point is near click position, **When** user drags, **Then** a new intermediate point is created and moves with cursor.
4. **Given** drag state is active on a branching point, **When** user drags, **Then** the branching point (and its connected wires) moves with cursor.
5. **Given** user is dragging an intermediate point, **When** point is released over a wire endpoint or another intermediate point, **Then** the dragged point is deleted (merged).

---

### User Story 4 - Connect Wire to Existing Branching Point (Priority: P2)

A user wants to connect a wire from a component pin to an existing branching point, or from one branching point to another.

**Why this priority**: After branching points are created, users must be able to connect additional wires to them to complete circuit junctions.

**Independent Test**: Can be fully tested by creating a branching point, then using wire tool to connect a component pin to the branching point.

**Acceptance Scenarios**:

1. **Given** a branching point and a component pin exist, **When** user creates wire from pin to branching point, **Then** wire connects the two endpoints.
2. **Given** two branching points exist, **When** user creates wire between them, **Then** wire connects both branching points.
3. **Given** user is creating wire and hovers over branching point, **When** cursor is over branching point cone, **Then** cursor shows pointer and branching point shows hover highlight.

---

### User Story 5 - Toggle Branching Point Source Type (Priority: P2)

A user wants to configure a branching point as a voltage source or current source for simulation purposes. They double-click on an existing branching point to cycle through source types: no source → voltage source → current source → no source. The cone material color changes to reflect the current state: white (no source), red (voltage source), blue (current source).

**Why this priority**: Source type configuration is essential for circuit simulation. Branching points acting as pinSources are a core modeling capability.

**Independent Test**: Can be fully tested by creating a branching point, double-clicking to cycle through states, and verifying both the ENode.sourceType attribute and visual cone color update correctly.

**Acceptance Scenarios**:

1. **Given** a branching point exists with no source type (white cone), **When** user double-clicks on it, **Then** sourceType becomes "voltage" and cone turns red.
2. **Given** a branching point has sourceType "voltage" (red cone), **When** user double-clicks on it, **Then** sourceType becomes "current" and cone turns blue.
3. **Given** a branching point has sourceType "current" (blue cone), **When** user double-clicks on it, **Then** sourceType becomes null/none and cone turns white.
4. **Given** user is in wire tool mode, **When** user double-clicks on branching point, **Then** source type cycles (does not start wire creation from that point).

---

### User Story 6 - Create Standalone Branching Point (Priority: P3)

A user wants to place a branching point at an arbitrary grid position (not on an existing wire) to pre-plan wire routing or to create junction points before connecting wires.

**Why this priority**: While most branching points are created by splitting wires, advanced users may want to pre-place junction points for complex layouts.

**Independent Test**: Can be fully tested by activating wire tool, double-clicking on empty grid space (not on wire or pin), and verifying branching point is created at grid-snapped position.

**Acceptance Scenarios**:

1. **Given** wire tool is active, **When** user double-clicks on empty grid position, **Then** a branching point is created at the grid-snapped position.
2. **Given** user creates standalone branching point, **When** creation completes, **Then** the branching point renders as cone and can be used as wire endpoint.

---

### Edge Cases

- What happens when user tries to create wire from a pin to itself?
  - Wire creation is rejected with visual feedback (not-allowed cursor).
- What happens when user clicks on empty space while source endpoint is selected?
  - A new standalone branching point is created at grid position and wire connects source to new branching point.
- What happens when user single-clicks on empty space (no wire, no enode) in idle state?
  - No action; single-click on empty space does nothing when no source endpoint is selected.
- What happens when user double-clicks on empty space (no wire, no enode)?
  - A standalone branching point is created at grid-snapped position.
- What happens when user drags an intermediate point onto a wire endpoint or another intermediate point?
  - The dragged intermediate point is deleted (merged), simplifying the wire path.
- How does system handle clicking on overlapping hitboxes (pin and wire at same location)?
  - Priority system determines: enode (pin/branching point) takes precedence over wire.
- What happens when a branching point has no connected wires?
  - Orphaned branching points are automatically deleted when they have zero wires (circuit model handles this).
- What happens when user tries to create a wire that already exists?
  - Wire creation is rejected; no duplicate wires between same two endpoints.
- What happens when user double-clicks on an existing branching point?
  - sourceType cycles (null → voltage → current → null); does not initiate wire creation.
- What happens when user presses Escape during drag?
  - Drag is cancelled and the drag target reverts to its original position.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST render branching point enodes as cone shapes visually distinct from component pins (hemispheres).
- **FR-002**: System MUST provide a unified WireTool that handles wire creation, branching point insertion/modification and intermediate point insertion/modification.
- **FR-003**: WireTool MUST allow selecting any enode (pin or branching point) as wire endpoint.
- **FR-004**: WireTool MUST show a preview line from selected source endpoint to current cursor position during wire creation.
- **FR-005**: WireTool MUST allow cancellation via Escape key at any step, resetting tool state.
- **FR-006**: WireTool MUST detect when cursor hovers over existing wire segment (using HoverManager existing functions).
- **FR-007**: System MUST create a branching point when user double-clicks on existing wire, splitting wire into two segments.
- **FR-016**: WireTool single-click on wire MUST trigger a drag state for manipulating intermediate points (visual waypoints in Line2 geometry).
- **FR-017**: At drag start, if a branching point is hovered, it becomes the drag target.
- **FR-018**: At drag start, if no branching point is hovered but an existing intermediate point is within 10 pixels (screen space), that intermediate point becomes the drag target.
- **FR-019**: At drag start, if neither branching point nor existing intermediate point is close, a new intermediate point MUST be created on the wire and become the drag target.
- **FR-020**: Intermediate points are purely visual waypoints (Line2 geometry vertices) and do NOT represent branching points in the circuit model.
- **FR-021**: Intermediate point positions MUST snap to the grid during and after drag operations.
- **FR-022**: Dragging an intermediate point onto a wire endpoint (enode) MUST delete/merge the intermediate point.
- **FR-023**: Dragging an intermediate point onto another intermediate point MUST delete/merge the dragged point.
- **FR-027**: Pressing Escape during drag MUST cancel the drag and revert the drag target to its original position.
- **FR-008**: System MUST create standalone branching point when user clicks on empty grid position during wire creation (connecting source to new point).
- **FR-009**: System MUST snap branching point positions to the grid.
- **FR-010**: System MUST prevent wire creation from an endpoint to itself.
- **FR-011**: System MUST prevent duplicate wires between the same two endpoints.
- **FR-012**: Branching point cones MUST respond to hover with visual feedback (brightness shift of current sourceType color).
- **FR-013**: Branching point cones MUST respond to selection with visual feedback (brightness shift of current sourceType color).
- **FR-014**: WireTool MUST update cursor based on context (crosshair default, pointer over valid target, not-allowed over invalid target).
- **FR-015**: System MUST maintain hitbox priority: enode > wire (enodes take precedence when overlapping).
- **FR-024**: Double-click on existing branching point MUST cycle its sourceType: null → "voltage" → "current" → null.
- **FR-025**: Branching point cone color MUST reflect sourceType: white (null/none), red (voltage), blue (current).
- **FR-026**: sourceType cycling on branching point takes precedence over wire creation when double-clicking on existing branching point.

### Key Entities

- **Branching Point ENode**: An ENode with type=BranchingPoint, no associated component, stores grid position directly. Connects multiple wires at a junction. Has `sourceType` attribute: null (no source), "voltage", or "current".
- **Wire**: Connection between exactly two ENodes (pins or branching points). Has `intermediatePositions` array storing waypoints for visual routing (persisted in circuit model).
- **WireTool**: Editing tool that manages wire creation, branching point insertion, and standalone branching point creation through a unified interface.
- **Branching Point Visual**: Cone-shaped geometry representing a branching point in the scene, with hitbox for raycasting.

## Clarifications

### Session 2025-12-15

- Q: How should branching point creation be triggered? → A: Double-click only (single click triggers drag state for intermediate points).
- Q: What should single click on wire do? → A: Triggers drag state for moving intermediate points (visual waypoints in Line2 geometry, not branching points).
- Q: What is the drag target priority? → A: 1) Hovering branching point, 2) Nearby existing intermediate point, 3) Create new intermediate point on wire.
- Q: What is the proximity threshold for detecting existing intermediate points? → A: 10 pixels (screen space).
- Q: Should intermediate points snap to grid? → A: Yes, snap to grid like branching points.
- Q: How to delete intermediate points? → A: Drag to endpoint (enode) or another intermediate point to merge/delete.
- Q: Where are intermediate points stored? → A: Wire model (Wire.intermediatePositions array).
- Q: During wire creation, what does single-click on empty space do? → A: Creates branching point and completes wire from source to new point.
- Q: How should hover/selection feedback work with sourceType colors? → A: Brightness shift (lighten/darken the sourceType color).
- Q: What happens on Escape during drag? → A: Revert to original position (cancel drag).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a wire between two component pins in under 5 seconds (2 clicks).
- **SC-002**: Users can visually distinguish branching points from component pins at first glance.
- **SC-003**: Users can insert a branching point on an existing wire in under 3 seconds (double-click on wire).
- **SC-004**: Wire preview updates at interactive frame rate (at least 30fps) while creating wire.
- **SC-005**: All wire tool operations (create wire, insert branch, cancel) complete with immediate visual feedback.
- **SC-006**: Users can successfully create a junction connecting 3+ wires using branching points.
