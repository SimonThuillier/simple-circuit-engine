# Tasks: Add Component Tool

**Input**: Design documents from `/specs/009-add-component-tool/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure is ready for AddComponentTool implementation

- [x] T001 Verify IEditingTool interface in src/scene/shared/types.ts has required methods
- [x] T002 Verify CircuitController has getFactoryRegistry(), getCircuit(), getControls() methods
- [x] T003 Verify SelectionManager exists and has required selection methods

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add saveAddComponent() method to CircuitWriter in src/scene/static/CircuitWriter.ts
- [x] T005 Add saveDeleteComponent() method to CircuitWriter in src/scene/static/CircuitWriter.ts
- [x] T006 Add addComponent() wrapper method to CircuitController in src/scene/static/CircuitController.ts
- [x] T007 Add removeComponent() wrapper method to CircuitController in src/scene/static/CircuitController.ts
- [x] T008 Add getFactoryRegistry() public method to CircuitController in src/scene/static/CircuitController.ts (if not already public)

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 1 - Select Component Type and Place on Canvas (Priority: P1) 🎯 MVP

**Goal**: Enable basic component placement workflow with component type selection and click-to-place

**Independent Test**: Activate tool, call setComponentType(ComponentType.Battery), hover over canvas to see ghost preview, click to place component. Verify component appears in circuit at clicked position.

### Implementation for User Story 1

- [x] T009 [US1] Implement AddComponentTool class skeleton with IEditingTool interface in src/scene/static/tools/AddComponentTool.ts
- [x] T010 [US1] Implement onActivate() lifecycle method - attach event listeners (pointerdown, hover) in src/scene/static/tools/AddComponentTool.ts
- [x] T011 [US1] Implement onDeactivate() lifecycle method - remove event listeners and cleanup in src/scene/static/tools/AddComponentTool.ts
- [x] T012 [US1] Implement setComponentType() method to set selected component type in src/scene/static/tools/AddComponentTool.ts
- [x] T013 [US1] Implement createGhostPreview() method - use FactoryRegistry.get() and createVisual() in src/scene/static/tools/AddComponentTool.ts
- [x] T014 [US1] Implement applyGhostEffect() method - traverse Object3D and set material.opacity = 0.5 and material.transparent = true in src/scene/static/tools/AddComponentTool.ts
- [x] T015 [US1] Implement getPreviewObjects() to return [ghostPreview] when preview exists in src/scene/static/tools/AddComponentTool.ts
- [x] T016 [US1] Implement handleGridPositionMove() method - update previewPosition with grid snapping in src/scene/static/tools/AddComponentTool.ts
- [x] T017 [US1] Implement handleClick() method - call addComponent() on CircuitController when clicking empty space in src/scene/static/tools/AddComponentTool.ts
- [x] T018 [US1] Implement getCursorType() - return 'crosshair' by default in src/scene/static/tools/AddComponentTool.ts
- [x] T019 [US1] Emit toolOperationCompleted event with component details after successful placement in src/scene/static/tools/AddComponentTool.ts
- [x] T020 [US1] Add JSDoc documentation for all public methods in src/scene/static/tools/AddComponentTool.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - basic component placement works

---

## Phase 4: User Story 2 - Visual Feedback for Invalid Placement (Priority: P2)

**Goal**: Prevent overlapping components with clear visual feedback (red tint + not-allowed cursor)

**Independent Test**: Place a component, then try to place another component at the same position. Verify ghost preview shows red tint and cursor changes to 'not-allowed', and click does not place component.

### Implementation for User Story 2

- [x] T021 [US2] Implement checkOverlap() method using THREE.Box3.setFromObject() and intersectsBox() in src/scene/static/tools/AddComponentTool.ts
- [x] T022 [US2] Implement applyInvalidEffect() method - set emissive to red (0xff0000) with intensity 0.5 in src/scene/static/tools/AddComponentTool.ts
- [x] T023 [US2] Implement removeInvalidEffect() method - restore normal emissive values in src/scene/static/tools/AddComponentTool.ts
- [x] T024 [US2] Update handleGridPositionMove() to call checkOverlap() and apply invalid effect when overlap detected in src/scene/static/tools/AddComponentTool.ts
- [x] T025 [US2] Update getCursorType() to return 'not-allowed' when hasOverlap is true in src/scene/static/tools/AddComponentTool.ts
- [x] T026 [US2] Update handleClick() to check hasOverlap and emit toolValidationError if overlap detected in src/scene/static/tools/AddComponentTool.ts
- [x] T027 [US2] Emit toolValidationError event with message "Cannot place component: position occupied" when overlap prevents placement in src/scene/static/tools/AddComponentTool.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - placement works with overlap prevention

---

## Phase 5: User Story 3 - Rotate Component Preview Before Placement (Priority: P3)

**Goal**: Enable rotation of ghost preview via scroll wheel before placement

**Independent Test**: Select component type, hover to see preview, scroll mouse wheel up/down, verify preview rotates 90° increments, click to place, verify placed component matches preview rotation.

### Implementation for User Story 3

- [x] T028 [US3] Implement handleScroll() method - increment/decrement previewRotation by 90° based on scroll direction in src/scene/static/tools/AddComponentTool.ts
- [x] T029 [US3] Implement rotation wrapping logic - normalize rotation to 0-360 range (0° → 90° → 180° → 270° → 0°) in src/scene/static/tools/AddComponentTool.ts
- [x] T030 [US3] Update createGhostPreview() to apply initial rotation to ghost preview object in src/scene/static/tools/AddComponentTool.ts
- [x] T031 [US3] Update handleGridPositionMove() to apply current previewRotation to ghost preview position in src/scene/static/tools/AddComponentTool.ts
- [x] T032 [US3] Attach 'wheel' event listener in onActivate() to call handleScroll() in src/scene/static/tools/AddComponentTool.ts
- [x] T033 [US3] Remove 'wheel' event listener in onDeactivate() in src/scene/static/tools/AddComponentTool.ts
- [x] T034 [US3] Update handleClick() to pass previewRotation to addComponent() method in src/scene/static/tools/AddComponentTool.ts

**Checkpoint**: All primary placement features should now work - placement, overlap detection, rotation

---

## Phase 6: User Story 4 - Delete Selected Component (Priority: P4)

**Goal**: Enable quick component deletion via Delete key while tool is active

**Independent Test**: Place a component, click on it to select, press Delete key, verify component is removed from circuit and selection is cleared.

### Implementation for User Story 4

- [x] T035 [US4] Implement handleKeyDown() method to handle Delete and Backspace keys in src/scene/static/tools/AddComponentTool.ts
- [x] T036 [US4] Get current selection from SelectionManager in handleKeyDown() in src/scene/static/tools/AddComponentTool.ts
- [x] T037 [US4] Call removeComponent() on CircuitController when selection is component and Delete pressed in src/scene/static/tools/AddComponentTool.ts
- [x] T038 [US4] Clear selection via SelectionManager.clearSelection() after deletion in src/scene/static/tools/AddComponentTool.ts
- [x] T039 [US4] Emit toolOperationCompleted event with action:'delete' and componentId after deletion in src/scene/static/tools/AddComponentTool.ts
- [x] T040 [US4] Attach 'keydown' event listener in onActivate() to call handleKeyDown() in src/scene/static/tools/AddComponentTool.ts
- [x] T041 [US4] Remove 'keydown' event listener in onDeactivate() in src/scene/static/tools/AddComponentTool.ts
- [x] T042 [US4] Update handleClick() to handle clicking on existing components - call SelectionManager.selectOne() instead of placing in src/scene/static/tools/AddComponentTool.ts
- [x] T043 [US4] Update getCursorType() to return 'pointer' when hovering existing component in src/scene/static/tools/AddComponentTool.ts

**Checkpoint**: All user stories should now be independently functional - complete Add Component Tool workflow ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T044 [P] Add edge case handling - emit toolValidationError when no component type selected and user tries to place in src/scene/static/tools/AddComponentTool.ts
- [x] T045 [P] Ensure ghost preview is removed when tool is deactivated in onDeactivate() in src/scene/static/tools/AddComponentTool.ts
- [x] T046 [P] Clone materials in applyGhostEffect() to avoid affecting placed components in src/scene/static/tools/AddComponentTool.ts
- [x] T047 [P] Add component deletion support to CircuitWriter.saveDeleteComponent() - remove from circuit and emit events in src/scene/static/CircuitWriter.ts
- [x] T048 [P] Add component deletion support to CircuitController.removeComponent() - remove visual and call edition controllerType in src/scene/static/CircuitController.ts
- [x] T049 [P] Update AddComponentTool registration in CircuitController._initializeTools() if needed in src/scene/static/CircuitController.ts
- [x] T050 Update quickstart.md with usage examples and keyboard shortcuts in specs/009-add-component-tool/quickstart.md
- [x] T051 Code review - verify strict typing, no 'any' types, all methods documented
- [x] T052 Verify constitution compliance - framework agnosticism, event-based communication
- [x] T053 Manual testing - test all user stories end-to-end with different component types

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - Can proceed sequentially in priority order (P1 → P2 → P3 → P4)
  - P1 must be complete before P2 for overlap detection to work
  - P2 can be tested independently after P1 is complete
  - P3 builds on P1, can be done in parallel with P2 if staffed
  - P4 can be done anytime after P1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - MUST COMPLETE FIRST (MVP)
- **User Story 2 (P2)**: Depends on User Story 1 completion (needs checkOverlap to test against placed components)
- **User Story 3 (P3)**: Depends on User Story 1 completion (needs basic placement workflow) - Can run parallel with US2
- **User Story 4 (P4)**: Depends on User Story 1 completion (needs components to delete) - Can run parallel with US2/US3

### Within Each User Story

- US1: T009 → T010-T012 [P] → T013-T014 → T015-T020
- US2: T021-T023 [P] → T024-T027
- US3: T028-T029 [P] → T030-T034
- US4: T035-T039 [P] → T040-T043

### Parallel Opportunities

- Phase 1: All tasks T001-T003 can run in parallel [P]
- Phase 2: T004-T005 can run in parallel, T006-T008 can run in parallel
- Phase 7: All polish tasks marked [P] can run in parallel
- Within US1: T010-T012, T015-T018 can run in parallel
- Within US2: T021-T023 can run in parallel
- Within US3: T028-T029 can run in parallel
- Within US4: T035-T039 can run in parallel
- Once US1 is complete, US3 and US4 can start in parallel

---

## Parallel Example: User Story 1

```bash
# Launch setup tasks together:
Task: "Verify IEditingTool interface..."
Task: "Verify CircuitController has..."
Task: "Verify SelectionManager exists..."

# After US1 core is done, these can run together:
Task: "Add JSDoc documentation..."
Task: "Implement getCursorType()..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify infrastructure)
2. Complete Phase 2: Foundational (add CircuitWriter methods)
3. Complete Phase 3: User Story 1 (basic placement)
4. **STOP and VALIDATE**: Test basic placement independently
5. Demo/validate before proceeding to overlap detection

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! Basic placement works)
3. Add User Story 2 → Test independently → Deploy/Demo (Overlap prevention works)
4. Add User Story 3 → Test independently → Deploy/Demo (Rotation works)
5. Add User Story 4 → Test independently → Deploy/Demo (Delete works)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: Complete User Story 1 first
3. Once US1 is complete:
   - Developer A: User Story 2 (overlap detection)
   - Developer B: User Story 3 (rotation)
   - Developer C: User Story 4 (deletion)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files or independent code sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 53 tasks across 7 phases
- Estimated MVP scope: Phases 1-3 (20 tasks) for basic placement
- Material cloning (T046) is critical to avoid ghost effect affecting placed components
