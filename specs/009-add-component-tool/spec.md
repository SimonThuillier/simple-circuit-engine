# Feature Specification: Add Component Tool

**Feature Branch**: `009-add-component-tool`
**Created**: 2025-12-16
**Status**: Draft
**Input**: User description: "AddComponentTool must be implemented: when activated the user can choose a component model among those defined in the FactoryRegistry and a click on an empty space add a new component of this model."

## Clarifications

### Session 2025-12-17

- Q: Should Delete/Suppr key remove a selected component when Add Component tool is active? → A: Yes, pressing Delete/Suppr removes the currently selected component.
- Q: Should rotation functionality (scroll wheel, 90° increments) be included? → A: Yes, include rotation via scroll wheel (90° increments).
- Q: How should component selection work while Add Component tool is active? → A: Click on existing component to select it (consistent with other tools).
- Q: When ghost preview is visible and user clicks on existing component, what happens? → A: Select the existing component (placement only on empty space).
- Q: How should overlap detection work for component placement? → A: Bounding box intersection (components overlap if their rectangular footprints intersect).
- Q: What visual indicator should be used for invalid placement? → A: Both red tint on ghost preview AND 'not-allowed' cursor.
- Q: Should AddComponentTool emit events like WireTool does? → A: Yes, emit events for component placement, deletion, and validation errors (toolOperationStarted, toolOperationCompleted, toolValidationError).
- Q: What should the ghost preview look like during valid placement? → A: Semi-transparent (e.g., 50% opacity).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Select Component Type and Place on Canvas (Priority: P1)

A circuit designer wants to add a new component (e.g., a battery or LED) to their circuit. They activate the Add Component tool, select the desired component type from the available options, move the cursor over an empty space on the canvas to see a preview of the component, and click to place it.

**Why this priority**: This is the core functionality - without the ability to select a component type and place it, the tool has no value. This enables the fundamental circuit building workflow.

**Independent Test**: Can be fully tested by activating the tool, selecting a component type, hovering over empty canvas space, and clicking to place. Delivers immediate value by allowing users to populate their circuits with components.

**Acceptance Scenarios**:

1. **Given** the Add Component tool is activated and a component type is selected, **When** the user hovers over empty canvas space, **Then** a ghost preview of the selected component is displayed at the cursor position (snapped to grid).
2. **Given** the Add Component tool is activated and a component type is selected, **When** the user clicks on empty canvas space, **Then** a new component of the selected type is added to the circuit at that grid position.
3. **Given** a component has just been placed, **When** the placement completes, **Then** the tool remains active with the same component type selected, allowing rapid placement of multiple components.

---

### User Story 2 - Visual Feedback for Invalid Placement (Priority: P2)

A circuit designer attempts to place a component at a location that is already occupied by another component. The system provides clear visual feedback indicating the placement is not allowed.

**Why this priority**: Error prevention improves user experience but is not strictly required for basic functionality. Users can visually avoid occupied spaces without system validation.

**Independent Test**: Can be tested by placing a component, then attempting to place another component at the same location and verifying the visual feedback changes and placement is blocked.

**Acceptance Scenarios**:

1. **Given** the Add Component tool is active with a component selected, **When** the user hovers over a position occupied by an existing component, **Then** the ghost preview displays a red tint AND the cursor changes to 'not-allowed'.
2. **Given** the ghost preview indicates invalid placement, **When** the user clicks, **Then** no component is placed and the tool remains active.
3. **Given** the ghost preview indicates invalid placement, **When** the user moves the cursor to an empty space, **Then** the ghost preview returns to normal appearance indicating valid placement.

---

### User Story 3 - Rotate Component Preview Before Placement (Priority: P3)

A circuit designer needs to orient components correctly to align with their circuit layout. While hovering with the ghost preview visible, they scroll the mouse wheel to rotate the component preview in 90-degree increments before placing it.

**Why this priority**: Proper component orientation is essential for clean circuit layouts, but the tool can still provide value without rotation (users could rotate after placement).

**Independent Test**: Can be tested by selecting a component type, hovering over canvas, scrolling to rotate the preview, and verifying the preview rotates. The placed component should match the rotated preview orientation.

**Acceptance Scenarios**:

1. **Given** the Add Component tool is active with a component selected and the ghost preview is visible, **When** the user scrolls the mouse wheel up, **Then** the ghost preview rotates 90 degrees clockwise.
2. **Given** the Add Component tool is active with a component selected and the ghost preview is visible, **When** the user scrolls the mouse wheel down, **Then** the ghost preview rotates 90 degrees counter-clockwise.
3. **Given** the ghost preview has been rotated, **When** the user clicks to place the component, **Then** the placed component matches the orientation of the preview.

---

### User Story 4 - Delete Selected Component (Priority: P4)

