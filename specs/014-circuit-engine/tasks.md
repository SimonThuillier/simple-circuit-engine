# Tasks: CircuitEngine Unified Facade

**Input**: Design documents from `/specs/014-circuit-engine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution requirement (60%+ coverage for scene module)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Type definitions and infrastructure changes required before facade implementation

- [X] T001 Add EngineMode type and CircuitEngineEventMap to src/scene/shared/types.ts
- [X] T002 Add SharedResources interface to src/scene/shared/types.ts
- [X] T003 Add ModeChangedEvent interface to src/scene/shared/types.ts
- [X] T004 Add CircuitEngineOptions interface to src/scene/shared/types.ts
- [X] T005 Add onAny() method to EventEmitter in src/scene/shared/EventEmitter.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refactoring existing controllers to support shared resources injection

**CRITICAL**: CircuitEngine cannot be implemented until these refactorings are complete

- [X] T006 Add optional sharedResources parameter to AbstractCircuitController constructor in src/scene/shared/AbstractCircuitController.ts
- [X] T007 Modify AbstractCircuitController.initialize() to use injected resources when provided in src/scene/shared/AbstractCircuitController.ts
- [X] T008 Add _useSharedResources flag to skip resource creation in AbstractCircuitController in src/scene/shared/AbstractCircuitController.ts
- [X] T009 Modify CircuitRunnerController to skip visual creation when visual maps are pre-populated in src/scene/simulation/CircuitRunnerController.ts
- [X] T010 Add test for AbstractCircuitController shared resource injection in tests/scene/shared/AbstractCircuitController.test.ts

**Checkpoint**: Foundation ready - CircuitEngine implementation can begin

---

## Phase 3: User Story 1 - Edit to Simulation Mode Switch (Priority: P1) 🎯 MVP

**Goal**: Enable seamless transition from edit mode to simulation mode, creating CircuitRunner from current circuit

**Independent Test**: Load circuit in edit mode, switch to simulation, verify simulation controls work and visuals are preserved

### Tests for User Story 1

- [X] T011 [P] [US1] Test setMode('simulation') transitions correctly in tests/scene/CircuitEngine.test.ts
- [X] T012 [P] [US1] Test active tool is cancelled when switching to simulation in tests/scene/CircuitEngine.test.ts
- [X] T013 [P] [US1] Test CircuitRunner is created from current circuit in tests/scene/CircuitEngine.test.ts
- [X] T014 [P] [US1] Test edit-only operations throw in simulation mode in tests/scene/CircuitEngine.test.ts

### Implementation for User Story 1

- [ ] T015 [US1] Create CircuitEngine class skeleton with constructor (factoryRegistry, behaviorRegistry) in src/scene/CircuitEngine.ts
- [ ] T016 [US1] Implement _mode property and mode getter in src/scene/CircuitEngine.ts
- [ ] T017 [US1] Implement _createSharedResources() helper to create all shared Three.js objects in src/scene/CircuitEngine.ts
- [ ] T018 [US1] Implement initialize() to create shared resources and both controllers in src/scene/CircuitEngine.ts
- [ ] T019 [US1] Implement setMode('simulation') transition logic in src/scene/CircuitEngine.ts
- [ ] T020 [US1] Implement simulation playback delegates (play, pause, step, stop) in src/scene/CircuitEngine.ts
- [ ] T021 [US1] Implement mode guard for edit-only operations (setActiveTool, setEditModeEnabled) in src/scene/CircuitEngine.ts

**Checkpoint**: Edit→Simulation mode switch works. Users can load circuit in edit mode and run simulation.

---

## Phase 4: User Story 2 - Simulation to Edit Mode Switch (Priority: P1)

**Goal**: Enable seamless transition from simulation mode back to edit mode, stopping simulation and restoring circuit design state

**Independent Test**: Run simulation, switch to edit mode, verify tools work and circuit is in design state (not runtime state)

### Tests for User Story 2

- [ ] T022 [P] [US2] Test setMode('edit') stops simulation automatically in tests/scene/CircuitEngine.test.ts
- [ ] T023 [P] [US2] Test circuit reverts to design state (not runtime state) in tests/scene/CircuitEngine.test.ts
- [ ] T024 [P] [US2] Test simulation-only operations throw in edit mode in tests/scene/CircuitEngine.test.ts
- [ ] T025 [P] [US2] Test same-mode switch is no-op in tests/scene/CircuitEngine.test.ts

### Implementation for User Story 2

- [ ] T026 [US2] Implement setMode('edit') transition logic in src/scene/CircuitEngine.ts
- [ ] T027 [US2] Implement _resetSimulationVisuals() to restore circuit design state colors in src/scene/CircuitEngine.ts
- [ ] T028 [US2] Implement mode guard for simulation-only operations (play, pause, step, stop) in src/scene/CircuitEngine.ts
- [ ] T029 [US2] Add early return for same-mode switch to setMode() in src/scene/CircuitEngine.ts

**Checkpoint**: Bidirectional mode switching works. Users can iterate between edit and simulation.

---

## Phase 5: User Story 3 - Unified Initialization (Priority: P2)

**Goal**: Single initialize() method sets up complete engine with both controllers, emits ready event

**Independent Test**: Initialize with container, verify scene/camera created, load circuit, verify circuitLoaded event

### Tests for User Story 3

- [ ] T030 [P] [US3] Test initialize() creates scene, camera, MapControls in tests/scene/CircuitEngine.test.ts
- [ ] T031 [P] [US3] Test initialize() emits ready event in tests/scene/CircuitEngine.test.ts
- [ ] T032 [P] [US3] Test setCircuit() loads circuit and emits circuitLoaded in tests/scene/CircuitEngine.test.ts
- [ ] T033 [P] [US3] Test setCircuit(null) clears circuit and emits circuitCleared in tests/scene/CircuitEngine.test.ts

### Implementation for User Story 3

- [ ] T034 [US3] Implement setCircuit() to load circuit via edit controller in src/scene/CircuitEngine.ts
- [ ] T035 [US3] Implement getCircuit() getter in src/scene/CircuitEngine.ts
- [ ] T036 [US3] Implement Three.js access methods (getScene, getCamera, getControls) in src/scene/CircuitEngine.ts
- [ ] T037 [US3] Implement onContainerResize() delegate in src/scene/CircuitEngine.ts
- [ ] T038 [US3] Implement getEditController() and getSimulationController() for advanced access in src/scene/CircuitEngine.ts

**Checkpoint**: Unified initialization works. Developers can integrate with 5 lines of code.

---

## Phase 6: User Story 4 - Unified Event System (Priority: P2)

**Goal**: Single event subscription works across both modes, forwarding all controller events through facade

**Independent Test**: Subscribe to hover event, verify it fires in both edit and simulation modes

### Tests for User Story 4

- [ ] T039 [P] [US4] Test on() subscribes to controller events in tests/scene/CircuitEngine.test.ts
- [ ] T040 [P] [US4] Test events from active controller are forwarded in tests/scene/CircuitEngine.test.ts
- [ ] T041 [P] [US4] Test modeChanged event is emitted on mode switch in tests/scene/CircuitEngine.test.ts
- [ ] T042 [P] [US4] Test off() unsubscribes from events in tests/scene/CircuitEngine.test.ts

### Implementation for User Story 4

- [ ] T043 [US4] Make CircuitEngine extend EventEmitter<CircuitEngineEventMap> in src/scene/CircuitEngine.ts
- [ ] T044 [US4] Implement _setupEventForwarding() using onAny() on both controllers in src/scene/CircuitEngine.ts
- [ ] T045 [US4] Emit modeChanged event in setMode() after transition completes in src/scene/CircuitEngine.ts
- [ ] T046 [US4] Implement _teardownEventForwarding() for dispose cleanup in src/scene/CircuitEngine.ts

**Checkpoint**: Event system works. Developers can subscribe once and receive events from both modes.

---

## Phase 7: User Story 5 - Resource Cleanup and Disposal (Priority: P3)

**Goal**: dispose() cleans up all WebGL resources, event listeners, and internal state without memory leaks

**Independent Test**: Initialize, switch modes multiple times, dispose, verify no lingering handlers or WebGL resources

### Tests for User Story 5

- [ ] T047 [P] [US5] Test dispose() stops simulation if running in tests/scene/CircuitEngine.test.ts
- [ ] T048 [P] [US5] Test dispose() clears all event subscriptions in tests/scene/CircuitEngine.test.ts
- [ ] T049 [P] [US5] Test dispose() releases Three.js resources in tests/scene/CircuitEngine.test.ts
- [ ] T050 [P] [US5] Test operations throw after dispose in tests/scene/CircuitEngine.test.ts

### Implementation for User Story 5

- [ ] T051 [US5] Implement dispose() to stop simulation and clear runner in src/scene/CircuitEngine.ts
- [ ] T052 [US5] Implement dispose() to deactivate tools and clear selection in src/scene/CircuitEngine.ts
- [ ] T053 [US5] Implement dispose() to tear down event forwarding in src/scene/CircuitEngine.ts
- [ ] T054 [US5] Implement dispose() to dispose both controllers in src/scene/CircuitEngine.ts
- [ ] T055 [US5] Implement isInitialized and isDisposed getters with state guards in src/scene/CircuitEngine.ts

**Checkpoint**: Full lifecycle works. Engine can be safely mounted/unmounted without leaks.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Exports, documentation, and final integration

- [ ] T056 [P] Create re-export at src/CircuitEngine.ts for convenient top-level import
- [ ] T057 [P] Add CircuitEngine export to src/index.ts
- [ ] T058 [P] Add JSDoc documentation to all public methods in src/scene/CircuitEngine.ts
- [ ] T059 Validate quickstart.md examples work correctly
- [ ] T060 Run npm test && npm run lint to verify all tests pass and no lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on User Story 1 (shares setMode implementation)
- **User Story 3 (Phase 5)**: Depends on Foundational (can parallel with US1/US2)
- **User Story 4 (Phase 6)**: Depends on Foundational (can parallel with US1/US2/US3)
- **User Story 5 (Phase 7)**: Depends on all prior user stories (needs full engine)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

```
        ┌─────────────────────────────────────────────┐
        │           Setup (Phase 1)                   │
        └─────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │      Foundational (Phase 2) - BLOCKING      │
        └─────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │  US1    │      │  US3    │      │  US4    │
   │(P1 MVP) │      │  (P2)   │      │  (P2)   │
   └────┬────┘      └─────────┘      └─────────┘
        │
        ▼
   ┌─────────┐
   │  US2    │
   │  (P1)   │
   └────┬────┘
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
   ┌─────────┐                              ┌─────────┐
   │  US5    │◄─────────────────────────────│ Polish  │
   │  (P3)   │                              │(Phase 8)│
   └─────────┘                              └─────────┘
