# Feature Specification: Build Tool Merge

**Feature Branch**: `010-build-tool-merge`
**Created**: 2025-12-17
**Status**: Draft
**Input**: User description: "After testing, It appears that the features of the PositionTool and WireTool should be handled by a single BuildTool. Create BuildTool and merge the logic from PositionTool and WireTool into it. After that the now redundant DeleteTool and BranchingPointTool can now be removed, as well as old PositionTool and WireTool."

## Clarifications

### Session 2025-12-17

- Q: When a user double-clicks on a component that is NOT currently selected, what should happen? → A: Select the component AND rotate it (single action)
- Q: What elements should BuildTool be able to delete? → A: Wires, branching points, AND components (unified deletion for best UX)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Connect Wires with BuildTool (Priority: P1)

Users can create wires from components pins/branching points to components pins/branching points/wires using the BuildTool, combining the wire creation functionality previously in WireTool.

**Why this priority**: Wire creation is the primary interaction for building circuits and must work seamlessly in the unified tool.

**Independent Test**: Can be fully tested by selecting the BuildTool, clicking on a pin/enode, and releasing on another pin/enode to create a wire. Delivers core circuit connectivity functionality.

**Acceptance Scenarios**:

1. **Given** BuildTool is active and user clicks on a component pin/branching point, **When** user drags to another pin and releases, **Then** a wire is created connecting the two pins with visual feedback during the operation.
2. **Given** BuildTool is active and user is creating a wire, **When** user releases on empty space, **Then** a standalone branching point is created at that position and connected by the new wire.
3. **Given** BuildTool is active and user is creating a wire, **When** user releases on an existing wire, **Then** a branching point is created at that position, the target wire is split, and the new wire connects to the branching point.
4. **Given** BuildTool is active and user is creating a wire, **When** user presses Escape, **Then** the wire creation is cancelled and no changes are made.

---

### User Story 2 - Move and Position Elements with BuildTool (Priority: P1)

Users can drag components, branching points, and wire intermediate points to reposition them using the BuildTool, combining the positioning functionality previously in PositionTool.

**Why this priority**: Moving elements is essential for circuit layout and must work alongside wire creation in the unified tool.

**Independent Test**: Can be fully tested by selecting a component and dragging it to a new position. Delivers essential circuit layout functionality.

**Acceptance Scenarios**:

1. **Given** BuildTool is active and a component is selected, **When** user drags the component, **Then** the component moves with the cursor with grid snapping, and connected wires update in real-time.
2. **Given** BuildTool is active, **When** user double clicks and drags a branching point, **Then** the branching point moves and all connected wires update their geometry.
3. **Given** BuildTool is active, **When** user clicks on a wire intermediate point, **Then** user can drag it to reshape the wire path.
4. **Given** BuildTool is active and user is dragging an element, **When** user presses Escape, **Then** the element returns to its original position.

---

### User Story 3 - Rotate Components with BuildTool (Priority: P2)

Users can rotate selected components using keyboard shortcuts or double-click, providing the rotation functionality previously in PositionTool.

**Why this priority**: Rotation is important for circuit layout but secondary to basic movement and wire creation.

**Independent Test**: Can be fully tested by selecting a component and pressing 'R' or double-clicking to rotate it 90 degrees.

**Acceptance Scenarios**:

1. **Given** BuildTool is active and a component is selected, **When** user presses 'R' key, **Then** the component rotates 90 degrees clockwise and connected wires update.
2. **Given** BuildTool is active and a component is selected, **When** user double-clicks the component, **Then** the component rotates 90 degrees clockwise.
3. **Given** BuildTool is active and a component is NOT selected, **When** user double-clicks the component, **Then** the component becomes selected AND rotates 90 degrees clockwise in a single action.

---

### User Story 4 - Delete Elements with BuildTool (Priority: P2)

Users can delete wires, branching points, and components using keyboard shortcuts, consolidating all delete functionality into the BuildTool for unified UX.

**Why this priority**: Deletion is a common operation that should be available without switching tools, but is secondary to creation and movement.

**Independent Test**: Can be fully tested by selecting a wire, branching point, or component and pressing Delete/Backspace key.

**Acceptance Scenarios**:

1. **Given** BuildTool is active and a wire is selected, **When** user presses Delete or Backspace, **Then** the wire is removed from the circuit.
2. **Given** BuildTool is active and a branching point is selected, **When** user presses Delete or Backspace, **Then** the branching point is removed and connected wires are merged if appropriate.
3. **Given** BuildTool is active and a component is selected, **When** user presses Delete or Backspace, **Then** the component and all its connected wires are removed from the circuit.

---

### User Story 5 - Create Branching Points with BuildTool (Priority: P2)

Users can create branching points on wires or in empty space using double-click, consolidating the BranchingPointTool functionality.

