# Tasks: 3D Circuit Controllers

**Input**: Design documents from `/specs/003-threejs-rendering/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Updated**: 2025-12-08 - Phases 6 and 7 marked as DISMISSED (premature optimization and polish)

**Tests**: Unit tests are REQUIRED per Testing Strategy section (TS-001 through TS-008)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Task Count**: 107 tasks total (22 dismissed, 85 active for MVP)
- Phase 1 (Setup): 4 tasks ✅
- Phase 2 (Foundational): 15 tasks ✅
- Phase 3 (US1 - Static Visualization P1): 18 tasks ✅
- Phase 4 (US3 - Live Simulation P1): 22 tasks ✅
- Phase 5 (US2 - Editing Interface P2): 26 tasks ✅
- Phase 6 (US4 - Performance P3): 9 tasks ⚠️ DISMISSED
- Phase 7 (Polish): 13 tasks ⚠️ DISMISSED

**MVP Status**: Phases 1-5 complete (85 tasks). Phases 6-7 dismissed as premature optimization and polish work.

**Deferred Requirements**:
- FR-016 (CircuitWorkspace bridge): Needed for production but deferred to post-MVP. Will enable seamless switching between static and simulation Controllers at application level.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Single library module (part of simple-circuit-engine)
- **Paths**: `src/scene/`, `tests/unit/scene/` at repository root
- **Note**: Module renamed from `rendering/` to `scene/` per Phase 1-3 POC refinements

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic directory structure

- [x] T001 Create directory structure: src/scene/{static,simulation,shared}/ per plan.md
- [x] T002 Create directory structure: tests/unit/scene/{__mocks__,helpers}/ per plan.md
- [x] T003 [P] Create src/scene/index.ts to export public renderer APIs
- [x] T004 [P] Create tests/unit/scene/__mocks__/three.ts for Three.js mocking infrastructure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities and types that MUST be complete before ANY user story renderer work

**⚠️ CRITICAL**: No user story renderer implementation can begin until this phase is complete

- [x] T005 [P] Create src/scene/shared/types.ts with ControllerEvent, ControllerEventMap, ChangedData, ControllerOptions types per contracts/types.ts
- [x] T006 [P] Implement EventEmitter<EventMap> class in src/scene/shared/EventEmitter.ts with on(), off(), emit() methods per research.md decision on type-safe event pattern
- [x] T007 [P] Create src/scene/shared/ComponentVisualFactory.ts with ComponentVisualFactory type and IFactoryRegistry interface per contracts/ComponentVisualFactory.ts
- [x] T008 [P] Implement FactoryRegistry class in src/scene/shared/FactoryRegistry.ts with register(), get(), has(), unregister(), getRegisteredTypes() methods
- [x] T009 [P] Implement createDefaultFactory() function in src/scene/shared/ComponentVisualFactory.ts that returns magenta cube placeholder per FR-024
- [x] T010 [P] Create src/scene/shared/CameraUtils.ts with camera setup utilities (createPerspectiveCamera, setupCameraFromMetadata functions)
- [x] T011 [P] Create src/scene/shared/GeometryUtils.ts with geometry helper functions (createWireGeometry, createGridHelper, createEnodeGeometry)
- [x] T012 [P] Create src/scene/shared/MaterialUtils.ts with material helper functions (createStandardMaterial, createLineMaterial, updateMaterialState)
- [x] T013 [P] Create src/scene/shared/LightingUtils.ts with lighting setup (createAmbientLight, createDirectionalLight, setupSceneLights)
- [x] T014 [P] Create src/scene/shared/InterpolationController.ts with updateState(), getInterpolatedState(), setTransitionDuration() methods per data-model.md for simulation interpolation
- [x] T015 [P] Add easing functions (easeInOutCubic, easeOutQuad, lerp) to src/scene/shared/InterpolationController.ts per research.md decision on frame-independent interpolation
- [x] T016 Create tests/unit/scene/helpers.ts with test utility functions (createMockCircuit, createMockCircuitRunner, createMockFactory)
- [x] T017 [P] Unit test for EventEmitter in tests/unit/scene/shared/EventEmitter.test.ts verifying on/off/emit with type safety and error isolation
- [x] T018 [P] Unit test for FactoryRegistry in tests/unit/scene/shared/FactoryRegistry.test.ts verifying register/get fallback behavior per TS-006
- [x] T019 [P] Unit test for InterpolationController in tests/unit/scene/shared/InterpolationController.test.ts verifying state interpolation with easing functions

**Checkpoint**: Foundation ready - renderer implementation can now begin in parallel

---

## Phase 3: User Story 1 - Static Circuit Visualization (Priority: P1) 🎯 MVP

**Goal**: Render static circuit topology in 3D space with all components, wires, and enodes visible. Enable camera navigation (rotate, zoom, pan).

**Independent Test**: Load a circuit definition, call initialize(), setCircuit(), render(), verify all circuit elements appear as Three.js objects in scene graph.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US1] Unit test for CircuitController constructor in tests/unit/scene/static/CircuitController.test.ts verifying factoryRegistry assignment (no circuit parameter) per TS-004
- [x] T021 [P] [US1] Unit test for CircuitController.initialize() in tests/unit/scene/static/CircuitController.test.ts verifying scene creation, camera setup, and 'ready' event emission per TS-004
- [x] T022 [P] [US1] Unit test for CircuitController.setCircuit() and update() in tests/unit/scene/static/CircuitController.test.ts verifying all circuit elements create corresponding Three.js objects per TS-001 and TS-004
- [x] T023 [P] [US1] Unit test for CircuitController.getScene() and getCamera() in tests/unit/scene/static/CircuitController.test.ts verifying scene and camera access per FR-004
- [x] T024 [P] [US1] Unit test for CircuitController.clearVisuals() and dispose() in tests/unit/scene/static/CircuitController.test.ts verifying geometry/material cleanup and state reset per TS-001

### Implementation for User Story 1

- [x] T025 [US1] Create src/scene/static/CircuitController.ts with class skeleton: constructor(factoryRegistry), fields (scene, camera, container, circuit, etc.) per contracts/CircuitController.ts - circuit NOT in constructor per FR-020
- [x] T026 [US1] Implement CircuitController.initialize(container, options) in src/scene/static/CircuitController.ts: create Scene, Camera (using CameraUtils), lights (using LightingUtils), emit 'ready' event per FR-019 - does NOT create circuit visuals yet
- [x] T027 [US1] Implement CircuitController.setCircuit(circuit) in src/scene/static/CircuitController.ts: clear existing visuals if present, set circuit reference, call _fullUpdate() to create all visuals per FR-019b
- [x] T028 [US1] Implement CircuitController.clearVisuals() in src/scene/static/CircuitController.ts: remove all circuit visuals from scene without disposing scene controllerType per FR-019c
- [x] T029 [US1] Implement _createComponentMesh(component) private method in src/scene/static/CircuitController.ts using factoryRegistry.get() and positioning component at circuit location per FR-003
- [x] T030 [US1] Implement _createWireMesh(wire) private method in src/scene/static/CircuitController.ts using GeometryUtils.createWireGeometry() and MaterialUtils.createLineMaterial() per FR-003
- [x] T031 [US1] Implement _createEnodeMesh(enode) private method in src/scene/static/CircuitController.ts using GeometryUtils.createEnodeGeometry() for branching points (skip pin enodes) per FR-003
- [x] T032 [US1] Implement CircuitController.update() and _fullUpdate() in src/scene/static/CircuitController.ts: iterate circuit.getAllComponents/Wires/ENodes, create meshes, add to scene, store in maps per FR-019a
- [x] T033 [US1] Implement CircuitController.render() in src/scene/static/CircuitController.ts (currently no-op, scene updates done in update()) per FR-022
- [x] T034 [US1] Implement CircuitController.dispose() in src/scene/static/CircuitController.ts: dispose all geometries/materials, clear maps, remove scene objects, clear event listeners per FR-018
- [x] T035 [US1] Implement CircuitController.getScene() and getCamera() in src/scene/static/CircuitController.ts returning scene and camera per FR-004 and FR-004a
- [x] T036 [US1] Add error handling to CircuitController: throw on initialization/constructor errors, emit 'error' events for runtime errors, console.warn for degraded rendering per FR-018
- [x] T037 [US1] Export CircuitController from src/scene/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - static circuits render with all elements visible

---

## Phase 4: User Story 3 - Live Simulation Visualization (Priority: P1) 🎯 MVP

**Goal**: Render live circuit simulation with real-time state updates, animated current flow, component state changes, smooth interpolation between simulation ticks.

**Independent Test**: Create CircuitRunner, call initialize(), setCircuit(circuitRunner), run simulation ticks, call render() each frame, verify visual state changes smoothly reflect simulation state.

**Note**: US3 has same priority as US1 but depends on US1 shared utilities. Can start immediately after Foundational phase if team capacity allows.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T038 [P] [US3] Unit test for CircuitRunnerController constructor in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying factoryRegistry assignment (no circuitRunner parameter) per TS-004
- [x] T039 [P] [US3] Unit test for CircuitRunnerController.initialize() in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying scene creation, interpolation controller setup, 'ready' event per TS-004
- [x] T040 [P] [US3] Unit test for CircuitRunnerController.setCircuit() in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying circuitRunner assignment and initial visual creation per TS-004
- [x] T041 [P] [US3] Unit test for CircuitRunnerController.render() interpolation in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying state interpolation between simulation ticks per FR-011 and TS-001
- [x] T042 [P] [US3] Unit test for CircuitRunnerController.setInterpolationDuration() in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying duration update and validation
- [x] T043 [P] [US3] Unit test for CircuitRunnerController wire animation in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying current flow visual updates per FR-010

### Implementation for User Story 3

- [x] T044 [US3] Create src/scene/simulation/CircuitRunnerController.ts with class skeleton: constructor(factoryRegistry), fields (scene, camera, circuitRunner, interpolationController, lastSimulationTick, lastRenderTime) per contracts/CircuitRunnerController.ts
- [x] T045 [US3] Implement CircuitRunnerController.initialize(container, options) in src/scene/simulation/CircuitRunnerController.ts: create Scene, Camera, lights, instantiate InterpolationController, emit 'ready' per FR-019 - does NOT create visuals yet
- [x] T046 [US3] Implement CircuitRunnerController.setCircuit(circuitRunner) in src/scene/simulation/CircuitRunnerController.ts: clear existing visuals, set circuitRunner reference, create initial visuals from CircuitRunner.stateManager per FR-019b
- [x] T047 [US3] Implement CircuitRunnerController.clearVisuals() in src/scene/simulation/CircuitRunnerController.ts per FR-019c
- [x] T048 [US3] Implement _createComponentMesh(component) in src/scene/simulation/CircuitRunnerController.ts using factoryRegistry with state-aware materials per FR-009
- [x] T049 [US3] Implement _createWireMesh(wire) in src/scene/simulation/CircuitRunnerController.ts with animation support (store animation state in userData) per FR-010
- [x] T050 [US3] Implement _createEnodeMesh(enode) in src/scene/simulation/CircuitRunnerController.ts (similar to Static but state-aware)
- [x] T051 [US3] Implement _updateComponentState(componentId) private method in src/scene/simulation/CircuitRunnerController.ts: read ComponentState from circuitRunner.stateManager, update material colors/emissive per FR-009
- [x] T052 [US3] Implement _updateWireAnimation(wireId) private method in src/scene/simulation/CircuitRunnerController.ts: animate current flow direction/magnitude based on NodeElectricalState per FR-010
- [x] T053 [US3] Implement CircuitRunnerController.render() in src/scene/simulation/CircuitRunnerController.ts: poll current simulation tick, call interpolationController.getInterpolatedState(), update all visual elements, animate wires per FR-011
- [x] T054 [US3] Implement CircuitRunnerController.update(changedData) in src/scene/simulation/CircuitRunnerController.ts for incremental updates (rare, only for topology changes during simulation) per FR-019a
- [x] T055 [US3] Implement CircuitRunnerController.setInterpolationDuration(durationMs) in src/scene/simulation/CircuitRunnerController.ts delegating to interpolationController per contract
- [x] T056 [US3] Implement CircuitRunnerController.dispose() in src/scene/simulation/CircuitRunnerController.ts: cleanup geometries/materials/interpolation state per FR-018
- [x] T057 [US3] Implement CircuitRunnerController.getScene() and getCamera() in src/scene/simulation/CircuitRunnerController.ts per FR-004 and FR-004a
- [x] T058 [US3] Add error handling to CircuitRunnerController per FR-018
- [x] T059 [US3] Export CircuitRunnerController from src/scene/index.ts

**Checkpoint**: At this point, User Stories 1 AND 3 (both P1) are complete - both static and simulation rendering work independently

---

## Phase 5: User Story 2 - Circuit Editing API (Priority: P2)

**Goal**: Implement integrated tool system for circuit editing with 5 core tools (Select, PlaceComponent, Wire, BranchingPoint, Delete). Tools handle UI interaction patterns, preview rendering, validation, and delegate circuit modifications to core Circuit API.

**Independent Test**: Enable edit mode, activate tool, programmatically trigger tool interactions (click, hover, scroll), verify tool events, preview rendering, validation, and circuit updates.

**Note**: This story depends on US1 (CircuitController) being complete.

### Tool System Architecture Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T060 [P] [US2] Unit test for tool system architecture in tests/unit/scene/static/tools/ToolSystem.test.ts: verify setEditMode(), setActiveTool(), getActiveTool() per FR-026, FR-027, FR-028
- [X] T061 [P] [US2] Unit test for single active tool constraint in tests/unit/scene/static/tools/ToolSystem.test.ts: verify only one tool active at a time, switching deactivates previous per FR-026
- [X] T062 [P] [US2] Unit test for tool state management in tests/unit/scene/static/tools/ToolSystem.test.ts: verify tool state reset on edit mode disable per FR-027
- [X] T063 [P] [US2] Unit test for tool event emission in tests/unit/scene/static/tools/ToolSystem.test.ts: verify 'toolActivated', 'toolDeactivated', 'cursorChangeRequested' events per FR-034, FR-035

### Individual Tool Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T064 [P] [US2] Unit test for PositionTool in tests/unit/scene/static/tools/PositionTool.test.ts: verify click to position, drag to move, double-click to rotate per FR-029
- [X] T065 [P] [US2] Unit test for AddComponentTool in tests/unit/scene/static/tools/AddComponentTool.test.ts: verify preview rendering, scroll to rotate, click to place, overlap validation per FR-029, FR-030, FR-032
- [X] T066 [P] [US2] Unit test for WireTool in tests/unit/scene/static/tools/WireTool.test.ts: verify source selection, path preview, target selection, cancellation per FR-029, FR-030, FR-031
- [X] T067 [P] [US2] Unit test for BranchingPointTool in tests/unit/scene/static/tools/BranchingPointTool.test.ts: verify wire targeting, insertion at location per FR-029
- [X] T068 [P] [US2] Unit test for DeleteTool in tests/unit/scene/static/tools/DeleteTool.test.ts: verify component cascade deletion, wire deletion, branching point deletion per FR-029, FR-032

### Tool Operations Tests

- [X] T069 [P] [US2] Unit test for tool preview rendering in tests/unit/scene/static/tools/ToolPreview.test.ts: verify PlaceComponent ghost preview, Wire path preview, semi-transparent rendering per FR-030
- [X] T070 [P] [US2] Unit test for tool validation in tests/unit/scene/static/tools/ToolValidation.test.ts: verify overlap detection, endpoint validation, validation error events per FR-032, FR-036
- [X] T071 [P] [US2] Unit test for tool-circuit integration in tests/unit/scene/static/tools/ToolIntegration.test.ts: verify Circuit API delegation, ChangedData construction, update() calls per FR-033, FR-037

### Tool System Implementation

- [X] T072 [US2] Create IEditingTool interface in src/scene/static/tools/IEditingTool.ts: define onActivate(), onDeactivate(), getCursorType(), getPreviewObjects() per FR-025
- [X] T073 [US2] Add tool system fields to CircuitController in src/scene/static/CircuitController.ts: editMode, tools Map, activeTool, toolState, previewObjects per data-model.md
- [X] T074 [US2] Implement setEditMode() in src/scene/static/CircuitController.ts: activate/deactivate tool system, reset tool state on disable per FR-006, FR-027
- [X] T075 [US2] Implement setActiveTool(), getActiveTool() in src/scene/static/CircuitController.ts: enforce single active tool, emit events per FR-026, FR-028, FR-034
- [X] T076 [US2] Implement cancelCurrentToolOperation() in src/scene/static/CircuitController.ts: cancel multi-step tool operations, emit 'toolOperationCancelled' per FR-031

### Individual Tool Implementations

- [X] T077 [US2] Implement PositionTool in src/scene/static/tools/PositionTool.ts: handleClick (position), handleDrag (move), handleDoubleClick (rotate), emit 'toolOperationCompleted' per FR-029, FR-037
- [X] T078 [US2] Implement AddComponentTool in src/scene/static/tools/AddComponentTool.ts: handleGridPositionMove (preview), handleScroll (rotate), handleClick (place), overlap validation per FR-029, FR-030, FR-032
- [X] T079 [US2] Implement WireTool in src/scene/static/tools/WireTool.ts: handleClick (source/target), path preview, cancellation support, emit 'toolOperationStarted'/'toolOperationCompleted' per FR-029, FR-030, FR-031
- [X] T080 [US2] Implement BranchingPointTool in src/scene/static/tools/BranchingPointTool.ts: handleClick (wire targeting, insertion), wire validation per FR-029, FR-032
- [X] T081 [US2] Implement DeleteTool in src/scene/static/tools/DeleteTool.ts: handleClick (delete), cascade logic for component pins, emit 'toolOperationCompleted' per FR-029, FR-032, FR-037

### Tool Operations Implementation

- [X] T082 [US2] Implement tool preview rendering in src/scene/static/CircuitController.ts: render preview objects semi-transparently, update on hover per FR-030
- [X] T083 [US2] Implement tool validation feedback in src/scene/static/CircuitController.ts: highlight conflicts, show error preview (red tint), emit 'toolValidationError' per FR-036
- [X] T084 [US2] Implement tool interaction handlers in src/scene/static/CircuitController.ts: handleToolClick(), handleToolHover(), handleToolScroll() delegate to active tool per FR-019
- [X] T085 [US2] Implement tool-circuit integration in tool classes: delegate to Circuit API, construct ChangedData, call Controller.update(), complete within 100ms per FR-033, FR-037

**Checkpoint**: At this point, User Stories 1, 2, AND 3 work independently - static rendering supports full editing with 5 tools, simulation rendering animates

---

## Phase 6: User Story 4 - Performance Optimization for Complex Circuits (Priority: P3) ⚠️ DISMISSED

**Status**: DISMISSED - Deferred to post-MVP validation phase

**Rationale**: Performance optimization is premature at this stage. Core functionality (Phases 1-5) must be validated in real-world usage before investing in optimization work. These tasks will be reconsidered after MVP deployment and performance profiling with actual use cases.

**Goal**: Optimize scene management for circuits with up to 500 components maintaining 30+ FPS. Implement dirty tracking, incremental updates, Level of Detail (LOD).

**Independent Test**: Load circuit with 500 components, measure frame time during render(), verify <33ms per frame (30 FPS).

**Note**: This is optimization work building on all previous stories.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] ~~T086 [P] [US4] Performance test for CircuitController with 500 components in tests/unit/scene/static/CircuitController.test.ts verifying render time <33ms per frame~~ **DISMISSED**
- [ ] ~~T087 [P] [US4] Performance test for CircuitRunnerController with 500 components in tests/unit/scene/simulation/CircuitRunnerController.test.ts verifying render time <33ms per frame~~ **DISMISSED**
- [ ] ~~T088 [P] [US4] Unit test for incremental update performance in tests/unit/scene/static/CircuitController.test.ts verifying only changed elements are updated~~ **DISMISSED**

### Implementation for User Story 4

- [ ] ~~T089 [P] [US4] Implement DirtyTracker class in src/scene/shared/DirtyTracker.ts with markDirty(objectId), clearDirty(), getDirtyObjects() methods per performance optimization pattern~~ **DISMISSED**
- [ ] ~~T090 [US4] Integrate DirtyTracker into CircuitController.update() in src/scene/static/CircuitController.ts: track changed objects, only update dirty elements per FR-012~~ **DISMISSED**
- [ ] ~~T091 [US4] Integrate DirtyTracker into CircuitRunnerController.render() in src/scene/simulation/CircuitRunnerController.ts: only update visuals for components/wires with state changes~~ **DISMISSED**
- [ ] ~~T092 [P] [US4] Implement LOD (Level of Detail) system in src/scene/shared/LODManager.ts: reduce geometry detail for distant objects (optional enhancement)~~ **DISMISSED**
- [ ] ~~T093 [US4] Add frustum culling optimization in CircuitController.render() in src/scene/static/CircuitController.ts: skip updates for off-screen objects (optional, Three.js does this by default)~~ **DISMISSED**
- [ ] ~~T094 [US4] Add object pooling for frequently created/destroyed meshes in src/scene/shared/ObjectPool.ts: reuse geometries/materials (optional enhancement)~~ **DISMISSED**

**Checkpoint**: ~~All user stories complete - renderers work independently and perform well at scale~~ **PHASE DISMISSED - MVP complete after Phase 5**

---

## Phase 7: Polish & Cross-Cutting Concerns ⚠️ DISMISSED

**Status**: DISMISSED - Deferred to post-MVP iteration

**Rationale**: Polish and documentation tasks should occur after the MVP has been validated through real-world usage. This allows documentation and examples to reflect actual usage patterns discovered during integration. These tasks will be reconsidered in a future iteration focused on developer experience improvements.

**Note**: JSDoc requirement from constitution remains as technical debt to be addressed in future iteration.

**Purpose**: Improvements that affect multiple user stories, documentation, final validation

- [ ] ~~T095 [P] Add JSDoc comments to all public methods in src/scene/static/CircuitController.ts per FR-019 and constitution quality standards~~ **DISMISSED**
- [ ] ~~T096 [P] Add JSDoc comments to all public methods in src/scene/simulation/CircuitRunnerController.ts per FR-019 and constitution quality standards~~ **DISMISSED**
- [ ] ~~T097 [P] Add JSDoc comments to all shared utility functions in src/scene/shared/ files~~ **DISMISSED**
- [ ] ~~T098 [P] Unit test for FactoryRegistry with unregistered component types in tests/unit/scene/FactoryRegistry.test.ts verifying fallback to default factory per TS-006~~ **DISMISSED**
- [ ] ~~T099 [P] Unit test for error handling in tests/unit/scene/CircuitController.test.ts verifying initialization errors throw, runtime errors emit events per FR-018 and TS-002~~ **DISMISSED**
- [ ] ~~T100 [P] Unit test for error handling in tests/unit/scene/CircuitRunnerController.test.ts verifying error emission per FR-018~~ **DISMISSED**
- [ ] ~~T101 Validate quickstart.md examples in specs/003-threejs-rendering/quickstart.md: ensure all code samples compile and run with new API~~ **DISMISSED**
- [ ] ~~T102 Create example usage in demo/ directory: static scene controllerType example with simple circuit showing new API pattern~~ **DISMISSED**
- [ ] ~~T103 Create example usage in demo/ directory: simulation scene controllerType example with animated circuit showing CircuitRunner integration~~ **DISMISSED**
- [ ] ~~T104 Run `npm test` to verify all unit tests pass with >80% coverage per constitution~~ **DISMISSED**
- [ ] ~~T105 Run `npm run lint` to verify TypeScript strict mode compliance per constitution~~ **DISMISSED**
- [ ] ~~T106 Update main README.md with scene module usage section referencing quickstart.md~~ **DISMISSED**
- [ ] ~~T107 Update CHANGELOG.md with scene module additions for version tracking~~ **DISMISSED**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase - Can start after Phase 2
- **User Story 3 (Phase 4)**: Depends on Foundational phase - Can start after Phase 2 (parallel with US1 if staffed)
- **User Story 2 (Phase 5)**: Depends on User Story 1 completion (builds on CircuitController)
- **User Story 4 (Phase 6)**: Depends on all previous user stories (optimization of existing code)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (CAN run parallel with US1)
- **User Story 2 (P2)**: Depends on User Story 1 completion - Adds edit feedback to CircuitController
- **User Story 4 (P3)**: Depends on User Stories 1, 2, 3 - Optimizes all existing renderers

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Shared utilities before renderer classes
- Controller class skeleton before methods
- Core rendering methods (initialize, update, render) before helper methods
- Helper methods before error handling
- Error handling before exports
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T001, T002, T003, T004 can all run in parallel (different directories)
- **Foundational Phase**: T005-T015 can all run in parallel (different files in shared/)
  - Tests T017-T019 can run in parallel after implementations
- **User Story 1 Tests**: T020-T024 can all run in parallel (different test cases in same file)
- **User Story 3 Tests**: T036-T040 can all run in parallel
- **User Story 1 and User Story 3**: Can be worked on in parallel by different developers after Foundational phase
- **User Story 2 Tests**: T055-T066 can run in parallel (tool system tests, individual tool tests, tool operations tests)
- **User Story 4 Tests**: T081-T083 can run in parallel
- **User Story 4 Implementation**: T084, T087, T089 can run in parallel (different files)
- **Polish Phase**: T090-T095, T097-T098, T101-T102 can run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# Phase 2: Launch all foundational utilities together:
Task: "Create src/scene/shared/types.ts with ControllerEvent types"
Task: "Implement EventEmitter class in src/scene/shared/EventEmitter.ts"
Task: "Create src/scene/shared/ComponentVisualFactory.ts"
Task: "Implement FactoryRegistry class"
Task: "Create CameraUtils, GeometryUtils, MaterialUtils, LightingUtils"
Task: "Create InterpolationController"

# Phase 3: Launch all tests for User Story 1 together:
Task: "Unit test for CircuitController constructor (factoryRegistry only)"
Task: "Unit test for CircuitController.initialize()"
Task: "Unit test for CircuitController.setCircuit() and update()"
Task: "Unit test for CircuitController.getScene() and getCamera()"
Task: "Unit test for CircuitController.clearVisuals() and dispose()"
```

