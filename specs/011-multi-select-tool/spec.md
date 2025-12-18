# Feature Specification: Multi-Select Tool

**Feature Branch**: `011-multi-select-tool`
**Created**: 2025-12-18
**Status**: Draft
**Input**: User description: "I need a new edition tool specialized to handle multi elements selection and manipulation on the scene: I should be able to drag a clear displayed window of selection, it should update selection on pointerup, and then I can hover one of the element selected and drag to move all the selected elements, press suppr to delete them, ctrl+c/ctrl+v to copy/paste them and ctrl+c/ctrl+x to cut/paste them"

## Clarifications

### Session 2025-12-18

- Q: Should MultiSelectTool handle BuildTool operations? → A: No, tools are independent; users switch between them.
- Q: Wire selection rule consistency (FR-002 vs FR-013)? → A: Wires selected only when BOTH endpoints are inside rectangle. Removed contradictory FR-013.
- Q: Boundary wire behavior during bulk move? → A: Boundary wires stretch to maintain connections (endpoints follow moved/stationary components).
- Q: Wire intermediate points during bulk move? → A: Intermediate points move with the selection (wire shape preserved).
- Q: Paste position anchor? → A: Cursor position becomes center of pasted group's bounding box.
- Q: Single-click element selection? → A: Clicking selects that element and clears previous multi-selection.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Rectangle Selection (Priority: P1)

As a circuit designer, I want to drag a selection rectangle across the scene to select multiple components, branching points and wires at once, so I can efficiently work with groups of elements instead of selecting them one by one.

**Why this priority**: This is the foundational interaction that enables all other multi-select operations. Without rectangle selection, users cannot create multi-selections.

**Independent Test**: Can be fully tested by clicking and dragging on empty space to draw a selection rectangle, releasing to confirm selection, and verifying that all elements within the rectangle bounds are selected and visually indicated.

**Acceptance Scenarios**:

1. **Given** the multi-select tool is active and no elements are selected, **When** I press and hold left mouse button on empty space and drag to create a rectangle, **Then** a visible selection rectangle is displayed that follows my cursor movement.

2. **Given** I am dragging a selection rectangle, **When** I release the mouse button, **Then** all components and branching points that are fully inside the rectangle + all wires connected to these components pins/branching points become selected and the selection rectangle disappears.

3. **Given** I am dragging a selection rectangle, **When** the rectangle encompasses multiple components and wires, **Then** a real-time visual preview shows which elements will be selected (e.g., highlight color change).

4. **Given** I have started dragging a selection rectangle, **When** I press Escape, **Then** the selection rectangle disappears and no selection change occurs.

5. **Given** elements are already selected, **When** I draw a new selection rectangle (without holding Shift), **Then** the previous selection is cleared and only elements in the new rectangle are selected.

6. **Given** elements are already selected, **When** I draw a new selection rectangle while holding Shift, **Then** elements in the new rectangle are added to the existing selection.

7. **Given** elements are already selected (single or multi), **When** I click directly on a different element without dragging, **Then** that element becomes the only selected element (previous selection cleared).

8. **Given** elements are already selected, **When** I click directly on an element while holding Shift, **Then** that element is added to the current selection.

---

### User Story 2 - Bulk Move (Priority: P1)

As a circuit designer, I want to move all selected elements together by dragging any one of them, so I can reposition groups of circuit elements while maintaining their relative positions.

**Why this priority**: Moving multiple elements is a fundamental editing operation that saves significant time compared to repositioning elements individually.

**Independent Test**: Can be fully tested by selecting multiple elements, dragging one of them, and verifying all selected elements move together while maintaining their relative positions.

**Acceptance Scenarios**:

1. **Given** multiple elements are selected, **When** I hover over any selected element, **Then** the cursor changes to indicate the element is draggable (grab cursor).

2. **Given** multiple elements are selected and I hover over a selected element, **When** I press and hold left mouse button and drag, **Then** all selected elements move together maintaining their relative positions.

