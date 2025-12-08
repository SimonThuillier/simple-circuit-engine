# Tasks: Map Controls and Hovering Detection

**Input**: Design documents from `/specs/004-map-controls-hovering/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks included (tests not explicitly requested in feature specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow plan.md structure: `src/scene/shared/`, `src/scene/static/`, `src/scene/simulation/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extract and create shared types and constants needed by all user stories

- [x] T001 Create LayerConstants.ts by extracting LAYERS enum from ComponentVisuals.ts to `src/scene/shared/LayerConstants.ts` - export `HitboxLayers` constant with DEFAULT=0, ENODE=1, COMPONENT=2, WIRE=3
- [x] T002 [P] Update ComponentVisuals.ts to import LAYERS from LayerConstants.ts instead of defining locally in `src/scene/shared/ComponentVisuals.ts`
- [x] T003 [P] Add HoverableType, HoveredElement, and MapControlsOptions types to `src/scene/shared/types.ts` per contracts/types.ts specification
- [x] T004 [P] Add HitboxUserData types (EnodeHitboxUserData, ComponentHitboxUserData, WireHitboxUserData) to `src/scene/shared/types.ts`
- [x] T005 Add ExtendedRendererOptions interface extending RendererOptions with mapControls property in `src/scene/shared/types.ts`
- [x] T006 Export new types from scene module index in `src/scene/index.ts`

**Checkpoint**: Shared types and constants ready - user story implementation can now begin

---

## Phase 2: User Story 1 - Navigate Circuit with Map Controls (Priority: P1) 🎯 MVP

**Goal**: Users can pan, zoom, and rotate the circuit view using MapControls

**Independent Test**: Load any circuit, verify click-drag pans, scroll wheel zooms, right-click rotates, and damping works on release

### Implementation for User Story 1

- [x] T007 [US1] Import MapControls from 'three/addons/controls/MapControls.js' and add mapControls property to CircuitSceneManager class in `src/scene/static/CircuitSceneManager.ts`
- [x] T008 [US1] Create private initializeMapControls() method in CircuitSceneManager that instantiates MapControls with camera and container, applies default options (enableDamping=true, dampingFactor=0.05, screenSpacePanning=true) in `src/scene/static/CircuitSceneManager.ts`
- [x] T009 [US1] Modify CircuitSceneManager.initialize() to accept ExtendedRendererOptions and call initializeMapControls() with mapControls options in `src/scene/static/CircuitSceneManager.ts`
- [x] T010 [US1] Add mapControls.update() call to CircuitSceneManager render loop (startRenderLoop method or equivalent) in `src/scene/static/CircuitSceneManager.ts`
- [x] T011 [US1] Add getMapControls(), updateMapControlsOptions(), resetCamera(), focusOnElement() public methods to CircuitSceneManager per SceneManagerExtensions contract in `src/scene/static/CircuitSceneManager.ts`
- [x] T012 [US1] Update CircuitSceneManager.dispose() to call mapControls.dispose() if initialized in `src/scene/static/CircuitSceneManager.ts`
- [x] T013 [P] [US1] Mirror T007-T012 changes in CircuitRunnerSceneManager - add MapControls import and property in `src/scene/simulation/CircuitRunnerSceneManager.ts`
- [x] T014 [P] [US1] Implement initializeMapControls(), modify initialize(), add update() to render loop in CircuitRunnerSceneManager in `src/scene/simulation/CircuitRunnerSceneManager.ts`
- [x] T015 [US1] Add getMapControls(), updateMapControlsOptions(), resetCamera(), focusOnElement() and dispose() updates to CircuitRunnerSceneManager in `src/scene/simulation/CircuitRunnerSceneManager.ts`

**Checkpoint**: MapControls working in both scene managers - users can navigate circuit views

---

## Phase 3: User Story 2 - Detect Hovered Elements (Priority: P1) 🎯 MVP

**Goal**: System detects and reports which element is under cursor with priority enode > component > wire

**Independent Test**: Move cursor over circuit elements, verify hover/unhover events emit with correct objectId and objectType

### Implementation for User Story 2

