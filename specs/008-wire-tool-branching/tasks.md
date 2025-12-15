# Tasks: Wire Tool & Branching Point Visual

**Input**: Design documents from `/specs/008-wire-tool-branching/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify existing infrastructure and project structure

- [X] T001 Verify existing tool infrastructure by reviewing src/scene/static/tools/PositionTool.ts
- [X] T002 [P] Verify existing ENode model has sourceType support in src/core/ENode.ts
- [X] T003 [P] Verify existing Wire model has intermediatePositions support in src/core/Wire.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Circuit Class Extensions

- [X] T004 Implement `addBranchingPoint(position, sourceType?)` method in src/core/Circuit.ts
- [X] T005 Implement `splitWire(wireId, position)` method in src/core/Circuit.ts
- [X] T006 Implement `updateWireIntermediatePositions(wireId, positions)` method in src/core/Circuit.ts
- [X] T007 Implement `updateENodeSourceType(enodeId, sourceType)` method in src/core/Circuit.ts

### CircuitEditionManager Extensions

- [X] T008 Implement `saveBranchingPointAction(position, sourceType?)` in src/scene/static/CircuitEditionManager.ts
- [X] T009 Implement `saveSplitWire(wireId, position)` in src/scene/static/CircuitEditionManager.ts
- [X] T010 Implement `saveWireIntermediatePositions(wireId, positions)` in src/scene/static/CircuitEditionManager.ts
- [X] T011 Implement `saveENodeSourceTypeAction(enodeId, sourceType)` in src/scene/static/CircuitEditionManager.ts

### WireVisualManager Extensions

- [X] T012 Implement `createPreviewWire(startPosition)` method in src/scene/shared/WireVisualManager.ts
- [X] T013 Implement `updatePreviewWire(endPosition)` method in src/scene/shared/WireVisualManager.ts
- [X] T014 Implement `removePreviewWire()` method in src/scene/shared/WireVisualManager.ts
- [X] T015 Implement `refreshWireGeometry(wireId)` method in src/scene/shared/WireVisualManager.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 2 - Visual Display of Branching Points (Priority: P1)

**Goal**: Render branching points as cone shapes with sourceType-based colors and hover/selection feedback

**Independent Test**: Create a circuit with a branching point and verify it renders as a cone shape at the correct position with appropriate colors

### Implementation for User Story 2

- [X] T016 [US2] Create BranchingPointVisualFactory class skeleton in src/scene/shared/components/BranchingPointVisualFactory.ts
- [X] T017 [US2] Implement `createVisual(enode)` method with cone geometry and hitbox in src/scene/shared/components/BranchingPointVisualFactory.ts
- [X] T018 [US2] Implement sourceType-based color mapping (white/red/blue) in src/scene/shared/components/BranchingPointVisualFactory.ts
- [X] T019 [US2] Implement `applyHover(object3D)` and `removeHover(object3D)` methods with brightness shift in src/scene/shared/components/BranchingPointVisualFactory.ts
- [X] T020 [US2] Implement `applySelection(object3D)` and `removeSelection(object3D)` methods with brightness shift in src/scene/shared/components/BranchingPointVisualFactory.ts
- [X] T021 [US2] Implement `updateSourceType(object3D, sourceType)` method in src/scene/shared/components/BranchingPointVisualFactory.ts
- [X] T022 [US2] Register BranchingPointVisualFactory in src/scene/static/CircuitSceneManager.ts
- [X] T023 [US2] Implement branching point rendering in scene initialization in src/scene/static/CircuitSceneManager.ts
- [X] T024 [US2] Wire hover/selection events for branching points in src/scene/static/CircuitSceneManager.ts

**Checkpoint**: Branching points render as cones with correct colors and feedback

---

## Phase 4: User Story 1 - Create Wire Between Two Pins (Priority: P1)

**Goal**: Allow users to create wires between component pins using click-to-click interaction with preview

**Independent Test**: Place two components, activate wire tool, click source pin, click target pin, verify wire exists in circuit model and renders visually

### Implementation for User Story 1

- [X] T025 [US1] Define WireToolMode type ('idle' | 'wire_creating' | 'dragging') in src/scene/static/tools/WireTool.ts
- [X] T026 [US1] Define WireCreatingState and DraggingState interfaces in src/scene/static/tools/WireTool.ts
- [X] T027 [US1] Implement `onActivate()` with event listener setup in src/scene/static/tools/WireTool.ts
- [X] T028 [US1] Implement `onDeactivate()` with event listener cleanup in src/scene/static/tools/WireTool.ts
- [X] T029 [US1] Implement `handlePointerDown(event)` for single-click on enode to start wire creation in src/scene/static/tools/WireTool.ts
- [X] T030 [US1] Implement `startWireCreation(sourceEnodeId)` to enter wire_creating state in src/scene/static/tools/WireTool.ts
- [X] T031 [US1] Implement `handleGridPositionMove(position)` to update preview wire during creation in src/scene/static/tools/WireTool.ts
- [X] T032 [US1] Implement `completeWireCreation(targetEnodeId)` to create wire between two enodes in src/scene/static/tools/WireTool.ts
- [X] T033 [US1] Implement `handleKeyDown(event)` for Escape cancellation during wire creation in src/scene/static/tools/WireTool.ts
- [X] T034 [US1] Implement `cancelWireCreation()` to reset state and remove preview in src/scene/static/tools/WireTool.ts
- [X] T035 [US1] Implement `getCursorType()` returning crosshair/pointer/not-allowed based on context in src/scene/static/tools/WireTool.ts
- [X] T036 [US1] Add wire duplicate prevention check (FR-011) in src/scene/static/tools/WireTool.ts
- [X] T037 [US1] Add self-connection prevention check (FR-010) in src/scene/static/tools/WireTool.ts
- [X] T038 [US1] Implement wire visual creation via CircuitEditionManager in src/scene/static/tools/WireTool.ts

**Checkpoint**: Users can create wires between pins with preview and cancellation support

---

## Phase 5: User Story 4 - Connect Wire to Existing Branching Point (Priority: P2)

**Goal**: Allow users to connect wires from pins to branching points and between branching points

**Independent Test**: Create a branching point, then use wire tool to connect a component pin to the branching point

### Implementation for User Story 4

- [ ] T039 [US4] Extend wire creation to accept branching point enodes as endpoints in src/scene/static/tools/WireTool.ts
- [ ] T040 [US4] Add branching point hover highlight during wire creation in src/scene/static/tools/WireTool.ts
- [ ] T041 [US4] Verify cursor changes to pointer when hovering branching point during wire creation in src/scene/static/tools/WireTool.ts

**Checkpoint**: Wires can be created to/from branching points

---

## Phase 6: User Story 3 - Create Branching Point on Existing Wire (Priority: P2)

**Goal**: Allow users to insert branching points on existing wires via double-click, splitting the wire

**Independent Test**: Create a wire between two pins, double-click on the wire, verify branching point is created and wire is split into two

### Implementation for User Story 3

- [ ] T042 [US3] Implement double-click vs single-click disambiguation (200ms timeout) in src/scene/static/tools/WireTool.ts
- [ ] T043 [US3] Implement `handleDblClick(event)` for double-click detection in src/scene/static/tools/WireTool.ts
- [ ] T044 [US3] Implement `createBranchingPointOnWire(wireId, position)` to split wire in src/scene/static/tools/WireTool.ts
- [ ] T045 [US3] Call CircuitEditionManager.saveSplitWire for wire split in src/scene/static/tools/WireTool.ts
- [ ] T046 [US3] Update scene to remove old wire visual and add new wire visuals in src/scene/static/tools/WireTool.ts
- [ ] T047 [US3] Add branching point visual to scene after creation in src/scene/static/tools/WireTool.ts

**Checkpoint**: Double-click on wire creates branching point and splits wire

---

## Phase 7: User Story 6 - Create Standalone Branching Point (Priority: P3)

**Goal**: Allow users to create branching points at empty grid positions via double-click

**Independent Test**: Activate wire tool, double-click on empty grid space, verify branching point is created at grid-snapped position

### Implementation for User Story 6

- [ ] T048 [US6] Implement `createStandaloneBranchingPoint(position)` in src/scene/static/tools/WireTool.ts
- [ ] T049 [US6] Add double-click on empty space detection to handleDblClick in src/scene/static/tools/WireTool.ts
- [ ] T050 [US6] Implement grid snapping for standalone branching point position in src/scene/static/tools/WireTool.ts
- [ ] T051 [US6] Add visual creation for standalone branching point in src/scene/static/tools/WireTool.ts

**Checkpoint**: Double-click on empty space creates standalone branching point

---

## Phase 8: User Story 5 - Toggle Branching Point Source Type (Priority: P2)

**Goal**: Allow users to cycle branching point sourceType via double-click (null → voltage → current → null)

**Independent Test**: Create a branching point, double-click to cycle through states, verify ENode.sourceType and cone color update correctly

### Implementation for User Story 5

- [ ] T052 [US5] Implement `cycleBranchingPointSourceType(enodeId)` in src/scene/static/tools/WireTool.ts
- [ ] T053 [US5] Add branching point detection to handleDblClick (prioritize over wire/empty) in src/scene/static/tools/WireTool.ts
- [ ] T054 [US5] Call CircuitEditionManager.saveENodeSourceTypeAction for sourceType update in src/scene/static/tools/WireTool.ts
- [ ] T055 [US5] Update branching point visual color after sourceType change in src/scene/static/tools/WireTool.ts

**Checkpoint**: Double-click on branching point cycles sourceType with visual feedback

---

## Phase 9: User Story 3b - Drag Intermediate Points on Wire (Priority: P2)

**Goal**: Allow users to drag intermediate points on wires for custom routing

**Independent Test**: Create a wire, single-click on it to start drag, move cursor, release, verify wire geometry updated

### Implementation for User Story 3b

- [ ] T056 [US3b] Implement screen-space proximity detection (10px threshold) utility in src/scene/static/tools/WireTool.ts
- [ ] T057 [US3b] Implement `findNearestIntermediatePoint(wireId, screenPos)` in src/scene/static/tools/WireTool.ts
- [ ] T058 [US3b] Implement `getInsertIndexForPosition(wireId, position)` for new point insertion in src/scene/static/tools/WireTool.ts
- [ ] T059 [US3b] Implement `startDrag(wireId, target, position)` to enter dragging state in src/scene/static/tools/WireTool.ts
- [ ] T060 [US3b] Add single-click on wire detection to handlePointerDown in src/scene/static/tools/WireTool.ts
- [ ] T061 [US3b] Implement drag target resolution: branching point > existing intermediate > new intermediate in src/scene/static/tools/WireTool.ts
- [ ] T062 [US3b] Implement `updateDrag(position)` to move drag target with grid snapping in src/scene/static/tools/WireTool.ts
- [ ] T063 [US3b] Implement real-time wire geometry update during drag in src/scene/static/tools/WireTool.ts
- [ ] T064 [US3b] Implement `commitDrag()` to persist intermediate positions to model in src/scene/static/tools/WireTool.ts
- [ ] T065 [US3b] Implement `cancelDrag()` to revert to original positions on Escape in src/scene/static/tools/WireTool.ts
- [ ] T066 [US3b] Add handlePointerUp for drag commit in src/scene/static/tools/WireTool.ts
- [ ] T067 [US3b] Implement intermediate point merge/delete when dropped on endpoint or other intermediate in src/scene/static/tools/WireTool.ts
- [ ] T068 [US3b] Implement branching point drag (moves connected wires) in src/scene/static/tools/WireTool.ts

**Checkpoint**: Single-click drag on wire manipulates intermediate points with grid snapping

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final integration and cleanup

- [ ] T069 Add JSDoc documentation to BranchingPointVisualFactory in src/scene/shared/components/BranchingPointVisualFactory.ts
- [ ] T070 Add JSDoc documentation to new WireTool methods in src/scene/static/tools/WireTool.ts
- [ ] T071 Add JSDoc documentation to Circuit extensions in src/core/Circuit.ts
- [ ] T072 [P] Add JSDoc documentation to WireVisualManager extensions in src/scene/shared/WireVisualManager.ts
- [ ] T073 [P] Add JSDoc documentation to CircuitEditionManager extensions in src/scene/static/CircuitEditionManager.ts
- [ ] T074 Verify all event emissions (wireCreated, branchingPointCreated, etc.) in src/scene/static/tools/WireTool.ts
- [ ] T075 Run `npm test && npm run lint` to verify all tests pass and no lint errors
- [ ] T076 Manual integration test: Create circuit with wires, branching points, intermediate points

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 2 (Phase 3)**: Depends on Foundational - provides visuals for all other stories
- **User Story 1 (Phase 4)**: Depends on Foundational + US2 visuals
- **User Story 4 (Phase 5)**: Depends on US1 + US2 (wire creation + branching visuals)
- **User Story 3 (Phase 6)**: Depends on US1 + US2 (wire creation + branching visuals)
- **User Story 6 (Phase 7)**: Depends on US2 (branching visuals only)
- **User Story 5 (Phase 8)**: Depends on US2 (branching visuals)
- **User Story 3b (Phase 9)**: Depends on US1 (wire creation)
- **Polish (Phase 10)**: Depends on all user stories

### User Story Dependencies

```
US2 (Branching Visuals) ─────┬────────────────────────────────┐
                             │                                │
                             ▼                                ▼
               US1 (Wire Creation) ──────────────────► US3b (Drag Intermediate)
                             │
                             ├────────► US4 (Wire to Branching)
                             │
                             └────────► US3 (Branching on Wire)
                                              │
                                              ▼
                                        US6 (Standalone Branching)

