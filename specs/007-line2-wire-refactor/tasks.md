---
description: 'Task list for Line2 Wire Refactor implementation'
---

# Tasks: Line2 Wire Refactor

**Input**: Design documents from `/specs/007-line2-wire-refactor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are omitted per template guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below follow the single project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification of dependencies

- [x] T001 Verify Three.js 0.181+ is installed with three/addons/lines support
- [x] T002 [P] Verify TypeScript strict mode configuration in tsconfig.json
- [x] T003 [P] Verify Vitest 4.0+ is installed for test updates

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and shared material infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add Line2, LineGeometry, and LineMaterial imports to src/scene/shared/types.ts
- [x] T005 Create createLine2Material helper function in src/scene/shared/MaterialUtils.ts
- [x] T006 Add shared LineMaterial instance to WireVisualManager class in src/scene/shared/WireVisualManager.ts
- [x] T007 Add setResolution method to WireVisualManager in src/scene/shared/WireVisualManager.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Wire Rendering with Consistent Line Width (Priority: P1) 🎯 MVP

**Goal**: Refactor each wire to render as a single Line2 object with consistent pixel-accurate line width

**Independent Test**: Render a circuit with wires and verify wire widths remain visually consistent when zooming in/out or rotating the view. Verify N wires = N Line2 objects in scene.

### Implementation for User Story 1

- [x] T008 [US1] Update wireLines Map type from Map<UUID, THREE.Line> to Map<UUID, Line2> in src/scene/shared/WireVisualManager.ts
- [x] T009 [US1] Update createOrUpdateWire method to create LineGeometry instead of BufferGeometry in src/scene/shared/WireVisualManager.ts
- [x] T010 [US1] Update createOrUpdateWire method to use geometry.setFromPoints() with wirePath.points in src/scene/shared/WireVisualManager.ts
- [x] T011 [US1] Update createOrUpdateWire method to create Line2 instead of THREE.Line using shared wireMaterial in src/scene/shared/WireVisualManager.ts
- [x] T012 [US1] Update dispose method to dispose shared wireMaterial in src/scene/shared/WireVisualManager.ts
- [x] T013 [US1] Update CircuitSceneManager to call wireVisualManager.setResolution() on init in src/scene/static/CircuitSceneManager.ts
- [x] T014 [US1] Update CircuitSceneManager to call wireVisualManager.setResolution() on resize in src/scene/static/CircuitSceneManager.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - wires render as Line2 with consistent width

---

## Phase 4: User Story 2 - One Line2 Per Wire (Priority: P1)

**Goal**: Ensure each wire is represented by exactly one Line2 object for individual management

**Independent Test**: Create a circuit with N wires and verify exactly N Line2 objects are in the scene. Verify wires with multiple intermediate points appear as single Line2 objects.

### Implementation for User Story 2

- [x] T015 [US2] Verify userData.wireId is set correctly on each Line2 in src/scene/shared/WireVisualManager.ts
- [x] T016 [US2] Verify userData.type is set to 'wire' on each Line2 in src/scene/shared/WireVisualManager.ts
- [x] T017 [US2] Ensure wires with multiple intermediate points create single Line2 with all segments in src/scene/shared/WireVisualManager.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - each wire is a single Line2 object

---

## Phase 5: User Story 3 - Dynamic Wire Updates (Priority: P2)

**Goal**: Enable efficient add/remove/update operations on individual Line2 wire objects

**Independent Test**: Add/remove wires programmatically and verify corresponding Line2 objects are created/removed. Move components and verify connected wire geometries update.

### Implementation for User Story 3

- [x] T018 [US3] Verify removeWire method properly disposes LineGeometry but NOT shared material in src/scene/shared/WireVisualManager.ts
- [x] T019 [US3] Verify removeWire method removes Line2 from scene and wireLines map in src/scene/shared/WireVisualManager.ts
- [x] T020 [US3] Ensure geometry update on wire path change uses setFromPoints() in src/scene/shared/WireVisualManager.ts
- [x] T021 [US3] Verify component move triggers wire endpoint updates correctly in src/scene/shared/WireVisualManager.ts

**Checkpoint**: All dynamic wire operations should work correctly

---

## Phase 6: User Story 4 - Wire Material Configuration (Priority: P2)

**Goal**: Configure LineMaterial for proper wire appearance (color, width, resolution)

**Independent Test**: Create wires with different color/width settings and verify they render correctly. Test window resize updates resolution.

### Implementation for User Story 4

- [x] T022 [US4] Verify LineMaterial is initialized with color 0xffffff (white) in src/scene/shared/WireVisualManager.ts
- [x] T023 [US4] Verify LineMaterial is initialized with linewidth 2 pixels in src/scene/shared/WireVisualManager.ts
- [x] T024 [US4] Verify resolution updates correctly on renderer resize events in src/scene/static/CircuitSceneManager.ts
- [x] T025 [US4] Ensure all Line2 objects share the same LineMaterial instance in src/scene/shared/WireVisualManager.ts

**Checkpoint**: Wire materials render with correct visual properties across all scenarios

---

## Phase 7: User Story 5 - Test Suite Compatibility (Priority: P3)

**Goal**: Update all existing WireVisualManager tests to work with Line2 API

**Independent Test**: Run test suite and confirm all tests pass with necessary Line2 API adaptations.

### Implementation for User Story 5

- [x] T026 [P] [US5] Update WireVisualManager.test.ts imports to include Line2, LineGeometry, LineMaterial from three/addons in tests/scene/shared/WireVisualManager.test.ts
- [x] T027 [P] [US5] Update type checks from instanceof THREE.Line to line.isLine2 or instanceof Line2 in tests/scene/shared/WireVisualManager.test.ts
- [x] T028 [US5] Add setResolution() call in test setup/beforeEach in tests/scene/shared/WireVisualManager.test.ts
- [x] T029 [US5] Update geometry verification to check LineGeometry attributes in tests/scene/shared/WireVisualManager.test.ts
- [x] T030 [US5] Verify wire add scenario tests pass with Line2 in tests/scene/shared/WireVisualManager.test.ts
- [x] T031 [US5] Verify wire remove scenario tests pass with Line2 in tests/scene/shared/WireVisualManager.test.ts
- [x] T032 [US5] Verify wire update scenario tests pass with Line2 in tests/scene/shared/WireVisualManager.test.ts
- [x] T033 [US5] Verify component move scenario tests pass with Line2 in tests/scene/shared/WireVisualManager.test.ts

**Checkpoint**: All tests should pass with Line2 implementation

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [x] T034 [P] Run npm test to verify all tests pass
- [x] T035 [P] Run npm run lint to verify code style compliance
- [x] T036 Verify quickstart.md instructions work correctly
- [x] T037 Visual verification with demo (npm run dev:demo) - check zoom consistency
- [x] T038 Check browser console for WebGL warnings or errors
- [x] T039 Verify memory cleanup - no leaks when adding/removing wires repeatedly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in sequential priority order (P1 → P1 → P2 → P2 → P3)
  - US1 and US2 are both P1 but US2 builds on US1 verification
  - US3 and US4 are both P2 but US3 focuses on dynamics, US4 on materials
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core Line2 rendering implementation
- **User Story 2 (P1)**: Can start after US1 - Verifies one Line2 per wire architecture
- **User Story 3 (P2)**: Can start after US1/US2 - Tests dynamic operations on Line2 objects
- **User Story 4 (P2)**: Can start after US1/US2 - Validates material configuration
- **User Story 5 (P3)**: Depends on US1-4 implementation complete - Test adaptation

### Within Each User Story

- Core refactoring tasks before verification tasks
- Material setup before usage
- Implementation complete before testing

### Parallel Opportunities

- T001, T002, T003 (Setup) can run in parallel
- T004, T005 can run in parallel within Foundational
- T026, T027 (test imports and type checks) can run in parallel
- T034, T035 (test and lint) can run in parallel in Polish phase

---

## Parallel Example: Setup Phase

```bash
# Launch all setup verification tasks together:
Task: "Verify Three.js 0.181+ is installed with three/addons/lines support"
Task: "Verify TypeScript strict mode configuration in tsconfig.json"
Task: "Verify Vitest 4.0+ is installed for test updates"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Core Line2 rendering)
4. Complete Phase 4: User Story 2 (Verify architecture)
5. **STOP and VALIDATE**: Test Line2 rendering independently
6. Visual demo verification

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → MVP complete (consistent line rendering)
3. Add User Story 3 → Test dynamic operations → Enhanced interactivity
4. Add User Story 4 → Test materials → Visual quality validated
5. Add User Story 5 → Test suite passes → Full test coverage
6. Each story adds value without breaking previous stories

### Sequential Single Developer Strategy

1. Developer completes Setup + Foundational
2. Complete User Story 1 (Core refactor)
3. Complete User Story 2 (Verify one-to-one mapping)
4. Complete User Story 3 (Dynamic updates)
5. Complete User Story 4 (Material config)
6. Complete User Story 5 (Test updates)
7. Polish phase validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story builds on the previous for this refactor (not fully independent due to architectural change)
- Shared LineMaterial is a key architectural decision from research.md
- Resolution must be set for LineMaterial to render correctly
- Verify geometry disposal to prevent memory leaks
- Commit after each task or logical group
- Stop at any checkpoint to validate story
- Edge cases: zero wires, all wires removed, invalid node references
