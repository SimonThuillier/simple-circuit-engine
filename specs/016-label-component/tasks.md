# Tasks: Label Component

**Input**: Design documents from `/specs/016-label-component/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included as the project has 60%+ test coverage requirement per constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow existing project structure per plan.md

---

## Phase 1: Setup (Core Type Definition)

**Purpose**: Add Label to ComponentType enum - required before any visual implementation

- [x] T001 Add `Label = 'label'` to ComponentType enum in `src/core/types/ComponentType.ts`
- [x] T002 Add COMPONENT_TYPE_METADATA entry for Label with empty pins Map and default config (text: 'Label', size: '1') in `src/core/types/ComponentType.ts`
- [x] T003 Run `npm run typecheck` to verify core type changes compile

---

## Phase 2: Foundational (Visual Factory Infrastructure)

**Purpose**: Create LabelVisualFactory class - MUST complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create `src/scene/shared/components/LabelVisualFactory.ts` with class extending ComponentVisualFactoryBase
- [x] T005 Implement private `createTextCanvas(text: string): HTMLCanvasElement` method with devicePixelRatio handling
- [x] T006 Implement private `createTextMesh(text: string): THREE.Mesh` method using CanvasTexture
- [x] T007 Implement `createVisual(component: Component): THREE.Object3D` method creating Group with hitbox and text mesh
- [x] T008 [P] Register LabelVisualFactory in `scripts/editor/src/main.ts`
- [x] T009 [P] Register LabelVisualFactory in `scripts/engine/src/main.ts`
- [x] T010 [P] Register LabelVisualFactory in `scripts/viewer/src/main.ts`
- [x] T011 [P] Register LabelVisualFactory in `scripts/simulator/src/main.ts`
- [x] T012 Run `npm run typecheck` to verify all factory registrations compile

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Label to Circuit (Priority: P1) 🎯 MVP

**Goal**: Users can add Label components to circuits with default text displayed

**Independent Test**: Add a Label component to a circuit and verify it appears at the specified position with default text "Label" displayed

### Tests for User Story 1

- [x] T013 [P] [US1] Create test file `tests/scene/shared/LabelVisualFactory.test.ts` with describe block and imports
- [x] T014 [P] [US1] Add test: createVisual returns THREE.Group with correct userData (componentId, componentType) in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T015 [P] [US1] Add test: createVisual creates group with hitbox and text mesh children in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T016 [P] [US1] Add test: Label component has zero pins (empty pins array) in `tests/scene/shared/LabelVisualFactory.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Verify `createVisual` sets userData.componentId and userData.componentType correctly in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T018 [US1] Verify hitbox is created with proper layer (HitboxLayers.COMPONENT) in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T019 [US1] Verify text mesh displays default "Label" text with monospace font in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T020 [US1] Run tests: `npm test -- --grep "LabelVisualFactory"` to verify US1 acceptance

**Checkpoint**: User Story 1 complete - Label can be added to circuits with default text

---

## Phase 4: User Story 2 - Configure Label Text (Priority: P1)

**Goal**: Users can customize label text via configuration panel

**Independent Test**: Open config panel, enter custom text, verify visual updates in real-time

### Tests for User Story 2

- [x] T021 [P] [US2] Add test: getConfigFormDefinition returns form with 'text' field of type 'text' in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T022 [P] [US2] Add test: updateFromConfiguration updates text mesh when text config changes in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T023 [P] [US2] Add test: text exceeding 64 characters is truncated in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T024 [P] [US2] Add test: empty text falls back to default "Label" in `tests/scene/shared/LabelVisualFactory.test.ts`

### Implementation for User Story 2

- [x] T025 [US2] Implement `getConfigFormDefinition()` returning ConfigFormDefinition with text field in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T026 [US2] Implement private `updateTextMesh(mesh: THREE.Mesh, text: string)` method in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T027 [US2] Implement private `findTextMesh(object3D: THREE.Object3D): THREE.Mesh | null` helper in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T028 [US2] Implement `updateFromConfiguration()` to update text mesh when config.text changes in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T029 [US2] Add text truncation (max 64 chars) in updateTextMesh and createTextCanvas in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T030 [US2] Add empty text fallback to "Label" in updateFromConfiguration in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T031 [US2] Implement `mapCoreConfigToForm()` for text field in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T032 [US2] Implement `mapFormToCoreConfig()` for text field with truncation in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T033 [US2] Run tests: `npm test -- --grep "LabelVisualFactory"` to verify US2 acceptance

**Checkpoint**: User Story 2 complete - Label text is configurable via panel

---

## Phase 5: User Story 3 - Scale Label Size (Priority: P2)

**Goal**: Users can scale label size (1x-4x) via configuration panel

**Independent Test**: Change size config, verify visual scales proportionally

### Tests for User Story 3

- [x] T034 [P] [US3] Add test: getConfigFormDefinition includes 'size' field with min=1, max=4, step=1 in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T035 [P] [US3] Add test: updateFromConfiguration applies scale transform based on size config in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T036 [P] [US3] Add test: size=2 doubles the visual scale in `tests/scene/shared/LabelVisualFactory.test.ts`