- [x] T016 [US2] Create HoverManager class skeleton implementing IHoverManager interface in `src/scene/shared/HoverManager.ts` with constructor(scene, camera), private raycaster property, private currentlyHovered state
- [x] T017 [US2] Implement HoverManager.updateFromMouse() - normalize coordinates, perform priority raycasting (ENODE layer first, then COMPONENT, then WIRE), extract hit info from userData in `src/scene/shared/HoverManager.ts`
- [x] T018 [US2] Implement HoverManager hover state comparison logic - compare new hit with currentlyHovered, trigger callbacks only on change in `src/scene/shared/HoverManager.ts`
- [x] T019 [US2] Implement HoverManager.onHoverChange(), offHoverChange() callback registration methods in `src/scene/shared/HoverManager.ts`
- [x] T020 [US2] Implement HoverManager.getHoveredElement(), setEnabled(), isEnabled(), clear(), refresh(), dispose() methods in `src/scene/shared/HoverManager.ts`
- [x] T021 [US2] Add hoverManager property and initializeHoverManager() method to CircuitSceneManager in `src/scene/static/CircuitSceneManager.ts`
- [x] T022 [US2] Add mousemove event listener in CircuitSceneManager.initialize() that calls hoverManager.updateFromMouse() with normalized coordinates in `src/scene/static/CircuitSceneManager.ts`
- [x] T023 [US2] Add mouseleave event listener in CircuitSceneManager.initialize() that calls hoverManager.clear() in `src/scene/static/CircuitSceneManager.ts`
- [x] T024 [US2] Register HoverManager callback in CircuitSceneManager that emits 'hover' and 'unhover' events via existing EventEmitter in `src/scene/static/CircuitSceneManager.ts`
- [x] T025 [US2] Add getHoveredElement(), setHoverEnabled(), isHoverEnabled() public methods to CircuitSceneManager per ISceneManagerHoverExtensions contract in `src/scene/static/CircuitSceneManager.ts`
- [x] T026 [US2] Update CircuitSceneManager.dispose() to remove event listeners and call hoverManager.dispose() in `src/scene/static/CircuitSceneManager.ts`
- [x] T027 [P] [US2] Mirror T021-T026 in CircuitRunnerSceneManager - add hoverManager property and initialization in `src/scene/simulation/CircuitRunnerSceneManager.ts`
- [x] T028 [P] [US2] Add event listeners, callback registration, public methods, and dispose cleanup in CircuitRunnerSceneManager in `src/scene/simulation/CircuitRunnerSceneManager.ts`

**Checkpoint**: Hover detection working with correct priority - users see hover/unhover events for enodes, components, and wires

---

## Phase 4: User Story 3 - Simultaneous Navigation and Hover Detection (Priority: P2)

**Goal**: Hover detection updates correctly during camera navigation (pan/zoom/rotate)

**Independent Test**: Pan the view while cursor stays stationary, verify hover events update as elements move under cursor

### Implementation for User Story 3

- [x] T029 [US3] Add 'change' event listener on MapControls in CircuitSceneManager that calls hoverManager.refresh() to update hover state after camera movement in `src/scene/static/CircuitSceneManager.ts`
- [x] T030 [US3] Store bound handler reference for MapControls 'change' listener for proper cleanup in dispose() in `src/scene/static/CircuitSceneManager.ts`
- [x] T031 [P] [US3] Mirror T029-T030 in CircuitRunnerSceneManager - add 'change' listener on MapControls that refreshes hover state in `src/scene/simulation/CircuitRunnerSceneManager.ts`

**Checkpoint**: Navigation and hover detection work together seamlessly

---

## Phase 5: User Story 4 - Performance-Optimized Hover Detection (Priority: P2)

**Goal**: Hover detection performs within 5ms for circuits with 200+ elements

**Independent Test**: Load circuit with 100+ elements, move cursor rapidly, verify no frame drops or lag

### Implementation for User Story 4