A circuit designer wants to quickly remove a misplaced component while continuing to add new components. With the Add Component tool active and a placed component selected, they press Delete/Suppr to remove it without switching tools.

**Why this priority**: Convenience feature that improves workflow efficiency but is not core to the tool's primary purpose of adding components.

**Independent Test**: Can be tested by placing a component, selecting it, pressing Delete key, and verifying the component is removed from the circuit.

**Acceptance Scenarios**:

1. **Given** the Add Component tool is active and an existing component is visible on canvas, **When** the user clicks on that component, **Then** the component becomes selected (visual highlight).
2. **Given** the Add Component tool is active and a component is selected, **When** the user presses Delete or Suppr key, **Then** the selected component is removed from the circuit.
3. **Given** a component has been deleted, **When** the deletion completes, **Then** the selection is cleared and the tool remains active for continued placement.

---

### Edge Cases

- What happens when no component type is selected and the user tries to place? A: warning message should prompt the user to select a component type first.
- How does the tool handle clicking exactly on a grid boundary? (Position should snap to nearest grid point)
- What happens when the user deactivates the tool while a ghost preview is visible? (Preview should be removed immediately)
- How does scrolling rotation wrap around? (Rotation cycles through 0°, 90°, 180°, 270° and back to 0°)
- What happens when Delete is pressed with no component selected? (No action taken, tool remains active)
- What happens when clicking on an existing component with ghost preview visible? (Selects component instead of attempting placement)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a list of available component types from the FactoryRegistry when the Add Component tool is activated.
- **FR-002**: Users MUST be able to select a single component type from the available options.
- **FR-003**: System MUST display a semi-transparent (50% opacity) ghost preview of the selected component at the cursor position when hovering over the canvas.
- **FR-004**: The ghost preview MUST snap to grid positions as the cursor moves.
- **FR-005**: System MUST add a new component to the circuit when the user clicks on an empty grid position.
- **FR-006**: The placed component MUST inherit the position and rotation from the ghost preview at the time of click.
- **FR-007**: System MUST detect overlap with existing components using bounding box intersection and provide visual feedback (red tint on ghost preview + 'not-allowed' cursor) for invalid placements.
- **FR-008**: System MUST prevent component placement at positions where the new component's bounding box would intersect with any existing component's bounding box.
- **FR-009**: System MUST maintain the selected component type after a successful placement, enabling rapid sequential placement.
- **FR-010**: System MUST remove the ghost preview when the tool is deactivated.
- **FR-011**: System MUST persist the selected component type for the duration of the tool's activation (until another type is selected or tool is deactivated).
- **FR-012**: Users MUST be able to rotate the ghost preview in 90-degree increments using mouse scroll (up = clockwise, down = counter-clockwise).
- **FR-013**: Rotation MUST wrap around (0° → 90° → 180° → 270° → 0°).
- **FR-014**: System MUST delete the currently selected component when the user presses Delete or Suppr key while the tool is active.
- **FR-015**: After component deletion, the selection MUST be cleared and the tool MUST remain active.
- **FR-016**: Users MUST be able to select an existing component by clicking on it while the Add Component tool is active.
- **FR-017**: When clicking on an existing component (even with ghost preview visible), the system MUST select that component instead of attempting placement.
- **FR-018**: System MUST emit `toolOperationCompleted` event after successful component placement or deletion, including operation details (componentId, position, type).
- **FR-019**: System MUST emit `toolValidationError` event when placement is blocked due to overlap or missing component type selection.

### Key Entities

- **Component Type Selection**: The currently selected component model identifier from FactoryRegistry (ComponentType enum value).
- **Ghost Preview**: A semi-transparent (50% opacity) visual representation of the component that follows the cursor, shows rotation state, and indicates placement validity (red tint when invalid).
- **Placement Position**: Grid-snapped coordinates where the component will be placed (Position object with x, y).
- **Rotation State**: The current rotation angle of the preview/component in 90-degree increments (0°, 90°, 180°, 270°).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can place a component in under 3 seconds from tool activation (select type + click).
- **SC-002**: Ghost preview updates position at least 30 times per second during cursor movement for smooth feedback.
- **SC-003**: 100% of placement attempts at occupied positions are prevented with clear visual feedback.
- **SC-004**: Users can place 10 components of the same type in under 15 seconds using rapid placement workflow.
- **SC-005**: Rotation preview accurately reflects final component orientation 100% of the time.

## Assumptions

- The FactoryRegistry already contains registered component types with associated visual factories.
- Grid snapping behavior follows the existing convention used by other tools in the application.
- The cursor position to world coordinate conversion is handled by existing scene infrastructure.
- Overlap detection uses component bounding boxes (rectangular footprints) already defined in the system or derivable from visual factories.
- The tool follows the existing IEditingTool interface pattern established by WireTool, PositionTool, etc.
