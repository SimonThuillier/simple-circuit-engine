# Tasks: Multi-Select Tool

**Input**: Design documents from `/specs/011-multi-select-tool/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type extensions and shared utilities required by all user stories

- [X] T001 Extend ToolType union to add 'multiSelect' in src/scene/shared/types.ts
- [X] T002 [P] Create MultiSelectTool skeleton class implementing IEditingTool in src/scene/static/tools/MultiSelectTool.ts
- [X] T003 [P] Add geometry utilities for bounding box and screen-space intersection in src/scene/shared/GeometryUtils.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: SelectionManager extensions that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement selectMultiple() method in src/scene/shared/SelectionManager.ts
- [X] T005 Implement addToSelection() method in src/scene/shared/SelectionManager.ts
- [X] T006 Implement removeFromSelection() method in src/scene/shared/SelectionManager.ts
- [X] T007 Implement getSelectionCount() method in src/scene/shared/SelectionManager.ts
- [X] T008 Implement getSelectedIds() method in src/scene/shared/SelectionManager.ts
- [X] T009 Register MultiSelectTool in CircuitController.ts tool initialization

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Rectangle Selection (Priority: P1) MVP

**Goal**: Enable users to draw selection rectangles to select multiple components, branching points, and wires at once

**Independent Test**: Click and drag on empty space to draw a selection rectangle, release to confirm selection, verify all elements within bounds are selected and visually indicated

### Implementation for User Story 1

- [X] T010 [US1] Define SelectionRectState interface and mode transitions in src/scene/static/tools/MultiSelectTool.ts
- [X] T011 [US1] Implement handlePointerDown for empty-space detection to start rectangle selection in src/scene/static/tools/MultiSelectTool.ts
- [X] T012 [US1] Implement CSS overlay creation for selection rectangle visualization in src/scene/static/tools/MultiSelectTool.ts
- [X] T013 [US1] Implement handlePointerMove to update rectangle dimensions and position in src/scene/static/tools/MultiSelectTool.ts
- [X] T014 [US1] Implement element detection logic (components/BPs inside rectangle, wires with both endpoints selected) in src/scene/static/tools/MultiSelectTool.ts
- [X] T015 [US1] Implement real-time preview highlighting for elements that will be selected in src/scene/static/tools/MultiSelectTool.ts
- [X] T016 [US1] Implement handlePointerUp to commit selection via SelectionManager.selectMultiple() in src/scene/static/tools/MultiSelectTool.ts
- [X] T017 [US1] Implement Escape key handling to cancel rectangle selection in src/scene/static/tools/MultiSelectTool.ts
- [X] T018 [US1] Implement Shift-key additive selection mode in src/scene/static/tools/MultiSelectTool.ts
- [X] T019 [US1] Implement single-click element selection (clears previous selection) in src/scene/static/tools/MultiSelectTool.ts
- [X] T020 [US1] Implement Shift-click to add single element to selection in src/scene/static/tools/MultiSelectTool.ts
- [X] T021 [US1] Implement click-on-empty-space to clear selection in src/scene/static/tools/MultiSelectTool.ts
- [X] T022 [US1] Emit selectionRectStarted and selectionRectCompleted events in src/scene/static/tools/MultiSelectTool.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Bulk Move (Priority: P1)

**Goal**: Enable users to move all selected elements together by dragging any one of them

**Independent Test**: Select multiple elements, drag one of them, verify all selected elements move together while maintaining relative positions

### Implementation for User Story 2

- [X] T023 [US2] Define BulkDragState interface in src/scene/static/tools/MultiSelectTool.ts
- [X] T024 [US2] Implement handlePointerDown detection for selected elements to initiate bulk drag in src/scene/static/tools/MultiSelectTool.ts
- [X] T025 [US2] Implement initial position snapshot capture for all selected elements in src/scene/static/tools/MultiSelectTool.ts
- [X] T026 [US2] Implement affected wire ID collection (boundary wires + selected wires) in src/scene/static/tools/MultiSelectTool.ts
- [X] T027 [US2] Implement handleGridPositionMove to apply delta to all selected elements in src/scene/static/tools/MultiSelectTool.ts
- [X] T028 [US2] Implement wire geometry updates via WireVisualManager during drag in src/scene/static/tools/MultiSelectTool.ts
- [X] T029 [US2] Implement handlePointerUp to commit bulk move with grid snapping in src/scene/static/tools/MultiSelectTool.ts
- [X] T030 [US2] Implement Escape key handling to revert all elements to initial positions in src/scene/static/tools/MultiSelectTool.ts
- [X] T031 [US2] Implement cursor change to 'grab' when hovering selected elements in src/scene/static/tools/MultiSelectTool.ts
- [X] T032 [US2] Emit bulkDragStarted and bulkDragCompleted events in src/scene/static/tools/MultiSelectTool.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Bulk Delete (Priority: P2)

**Goal**: Enable users to delete all selected elements at once by pressing Delete/Backspace

**Independent Test**: Select multiple elements, press Delete or Backspace, verify all selected elements are removed from the circuit

### Implementation for User Story 3

- [X] T033 [US3] Implement deleteSelection() method with ordered deletion (wires → components → branching points) in src/scene/static/tools/MultiSelectTool.ts
- [X] T034 [US3] Implement handleKeyDown for Delete/Backspace to trigger bulk delete in src/scene/static/tools/MultiSelectTool.ts
- [X] T035 [US3] Implement orphaned wire cleanup after component deletion in src/scene/static/tools/MultiSelectTool.ts
- [X] T036 [US3] Implement selection clearing after delete operation in src/scene/static/tools/MultiSelectTool.ts
- [X] T037 [US3] Emit bulkDeleteCompleted event in src/scene/static/tools/MultiSelectTool.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Copy/Paste (Priority: P2)

**Goal**: Enable users to copy selected elements to clipboard and paste them at cursor position

**Independent Test**: Select elements, press Ctrl+C, move cursor, press Ctrl+V, verify duplicated elements appear at new position

### Implementation for User Story 4

- [X] T038 [US4] Define ClipboardData, ClipboardComponent, ClipboardBranchingPoint, ClipboardWire interfaces in src/scene/static/tools/MultiSelectTool.ts
- [X] T039 [US4] Implement copySelection() method to serialize selection to ClipboardData in src/scene/static/tools/MultiSelectTool.ts
- [X] T040 [US4] Implement anchor calculation (center of selection bounding box) for clipboard in src/scene/static/tools/MultiSelectTool.ts
- [X] T041 [US4] Implement relative position calculation for all elements in clipboard in src/scene/static/tools/MultiSelectTool.ts
- [X] T042 [US4] Implement wire filtering (only wires with both endpoints in selection) for clipboard in src/scene/static/tools/MultiSelectTool.ts
- [X] T043 [US4] Implement handleKeyDown for Ctrl+C (Cmd+C on Mac) to trigger copy in src/scene/static/tools/MultiSelectTool.ts
- [X] T044 [US4] Implement pasteAtCursor() method to deserialize ClipboardData at cursor position in src/scene/static/tools/MultiSelectTool.ts
- [X] T045 [US4] Implement component creation from clipboard with position offset in src/scene/static/tools/MultiSelectTool.ts
- [X] T046 [US4] Implement branching point creation from clipboard with position offset in src/scene/static/tools/MultiSelectTool.ts
- [X] T047 [US4] Implement wire creation with ID remapping (original → new element IDs) in src/scene/static/tools/MultiSelectTool.ts
- [X] T048 [US4] Implement handleKeyDown for Ctrl+V (Cmd+V on Mac) to trigger paste in src/scene/static/tools/MultiSelectTool.ts
- [X] T049 [US4] Implement selection of pasted elements after paste operation in src/scene/static/tools/MultiSelectTool.ts
- [X] T050 [US4] Implement hasClipboardContent() method in src/scene/static/tools/MultiSelectTool.ts
- [X] T051 [US4] Emit copyCompleted and pasteCompleted events in src/scene/static/tools/MultiSelectTool.ts

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Cut/Paste (Priority: P3)

**Goal**: Enable users to cut selected elements (remove and copy to clipboard) and paste them elsewhere

**Independent Test**: Select elements, press Ctrl+X, verify elements removed, press Ctrl+V to paste at new location

### Implementation for User Story 5

- [X] T052 [US5] Implement cutSelection() method (copy + delete) in src/scene/static/tools/MultiSelectTool.ts
- [X] T053 [US5] Implement handleKeyDown for Ctrl+X (Cmd+X on Mac) to trigger cut in src/scene/static/tools/MultiSelectTool.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, tool lifecycle, and integration refinements

- [X] T054 [P] Implement activate() lifecycle method (initialize state, register keyboard listeners) in src/scene/static/tools/MultiSelectTool.ts
- [X] T055 [P] Implement deactivate() lifecycle method (cleanup overlay, remove listeners) in src/scene/static/tools/MultiSelectTool.ts
- [X] T056 [P] Implement cancelOperation() method to cleanly abort any in-progress operation in src/scene/static/tools/MultiSelectTool.ts
- [X] T057 Implement camera controls lock during drag operations in src/scene/static/tools/MultiSelectTool.ts
- [X] T058 Run quickstart.md validation scenarios
- [X] T059 Run npm test && npm run lint to verify no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1; US2 depends on US1 for selection
  - US3-US5 depend on US1 for selection capability
  - US4 (Copy/Paste) and US5 (Cut/Paste) should be done sequentially (US5 uses US4)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 for selection state to exist
- **User Story 3 (P2)**: Depends on US1 for selection to delete
- **User Story 4 (P2)**: Depends on US1 for selection to copy
- **User Story 5 (P3)**: Depends on US4 for copy functionality (cut = copy + delete)

### Within Each User Story

- State/interface definitions before event handlers
- Core logic before event emissions
- All tasks within a story are sequential (same file)

### Parallel Opportunities

- T002 and T003 (skeleton + geometry utils) can run in parallel
- T054, T055, T056 (lifecycle methods) can run in parallel
- SelectionManager methods (T004-T008) are sequential (same file, interdependent)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch setup tasks in parallel:
Task: "Create MultiSelectTool skeleton class in src/scene/static/tools/MultiSelectTool.ts"
Task: "Add geometry utilities in src/scene/shared/GeometryUtils.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (SelectionManager extensions)
3. Complete Phase 3: User Story 1 (Rectangle Selection)
4. Complete Phase 4: User Story 2 (Bulk Move)
5. **STOP and VALIDATE**: Test selection and move independently
6. Both P1 stories deliver core value

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Selection works!
3. Add User Story 2 → Test independently → Move works!
4. Add User Story 3 → Test independently → Delete works!
5. Add User Story 4 → Test independently → Copy/Paste works!
6. Add User Story 5 → Test independently → Cut/Paste works!
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All user story tasks are in the same file (MultiSelectTool.ts), so they must be sequential within each story
- CSS overlay approach chosen per research.md for selection rectangle (simplest, most performant)
- Delete order (wires → components → branching points) per research.md to avoid dangling references
- Clipboard uses relative positions for paste at cursor location
- Wire ID remapping required during paste to connect to newly created elements
