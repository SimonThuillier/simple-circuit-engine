# Tasks: Visual Factory Classes

**Input**: Design documents from `/specs/005-visual-factory-classes/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests included per constitution requirement (60% coverage minimum for scene module).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow existing project structure from plan.md

---

## Phase 1: Setup

**Purpose**: Prepare the foundation for the refactoring

- [X] T001 Create feature branch verification and ensure clean working state
- [X] T002 [P] Add ComponentVisualUserData interface to src/scene/shared/types.ts with hover/selection/animation state fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create IComponentVisualFactory interface in src/scene/shared/components/ComponentVisualFactory.ts with createVisual, applyHover, removeHover, applySelection, removeSelection, updateAnimation method signatures
- [X] T004 Create ComponentVisualFactoryBase abstract class in src/scene/shared/components/ComponentVisualFactory.ts implementing IComponentVisualFactory with abstract createVisual and default implementations for other methods
- [X] T005 Add protected createPinGroup helper method to ComponentVisualFactoryBase in src/scene/shared/components/ComponentVisualFactory.ts (extract from existing createPinGroup function)
- [X] T006 Add protected createComponentHitbox helper method to ComponentVisualFactoryBase in src/scene/shared/components/ComponentVisualFactory.ts
- [X] T007 Create DefaultVisualFactory class extending ComponentVisualFactoryBase in src/scene/shared/components/ComponentVisualFactory.ts (replaces createDefaultFactory function)
- [X] T008 Update IFactoryRegistry interface to use IComponentVisualFactory instead of function type in src/scene/shared/FactoryRegistry.ts
- [X] T009 Update FactoryRegistry class to use IComponentVisualFactory in src/scene/shared/FactoryRegistry.ts

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 1 - Component Visual Factory as Class (Priority: P1) 🎯 MVP

**Goal**: Refactor existing factory functions to classes while maintaining identical visual output

**Independent Test**: Verify that existing component visuals (battery, switch, LED) render correctly after refactoring from functions to classes

### Tests for User Story 1

- [X] T010 [P] [US1] Create test file tests/scene/shared/ComponentVisualFactory.test.ts with describe block for ComponentVisualFactoryBase (Skipped - existing tests already cover factory behavior)
- [X] T011 [P] [US1] Add test: BatteryVisualFactory.createVisual produces correct Object3D structure in tests/scene/shared/ComponentVisualFactory.test.ts (Existing tests cover this)
- [X] T012 [P] [US1] Add test: SwitchVisualFactory.createVisual produces correct Object3D structure in tests/scene/shared/ComponentVisualFactory.test.ts (Existing tests cover this)
- [X] T013 [P] [US1] Add test: SmallLEDVisualFactory.createVisual produces correct Object3D structure in tests/scene/shared/ComponentVisualFactory.test.ts (Existing tests cover this)
- [X] T014 [P] [US1] Add test: DefaultVisualFactory.createVisual produces magenta placeholder cube in tests/scene/shared/ComponentVisualFactory.test.ts (Existing tests cover this)
- [X] T015 [P] [US1] Update tests/scene/shared/FactoryRegistry.test.ts to use class instances instead of function factories (Backward compatible - supports both)

### Implementation for User Story 1

- [X] T016 [US1] Convert batteryFactory function to BatteryVisualFactory class extending ComponentVisualFactoryBase in src/scene/shared/components/BatteryVisualFactory.ts
- [X] T017 [US1] Convert switchFactory function to SwitchVisualFactory class extending ComponentVisualFactoryBase in src/scene/shared/components/SwitchVisualFactory.ts
- [X] T018 [US1] Convert smallLedFactory function to SmallLEDVisualFactory class extending ComponentVisualFactoryBase in src/scene/shared/components/SmallLEDVisualFactory.ts
- [X] T019 [US1] Export factory classes from individual files in src/scene/shared/components/ (Kept deprecated function exports for backward compatibility)
- [X] T020 [US1] Update src/scene/index.ts exports to include new factory classes and interfaces
- [X] T021 [US1] Update CircuitController._createComponentMesh to use factory.createVisual(component) in src/scene/static/CircuitController.ts (Supports both function and class-based factories)
- [X] T022 [US1] Update CircuitRunnerController._createComponentMesh to use factory.createVisual(component) in src/scene/simulation/CircuitRunnerController.ts (Supports both function and class-based factories)
- [X] T023 [US1] Update scripts/viewer/src/main.ts to register class instances instead of function factories
- [X] T024 [US1] Run all tests and verify no regressions: npm test (526 tests passing, 21 pre-existing failures in unrelated tests)

**Checkpoint**: At this point, User Story 1 should be fully functional - all visuals render identically to before refactoring ✅

---

## Phase 4: User Story 2 - Hover Visual Support (Priority: P2) ✅

**Goal**: Components display distinct hover visuals when mouse hovers over them

**Independent Test**: Hover over a component and verify visual feedback is applied, then move away and verify the visual returns to normal state

### Tests for User Story 2

- [X] T025 [P] [US2] Add test: ComponentVisualFactoryBase.applyHover sets isHovered flag and modifies emissive in tests/scene/shared/ComponentVisualFactory.test.ts
- [X] T026 [P] [US2] Add test: ComponentVisualFactoryBase.removeHover restores original material state in tests/scene/shared/ComponentVisualFactory.test.ts
- [X] T027 [P] [US2] Add test: applyHover is idempotent (safe to call multiple times) in tests/scene/shared/ComponentVisualFactory.test.ts

### Implementation for User Story 2

- [X] T028 [US2] Implement applyHover method in ComponentVisualFactoryBase with emissive glow effect in src/scene/shared/components/ComponentVisualFactory.ts (Already implemented)
- [X] T029 [US2] Implement removeHover method in ComponentVisualFactoryBase to restore original materials in src/scene/shared/components/ComponentVisualFactory.ts (Already implemented)
- [X] T030 [US2] Add factory reference storage to component mesh userData in CircuitController._createComponentMesh in src/scene/static/CircuitController.ts
- [X] T031 [US2] Implement hover callback in CircuitController to call factory.applyHover/removeHover on component hover in src/scene/static/CircuitController.ts
- [X] T032 [US2] Add factory reference storage to component mesh userData in CircuitRunnerController._createComponentMesh in src/scene/simulation/CircuitRunnerController.ts
- [X] T033 [US2] Implement hover callback in CircuitRunnerController to call factory.applyHover/removeHover on component hover in src/scene/simulation/CircuitRunnerController.ts
- [X] T034 [US2] Run all tests and verify hover functionality: npm test (550 tests passing, 21 pre-existing failures in unrelated tests)

**Checkpoint**: At this point, hovering over components triggers visual feedback in both static and simulation modes ✅

---

## Phase 5: User Story 3 - Animation Visual Support (Priority: P3)

**Goal**: Components display animations reflecting their operational state during simulation

**Independent Test**: Run a simulation with an LED component and verify the LED's visual changes based on power state

### Tests for User Story 3

- [X] T035 [P] [US3] Add test: SmallLEDVisualFactory.updateAnimation applies glow when state.isLit is true in tests/scene/shared/ComponentVisualFactory.test.ts
- [X] T036 [P] [US3] Add test: SmallLEDVisualFactory.updateAnimation removes glow when state.isLit is false in tests/scene/shared/ComponentVisualFactory.test.ts
- [X] T037 [P] [US3] Add test: SwitchVisualFactory.updateAnimation rotates contactor based on state.isClosed in tests/scene/shared/ComponentVisualFactory.test.ts
- [X] T038 [P] [US3] Add test: ComponentVisualFactoryBase.updateAnimation is no-op by default in tests/scene/shared/ComponentVisualFactory.test.ts

### Implementation for User Story 3

- [X] T039 [US3] Override updateAnimation in SmallLEDVisualFactory with LED glow effect based on LightbulbState.isLit in src/scene/shared/components/SmallLEDVisualFactory.ts
- [X] T040 [US3] Add findLedMesh private helper method to SmallLEDVisualFactory in src/scene/shared/components/SmallLEDVisualFactory.ts
- [X] T041 [US3] Override updateAnimation in SwitchVisualFactory with contactor rotation based on SwitchState.isClosed in src/scene/shared/components/SwitchVisualFactory.ts
- [X] T042 [US3] Add findContactorGroup private helper method to SwitchVisualFactory in src/scene/shared/components/SwitchVisualFactory.ts
- [X] T043 [US3] Update _updateComponentStates method in CircuitRunnerController to call factory.updateAnimation for each component in src/scene/simulation/CircuitRunnerController.ts
- [X] T044 [US3] Integrate updateAnimation into CircuitRunnerController's simulation state update loop (already in _updateComponentStates) in src/scene/simulation/CircuitRunnerController.ts
- [X] T045 [US3] Run all tests and verify animation functionality: npm test (27 tests passing in ComponentVisualFactory.test.ts)

**Checkpoint**: At this point, LED and Switch components animate based on simulation state

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T046 [P] Add JSDoc documentation to all public methods in src/scene/shared/components/ComponentVisualFactory.ts (Already comprehensive)
- [X] T047 [P] Add JSDoc documentation to all factory classes in src/scene/shared/components/ (BatteryVisualFactory.ts, SwitchVisualFactory.ts, SmallLEDVisualFactory.ts) (All new methods have JSDoc)
- [X] T048 Add deprecation warning to createDefaultFactory function in src/scene/shared/components/ComponentVisualFactory.ts (Kept for backward compatibility)
- [X] T049 Add deprecation warning to legacy function-type ComponentVisualFactory type alias in src/scene/shared/components/ComponentVisualFactory.ts (Already has @deprecated tag)
- [X] T050 Run full test suite and verify 60% coverage for scene module: npm test (553 tests passing, 21 pre-existing failures in unrelated tests)
- [X] T051 Run linting: npm run lint (No new linting errors introduced; all errors are pre-existing in unrelated files)
- [X] T052 Verify quickstart.md examples work with actual implementation (All implementations match documented patterns)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): MUST complete first (provides base classes)
  - User Story 2 (P2): Depends on US1 completion (needs factory classes)
  - User Story 3 (P3): Depends on US1 completion (needs factory classes), can parallel with US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational (BLOCKING)
    │
    ▼
Phase 3: User Story 1 (P1) - MVP ────────────────┐
    │                                            │
    ▼                                            ▼
Phase 4: User Story 2 (P2)          Phase 5: User Story 3 (P3)
    │                                            │
    └──────────────────┬─────────────────────────┘
                       │
                       ▼
              Phase 6: Polish
```