**Why this priority**: Branching point creation is already partially in WireTool and should be fully available in BuildTool.

**Independent Test**: Can be fully tested by double-clicking on a wire to create a branching point that splits the wire.

**Acceptance Scenarios**:

1. **Given** BuildTool is active, **When** user double-clicks on a wire, **Then** a branching point is created at that position and the wire is split into two segments.
2. **Given** BuildTool is active, **When** user double-clicks on empty space (not on any element), **Then** a standalone branching point is created at that grid position.

---

### User Story 6 - Remove Redundant Tools (Priority: P3)

The codebase is cleaned up by removing PositionTool, WireTool, DeleteTool, and BranchingPointTool after their functionality is consolidated into BuildTool.

**Why this priority**: Cleanup is essential for maintainability but can only happen after BuildTool is fully functional.

**Independent Test**: Can be verified by confirming the removed tool files no longer exist and the ToolType union is updated to exclude removed types.

**Acceptance Scenarios**:

1. **Given** BuildTool is implemented and tested, **When** the cleanup is complete, **Then** PositionTool.ts, WireTool.ts, DeleteTool.ts, and BranchingPointTool.ts are deleted from the codebase.
2. **Given** the tool files are removed, **When** examining the ToolType definition, **Then** it only includes 'build' and 'addComponent' as valid tool types.
3. **Given** cleanup is complete, **When** running all tests, **Then** all tests pass with no references to removed tools.

---

### Edge Cases

- What happens when user starts a wire creation and then clicks on the same source enode? The operation is cancelled.
- What happens when user tries to create a duplicate wire between the same two enodes? The operation fails with a validation error.
- What happens when user drags an element outside the visible canvas area? The drag continues with the element following grid-snapped cursor position.
- What happens when user deletes a branching point that would result in a duplicate wire? The deletion should be prevented or handled gracefully with appropriate feedback.
- What happens when user rapidly switches between wire creation and drag operations? The tool correctly disambiguates based on the clicked target (enode starts wire, selected element starts drag).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a BuildTool that combines wire creation, element positioning, rotation, deletion, and branching point functionality.
- **FR-002**: BuildTool MUST allow users to create wires by clicking on a source enode and releasing on a target enode.
- **FR-003**: BuildTool MUST show a preview wire during wire creation that follows the cursor position.
- **FR-004**: BuildTool MUST allow users to drag selected components with grid snapping and real-time wire updates.
- **FR-005**: BuildTool MUST allow users to drag branching points with connected wire geometry updates.
- **FR-006**: BuildTool MUST allow users to drag wire intermediate points to reshape wire paths.
- **FR-007**: BuildTool MUST allow users to rotate selected components via 'R' key or double-click (90-degree increments).
- **FR-008**: BuildTool MUST allow users to delete selected wires, branching points, and components via Delete/Backspace keys.
- **FR-009**: BuildTool MUST allow users to create branching points by double-clicking on wires (splits wire) or empty space (standalone).
- **FR-010**: BuildTool MUST cancel any active operation when Escape key is pressed.
- **FR-011**: System MUST remove PositionTool, WireTool, DeleteTool, and BranchingPointTool after BuildTool is complete.
- **FR-012**: System MUST update ToolType to only include 'build' and 'addComponent' types.
- **FR-013**: BuildTool MUST correctly disambiguate user intent based on clicked target (enode = wire creation, selected element = drag, wire = intermediate point drag or new intermediate point creation).
- **FR-014**: BuildTool MUST emit appropriate events for all operations (toolOperationStarted, toolOperationCompleted, toolOperationCancelled, toolValidationError).

### Key Entities

- **BuildTool**: The unified editing tool that handles wire creation, element positioning, rotation, deletion, and branching points. Replaces PositionTool, WireTool, DeleteTool, and BranchingPointTool.
- **ToolType**: Updated type union containing only 'build' and 'addComponent' after cleanup.
- **BuildToolMode**: Internal state machine tracking current operation mode (idle, wire_creation, component_drag, wire_point_dragging, bp_drag).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete all wire creation operations (pin-to-pin, pin-to-empty-space, pin-to-wire) without switching tools.
- **SC-002**: Users can move components and branching points with immediate visual feedback and grid snapping.
- **SC-003**: Users can reshape wire paths by dragging intermediate points or creating new ones by clicking on wire segments.
- **SC-004**: Users can rotate components with a single keypress or double-click action.
- **SC-005**: Users can delete selected elements with a single keypress action.
- **SC-006**: Codebase contains no references to removed tools (PositionTool, WireTool, DeleteTool, BranchingPointTool) after cleanup.
- **SC-007**: All existing circuit editing functionality remains accessible through BuildTool and AddComponentTool combination.
- **SC-008**: All existing tests pass after the refactoring, with tests updated to reference BuildTool instead of removed tools.
