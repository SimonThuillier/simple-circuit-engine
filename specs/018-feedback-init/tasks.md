# Tasks: Feedback Loop Initialization

**Input**: Design documents from `/specs/018-feedback-init/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Included as this is a TDD project (per constitution: "Will write tests before implementation")

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization - minimal for this feature as infrastructure already exists

- [X] T001 Create test directory structure at tests/core/simulation/feedback-init/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add `initializationPriority` config parameter to Transistor metadata in src/core/types/ComponentType.ts
- [X] T003 [P] Add `initializationPriority` config parameter to Relay metadata in src/core/types/ComponentType.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Automatic Feedback Loop Resolution (Priority: P1) 🎯 MVP

**Goal**: Enable feedback circuits (RS flip-flops, etc.) to automatically resolve to a valid stable state during initialization

**Independent Test**: Create an RS flip-flop circuit, run initialization, verify stable state where outputs are not simultaneously in invalid configuration

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] [US1] Unit test: CircuitRunner initializes RS flip-flop to valid stable state in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts
- [X] T005 [P] [US1] Unit test: Multiple independent feedback loops each resolve to valid stable states in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts
- [X] T006 [P] [US1] Unit test: Nested feedback loops reach globally consistent stable state in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts
- [X] T007 [P] [US1] Unit test: Circuits without feedback loops initialize identically to before (backward compatibility) in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts

### Implementation for User Story 1

- [X] T008 [US1] Create helper function `getInitializationPriority(config: Map<string, string>): number` in src/core/simulation/CircuitRunner.ts
- [X] T009 [US1] Modify `initializeState()` to sort components by initializationPriority (descending), then UUID (ascending) for determinism in src/core/simulation/CircuitRunner.ts
- [X] T010 [US1] Modify `initializeState()` to run `propagateConductivity()` after each priority group instead of once at the end in src/core/simulation/CircuitRunner.ts

**Checkpoint**: User Story 1 complete - RS flip-flops and feedback circuits initialize to valid stable states automatically

---

## Phase 4: User Story 2 - Initialization Priority Configuration (Priority: P2)

**Goal**: Allow users to configure `initializationPriority` on transistors/relays to deterministically control which stable state feedback circuits settle into

**Independent Test**: Set different initializationPriority values on RS flip-flop components, verify initial state matches expected outcome based on priorities

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US2] Unit test: Higher initializationPriority component processed first, determines initial state in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts
- [X] T012 [P] [US2] Unit test: Null/empty initializationPriority defaults to 0 in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts
- [X] T013 [P] [US2] Unit test: Equal priorities tie-broken by UUID alphabetical order ascending in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts
- [X] T014 [P] [US2] Unit test: Negative initializationPriority values work correctly (processed after 0) in tests/core/simulation/feedback-init/FeedbackInitialization.test.ts

### Implementation for User Story 2

- [X] T015 [US2] Verify TransistorBehavior.createInitialState() reads initializationPriority from config in src/core/simulation/behaviors/TransistorBehavior.ts
- [X] T016 [P] [US2] Verify RelayBehavior.createInitialState() reads initializationPriority from config in src/core/simulation/behaviors/RelayBehavior.ts

**Checkpoint**: User Story 2 complete - users can control feedback initialization via priority config

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-story verification

- [X] T017 Run quickstart.md validation scenarios manually
- [X] T018 Verify backward compatibility: existing circuit JSON files load without migration
- [X] T019 Run full test suite to ensure no regressions (`npm test`)
- [X] T020 Run linting (`npm run lint`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion (can run in parallel with US1)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1, uses same infrastructure

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation tasks execute sequentially (T008 → T009 → T010)
- Story complete when all tests pass

### Parallel Opportunities

- T002 and T003 (Foundational) can run in parallel - different component types
- All US1 tests (T004-T007) can run in parallel - same file but independent test cases
- All US2 tests (T011-T014) can run in parallel - same file but independent test cases
- T015 and T016 can run in parallel - different behavior files
- US1 and US2 can be worked on in parallel once Foundational phase is complete

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test: CircuitRunner initializes RS flip-flop to valid stable state"
Task: "Unit test: Multiple independent feedback loops each resolve to valid stable states"
Task: "Unit test: Nested feedback loops reach globally consistent stable state"
Task: "Unit test: Circuits without feedback loops initialize identically to before"
```

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test: Higher initializationPriority component processed first"
Task: "Unit test: Null/empty initializationPriority defaults to 0"
Task: "Unit test: Equal priorities tie-broken by UUID alphabetical order"
Task: "Unit test: Negative initializationPriority values work correctly"

# Launch behavior verification in parallel:
Task: "Verify TransistorBehavior.createInitialState() reads initializationPriority"
Task: "Verify RelayBehavior.createInitialState() reads initializationPriority"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T003)
3. Complete Phase 3: User Story 1 (T004-T010)
4. **STOP and VALIDATE**: Test RS flip-flop initialization independently
5. Deploy/demo if ready - basic feedback circuits now work!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP - circuits initialize correctly!)
3. Add User Story 2 → Test independently → Deploy (user control over initialization)
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (automatic resolution)
   - Developer B: User Story 2 (priority configuration)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Key files modified:
  - `src/core/types/ComponentType.ts` (Foundational)
  - `src/core/simulation/CircuitRunner.ts` (US1 core logic)
  - `src/core/simulation/behaviors/TransistorBehavior.ts` (US2 verification)
  - `src/core/simulation/behaviors/RelayBehavior.ts` (US2 verification)
  - `tests/core/simulation/feedback-init/FeedbackInitialization.test.ts` (all tests)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