---

## Parallel Example: User Stories 1 and 3 (Both P1)

```bash
# After Foundational phase completes, split team:

# Developer A: User Story 1 - Static Circuit Visualization
Task: "Create src/scene/static/CircuitController.ts with class skeleton"
Task: "Implement CircuitController.initialize() - creates scene/camera only"
Task: "Implement CircuitController.setCircuit() and clearVisuals()"
Task: "Implement _createComponentMesh(), _createWireMesh(), _createEnodeMesh()"
Task: "Implement CircuitController.update(), render(), dispose()"
Task: "Implement CircuitController.getScene() and getCamera()"

# Developer B: User Story 3 - Live Simulation Visualization (parallel)
Task: "Create src/scene/simulation/CircuitRunnerController.ts with class skeleton"
Task: "Implement CircuitRunnerController.initialize() - creates scene/camera only"
Task: "Implement CircuitRunnerController.setCircuit(circuitRunner)"
Task: "Implement _createComponentMesh(), _createWireMesh(), _createEnodeMesh() with state"
Task: "Implement _updateComponentState(), _updateWireAnimation()"
Task: "Implement CircuitRunnerController.render() with interpolation"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Static rendering)
4. Complete Phase 4: User Story 3 (Simulation rendering)
5. **STOP and VALIDATE**: Test both renderers independently
6. Deploy/demo if ready

**MVP Deliverable**: Two working renderers - static circuits visible in 3D, simulation circuits animate in real-time.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Static rendering MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo (Simulation rendering added!)
4. Add User Story 2 → Test independently → Deploy/Demo (Edit feedback added!)
5. Add User Story 4 → Test independently → Deploy/Demo (Performance optimized!)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 2+ developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Static renderer)
   - **Developer B**: User Story 3 (Simulation renderer)
   - Stories complete and integrate independently
3. After both P1 stories done:
   - **Developer A**: User Story 2 (Edit feedback for Static)
   - **Developer B**: User Story 4 (Performance optimization)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests written FIRST, must FAIL before implementation (TDD approach)
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution requires: No `any` types, JSDoc on public APIs, strict TypeScript mode
- All renderers use Three.js 0.181+ (already in project dependencies)
- Controllers are stateless - state resides in Circuit/CircuitRunner instances
