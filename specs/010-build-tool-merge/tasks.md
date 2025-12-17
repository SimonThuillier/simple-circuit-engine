# Tasks: Build Tool Merge

**Input**: Design documents from `/specs/010-build-tool-merge/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are NOT included. Tests will be updated as part of implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Project structure: `src/scene/static/tools/`, `tests/scene/tools/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create BuildTool skeleton and state machine foundation

- [ ] T001 Create BuildTool.ts skeleton with IEditingTool interface in src/scene/static/tools/BuildTool.ts
- [ ] T002 Define BuildToolMode type and state interfaces (WireCreatingState, ElementDragState, WirePointDragState, BPDragState) in src/scene/static/tools/BuildTool.ts
- [ ] T003 Implement constructor with CircuitSceneManager parameter and bind all event handler methods in src/scene/static/tools/BuildTool.ts
- [ ] T004 Implement onActivate() method with event listener attachment and state reset in src/scene/static/tools/BuildTool.ts
- [ ] T005 Implement onDeactivate() method with cleanup, listener removal, and operation cancellation in src/scene/static/tools/BuildTool.ts
- [ ] T006 Implement getCursorType() method with mode-aware cursor logic in src/scene/static/tools/BuildTool.ts
- [ ] T007 Implement getPreviewObjects() method returning preview wire array in src/scene/static/tools/BuildTool.ts

**Checkpoint**: BuildTool skeleton complete with IEditingTool contract satisfied

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helper methods and utility functions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Implement isValidWireTarget() helper method for wire creation validation in src/scene/static/tools/BuildTool.ts
- [ ] T009 Implement disambiguateClick() helper method for target priority routing in src/scene/static/tools/BuildTool.ts
- [ ] T010 Implement checkMergeDelete() helper method for wire point simplification in src/scene/static/tools/BuildTool.ts
- [ ] T011 Implement event handler stubs (handlePointerDown, handlePointerUp, handleGridPositionMove, handleKeyDown, handleDblClick) in src/scene/static/tools/BuildTool.ts
- [ ] T012 Add JSDoc comments for all public methods and state interfaces in src/scene/static/tools/BuildTool.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Connect Wires with BuildTool (Priority: P1) 🎯 MVP

**Goal**: Users can create wires from component pins/branching points to component pins/branching points/wires using the BuildTool

**Independent Test**: Select BuildTool, click on a pin/enode, drag to another pin/enode, release to create a wire. Delivers core circuit connectivity functionality.

### Implementation for User Story 1

- [ ] T013 [US1] Copy WireCreatingState interface from WireTool and adapt to BuildTool in src/scene/static/tools/BuildTool.ts
- [ ] T014 [US1] Implement startWireCreation() method with source enode validation and preview wire creation in src/scene/static/tools/BuildTool.ts
- [ ] T015 [US1] Implement updateWireCreation() helper for preview wire endpoint updates in src/scene/static/tools/BuildTool.ts
- [ ] T016 [US1] Implement completeWireCreation() method with target validation, wire creation, and preview cleanup in src/scene/static/tools/BuildTool.ts
- [ ] T017 [US1] Implement cancelWireCreation() method with preview disposal and state reset in src/scene/static/tools/BuildTool.ts
- [ ] T018 [US1] Add wire creation logic to handlePointerDown() for enode target priority in src/scene/static/tools/BuildTool.ts
- [ ] T019 [US1] Add wire completion logic to handlePointerUp() with target type routing (pin/empty/wire) in src/scene/static/tools/BuildTool.ts
- [ ] T020 [US1] Add preview update logic to handleGridPositionMove() for wire_creating mode in src/scene/static/tools/BuildTool.ts
- [ ] T021 [US1] Add Escape key handling for wire creation cancellation in handleKeyDown() in src/scene/static/tools/BuildTool.ts
- [ ] T022 [US1] Add event emission for wire creation operations (toolOperationStarted, toolOperationCompleted, toolValidationError) in src/scene/static/tools/BuildTool.ts
- [ ] T023 [US1] Migrate WireTool.test.ts to BuildTool.test.ts with wire creation test cases in tests/scene/tools/BuildTool.test.ts

**Checkpoint**: Wire creation fully functional - can create wires from pins to pins, pins to empty space (creates BP), and pins to wires (creates BP and splits wire)

---

## Phase 4: User Story 2 - Move and Position Elements with BuildTool (Priority: P1)

**Goal**: Users can drag components, branching points, and wire intermediate points to reposition them using the BuildTool

**Independent Test**: Select a component and drag it to a new position. Delivers essential circuit layout functionality.

### Implementation for User Story 2

