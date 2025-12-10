# Tasks: Position Tool & Wire Visual Improvements

**Input**: Design documents from `/specs/006-position-tool-wires/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Updated**: 2025-12-11

**Tests**: Test tasks are included as specified in plan.md (scene module requires 60% coverage minimum).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

**Architecture Note**: Selection behavior (click to select/deselect) is implemented in CircuitSceneManager, not in PositionTool. Tasks T027-T029 were originally assigned to PositionTool but are implemented in CircuitSceneManager.handlePointerDown().

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project setup needed - integrating into existing project structure

- [X] T001 Verify existing project structure matches plan.md in src/scene/shared/ and src/scene/static/tools/
- [X] T002 [P] Create test directory structure: tests/scene/shared/ and tests/scene/static/tools/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### 2.1 WireVisualManager Foundation

- [X] T003 [P] Create WireVisualManager class with wire mesh tracking (Map<UUID, THREE.Line>) in src/scene/shared/WireVisualManager.ts
- [X] T004 [P] Implement getENodeWorldPosition() to traverse component group and find pin by enodeId in src/scene/shared/WireVisualManager.ts
- [X] T005 Implement computeWirePath() to derive path from ENode positions + intermediatePositions in src/scene/shared/WireVisualManager.ts
- [X] T006 Implement createOrUpdateWire() to create/update Line with proper geometry in src/scene/shared/WireVisualManager.ts
- [X] T007 Implement updateWiresForComponent() to update all wires connected to a component in src/scene/shared/WireVisualManager.ts
- [X] T008 Implement removeWire() and dispose() methods in src/scene/shared/WireVisualManager.ts
- [X] T009 [P] Create WireVisualManager unit tests in tests/scene/shared/WireVisualManager.test.ts

### 2.2 SelectionManager Foundation

- [X] T010 [P] Create SelectionManager class with selection state tracking in src/scene/shared/SelectionManager.ts
- [X] T011 Implement position(), deselect(), isSelected(), getSelectedComponentId() methods in src/scene/shared/SelectionManager.ts
- [X] T012 Implement onSelectionChange() callback registration and dispose() in src/scene/shared/SelectionManager.ts
- [X] T013 [P] Create SelectionManager unit tests in tests/scene/shared/SelectionManager.test.ts

### 2.3 Component Visual Factory Selection Support

- [X] T014 Implement applySelection() with orange emissive (#ff8800) at 0.8 intensity in src/scene/shared/components/ComponentVisualFactory.ts
- [X] T015 Implement removeSelection() with proper state restoration in src/scene/shared/components/ComponentVisualFactory.ts
- [X] T016 Handle selection/hover interaction (selection takes precedence) in src/scene/shared/components/ComponentVisualFactory.ts

**Checkpoint**: Foundation ready - WireVisualManager, SelectionManager, and selection visuals are complete

---

## Phase 3: User Story 3 - Wire Endpoints Target Pins (Priority: P1) 🎯 MVP

**Goal**: Wire visuals connect to actual pin positions instead of component centers

**Independent Test**: Create a wire between two component pins and verify endpoints are at pin positions, not component centers

### Implementation for User Story 3

- [X] T017 [US3] Integrate WireVisualManager into CircuitSceneManager, replacing _createWireMesh() in src/scene/static/CircuitSceneManager.ts
- [X] T018 [US3] Update _updateCircuitVisualsIncremental() to use WireVisualManager for wire creation in src/scene/static/CircuitSceneManager.ts
- [X] T019 [US3] Update _updateCircuitVisualsFull() to use WireVisualManager for all wire rendering in src/scene/static/CircuitSceneManager.ts
- [X] T020 [US3] Ensure wire endpoints derive from pin world positions (via getENodeWorldPosition) in src/scene/static/CircuitSceneManager.ts

**Checkpoint**: Wire endpoints now target actual pin positions

---

## Phase 4: User Story 5 - Multi-Line Wire Rendering (Priority: P2)

**Goal**: Wires with intermediatePositions render as connected multi-segment lines

**Independent Test**: Create a wire with intermediate positions and verify it renders as connected segments through all waypoints

### Implementation for User Story 5

- [X] T021 [US5] Verify computeWirePath() includes intermediatePositions in path array in src/scene/shared/WireVisualManager.ts
- [X] T022 [US5] Test wire rendering with 1, 5, and 10 intermediate positions in tests/scene/shared/WireVisualManager.test.ts
- [X] T023 [US5] Ensure straight wires (no intermediatePositions) render correctly as single segment in src/scene/shared/WireVisualManager.ts

**Checkpoint**: Multi-segment wires render correctly through all waypoints

---

## Phase 5: User Story 1 - Select and Move Component (Priority: P1) 🎯 MVP

**Goal**: Users can position a component by clicking, then drag it to a new grid position with wires following

**Independent Test**: Place a component, position it, drag to new position, verify component and connected wires update correctly

### 5.1 Selection Integration

- [X] T024 [US1] Create SelectionManager instance in CircuitSceneManager constructor in src/scene/static/CircuitSceneManager.ts
- [X] T025 [US1] Wire up SelectionManager callbacks to apply/remove selection visuals in src/scene/static/CircuitSceneManager.ts : in CircuitSceneManager visual factories of components can be retrieved by const factory = this.factoryRegistry.get(componentGroup.userData.componentType);
- [X] T026 [US1] Add selectionChange event emission to CircuitSceneManager event map in src/scene/static/CircuitSceneManager.ts

### 5.2 Selection Click Handling (Implemented in CircuitSceneManager)

- [X] T027 [US1] Implement click to select hovered element via SelectionManager in src/scene/static/CircuitSceneManager.ts (handlePointerDown)
- [X] T028 [US1] Handle click on empty space to deselect in src/scene/static/CircuitSceneManager.ts (handlePointerDown)
- [X] T029 [US1] Handle click on different element to change selection in src/scene/static/CircuitSceneManager.ts (handlePointerDown)

### 5.3 PositionTool Drag Handling

- [X] T030 [US1] Implement DragState interface and internal state tracking in src/scene/static/tools/PositionTool.ts
- [X] T031 [US1] Implement handleMouseDown() to start drag on selected component in src/scene/static/tools/PositionTool.ts
- [X] T032 [US1] Implement handleMouseMove() with grid snapping (Math.round) during drag in src/scene/static/tools/PositionTool.ts
- [X] T033 [US1] Update component visual position during drag (before committing to model) in src/scene/static/tools/PositionTool.ts
- [X] T034 [US1] Implement handleMouseUp() to commit position to Circuit model in src/scene/static/tools/PositionTool.ts

### 5.4 User Story 4 - Wires Follow Pins During Movement (Priority: P1)

- [ ] T035 [US1] [US4] Call WireVisualManager.updateWiresForComponent() on each drag move in src/scene/static/tools/PositionTool.ts (TODO in code)
- [ ] T036 [US1] [US4] Ensure all wires connected to dragged component update in real-time in src/scene/static/tools/PositionTool.ts (TODO in code)

### 5.5 CircuitSceneManager Integration

- [X] T037 [US1] Add pointerdown handler to CircuitSceneManager for selection in src/scene/static/CircuitSceneManager.ts (handlePointerDown)
- [X] T038 [US1] PositionTool handles its own event listeners in onActivate()/onDeactivate() - no CSM routing needed
- [ ] T039 [US1] Add dragStart, dragMove, dragEnd event emissions in src/scene/static/CircuitSceneManager.ts (optional - not yet implemented)

### 5.6 Tests

- [ ] T040 [P] [US1] Create PositionTool unit tests for click selection in tests/scene/static/tools/PositionTool.test.ts
- [ ] T041 [P] [US1] Create PositionTool unit tests for drag operations in tests/scene/static/tools/PositionTool.test.ts

**Checkpoint**: Select and move functionality complete with wire following

---

## Phase 6: User Story 6 - Deselect Component (Priority: P2)

**Goal**: Users can deselect via clicking empty space; Escape cancels drag

**Independent Test**: Select a component, click empty space to deselect; start drag and press Escape to cancel

### Implementation for User Story 6

- [X] T042 [US6] Implement handleKeyDown() for Escape key to cancel drag in src/scene/static/tools/PositionTool.ts
- [X] T043 [US6] PositionTool adds keyboard event listener in onActivate() - no CSM routing needed
- [ ] T044 [US6] Add dragCancel event emission when Escape cancels drag in src/scene/static/CircuitSceneManager.ts (optional)

**Note**: Empty space click deselection is handled in CircuitSceneManager.handlePointerDown() (T028). Escape key in PositionTool cancels drag but preserves selection.

**Checkpoint**: Deselection via empty space click works; Escape cancels drag

---

## Phase 7: User Story 2 - Rotate Selected Component (Priority: P2)

**Goal**: Users can rotate selected component 90° clockwise via double-click or R key

**Independent Test**: Select a component, trigger rotation, verify component rotates and wires update

### Implementation for User Story 2

- [ ] T045 [US2] Implement handleDoubleClick() to rotate selected component 90° clockwise in src/scene/static/tools/PositionTool.ts
- [ ] T046 [US2] Implement handleKeyDown('r') to rotate selected component in src/scene/static/tools/PositionTool.ts
- [ ] T047 [US2] Update component rotation in Circuit model after rotation in src/scene/static/tools/PositionTool.ts
- [ ] T048 [US2] Update component visual rotation (Object3D.rotation.y) in src/scene/static/tools/PositionTool.ts
- [ ] T049 [US2] Call WireVisualManager.updateWiresForComponent() after rotation in src/scene/static/tools/PositionTool.ts
- [ ] T050 [US2] Add double-click event handler to CircuitSceneManager in src/scene/static/CircuitSceneManager.ts
- [ ] T051 [US2] Add componentRotated event emission in src/scene/static/CircuitSceneManager.ts
- [ ] T052 [P] [US2] Create rotation unit tests in tests/scene/static/tools/PositionTool.test.ts

**Checkpoint**: Rotation functionality complete with wire updates

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T053 [P] Add JSDoc documentation to WireVisualManager public methods in src/scene/shared/WireVisualManager.ts
- [ ] T054 [P] Add JSDoc documentation to SelectionManager public methods in src/scene/shared/SelectionManager.ts
- [ ] T055 [P] Add JSDoc documentation to PositionTool public methods in src/scene/static/tools/PositionTool.ts
- [ ] T056 Ensure all new code passes npm run lint in project root
- [ ] T057 Run npm test and verify 60% coverage for scene module
- [ ] T058 Verify quickstart.md testing checklist passes (manual validation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 3 (Phase 3)**: Depends on Foundational (WireVisualManager)
- **User Story 5 (Phase 4)**: Depends on Foundational (WireVisualManager)
- **User Story 1 (Phase 5)**: Depends on Foundational (SelectionManager + WireVisualManager)
- **User Story 6 (Phase 6)**: Depends on User Story 1 (PositionTool infrastructure)
- **User Story 2 (Phase 7)**: Depends on User Story 1 (PositionTool infrastructure)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 3 (P1)**: Wire pin targeting - Can start after Foundational
- **User Story 5 (P2)**: Multi-line wires - Can start after Foundational (parallel with US3)
- **User Story 1 (P1)**: Select/Move - Can start after Foundational
- **User Story 4 (P1)**: Wires follow pins - Integrated into US1 (T035-T036)
- **User Story 6 (P2)**: Deselect - Requires US1 PositionTool infrastructure
- **User Story 2 (P2)**: Rotate - Requires US1 PositionTool infrastructure

### Within Each User Story

- Foundation classes before integration
- Core implementation before events
- Tests can run in parallel with implementation (TDD optional)

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T003, T004, T009, T010, T013, T014 can all run in parallel (different files)

**Within Phase 5 (User Story 1)**:
- T040, T041 tests can run in parallel
- Selection integration (T024-T026) and click handling (T027-T029) are sequential

**Across User Stories (if team capacity allows)**:
- User Story 3 and User Story 5 can run in parallel after Foundational
- User Story 6 and User Story 2 can run in parallel after User Story 1

---

## Parallel Example: Foundational Phase

```bash
# Launch these tasks in parallel (different files):
Task: "Create WireVisualManager class in src/scene/shared/WireVisualManager.ts"
Task: "Create SelectionManager class in src/scene/shared/SelectionManager.ts"
Task: "Create WireVisualManager unit tests in tests/scene/shared/WireVisualManager.test.ts"
Task: "Create SelectionManager unit tests in tests/scene/shared/SelectionManager.test.ts"
Task: "Implement applySelection() in src/scene/shared/components/ComponentVisualFactory.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 3, 4)

1. Complete Phase 1: Setup (verify structure)
2. Complete Phase 2: Foundational (WireVisualManager + SelectionManager)
3. Complete Phase 3: User Story 3 (wire pin targeting)
4. Complete Phase 5: User Story 1 + 4 (position/move with wire following)
5. **STOP and VALIDATE**: Test position-move workflow with wire updates
6. Deploy/demo if ready - core editing capability is functional

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 3 → Wire endpoints at pins → Demo
3. Add User Story 1 + 4 → Select/Move with wires → Demo (MVP!)
4. Add User Story 5 → Multi-line wires → Demo
5. Add User Story 6 → Deselect → Demo
6. Add User Story 2 → Rotation → Demo (Full feature complete)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 4 (wires follow pins) is integrated into User Story 1 tasks
- All tasks include exact file paths for immediate execution
- Verify tests fail before implementing (if following TDD)
- Commit after each task or logical group