3. **Given** I am dragging multiple selected elements, **When** I release the mouse button, **Then** all elements snap to their new grid-aligned positions and the operation is committed.

4. **Given** I am dragging multiple selected elements, **When** I press Escape, **Then** all elements return to their original positions and the drag operation is cancelled.

5. **Given** multiple elements are selected including components, branching points and wires, **When** I drag the selection, **Then** wires connected to moved components and branching points update their geometry to follow the new component positions.

6. **Given** multiple elements are selected, **When** I drag the selection over other non-selected elements, **Then** no collision detection prevents the move (elements can overlap temporarily).

---

### User Story 3 - Bulk Delete (Priority: P2)

As a circuit designer, I want to delete all selected elements at once by pressing Delete/Backspace, so I can quickly remove groups of unwanted circuit elements.

**Why this priority**: Deletion is a common operation but less frequent than selection and movement. Having bulk delete significantly improves editing efficiency.

**Independent Test**: Can be fully tested by selecting multiple elements, pressing Delete or Backspace, and verifying all selected elements are removed from the circuit.

**Acceptance Scenarios**:

1. **Given** multiple elements are selected, **When** I press the Delete or Backspace key, **Then** all selected elements are removed from the circuit.

2. **Given** multiple components are selected with wires connected to them, **When** I delete the selection, **Then** the components are deleted and connected wires that become invalid (no valid endpoints) are also removed.

3. **Given** a mixed selection of components and wires, **When** I delete the selection, **Then** all selected items are deleted regardless of their type.

4. **Given** multiple elements are selected, **When** I delete them, **Then** the selection is cleared after deletion.

---

### User Story 4 - Copy/Paste (Priority: P2)

As a circuit designer, I want to copy selected elements to a clipboard and paste them elsewhere, so I can duplicate circuit patterns without recreating them manually.

**Why this priority**: Copy/paste enables rapid circuit construction through duplication, which is valuable but requires the selection infrastructure to be in place first.

**Independent Test**: Can be fully tested by selecting elements, pressing Ctrl+C, moving cursor to a new position, pressing Ctrl+V, and verifying duplicated elements appear at the new position.

**Acceptance Scenarios**:

1. **Given** multiple elements are selected, **When** I press Ctrl+C (or Cmd+C on Mac), **Then** the selected elements are copied to the clipboard (visual feedback confirms copy).

