# Tasks: Ctrl+Click Source Type Cycling

**Input**: Design documents from `/specs/012-ctrl-click-source-cycle/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Test tasks included based on quickstart.md test scenarios and spec acceptance criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (this feature follows this structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup required - feature extends existing BuildTool infrastructure

_This phase is empty because the feature modifies existing files only, requiring no new project structure._

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: Both user stories depend on Circuit.ts change to support component pins

- [X] T001 Remove BranchingPoint-only constraint in Circuit.updateENodeSourceType() in src/core/Circuit.ts (lines 932-934)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Cycle Source Type on Branching Point (Priority: P1) 🎯 MVP

**Goal**: Enable users to cycle sourceType on branching points using Ctrl+click (null → Voltage → Current → null) with immediate visual feedback (white → red → blue → white cone color).

**Independent Test**: Create a branching point, Ctrl+click to cycle through states, verify ENode.source attribute and visual cone color update correctly through all states.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T002 [P] [US1] Add test: Ctrl+click cycles branching point null → Voltage in tests/scene/tools/BuildTool.test.ts
- [X] T003 [P] [US1] Add test: Ctrl+click cycles branching point Voltage → Current in tests/scene/tools/BuildTool.test.ts
- [X] T004 [P] [US1] Add test: Ctrl+click cycles branching point Current → null in tests/scene/tools/BuildTool.test.ts
- [X] T005 [P] [US1] Add test: Regular click (no Ctrl) preserves sourceType and initiates wire creation in tests/scene/tools/BuildTool.test.ts
- [X] T006 [P] [US1] Add test: Ctrl+click during active wire creation is ignored in tests/scene/tools/BuildTool.test.ts

### Implementation for User Story 1

- [X] T007 [US1] Add getNextSourceType() helper function in src/scene/static/tools/BuildTool.ts
- [X] T008 [US1] Add cycleEnodeSourceType() private method in src/scene/static/tools/BuildTool.ts
- [X] T009 [US1] Add updateEnodeVisual() private method in src/scene/static/tools/BuildTool.ts
- [X] T010 [US1] Add Ctrl+click check in handlePointerDown() before wire creation logic in src/scene/static/tools/BuildTool.ts
- [X] T011 [US1] Verify enodeSourceTypeChanged event is emitted correctly via CircuitWriter
- [X] T012 [US1] Run all User Story 1 tests to verify branching point cycling works end-to-end

**Checkpoint**: At this point, User Story 1 should be fully functional - Ctrl+click cycles branching point sourceType with visual feedback

---

## Phase 4: User Story 2 - Cycle Source Type on Component Pin (Priority: P2)

**Goal**: Extend sourceType cycling to component pins using Ctrl+click (null → Voltage → Current → null) with immediate visual color feedback (bronze → red → blue → bronze).

**Independent Test**: Create a component with pins, Ctrl+click on a pin to cycle through states, verify ENode.source attribute and pin color update correctly through all states.

**Dependencies**: Requires User Story 1 completion (BuildTool Ctrl+click handler must exist)

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US2] Add test: Ctrl+click cycles component pin null → Voltage in tests/scene/tools/BuildTool.test.ts
- [X] T014 [P] [US2] Add test: Ctrl+click cycles component pin Voltage → Current in tests/scene/tools/BuildTool.test.ts
- [X] T015 [P] [US2] Add test: Ctrl+click cycles component pin Current → null in tests/scene/tools/BuildTool.test.ts
- [X] T016 [P] [US2] Add test: Regular click on pin (no Ctrl) preserves sourceType and initiates wire creation in tests/scene/tools/BuildTool.test.ts

### Implementation for User Story 2

- [X] T017 [US2] Add updatePinSourceType() method to ComponentVisualFactory in src/scene/shared/components/ComponentVisualFactory.ts
- [X] T018 [US2] Update BuildTool.updateEnodeVisual() to handle component pins using ComponentVisualFactory in src/scene/static/tools/BuildTool.ts
- [X] T019 [US2] Add JSDoc documentation to updatePinSourceType() method
- [X] T020 [US2] Run all User Story 2 tests to verify component pin cycling works end-to-end

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - both branching points and component pins support Ctrl+click sourceType cycling

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect the entire feature

- [X] T021 [P] Add JSDoc documentation to getNextSourceType() in src/scene/static/tools/BuildTool.ts
- [X] T022 [P] Add JSDoc documentation to cycleEnodeSourceType() in src/scene/static/tools/BuildTool.ts
- [X] T023 [P] Add JSDoc documentation to updateEnodeVisual() in src/scene/static/tools/BuildTool.ts
- [X] T024 Run npm test to verify all tests pass
- [X] T025 Run npm run lint to verify code quality
- [X] T026 Manual verification: Ctrl+click on branching point cycles sourceType with visual feedback
- [X] T027 Manual verification: Ctrl+click on component pin cycles sourceType with visual feedback
- [X] T028 Manual verification: Regular click still initiates wire creation
- [X] T029 Manual verification: Ctrl+click during wire creation is ignored
- [X] T030 Manual verification: enodeSourceTypeChanged event emitted on each cycle

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty - no setup tasks needed
- **Foundational (Phase 2)**: No dependencies - can start immediately - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational (T001)
  - User Story 2 (P2): Depends on User Story 1 completion (requires BuildTool handler)
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (T001) - Fully independent
- **User Story 2 (P2)**: Depends on User Story 1 completion (T002-T012) - Extends existing Ctrl+click handler

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Helper functions before methods that use them (T007 before T008, T009, T010)
- BuildTool changes before manual verification
- All implementation before running test suite

### Parallel Opportunities

- **Foundational phase**: Only 1 task (T001) - no parallelization
- **User Story 1 tests**: T002, T003, T004, T005, T006 can all be written in parallel
- **User Story 2 tests**: T013, T014, T015, T016 can all be written in parallel
- **Polish phase**: T021, T022, T023 (JSDoc tasks) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add test: Ctrl+click cycles branching point null → Voltage in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Ctrl+click cycles branching point Voltage → Current in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Ctrl+click cycles branching point Current → null in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Regular click (no Ctrl) preserves sourceType in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Ctrl+click during active wire creation is ignored in tests/scene/tools/BuildTool.test.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Add test: Ctrl+click cycles component pin null → Voltage in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Ctrl+click cycles component pin Voltage → Current in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Ctrl+click cycles component pin Current → null in tests/scene/tools/BuildTool.test.ts"
Task: "Add test: Regular click on pin (no Ctrl) preserves sourceType in tests/scene/tools/BuildTool.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001)
2. Complete Phase 3: User Story 1 (T002-T012)
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Demo: Ctrl+click on branching points cycles sourceType

### Incremental Delivery

1. Complete Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo MVP (branching points only)
3. Add User Story 2 → Test independently → Demo complete feature (branching points + pins)
4. Add Polish → Final validation and documentation
5. Each story adds value without breaking previous stories

### Sequential Team Strategy

Single developer workflow (recommended for this small feature):

1. Complete Foundational (T001) - ~5 minutes
2. Complete User Story 1 (T002-T012) - ~2 hours
3. Validate User Story 1 works independently
4. Complete User Story 2 (T013-T020) - ~1 hour
5. Validate User Stories 1 and 2 work together
6. Complete Polish (T021-T030) - ~30 minutes

**Total estimated time**: ~4 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
- This is a small feature - User Story 2 depends on User Story 1 for the BuildTool handler
- All existing infrastructure (persistence, events, visual factories for BPs) already exists