- [ ] T024 [US2] Copy ElementDragState interface (formerly DragState) from PositionTool and adapt to BuildTool in src/scene/static/tools/BuildTool.ts
- [ ] T025 [US2] Implement startElementDrag() method with selection validation and position snapshot in src/scene/static/tools/BuildTool.ts
- [ ] T026 [US2] Implement updateElementDrag() method with delta calculation and real-time position updates in src/scene/static/tools/BuildTool.ts
- [ ] T027 [US2] Implement commitElementDrag() method with final position persistence and wire updates in src/scene/static/tools/BuildTool.ts
- [ ] T028 [US2] Implement cancelElementDrag() method with position restoration from snapshot in src/scene/static/tools/BuildTool.ts
- [ ] T029 [US2] Copy WirePointDragState interface from WireTool/PositionTool and adapt to BuildTool in src/scene/static/tools/BuildTool.ts
- [ ] T030 [US2] Implement startWirePointDrag() method with wire validation and point index calculation in src/scene/static/tools/BuildTool.ts
- [ ] T031 [US2] Implement updateWirePointDrag() method with intermediate position updates in src/scene/static/tools/BuildTool.ts
- [ ] T032 [US2] Implement commitWirePointDrag() method with merge/delete check via checkMergeDelete() in src/scene/static/tools/BuildTool.ts
- [ ] T033 [US2] Implement cancelWirePointDrag() method with position restoration in src/scene/static/tools/BuildTool.ts
- [ ] T034 [US2] Copy BPDragState interface from PositionTool and adapt to BuildTool in src/scene/static/tools/BuildTool.ts
- [ ] T035 [US2] Implement startBPDrag() method with branching point validation and position snapshot in src/scene/static/tools/BuildTool.ts
- [ ] T036 [US2] Implement updateBPDrag() method with BP position updates and connected wire geometry refresh in src/scene/static/tools/BuildTool.ts
- [ ] T037 [US2] Implement commitBPDrag() method with simplify logic for connected wires in src/scene/static/tools/BuildTool.ts
- [ ] T038 [US2] Implement cancelBPDrag() method with position restoration in src/scene/static/tools/BuildTool.ts
- [ ] T039 [US2] Add element drag logic to handlePointerDown() for selected element target priority in src/scene/static/tools/BuildTool.ts
- [ ] T040 [US2] Add wire point drag logic to handlePointerDown() for wire target priority in src/scene/static/tools/BuildTool.ts
- [ ] T041 [US2] Add drag completion logic to handlePointerUp() with mode routing (element_dragging, wire_point_dragging, bp_dragging) in src/scene/static/tools/BuildTool.ts
- [ ] T042 [US2] Add position update logic to handleGridPositionMove() for all dragging modes in src/scene/static/tools/BuildTool.ts
- [ ] T043 [US2] Add Escape key handling for drag cancellation in handleKeyDown() in src/scene/static/tools/BuildTool.ts
- [ ] T044 [US2] Add event emission for drag operations (dragStart, dragMove, dragEnd, dragCancel) in src/scene/static/tools/BuildTool.ts
- [ ] T045 [US2] Add camera controls locking/unlocking during drag operations in src/scene/static/tools/BuildTool.ts
- [ ] T046 [US2] Migrate PositionTool.test.ts drag tests to BuildTool.test.ts in tests/scene/tools/BuildTool.test.ts

**Checkpoint**: Element dragging fully functional - can drag components, branching points, and wire intermediate points with real-time visual updates

---

## Phase 5: User Story 3 - Rotate Components with BuildTool (Priority: P2)

**Goal**: Users can rotate selected components using keyboard shortcuts or double-click

**Independent Test**: Select a component and press 'R' or double-click to rotate it 90 degrees.

### Implementation for User Story 3

- [ ] T047 [US3] Implement rotateSelectedComponent() method with 90-degree rotation logic in src/scene/static/tools/BuildTool.ts
- [ ] T048 [US3] Implement selectAndRotateComponent() method for unselected component double-click case in src/scene/static/tools/BuildTool.ts
- [ ] T049 [US3] Add 'R' key handling for component rotation in handleKeyDown() in src/scene/static/tools/BuildTool.ts
- [ ] T050 [US3] Add component double-click rotation logic to handleDblClick() with target priority (component > wire > empty) in src/scene/static/tools/BuildTool.ts
- [ ] T051 [US3] Add event emission for component rotation (componentRotated) in src/scene/static/tools/BuildTool.ts
- [ ] T052 [US3] Migrate PositionTool.test.ts rotation tests to BuildTool.test.ts in tests/scene/tools/BuildTool.test.ts

**Checkpoint**: Component rotation fully functional - can rotate via 'R' key or double-click, including unselected components

---

## Phase 6: User Story 4 - Delete Elements with BuildTool (Priority: P2)

**Goal**: Users can delete wires, branching points, and components using keyboard shortcuts

**Independent Test**: Select a wire, branching point, or component and press Delete/Backspace key.

### Implementation for User Story 4