### Implementation for User Story 3

- [x] T037 [US3] Add 'size' field to getConfigFormDefinition with type='number', min=1, max=4, step=1 in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T038 [US3] Add scale transform application in updateFromConfiguration based on size config in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T039 [US3] Add size to mapCoreConfigToForm (parseFloat) in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T040 [US3] Add size to mapFormToCoreConfig (toString) in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T041 [US3] Run tests: `npm test -- --grep "LabelVisualFactory"` to verify US3 acceptance

**Checkpoint**: User Story 3 complete - Label size is scalable 1x-4x

---

## Phase 6: User Story 4 - Position and Rotate Label (Priority: P2)

**Goal**: Users can position and rotate labels (leverages existing BuildTool)

**Independent Test**: Drag label to new position, rotate with R key, verify both operations work

### Tests for User Story 4

- [x] T042 [P] [US4] Add test: visual group rotation follows component rotation in `tests/scene/shared/LabelVisualFactory.test.ts`
- [x] T043 [P] [US4] Add test: text mesh is positioned at origin within group (scene handles placement) in `tests/scene/shared/LabelVisualFactory.test.ts`

### Implementation for User Story 4

- [x] T044 [US4] Verify createVisual returns group positioned at origin (0,0,0) in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T045 [US4] Verify text mesh is centered within group for proper rotation pivot in `src/scene/shared/components/LabelVisualFactory.ts`
- [ ] T046 [US4] Visual verification: Build editor and test drag/rotate with Label component

**Checkpoint**: User Story 4 complete - Label supports standard position/rotate operations

---

## Phase 7: User Story 5 - Delete Label (Priority: P3)

**Goal**: Users can delete labels (leverages existing BuildTool delete)

**Independent Test**: Select label, press Delete key, verify removal

### Tests for User Story 5

- [x] T047 [P] [US5] Add test: visual can be disposed without errors (geometry, material, texture) in `tests/scene/shared/LabelVisualFactory.test.ts`

### Implementation for User Story 5

- [x] T048 [US5] Verify texture.dispose() is called in visual cleanup (inherited from base class or override if needed) in `src/scene/shared/components/LabelVisualFactory.ts`
- [ ] T049 [US5] Visual verification: Build editor and test delete with Label component

**Checkpoint**: User Story 5 complete - Label supports standard delete operation

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T050 [P] Add JSDoc documentation to LabelVisualFactory class and public methods in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T051 [P] Add hover effect support (verify inherited applyHover/removeHover work with text mesh) in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T052 [P] Add selection effect support (verify inherited applySelection/removeSelection work) in `src/scene/shared/components/LabelVisualFactory.ts`
- [x] T053 Run full test suite: `npm test` to verify no regressions
- [x] T054 Run type check: `npm run typecheck` to verify TypeScript compilation
- [x] T055 Run lint: `npm run lint` to verify code style
- [ ] T056 Visual validation: Build editor and run through all user story acceptance scenarios
- [ ] T057 Verify JSON serialization: Save circuit with Label, reload, verify text/size preserved

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 priority but can run in parallel
  - US3 and US4 are P2 priority, can start after Foundational
  - US5 is P3 priority, can start after Foundational
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Builds on createVisual from US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends config form from US2 but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses existing BuildTool, independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Uses existing BuildTool delete, independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation completes tests
- Story complete before moving to next priority

### Parallel Opportunities

- T008-T011 (factory registrations) can run in parallel
- T013-T016 (US1 tests) can run in parallel
- T021-T024 (US2 tests) can run in parallel
- T034-T036 (US3 tests) can run in parallel
- T042-T043 (US4 tests) can run in parallel
- T050-T052 (polish tasks) can run in parallel
- Different user stories can be worked on in parallel after Foundational phase

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create test file tests/scene/shared/LabelVisualFactory.test.ts"
Task: "Add test: createVisual returns THREE.Group with correct userData"
Task: "Add test: createVisual creates group with hitbox and text mesh children"
Task: "Add test: Label component has zero pins"
```

---

## Parallel Example: Factory Registrations

```bash
# Launch all factory registrations together:
Task: "Register LabelVisualFactory in scripts/editor/src/main.ts"
Task: "Register LabelVisualFactory in scripts/engine/src/main.ts"
Task: "Register LabelVisualFactory in scripts/viewer/src/main.ts"
Task: "Register LabelVisualFactory in scripts/simulator/src/main.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (add ComponentType.Label)
2. Complete Phase 2: Foundational (create LabelVisualFactory)
3. Complete Phase 3: User Story 1 (add label to circuit)
4. **STOP and VALIDATE**: Test adding Labels in editor
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Basic label works (MVP!)
3. Add User Story 2 → Test independently → Custom text works
4. Add User Story 3 → Test independently → Size scaling works
5. Add User Story 4 → Test independently → Position/rotate works
6. Add User Story 5 → Test independently → Delete works
7. Polish → Full feature complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (core functionality)
   - Developer B: User Story 3 + 4 (config and positioning)
   - Developer C: User Story 5 + Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Label has no simulation behavior - purely visual/decorative