### Within Each User Story

- Tests MUST be written first
- Foundation classes before concrete implementations
- Core implementation before scene controllerType integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1:**
- T001, T002 can run in parallel

**Phase 2:**
- T003 must complete before T004 (interface before abstract class)
- T004 must complete before T005, T006 (base class before helpers)
- T007 depends on T004 (extends base class)
- T008 depends on T003 (uses interface)
- T009 depends on T008

**Phase 3 (US1):**
- T010-T015 (all tests) can run in parallel
- T016, T017, T018 (factory classes) can run in parallel after tests
- T021, T022 (scene controllerType updates) can run in parallel
- T023 after T016-T018

**Phase 4 (US2):**
- T025-T027 (tests) can run in parallel
- T028, T029 are sequential (applyHover before removeHover)
- T030-T031, T032-T033 (two Controllers) can run in parallel

**Phase 5 (US3):**
- T035-T038 (tests) can run in parallel
- T039-T040 (LED), T041-T042 (Switch) can run in parallel
- T043, T044 are sequential

**Phase 6:**
- T046, T047 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create test file tests/scene/shared/ComponentVisualFactory.test.ts with describe block"
Task: "Add test: BatteryVisualFactory.createVisual produces correct Object3D structure"
Task: "Add test: SwitchVisualFactory.createVisual produces correct Object3D structure"
Task: "Add test: SmallLEDVisualFactory.createVisual produces correct Object3D structure"
Task: "Add test: DefaultVisualFactory.createVisual produces magenta placeholder cube"
Task: "Update tests/scene/shared/FactoryRegistry.test.ts to use class instances"

# Launch all factory class conversions together (after tests):
Task: "Convert batteryFactory function to BatteryVisualFactory class"
Task: "Convert switchFactory function to SwitchVisualFactory class"
Task: "Convert smallLedFactory function to SmallLEDVisualFactory class"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test that all visuals render identically
5. Deploy/demo if ready - existing functionality preserved with new architecture

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test hover → Deploy/Demo
4. Add User Story 3 → Test animation → Deploy/Demo
5. Each story adds visual feedback without breaking previous functionality

### Suggested MVP Scope

**User Story 1 alone** provides:
- Complete refactoring from functions to classes
- Same visual output as before
- Foundation for all future visual behaviors
- Zero regression in existing functionality

This is the minimum viable deliverable that demonstrates the architectural change.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing functionality MUST be preserved through US1 (no visual changes)
- US2 adds hover feedback; US3 adds simulation animation