- [ ] T053 [US4] Implement deleteSelectedElement() method with type routing (component/wire/enode) in src/scene/static/tools/BuildTool.ts
- [ ] T054 [US4] Add component deletion logic with cascade to connected wires in deleteSelectedElement() in src/scene/static/tools/BuildTool.ts
- [ ] T055 [US4] Add wire deletion logic in deleteSelectedElement() in src/scene/static/tools/BuildTool.ts
- [ ] T056 [US4] Add branching point deletion logic with wire merge validation in deleteSelectedElement() in src/scene/static/tools/BuildTool.ts
- [ ] T057 [US4] Add Delete/Backspace key handling in handleKeyDown() in src/scene/static/tools/BuildTool.ts
- [ ] T058 [US4] Add event emission for deletion operations (toolOperationCompleted with removedComponents/removedWires/removedENodes) in src/scene/static/tools/BuildTool.ts
- [ ] T059 [US4] Migrate DeleteTool.test.ts to BuildTool.test.ts with deletion test cases in tests/scene/tools/BuildTool.test.ts

**Checkpoint**: Element deletion fully functional - can delete components, wires, and branching points with appropriate cascade behavior

---

## Phase 7: User Story 5 - Create Branching Points with BuildTool (Priority: P2)

**Goal**: Users can create branching points on wires or in empty space using double-click

**Independent Test**: Double-click on a wire to create a branching point that splits the wire.

### Implementation for User Story 5

- [ ] T060 [US5] Implement createBranchingPointOnWire() method with wire split logic in src/scene/static/tools/BuildTool.ts
- [ ] T061 [US5] Implement createStandaloneBranchingPoint() method with grid position snapping in src/scene/static/tools/BuildTool.ts
- [ ] T062 [US5] Add wire double-click logic to handleDblClick() for branching point creation in src/scene/static/tools/BuildTool.ts
- [ ] T063 [US5] Add empty space double-click logic to handleDblClick() for standalone branching point creation in src/scene/static/tools/BuildTool.ts
- [ ] T064 [US5] Add event emission for branching point creation (toolOperationCompleted with addedENodes) in src/scene/static/tools/BuildTool.ts
- [ ] T065 [US5] Migrate BranchingPointTool.test.ts to BuildTool.test.ts with branching point test cases in tests/scene/tools/BuildTool.test.ts

**Checkpoint**: Branching point creation fully functional - can create branching points on wires (splits wire) and in empty space

---

## Phase 8: User Story 6 - Remove Redundant Tools (Priority: P3)

**Goal**: Codebase is cleaned up by removing PositionTool, WireTool, DeleteTool, and BranchingPointTool

**Independent Test**: Verify removed tool files no longer exist and ToolType union is updated to exclude removed types.

### Implementation for User Story 6

- [ ] T066 [US6] Update ToolType union in src/scene/shared/types.ts to only include 'build' and 'addComponent'
- [ ] T067 [US6] Register BuildTool in CircuitSceneManager tool factory in src/scene/static/CircuitSceneManager.ts
- [ ] T068 [US6] Update CircuitSceneManager.setActiveTool() method to handle 'build' tool type in src/scene/static/CircuitSceneManager.ts
- [ ] T069 [US6] Remove PositionTool import and registration from CircuitSceneManager in src/scene/static/CircuitSceneManager.ts
- [ ] T070 [US6] Remove WireTool import and registration from CircuitSceneManager in src/scene/static/CircuitSceneManager.ts
- [ ] T071 [US6] Remove DeleteTool import and registration from CircuitSceneManager in src/scene/static/CircuitSceneManager.ts
- [ ] T072 [US6] Remove BranchingPointTool import and registration from CircuitSceneManager in src/scene/static/CircuitSceneManager.ts
- [ ] T073 [US6] Delete src/scene/static/tools/PositionTool.ts file
- [ ] T074 [US6] Delete src/scene/static/tools/WireTool.ts file
- [ ] T075 [US6] Delete src/scene/static/tools/DeleteTool.ts file
- [ ] T076 [US6] Delete src/scene/static/tools/BranchingPointTool.ts file
- [ ] T077 [US6] Delete tests/scene/tools/PositionTool.test.ts file (tests migrated to BuildTool.test.ts)
- [ ] T078 [US6] Delete tests/scene/tools/WireTool.test.ts file (tests migrated to BuildTool.test.ts)
- [ ] T079 [US6] Delete tests/scene/tools/DeleteTool.test.ts file (tests migrated to BuildTool.test.ts)
- [ ] T080 [US6] Delete tests/scene/tools/BranchingPointTool.test.ts file (tests migrated to BuildTool.test.ts)
- [ ] T081 [US6] Search and update any remaining references to old tool types in application code (grep for 'position', 'wire', 'delete', 'branchingPoint' tool strings)
- [ ] T082 [US6] Run npm test to verify all tests pass with BuildTool
- [ ] T083 [US6] Run npm run lint to verify no linting errors

