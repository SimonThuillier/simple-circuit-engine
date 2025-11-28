# Tasks: Core Object Model

**Input**: Design documents from `/specs/001-core-object-model/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included per specification requirements (80% coverage target for core module).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/core/`, `tests/core/` at repository root
- Paths follow constitution structure (core module within src/)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure per plan.md (src/core/, src/core/types/, tests/core/, tests/core/integration/)
- [X] T002 Initialize TypeScript project with package.json, tsconfig.json (strict mode, ES2022 target)
- [X] T003 [P] Configure Vitest testing framework in vitest.config.ts
- [X] T004 [P] Setup linting (ESLint) and formatting (Prettier) tools
- [X] T005 [P] Add npm scripts for test, type-check, build

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Create UUID type and generateUUID() function in src/core/types/Identifier.ts
- [X] T007 [P] Create Position class with integer validation in src/core/types/Position.ts
- [X] T008 [P] Create Rotation class with integer validation in src/core/types/Rotation.ts
- [X] T009 [P] Create ENodeType enum (Pin, BranchingPoint) in src/core/types/ENodeType.ts
- [X] T010 Create core module index exports in src/core/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Circuit with Components (Priority: P1) 🎯 MVP

**Goal**: Enable creating a circuit container and placing components with position/rotation, establishing the foundational topology management.

**Independent Test**: Create a Circuit instance, add components at various positions with rotations, verify they can be tracked and queried through the circuit's APIs. Components should maintain their position, rotation, and pin information.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Unit test for Position class validation in tests/core/Position.test.ts
- [X] T012 [P] [US1] Unit test for Rotation class validation in tests/core/Rotation.test.ts
- [X] T013 [P] [US1] Unit test for Component creation and properties in tests/core/Component.test.ts
- [X] T014 [P] [US1] Unit test for Circuit container operations in tests/core/Circuit.test.ts
- [X] T015 [P] [US1] Integration test for component lifecycle in tests/core/integration/lifecycle.test.ts

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement Component class in src/core/Component.ts (id, position, rotation, pins array)
- [X] T017 [US1] Implement Circuit class with component management in src/core/Circuit.ts (Maps, addComponent, removeComponent, getComponent, getAllComponents)
- [X] T018 [US1] Implement automatic pin ENode creation when component added (stub ENode references for now)
- [X] T019 [US1] Implement cascade deletion for components (remove pins and connected wires - will complete in US3)
- [X] T020 [US1] Add position/rotation validation in Circuit.addComponent()
- [X] T021 [US1] Add JSDoc documentation to all public Circuit and Component methods
- [X] T022 [US1] Verify all US1 tests pass and coverage meets 80% target

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. You can create circuits, add/remove components with positions and rotations, and query them.

---

## Phase 4: User Story 2 - Define Electrical Connection Points (Priority: P2)

**Goal**: Implement ENode entities for component pins and branching points, with automatic lifecycle management tied to components.

**Independent Test**: Create components with multiple pins, verify each pin has a unique ENode. Create branching point ENodes at positions. Query ENodes to determine type (pin vs branch) and position.

### Tests for User Story 2

- [X] T023 [P] [US2] Unit test for ENode class and types in tests/core/ENode.test.ts
- [X] T024 [P] [US2] Integration test for automatic pin ENode creation in tests/core/integration/lifecycle.test.ts (extend existing)
- [X] T025 [P] [US2] Integration test for ENode position handling in tests/core/integration/lifecycle.test.ts

### Implementation for User Story 2

- [X] T026 [P] [US2] Implement ENode class in src/core/ENode.ts (id, type, component, pinIndex, position, wires Set)
- [X] T027 [US2] Implement getPosition() method for ENode (derives from component for pins, direct for branches)
- [X] T028 [US2] Integrate ENode creation into Circuit.addComponent() (replace stubs from US1)
- [X] T029 [US2] Implement Circuit.getENode() and getAllENodes() methods
- [X] T030 [US2] Update Component class to link with pin ENodes bidirectionally
- [X] T031 [US2] Add branching point ENode creation capability (used by US3)
- [X] T032 [US2] Add validation for ENode position (integers for branching points)
- [X] T033 [US2] Add JSDoc documentation to all public ENode methods
- [X] T034 [US2] Verify all US2 tests pass and coverage meets target

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Components automatically create pin ENodes, and you can query all electrical connection points.

