# Tasks: 3D Circuit Renderers

**Input**: Design documents from `/specs/003-threejs-rendering/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests are REQUIRED per Testing Strategy section (TS-001 through TS-008)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Task Count**: 102 tasks total
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 15 tasks
- Phase 3 (US1 - Static Visualization P1): 16 tasks
- Phase 4 (US3 - Live Simulation P1): 19 tasks
- Phase 5 (US2 - Editing Interface P2): 26 tasks (updated with tool system)
- Phase 6 (US4 - Performance P3): 9 tasks
- Phase 7 (Polish): 13 tasks

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Single library module (part of simple-circuit-engine)
- **Paths**: `src/rendering/`, `tests/unit/rendering/` at repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic directory structure

- [x] T001 Create directory structure: src/rendering/{static,simulation,shared}/ per plan.md
- [x] T002 Create directory structure: tests/unit/rendering/{__mocks__,helpers}/ per plan.md
- [x] T003 [P] Create src/rendering/index.ts to export public renderer APIs
- [x] T004 [P] Create tests/unit/rendering/__mocks__/three.ts for Three.js mocking infrastructure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities and types that MUST be complete before ANY user story renderer work

**⚠️ CRITICAL**: No user story renderer implementation can begin until this phase is complete

- [x] T005 [P] Create src/rendering/shared/types.ts with RenderEvent, RenderEventMap, ChangedData, RendererOptions types per contracts/types.ts
- [x] T006 [P] Implement EventEmitter<EventMap> class in src/rendering/shared/EventEmitter.ts with on(), off(), emit() methods per research.md decision on type-safe event pattern
- [x] T007 [P] Create src/rendering/shared/ComponentVisualFactory.ts with ComponentVisualFactory type and IFactoryRegistry interface per contracts/ComponentVisualFactory.ts
- [x] T008 [P] Implement FactoryRegistry class in src/rendering/shared/FactoryRegistry.ts with register(), get(), has(), unregister(), getRegisteredTypes() methods
- [x] T009 [P] Implement createDefaultFactory() function in src/rendering/shared/ComponentVisualFactory.ts that returns magenta cube placeholder per FR-024
- [x] T010 [P] Create src/rendering/shared/CameraUtils.ts with camera setup utilities (createPerspectiveCamera, setupCameraFromMetadata functions)
- [x] T011 [P] Create src/rendering/shared/GeometryUtils.ts with geometry helper functions (createWireGeometry, createGridHelper, createEnodeGeometry)
- [x] T012 [P] Create src/rendering/shared/MaterialUtils.ts with material helper functions (createStandardMaterial, createLineMaterial, updateMaterialState)
- [x] T013 [P] Create src/rendering/shared/LightingUtils.ts with lighting setup (createAmbientLight, createDirectionalLight, setupSceneLights)
- [x] T014 [P] Create src/rendering/shared/InterpolationController.ts with updateState(), getInterpolatedState(), setTransitionDuration() methods per data-model.md for simulation interpolation
- [x] T015 [P] Add easing functions (easeInOutCubic, easeOutQuad, lerp) to src/rendering/shared/InterpolationController.ts per research.md decision on frame-independent interpolation
- [x] T016 Create tests/rendering/helpers.ts with test utility functions (createMockCircuit, createMockCircuitRunner, createMockFactory)
- [x] T017 [P] Unit test for EventEmitter in tests/rendering/shared/EventEmitter.test.ts verifying on/off/emit with type safety and error isolation
- [x] T018 [P] Unit test for FactoryRegistry in tests/rendering/shared/FactoryRegistry.test.ts verifying register/get fallback behavior per TS-006
- [x] T019 [P] Unit test for InterpolationController in tests/rendering/shared/InterpolationController.test.ts verifying state interpolation with easing functions

**Checkpoint**: Foundation ready - renderer implementation can now begin in parallel

---

## Phase 3: User Story 1 - Static Circuit Visualization (Priority: P1) 🎯 MVP

**Goal**: Render static circuit topology in 3D space with all components, wires, and enodes visible. Enable camera navigation (rotate, zoom, pan).

**Independent Test**: Load a circuit definition, call initialize(), render(), verify all circuit elements appear as Three.js objects in scene graph.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US1] Unit test for StaticCircuitRenderer constructor in tests/rendering/static/StaticCircuitRenderer.test.ts verifying circuit and factoryRegistry assignment per TS-004
- [x] T021 [P] [US1] Unit test for StaticCircuitRenderer.initialize() in tests/rendering/static/StaticCircuitRenderer.test.ts verifying scene creation, camera setup, grid, and 'ready' event emission per TS-004
- [x] T022 [P] [US1] Unit test for StaticCircuitRenderer.update() full update in tests/rendering/static/StaticCircuitRenderer.test.ts verifying all circuit elements create corresponding Three.js objects per TS-001
- [x] T023 [P] [US1] Unit test for StaticCircuitRenderer.getScene() in tests/rendering/static/StaticCircuitRenderer.test.ts verifying scene access and camera exposure per FR-004
- [x] T024 [P] [US1] Unit test for StaticCircuitRenderer.dispose() in tests/rendering/static/StaticCircuitRenderer.test.ts verifying geometry/material cleanup and state reset per TS-001

### Implementation for User Story 1

- [x] T025 [US1] Create src/rendering/static/StaticCircuitRenderer.ts with class skeleton: constructor(circuit, factoryRegistry), fields (scene, camera, container, etc.) per contracts/StaticCircuitRenderer.ts
- [x] T026 [US1] Implement StaticCircuitRenderer.initialize(container, options) in src/rendering/static/StaticCircuitRenderer.ts: create Scene, Camera (using CameraUtils), lights (using LightingUtils), grid helper, emit 'ready' event per FR-019
- [x] T027 [US1] Implement _createComponentMesh(component) private method in src/rendering/static/StaticCircuitRenderer.ts using factoryRegistry.get() and positioning component at circuit location per FR-003
- [x] T028 [US1] Implement _createWireMesh(wire) private method in src/rendering/static/StaticCircuitRenderer.ts using GeometryUtils.createWireGeometry() and MaterialUtils.createLineMaterial() per FR-003
- [x] T029 [US1] Implement _createEnodeMesh(enode) private method in src/rendering/static/StaticCircuitRenderer.ts using GeometryUtils.createEnodeGeometry() for pins and branching points per FR-003
- [x] T030 [US1] Implement StaticCircuitRenderer.update() full update in src/rendering/static/StaticCircuitRenderer.ts: iterate circuit.getAllComponents/Wires/ENodes, create meshes, add to scene, store in maps per FR-019a
- [x] T031 [US1] Implement StaticCircuitRenderer.render() in src/rendering/static/StaticCircuitRenderer.ts (currently no-op, scene updates done in update()) per FR-022
- [x] T032 [US1] Implement StaticCircuitRenderer.dispose() in src/rendering/static/StaticCircuitRenderer.ts: dispose all geometries/materials, clear maps, remove scene objects, clear event listeners per FR-018
- [x] T033 [US1] Implement StaticCircuitRenderer.getScene() in src/rendering/static/StaticCircuitRenderer.ts returning scene with camera accessible via scene.camera per FR-004
- [x] T034 [US1] Add error handling to StaticCircuitRenderer: throw on initialization/constructor errors, emit 'error' events for runtime errors, console.warn for degraded rendering per FR-018
- [x] T035 [US1] Export StaticCircuitRenderer from src/rendering/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - static circuits render with all elements visible

---

## Phase 4: User Story 3 - Live Simulation Visualization (Priority: P1) 🎯 MVP

**Goal**: Render live circuit simulation with real-time state updates, animated current flow, component state changes, smooth interpolation between simulation ticks.

**Independent Test**: Create CircuitRunner, call initialize(), run simulation ticks, call render() each frame, verify visual state changes smoothly reflect simulation state.

**Note**: US3 has same priority as US1 but depends on US1 shared utilities. Can start immediately after Foundational phase if team capacity allows.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T036 [P] [US3] Unit test for SimulationCircuitRenderer constructor in tests/rendering/simulation/SimulationCircuitRenderer.test.ts verifying circuitRunner and factoryRegistry assignment per TS-004
- [ ] T037 [P] [US3] Unit test for SimulationCircuitRenderer.initialize() in tests/rendering/simulation/SimulationCircuitRenderer.test.ts verifying scene creation, interpolation controller setup, 'ready' event per TS-004
- [ ] T038 [P] [US3] Unit test for SimulationCircuitRenderer.render() interpolation in tests/rendering/simulation/SimulationCircuitRenderer.test.ts verifying state interpolation between simulation ticks per FR-011 and TS-001
- [ ] T039 [P] [US3] Unit test for SimulationCircuitRenderer.setInterpolationDuration() in tests/rendering/simulation/SimulationCircuitRenderer.test.ts verifying duration update and validation
- [ ] T040 [P] [US3] Unit test for SimulationCircuitRenderer wire animation in tests/rendering/simulation/SimulationCircuitRenderer.test.ts verifying current flow visual updates per FR-010

### Implementation for User Story 3

- [ ] T041 [US3] Create src/rendering/simulation/SimulationCircuitRenderer.ts with class skeleton: constructor(circuitRunner, factoryRegistry), fields (scene, camera, interpolationController, lastSimulationTick, lastRenderTime) per contracts/SimulationCircuitRenderer.ts
- [ ] T042 [US3] Implement SimulationCircuitRenderer.initialize(container, options) in src/rendering/simulation/SimulationCircuitRenderer.ts: create Scene, Camera, lights, grid, instantiate InterpolationController, initial render from CircuitRunner.stateManager, emit 'ready' per FR-019
- [ ] T043 [US3] Implement _createComponentMesh(component) in src/rendering/simulation/SimulationCircuitRenderer.ts using factoryRegistry (same as Static but with state-aware materials) per FR-009
- [ ] T044 [US3] Implement _createWireMesh(wire) in src/rendering/simulation/SimulationCircuitRenderer.ts with animation support (store animation state in userData) per FR-010
- [ ] T045 [US3] Implement _createEnodeMesh(enode) in src/rendering/simulation/SimulationCircuitRenderer.ts (similar to Static but state-aware)
- [ ] T046 [US3] Implement _updateComponentState(componentId) private method in src/rendering/simulation/SimulationCircuitRenderer.ts: read ComponentState from circuitRunner.stateManager, update material colors/emissive per FR-009
- [ ] T047 [US3] Implement _updateWireAnimation(wireId) private method in src/rendering/simulation/SimulationCircuitRenderer.ts: animate current flow direction/magnitude based on NodeElectricalState per FR-010
- [ ] T048 [US3] Implement SimulationCircuitRenderer.render() in src/rendering/simulation/SimulationCircuitRenderer.ts: poll current simulation tick, call interpolationController.getInterpolatedState(), update all visual elements, animate wires per FR-011
- [ ] T049 [US3] Implement SimulationCircuitRenderer.update(changedData) in src/rendering/simulation/SimulationCircuitRenderer.ts for incremental updates (rare, only for topology changes during simulation) per FR-019a
- [ ] T050 [US3] Implement SimulationCircuitRenderer.setInterpolationDuration(durationMs) in src/rendering/simulation/SimulationCircuitRenderer.ts delegating to interpolationController per contract
- [ ] T051 [US3] Implement SimulationCircuitRenderer.dispose() in src/rendering/simulation/SimulationCircuitRenderer.ts: cleanup geometries/materials/interpolation state per FR-018
- [ ] T052 [US3] Implement SimulationCircuitRenderer.getScene() in src/rendering/simulation/SimulationCircuitRenderer.ts returning scene per FR-004
- [ ] T053 [US3] Add error handling to SimulationCircuitRenderer per FR-018
- [ ] T054 [US3] Export SimulationCircuitRenderer from src/rendering/index.ts

**Checkpoint**: At this point, User Stories 1 AND 3 (both P1) are complete - both static and simulation rendering work independently

---

## Phase 5: User Story 2 - Circuit Editing Interface (Priority: P2)

**Goal**: Implement integrated tool system for circuit editing with 5 core tools (Select, PlaceComponent, Wire, BranchingPoint, Delete). Tools handle UI interaction patterns, preview rendering, validation, and delegate circuit modifications to core Circuit API.

**Independent Test**: Enable edit mode, activate tool, programmatically trigger tool interactions (click, hover, scroll), verify tool events, preview rendering, validation, and circuit updates.

**Note**: This story depends on US1 (StaticCircuitRenderer) being complete.

### Tool System Architecture Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T055 [P] [US2] Unit test for tool system architecture in tests/rendering/static/tools/ToolSystem.test.ts: verify setEditMode(), setActiveTool(), getActiveTool() per FR-026, FR-027, FR-028
- [ ] T056 [P] [US2] Unit test for single active tool constraint in tests/rendering/static/tools/ToolSystem.test.ts: verify only one tool active at a time, switching deactivates previous per FR-026
- [ ] T057 [P] [US2] Unit test for tool state management in tests/rendering/static/tools/ToolSystem.test.ts: verify tool state reset on edit mode disable per FR-027
- [ ] T058 [P] [US2] Unit test for tool event emission in tests/rendering/static/tools/ToolSystem.test.ts: verify 'toolActivated', 'toolDeactivated', 'cursorChangeRequested' events per FR-034, FR-035

### Individual Tool Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T059 [P] [US2] Unit test for SelectTool in tests/rendering/static/tools/SelectTool.test.ts: verify click to select, drag to move, double-click to rotate per FR-029
- [ ] T060 [P] [US2] Unit test for PlaceComponentTool in tests/rendering/static/tools/PlaceComponentTool.test.ts: verify preview rendering, scroll to rotate, click to place, overlap validation per FR-029, FR-030, FR-032
- [ ] T061 [P] [US2] Unit test for WireTool in tests/rendering/tools/static/WireTool.test.ts: verify source selection, path preview, target selection, cancellation per FR-029, FR-030, FR-031
- [ ] T062 [P] [US2] Unit test for BranchingPointTool in tests/rendering/static/tools/BranchingPointTool.test.ts: verify wire targeting, insertion at location per FR-029
- [ ] T063 [P] [US2] Unit test for DeleteTool in tests/rendering/tools/static/DeleteTool.test.ts: verify component cascade deletion, wire deletion, branching point deletion per FR-029, FR-032

### Tool Operations Tests

- [ ] T064 [P] [US2] Unit test for tool preview rendering in tests/rendering/static/tools/ToolPreview.test.ts: verify PlaceComponent ghost preview, Wire path preview, semi-transparent rendering per FR-030
- [ ] T065 [P] [US2] Unit test for tool validation in tests/rendering/tools/static/ToolValidation.test.ts: verify overlap detection, endpoint validation, validation error events per FR-032, FR-036
- [ ] T066 [P] [US2] Unit test for tool-circuit integration in tests/rendering/tools/static/ToolIntegration.test.ts: verify Circuit API delegation, ChangedData construction, update() calls per FR-033, FR-037

### Tool System Implementation

- [ ] T067 [US2] Create IEditingTool interface in src/rendering/static/tools/IEditingTool.ts: define onActivate(), onDeactivate(), getCursorType(), getPreviewObjects() per FR-025
- [ ] T068 [US2] Add tool system fields to StaticCircuitRenderer in src/rendering/static/StaticCircuitRenderer.ts: editMode, tools Map, activeTool, toolState, previewObjects per data-model.md
- [ ] T069 [US2] Implement setEditMode() in src/rendering/static/StaticCircuitRenderer.ts: activate/deactivate tool system, reset tool state on disable per FR-006, FR-027
- [ ] T070 [US2] Implement setActiveTool(), getActiveTool() in src/rendering/static/StaticCircuitRenderer.ts: enforce single active tool, emit events per FR-026, FR-028, FR-034
- [ ] T071 [US2] Implement cancelCurrentToolOperation() in src/rendering/static/StaticCircuitRenderer.ts: cancel multi-step tool operations, emit 'toolOperationCancelled' per FR-031

### Individual Tool Implementations

- [ ] T072 [US2] Implement SelectTool in src/rendering/static/tools/SelectTool.ts: handleClick (select), handleDrag (move), handleDoubleClick (rotate), emit 'toolOperationCompleted' per FR-029, FR-037
- [ ] T073 [US2] Implement PlaceComponentTool in src/rendering/static/tools/PlaceComponentTool.ts: handleHover (preview), handleScroll (rotate), handleClick (place), overlap validation per FR-029, FR-030, FR-032
- [ ] T074 [US2] Implement WireTool in src/rendering/static/tools/WireTool.ts: handleClick (source/target), path preview, cancellation support, emit 'toolOperationStarted'/'toolOperationCompleted' per FR-029, FR-030, FR-031
- [ ] T075 [US2] Implement BranchingPointTool in src/rendering/static/tools/BranchingPointTool.ts: handleClick (wire targeting, insertion), wire validation per FR-029, FR-032
- [ ] T076 [US2] Implement DeleteTool in src/rendering/static/tools/DeleteTool.ts: handleClick (delete), cascade logic for component pins, emit 'toolOperationCompleted' per FR-029, FR-032, FR-037

### Tool Operations Implementation

- [ ] T077 [US2] Implement tool preview rendering in src/rendering/static/StaticCircuitRenderer.ts: render preview objects semi-transparently, update on hover per FR-030
- [ ] T078 [US2] Implement tool validation feedback in src/rendering/static/StaticCircuitRenderer.ts: highlight conflicts, show error preview (red tint), emit 'toolValidationError' per FR-036
- [ ] T079 [US2] Implement tool interaction handlers in src/rendering/static/StaticCircuitRenderer.ts: handleToolClick(), handleToolHover(), handleToolScroll() delegate to active tool per FR-019
- [ ] T080 [US2] Implement tool-circuit integration in tool classes: delegate to Circuit API, construct ChangedData, call renderer.update(), complete within 100ms per FR-033, FR-037

**Checkpoint**: At this point, User Stories 1, 2, AND 3 work independently - static rendering supports full editing with 5 tools, simulation rendering animates

---

## Phase 6: User Story 4 - Performance Optimization for Complex Circuits (Priority: P3)

**Goal**: Optimize rendering for circuits with up to 500 components maintaining 30+ FPS. Implement dirty tracking, incremental updates, Level of Detail (LOD).

**Independent Test**: Load circuit with 500 components, measure frame time during render(), verify <33ms per frame (30 FPS).

**Note**: This is optimization work building on all previous stories.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T081 [P] [US4] Performance test for StaticCircuitRenderer with 500 components in tests/rendering/static/phasStaticCircuitRenderer.test.ts verifying render time <33ms per frame
- [ ] T082 [P] [US4] Performance test for SimulationCircuitRenderer with 500 components in tests/rendering/simulation/SimulationCircuitRenderer.test.ts verifying render time <33ms per frame
- [ ] T083 [P] [US4] Unit test for incremental update performance in tests/rendering/static/StaticCircuitRenderer.test.ts verifying only changed elements are updated

### Implementation for User Story 4

- [ ] T084 [P] [US4] Implement DirtyTracker class in src/rendering/shared/DirtyTracker.ts with markDirty(objectId), clearDirty(), getDirtyObjects() methods per performance optimization pattern
- [ ] T085 [US4] Integrate DirtyTracker into StaticCircuitRenderer.update() in src/rendering/static/StaticCircuitRenderer.ts: track changed objects, only update dirty elements per FR-012
- [ ] T086 [US4] Integrate DirtyTracker into SimulationCircuitRenderer.render() in src/rendering/simulation/SimulationCircuitRenderer.ts: only update visuals for components/wires with state changes
- [ ] T087 [P] [US4] Implement LOD (Level of Detail) system in src/rendering/shared/LODManager.ts: reduce geometry detail for distant objects (optional enhancement)
- [ ] T088 [US4] Add frustum culling optimization in StaticCircuitRenderer.render() in src/rendering/static/StaticCircuitRenderer.ts: skip updates for off-screen objects (optional, Three.js does this by default)
- [ ] T089 [US4] Add object pooling for frequently created/destroyed meshes in src/rendering/shared/ObjectPool.ts: reuse geometries/materials (optional enhancement)

**Checkpoint**: All user stories complete - renderers work independently and perform well at scale

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, documentation, final validation

- [ ] T090 [P] Add JSDoc comments to all public methods in src/rendering/static/StaticCircuitRenderer.ts per FR-019 and constitution quality standards
- [ ] T091 [P] Add JSDoc comments to all public methods in src/rendering/simulation/SimulationCircuitRenderer.ts per FR-019 and constitution quality standards
- [ ] T092 [P] Add JSDoc comments to all shared utility functions in src/rendering/shared/ files
- [ ] T093 [P] Unit test for FactoryRegistry with unregistered component types in tests/unit/rendering/FactoryRegistry.test.ts verifying fallback to default factory per TS-006
- [ ] T094 [P] Unit test for error handling in tests/unit/rendering/StaticCircuitRenderer.test.ts verifying initialization errors throw, runtime errors emit events per FR-018 and TS-002
- [ ] T095 [P] Unit test for error handling in tests/unit/rendering/SimulationCircuitRenderer.test.ts verifying error emission per FR-018
- [ ] T096 Validate quickstart.md examples in specs/003-threejs-rendering/quickstart.md: ensure all code samples compile and run
- [ ] T097 Create example usage in demo/ directory: static renderer example with simple circuit
- [ ] T098 Create example usage in demo/ directory: simulation renderer example with animated circuit
- [ ] T099 Run `npm test` to verify all unit tests pass with >80% coverage per constitution
- [ ] T100 Run `npm run lint` to verify TypeScript strict mode compliance per constitution
- [ ] T101 Update main README.md with rendering module usage section referencing quickstart.md
- [ ] T102 Update CHANGELOG.md with rendering module additions for version tracking

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase - Can start after Phase 2
- **User Story 3 (Phase 4)**: Depends on Foundational phase - Can start after Phase 2 (parallel with US1 if staffed)
- **User Story 2 (Phase 5)**: Depends on User Story 1 completion (builds on StaticCircuitRenderer)
- **User Story 4 (Phase 6)**: Depends on all previous user stories (optimization of existing code)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (CAN run parallel with US1)
- **User Story 2 (P2)**: Depends on User Story 1 completion - Adds edit feedback to StaticCircuitRenderer
- **User Story 4 (P3)**: Depends on User Stories 1, 2, 3 - Optimizes all existing renderers

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Shared utilities before renderer classes
- Renderer class skeleton before methods
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
Task: "Create src/rendering/shared/types.ts with RenderEvent types"
Task: "Implement EventEmitter class in src/rendering/shared/EventEmitter.ts"
Task: "Create src/rendering/shared/ComponentVisualFactory.ts"
Task: "Implement FactoryRegistry class"
Task: "Create CameraUtils, GeometryUtils, MaterialUtils, LightingUtils"
Task: "Create InterpolationController"

# Phase 3: Launch all tests for User Story 1 together:
Task: "Unit test for StaticCircuitRenderer constructor"
Task: "Unit test for StaticCircuitRenderer.initialize()"
Task: "Unit test for StaticCircuitRenderer.update() full update"
Task: "Unit test for StaticCircuitRenderer.getScene()"
Task: "Unit test for StaticCircuitRenderer.dispose()"
```

---

## Parallel Example: User Stories 1 and 3 (Both P1)

```bash
# After Foundational phase completes, split team:

# Developer A: User Story 1 - Static Circuit Visualization
Task: "Create src/rendering/static/StaticCircuitRenderer.ts with class skeleton"
Task: "Implement StaticCircuitRenderer.initialize()"
Task: "Implement _createComponentMesh(), _createWireMesh(), _createEnodeMesh()"
Task: "Implement StaticCircuitRenderer.update()"
Task: "Implement StaticCircuitRenderer.render(), dispose(), getScene()"

# Developer B: User Story 3 - Live Simulation Visualization (parallel)
Task: "Create src/rendering/simulation/SimulationCircuitRenderer.ts with class skeleton"
Task: "Implement SimulationCircuitRenderer.initialize()"
Task: "Implement _createComponentMesh(), _createWireMesh(), _createEnodeMesh() with state"
Task: "Implement _updateComponentState(), _updateWireAnimation()"
Task: "Implement SimulationCircuitRenderer.render() with interpolation"
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
- Renderers are stateless - state resides in Circuit/CircuitRunner instances