US5 (SourceType Cycling) depends only on US2 (Branching Visuals)
```

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T004, T005, T006, T007 can run in parallel (different methods in Circuit.ts)
- T008-T011 can run in parallel after Circuit methods done
- T012-T015 can run in parallel (WireVisualManager methods)

**Across User Stories (after dependencies met)**:
- US5 and US6 can run in parallel (both only depend on US2)
- US3 and US4 can run in parallel (both depend on US1 + US2)
- US3b can run in parallel with US3-US6 (only depends on US1)

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch Circuit.ts extensions in parallel:
Task: "Implement addBranchingPoint method in src/core/Circuit.ts"
Task: "Implement splitWire method in src/core/Circuit.ts"
Task: "Implement updateWireIntermediatePositions method in src/core/Circuit.ts"
Task: "Implement updateENodeSourceType method in src/core/Circuit.ts"

# Then launch WireVisualManager extensions in parallel:
Task: "Implement createPreviewWire method in src/scene/shared/WireVisualManager.ts"
Task: "Implement updatePreviewWire method in src/scene/shared/WireVisualManager.ts"
Task: "Implement removePreviewWire method in src/scene/shared/WireVisualManager.ts"
Task: "Implement refreshWireGeometry method in src/scene/shared/WireVisualManager.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 2 (Branching Visuals)
4. Complete Phase 4: User Story 1 (Wire Creation)
5. **STOP and VALIDATE**: Test wire creation between pins
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US2 (Branching Visuals) → Branching points render
3. Add US1 (Wire Creation) → **MVP Complete!** Users can create wires
4. Add US4 (Wire to Branching) → Wires connect to branching points
5. Add US3 (Branching on Wire) → Users can split wires
6. Add US5 (SourceType Cycling) → Simulation configuration
7. Add US6 (Standalone Branching) → Advanced workflow
8. Add US3b (Drag Intermediate) → Wire routing flexibility
9. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Double-click vs single-click: Use 200ms timeout for disambiguation
- Grid snapping: Always snap positions before storing in model
- Screen-space proximity: 10px threshold for intermediate point detection