---

## Phase 5: User Story 3 - Connect Components with Wires (Priority: P3)

**Goal**: Implement Wire entities connecting ENodes, with automatic branching point creation, wire splitting, and orphaned ENode cleanup.

**Independent Test**: Create wires between existing ENodes. Verify bidirectional connections. Test wire splitting to create branches. Confirm orphaned branching points are automatically removed. Test wires with intermediate positions for rendering.

### Tests for User Story 3

- [X] T035 [P] [US3] Unit test for Wire class and creation in tests/core/Wire.test.ts
- [ ] T036 [P] [US3] Integration test for wire operations in tests/core/integration/lifecycle.test.ts (extend)
- [ ] T037 [P] [US3] Integration test for wire splitting scenarios in tests/core/integration/wire-splitting.test.ts
- [ ] T038 [P] [US3] Integration test for orphaned ENode cleanup in tests/core/integration/orphaned-cleanup.test.ts

### Implementation for User Story 3

- [X] T039 [P] [US3] Implement Wire class in src/core/Wire.ts (id, node1, node2, intermediatePositions)
- [X] T040 [US3] Implement Circuit.addWire() with validation (self-connection, duplicates, non-existent nodes)
- [X] T041 [US3] Implement bidirectional references (Wire → ENodes, ENodes → Wires)
- [X] T042 [US3] Implement Circuit.removeWire() with orphaned branching point cleanup
- [X] T043 [US3] Implement Circuit.splitWire() for creating branching points and splitting wires
- [X] T044 [US3] Implement Circuit.getWire(), getAllWires(), getWiresByNode(), getNodesByWire()
- [X] T045 [US3] Implement Circuit.hasWireBetween() for duplicate detection
- [X] T046 [US3] Implement Circuit.getConnectedComponents() for relationship traversal
- [X] T047 [US3] Complete cascade deletion in Circuit.removeComponent() (remove connected wires)
- [X] T048 [US3] Add intermediate positions support for ad-hoc wire paths
- [X] T049 [US3] Add validation for wire intermediate positions (integer coordinates)
- [X] T050 [US3] Add error handling and descriptive error messages for all wire operations
- [X] T051 [US3] Add JSDoc documentation to all public Wire and Circuit wire methods
- [X] T052 [US3] Verify all US3 tests pass and coverage meets 80% target

**Checkpoint**: All user stories should now be independently functional. Complete circuit topology can be created, modified, and queried. Automatic lifecycle management ensures topology consistency.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T053 [P] Implement Circuit.toJSON() serialization method in src/core/Circuit.ts
- [ ] T054 [P] Implement Circuit.fromJSON() deserialization method in src/core/Circuit.ts
- [ ] T055 [P] Add JSON serialization tests in tests/core/Circuit.test.ts
- [ ] T056 [P] Create comprehensive quickstart examples demonstrating all three user stories
- [ ] T057 [P] Verify quickstart.md examples actually run and produce expected output
- [ ] T058 Code cleanup: Remove any remaining TODOs, unused imports, dead code
- [ ] T059 Performance validation: Test circuit with 100+ components, 500+ connections meets <100ms query target
- [ ] T060 [P] Final coverage check: Verify 80% coverage across all core module code
- [ ] T061 [P] Type check: Ensure strict TypeScript with no `any` types
- [ ] T062 Update core module exports in src/core/index.ts to expose all public APIs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Extends US1 (Component → ENode integration)
  - User Story 3 (P3): Can start after Foundational - Requires US1 (Circuit) and US2 (ENode) for wire connections
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates Circuit and Component (MVP)
- **User Story 2 (P2)**: Requires US1 for Component integration - Adds ENode automatic creation
- **User Story 3 (P3)**: Requires US1 (Circuit container) and US2 (ENodes) - Adds Wire connectivity

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Type definitions (US2 ENode) before usage
- Core classes (Component, ENode, Wire) before Circuit integration
- Validation before advanced features
- Documentation after implementation
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase**:
- T003, T004, T005 can run in parallel