```

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T001, T002, T003, T004 can run in parallel (different type definitions)
- T005 depends on none

**Within Foundational (Phase 2)**:
- T006, T007, T008 are sequential (same file modifications)
- T009 can parallel with T006-T008 (different file)
- T010 depends on T006-T008

**Within Each User Story**:
- All tests marked [P] can run in parallel
- Implementation tasks are generally sequential within a story

**Across User Stories**:
- US3 and US4 can run in parallel with US1/US2 (different concerns)
- US5 requires all others complete

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests in parallel:
Task: "Test setMode('simulation') transitions correctly"
Task: "Test active tool is cancelled when switching to simulation"
Task: "Test CircuitRunner is created from current circuit"
Task: "Test edit-only operations throw in simulation mode"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (type definitions)
2. Complete Phase 2: Foundational (controller refactoring)
3. Complete Phase 3: User Story 1 (edit → simulation)
4. Complete Phase 4: User Story 2 (simulation → edit)
5. **STOP and VALIDATE**: Test bidirectional mode switching
6. Deploy/demo if ready - this is the core value!

### Incremental Delivery

1. Setup + Foundational → Refactoring complete
2. Add US1 + US2 → Mode switching works (MVP!)
3. Add US3 → Unified initialization works
4. Add US4 → Event system works
5. Add US5 → Full lifecycle works
6. Polish → Production ready

### Suggested Parallel Execution

With single developer:
1. Complete Phases 1-4 sequentially (core MVP)
2. Then Phase 5-6 can overlap partially
3. Phase 7-8 last

With two developers:
1. Both: Phase 1-2 together
2. Dev A: US1 + US2 (mode switching)
3. Dev B: US3 + US4 (initialization + events)
4. Both: US5 + Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 together form the MVP (bidirectional mode switching)
- US3 and US4 are P2 but can parallel with US1/US2
- Verify tests fail before implementing (TDD per constitution)
- Commit after each task or logical group
- Target: 60%+ test coverage for scene module per constitution