2. **Given** elements are in the clipboard, **When** I press Ctrl+V (or Cmd+V on Mac), **Then** duplicates of the clipboard elements are created centered on the current cursor position (cursor becomes center of pasted group's bounding box).

3. **Given** I have pasted elements, **When** the paste operation completes, **Then** the newly pasted elements become the current selection.

4. **Given** components with connected wires are copied, **When** I paste them, **Then** internal wire connections between copied components are preserved in the paste.

5. **Given** elements are in the clipboard, **When** I paste multiple times without copying again, **Then** each paste creates new duplicates (clipboard is not cleared by paste).

6. **Given** no elements are selected, **When** I press Ctrl+C, **Then** nothing happens (clipboard remains unchanged).

---

### User Story 5 - Cut/Paste (Priority: P3)

As a circuit designer, I want to cut selected elements (removing them from the scene) and paste them elsewhere, so I can relocate circuit sections efficiently.

**Why this priority**: Cut/paste is a variation of copy/paste and can be implemented with minimal additional effort once copy/paste works.

**Independent Test**: Can be fully tested by selecting elements, pressing Ctrl+X, verifying elements are removed, then pressing Ctrl+V to paste them at a new location.

**Acceptance Scenarios**:

1. **Given** multiple elements are selected, **When** I press Ctrl+X (or Cmd+X on Mac), **Then** the selected elements are copied to the clipboard AND removed from the circuit.

2. **Given** I have cut elements, **When** I press Ctrl+V, **Then** the cut elements are restored at the current cursor position.

3. **Given** elements were cut (not copied), **When** I paste them multiple times, **Then** each paste creates new duplicates (cut elements can be pasted repeatedly).

---

### Edge Cases

- What happens when selection rectangle starts on a component? The drag is interpreted as a move operation, not a selection rectangle.
- What happens when pasting at a position where elements would overlap with existing elements? Elements are pasted regardless; overlapping is allowed (no collision prevention).
- What happens when copying/cutting wires without their connected components? Only the selected wires are copied; endpoint references become unresolved and the pasted wires connect to new standalone branching points at the original endpoint positions.
- What happens when deleting a branching point that is part of a multi-selection? The branching point is deleted, and connected wires are merged or removed as per existing single-delete behavior.
- What happens when the selection rectangle has zero width or height (click without drag)? No selection change occurs; this is treated as a click to deselect.
- What happens when all selected elements are outside the visible viewport during paste? Elements are pasted at cursor position relative to viewport, ensuring at least one element is visible.
- At selection definition, are wires partially inside the rectangle selected? No : the strict rule for wire selection is that both of their termination enodes must be within the rectangle (eg selected) to be selected. a Wire with one end node selected and the other not selected is not selected.
- What happens to wires connecting selected components to non-selected components during bulk move? Boundary wires stretch to maintain connections; their endpoints follow their respective components (moved or stationary).
- What happens to wire intermediate points (bends/waypoints) during bulk move? Intermediate points of selected wires move with the selection, preserving wire shape.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a visible selection rectangle when the user drags on empty space, rendered with a distinct border and semi-transparent fill.
- **FR-002**: System MUST select all components and branching points fully inside the selection rectangle, plus all wires whose both endpoints are selected, upon mouse release.
- **FR-003**: System MUST support additive selection using Shift modifier key when drawing selection rectangles.
- **FR-004**: System MUST move all selected elements together when the user drags any selected element, maintaining relative positions.
- **FR-005**: System MUST update wire geometry in real-time during bulk move operations for wires connected to moving components.
- **FR-006**: System MUST delete all selected elements when user presses Delete or Backspace key.
- **FR-007**: System MUST copy selected elements to internal clipboard when user presses Ctrl+C (Cmd+C on Mac).
- **FR-008**: System MUST paste clipboard contents at cursor position when user presses Ctrl+V (Cmd+V on Mac).
- **FR-009**: System MUST cut selected elements (copy to clipboard and delete) when user presses Ctrl+X (Cmd+X on Mac).
- **FR-010**: System MUST provide visual feedback for selected elements that is distinct from hover and single-selection states.
- **FR-011**: System MUST allow cancellation of in-progress operations (selection rectangle, bulk move) via Escape key.
- **FR-012**: System MUST preserve internal wire connections when copying/pasting groups of connected components.
- **FR-013**: System MUST update the SelectionManager to use MultiSelectionData when multiple elements are selected.
- **FR-014**: System MUST clear multi-selection when user clicks on empty space without Shift held.

### Key Entities

- **MultiSelectTool**: New editing tool implementing IEditingTool interface, managing selection rectangle, bulk operations, and clipboard.
- **SelectionRectangle**: Visual overlay rendered during rectangle selection showing bounds and affected elements.
- **Clipboard**: Internal data structure holding copied element definitions with relative positions for paste operations.
- **MultiSelectionData**: Existing type in SelectionManager representing multiple selected components, enodes, and wires.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can select 10+ elements with a single rectangle drag operation in under 2 seconds.
- **SC-002**: Bulk move of 20 elements completes with real-time visual feedback at 30+ FPS.
- **SC-003**: Copy/paste of complex selections (10+ components with interconnecting wires) completes in under 1 second.
- **SC-004**: Users can complete a full edit workflow (select, move, copy, paste, delete) using only keyboard shortcuts and mouse drag operations.

## Assumptions

- The existing SelectionManager already supports MultiSelectionData structure and can track multiple selected elements.
- Wire visual updates via WireVisualManager can handle batch updates efficiently.
- The grid snapping system works consistently for bulk position updates.
- The existing tool system (IEditingTool interface) supports adding new tool types without architectural changes.
- Clipboard data does not need to persist across browser sessions (in-memory only).