**Foundational Phase**:
- T006, T007, T008, T009 can all run in parallel (different files)

**User Story 1 Tests**:
- T011, T012, T013, T014, T015 can all run in parallel

**User Story 1 Implementation**:
- T016 (Component) and T017 (Circuit) can run in parallel

**User Story 2 Tests**:
- T023, T024, T025 can run in parallel

**User Story 2 Implementation**:
- T026 (ENode class) independent of Circuit updates

**User Story 3 Tests**:
- T035, T036, T037, T038 can run in parallel

**User Story 3 Implementation**:
- T039 (Wire class) can start early

**Polish Phase**:
- T053, T054, T056, T057, T058, T060, T061 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task 1: "Unit test for Position class validation in tests/core/Position.test.ts"
Task 2: "Unit test for Rotation class validation in tests/core/Rotation.test.ts"
Task 3: "Unit test for Component creation in tests/core/Component.test.ts"
Task 4: "Unit test for Circuit operations in tests/core/Circuit.test.ts"
Task 5: "Integration test for component lifecycle in tests/core/integration/lifecycle.test.ts"

# After tests, launch Component and Circuit implementation in parallel:
Task 1: "Implement Component class in src/core/Component.ts"
Task 2: "Implement Circuit class in src/core/Circuit.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch all tests for User Story 3 together:
Task 1: "Unit test for Wire class in tests/core/Wire.test.ts"
Task 2: "Integration test for wire operations in tests/core/integration/lifecycle.test.ts"
Task 3: "Integration test for wire splitting in tests/core/integration/wire-splitting.test.ts"
Task 4: "Integration test for orphaned cleanup in tests/core/integration/orphaned-cleanup.test.ts"

# Wire class can be implemented early:
Task: "Implement Wire class in src/core/Wire.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T010) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T011-T022)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. You now have a working circuit container with components!

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → Type system and project structure ready
2. **+ User Story 1** → Test independently → Circuit with positioned/rotated components (MVP!)
3. **+ User Story 2** → Test independently → Components with automatic pin ENodes
4. **+ User Story 3** → Test independently → Full circuit topology with wires and connectivity
5. **+ Polish** → Serialization, performance validation, final cleanup

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Together**: Complete Setup + Foundational (T001-T010)
2. **Once Foundational is done**:
   - Developer A: User Story 1 tests (T011-T015)
   - Developer B: User Story 1 implementation (T016-T017)
3. **Sequential by priority**:
   - Complete and validate US1 before starting US2
   - Complete and validate US2 before starting US3
   - This ensures each story builds correctly on previous foundations

---

## Task Count Summary

- **Total Tasks**: 62
- **Setup Phase**: 5 tasks
- **Foundational Phase**: 5 tasks (BLOCKS all stories)
- **User Story 1 (P1)**: 12 tasks (5 tests + 7 implementation)
- **User Story 2 (P2)**: 12 tasks (3 tests + 9 implementation)
- **User Story 3 (P3)**: 18 tasks (4 tests + 14 implementation)
- **Polish Phase**: 10 tasks

**Parallel Opportunities**: 28 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- **US1**: Create circuit, add/remove components, query by ID and enumerate all components
- **US2**: Components auto-create pin ENodes, query ENodes by ID, distinguish pin vs branching types
- **US3**: Connect ENodes with wires, query connections, split wires, verify orphaned cleanup

**Suggested MVP Scope**: Complete through User Story 1 (T001-T022) for functional circuit container with components

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- All tests must fail before implementing their corresponding functionality
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: Zero dependencies, pure TypeScript, 80% test coverage