**Checkpoint**: Cleanup complete - only BuildTool and AddComponentTool remain, all tests pass

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T084 [P] Update CLAUDE.md with BuildTool architecture and state machine documentation
- [ ] T085 [P] Code review for TypeScript strict mode compliance and error handling
- [ ] T086 Performance profiling for 60fps target during drag operations
- [ ] T087 Manual validation of all quickstart.md test scenarios
- [ ] T088 [P] Review JSDoc completeness for all public methods and state interfaces
- [ ] T089 Verify IEditingTool contract validation checklist (contracts/IEditingTool.md)
- [ ] T090 Review event emission consistency across all operations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after Phase 2
  - Or sequentially in priority order (P1 → P1 → P2 → P2 → P2 → P3)
  - **RECOMMENDED**: US1 and US2 together form MVP (wire creation + movement)
- **Polish (Phase 9)**: Depends on US1-US5 being complete (US6 can run in parallel with Polish)

### User Story Dependencies

- **User Story 1 (P1)**: Wire creation - Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Element positioning - Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Component rotation - Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Element deletion - Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 5 (P2)**: Branching point creation - Can start after Foundational (Phase 2) - Partially overlaps with US1 wire creation logic
- **User Story 6 (P3)**: Tool cleanup - MUST wait for US1-US5 to be complete and tested

### Within Each User Story

- Models/state interfaces before operation methods
- Operation methods before event handlers
- Event handlers before integration
- Event emission as final step
- Test migration after implementation complete

### Parallel Opportunities

- **Setup (Phase 1)**: T002 and T003 can run in parallel with T001
- **Foundational (Phase 2)**: T008, T009, T010 can run in parallel after T011 completes
- **User Story 1**: T013 (state interface) can run in parallel with T014-T017 (implementation methods)
- **User Story 2**: T024, T029, T034 (state interfaces) can run in parallel
- **User Story 6**: T073-T080 (file deletions) can run in parallel, T066-T072 (updates) can run in parallel
- **Polish (Phase 9)**: T084, T085, T088 can run in parallel
- **Multiple user stories**: US1 and US2 can be implemented in parallel by different developers after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch state interface and helper methods together:
Task: "Copy WireCreatingState interface from WireTool and adapt to BuildTool"
Task: "Implement startWireCreation() method"
Task: "Implement updateWireCreation() helper"

# After state setup, launch completion and cancellation logic:
Task: "Implement completeWireCreation() method"
Task: "Implement cancelWireCreation() method"
```

---

## Parallel Example: User Story 6 Cleanup

```bash
# Launch all tool deletions together:
Task: "Delete src/scene/static/tools/PositionTool.ts file"
Task: "Delete src/scene/static/tools/WireTool.ts file"
Task: "Delete src/scene/static/tools/DeleteTool.ts file"
Task: "Delete src/scene/static/tools/BranchingPointTool.ts file"

# Launch all test deletions together:
Task: "Delete tests/scene/tools/PositionTool.test.ts file"
Task: "Delete tests/scene/tools/WireTool.test.ts file"
Task: "Delete tests/scene/tools/DeleteTool.test.ts file"
Task: "Delete tests/scene/tools/BranchingPointTool.test.ts file"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T012) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 - Wire Creation (T013-T023)
4. Complete Phase 4: User Story 2 - Element Positioning (T024-T046)
5. **STOP and VALIDATE**: Test wire creation and element positioning together
6. This delivers the core BuildTool functionality for circuit building

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (wire creation) → Test independently
3. Add User Story 2 (positioning) → Test independently → **MVP COMPLETE**
4. Add User Story 3 (rotation) → Test independently
5. Add User Story 4 (deletion) → Test independently
6. Add User Story 5 (branching points) → Test independently
7. Complete User Story 6 (cleanup) → Remove old tools
8. Polish phase → Documentation and optimization

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T012)
2. Once Foundational is done:
   - Developer A: User Story 1 (Wire Creation - T013-T023)
   - Developer B: User Story 2 (Element Positioning - T024-T046)
   - Developer C: User Story 3 (Rotation - T047-T052)
3. After US1 and US2 complete:
   - Developer A: User Story 4 (Deletion - T053-T059)
   - Developer B: User Story 5 (Branching Points - T060-T065)
4. After US1-US5 complete:
   - Any developer: User Story 6 (Cleanup - T066-T083)
5. Final: Polish phase (T084-T090)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are being updated/migrated as part of implementation tasks (not written first)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- BuildTool follows existing tool patterns (WireTool state machine, PositionTool drag logic)
- All state interfaces must be strongly typed (no `any`)
- All event handlers must check event.button === 0 (left click only)
- Camera controls must be locked during active operations
- Preview objects must be disposed on mode transitions