- [x] T032 [US4] Optimize HoverManager raycasting - use early return on first hit (don't check all layers if higher priority found), ensure recursive=true for scene traversal in `src/scene/shared/HoverManager.ts`
- [x] T033 [US4] Add optional throttling/debouncing to updateFromMouse() - if last update was <8ms ago, skip (performance safety valve) in `src/scene/shared/HoverManager.ts`
- [x] T034 [US4] Ensure camera.layers only includes layer 0 to prevent hitbox meshes from being rendered (visual performance) in `src/scene/static/CircuitSceneManager.ts` and `src/scene/simulation/CircuitRunnerSceneManager.ts`

**Checkpoint**: Hover detection performs smoothly on large circuits

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T035 [P] Add JSDoc documentation to all public methods in HoverManager class in `src/scene/shared/HoverManager.ts`
- [x] T036 [P] Add JSDoc documentation to new public methods in CircuitSceneManager in `src/scene/static/CircuitSceneManager.ts`
- [x] T037 [P] Add JSDoc documentation to new public methods in CircuitRunnerSceneManager in `src/scene/simulation/CircuitRunnerSceneManager.ts`
- [x] T038 Validate implementation against quickstart.md examples - ensure all documented APIs work as shown in `specs/004-map-controls-hovering/quickstart.md`
- [x] T039 Run existing tests to ensure no regressions: `npm test`
- [x] T040 Run linting to ensure code style compliance: `npm run lint`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion (T001-T006)
- **User Story 2 (Phase 3)**: Depends on Setup completion (T001-T006), can run parallel to US1
- **User Story 3 (Phase 4)**: Depends on US1 AND US2 completion (needs both MapControls and HoverManager)
- **User Story 4 (Phase 5)**: Depends on US2 completion (optimizes HoverManager)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    │
    ├──────────────────┐
    ▼                  ▼
Phase 2: US1       Phase 3: US2
(MapControls)      (HoverManager)
    │                  │
    └────────┬─────────┘
             ▼
       Phase 4: US3
    (Integration)
             │
             ▼
       Phase 5: US4
    (Performance)
             │
             ▼
       Phase 6: Polish
```

### Within Each User Story

- CircuitSceneManager tasks can run in parallel with CircuitRunnerSceneManager tasks (different files)
- Implementation order within each manager: initialization → event listeners → public methods → dispose

### Parallel Opportunities

**Setup Phase (can all run in parallel after T001):**
```
T002, T003, T004 → all different files, no dependencies
```

**User Story 1 & 2 (can run in parallel after Setup):**
```
US1 and US2 can start simultaneously - different concerns
```

**Within User Story 1:**
```
T013, T014 (CircuitRunnerSceneManager) can run in parallel with T007-T012 (CircuitSceneManager)
```

**Within User Story 2:**
```
T027, T028 (CircuitRunnerSceneManager) can run in parallel with T021-T026 (CircuitSceneManager)
```

**Within User Story 3:**
```
T031 (CircuitRunnerSceneManager) can run in parallel with T029-T030 (CircuitSceneManager)
```

**Polish Phase:**
```
T035, T036, T037 → all documentation tasks, different files
```

---

## Parallel Example: User Story 2

```bash
# After HoverManager core is complete (T016-T020), launch both scene managers in parallel:
Task: T021-T026 "CircuitSceneManager hover integration"
Task: T027-T028 "CircuitRunnerSceneManager hover integration"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (shared types and constants)
2. Complete Phase 2: User Story 1 (MapControls) - **can navigate**
3. Complete Phase 3: User Story 2 (HoverManager) - **can see what's under cursor**
4. **STOP and VALIDATE**: Both navigation and hover work independently
5. Deploy/demo as MVP

### Incremental Delivery

1. Setup → Types and constants ready
2. Add US1 → MapControls working → Demo navigation
3. Add US2 → Hover detection working → Demo hover events
4. Add US3 → Integration complete → Demo simultaneous usage
5. Add US4 → Performance optimized → Demo large circuits
6. Polish → Production ready

### Task Summary

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Setup | T001-T006 (6 tasks) | T002, T003, T004 |
| US1 | T007-T015 (9 tasks) | T013-T014 |
| US2 | T016-T028 (13 tasks) | T027-T028 |
| US3 | T029-T031 (3 tasks) | T031 |
| US4 | T032-T034 (3 tasks) | - |
| Polish | T035-T040 (6 tasks) | T035, T036, T037 |
| **Total** | **40 tasks** | **13 parallelizable** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 priority and form the MVP together
- US3 and US4 are P2 priority and enhance the MVP
- Existing hitboxes in ComponentVisuals.ts already use correct layers - no changes needed
- Wire hitboxes mentioned in research.md are already implemented in existing factories
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
