# Tasks: Circuit Topology Visualizer

**Input**: Design documents from `/specs/002-topology-visualizer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included based on spec requirements (User Story 3 - validation tests, integration tests for rendering pipeline).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `scripts/visualizer/`, `tests/visualizer/` at repository root
- Output directory: `output/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure for visualizer

- [X] T001 Create scripts/visualizer directory structure per implementation plan
- [X] T002 [P] Create scripts/visualizer/src directory for TypeScript source files
- [X] T003 [P] Create tests/visualizer directory for test files
- [X] T004 [P] Add d3 and d3-graphviz dependencies to package.json
- [X] T005 [P] Add @types/d3 and @types/d3-graphviz dev dependencies to package.json
- [X] T006 [P] Add output/ to .gitignore for generated files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build configuration and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Configure Vite build for visualizer in vite.config.ts (library mode, IIFE format, entry: scripts/visualizer/src/main.ts, output: output/circuit-topology-visualizer.js)
- [X] T008 [P] Create npm script "build:visualizer" in package.json to run Vite build for visualizer
- [X] T009 [P] Create scripts/visualizer/circuit-topology-visualizer.html base template with textarea input, visualize button, error display div, and graph container div
- [X] T010 Implement circuit JSON type definitions in scripts/visualizer/src/types.ts (CircuitJSON, ComponentJSON, EnodeJSON, WireJSON interfaces from data-model.md)
- [X] T011 Implement error classes in scripts/visualizer/src/errors.ts (VisualizerError, ValidationError, IntegrityError, RenderError)

**Checkpoint**: Foundation ready - circuit visualization implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visualize Circuit Topology from JSON (Priority: P1) 🎯 MVP

**Goal**: Load circuit JSON, parse it, and display topology graph showing components and connections

**Independent Test**: Load a circuit JSON file, click visualize, and verify that a graph appears showing components and their connections

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement parseCircuitJSON() function in scripts/visualizer/src/parser.ts (validate JSON structure, extract components/enodes/wires)
- [X] T013 [P] [US1] Implement classifyEnodes() function in scripts/visualizer/src/parser.ts (distinguish pin-type vs branching-point enodes based on component field)
- [X] T014 [P] [US1] Implement generateShortId() utility in scripts/visualizer/src/parser.ts (extract first 8 characters from UUID)
- [X] T015 [US1] Implement buildParsedCircuit() function in scripts/visualizer/src/parser.ts (create ParsedCircuit structure with Maps and short IDs)
- [X] T016 [P] [US1] Implement generateDOTHeader() function in scripts/visualizer/src/graph-builder.ts (create DOT digraph with rankdir and attributes)
- [X] T017 [P] [US1] Implement generateComponentSubgraph() function in scripts/visualizer/src/graph-builder.ts (create DOT cluster subgraph with component label and pin nodes)
- [X] T018 [P] [US1] Implement generateBranchingPointNode() function in scripts/visualizer/src/graph-builder.ts (create DOT node for standalone enode with shape=point)
- [X] T019 [P] [US1] Implement generateWireEdge() function in scripts/visualizer/src/graph-builder.ts (create DOT edge with UUID label)
- [X] T020 [US1] Implement buildDOTGraph() main function in scripts/visualizer/src/graph-builder.ts (orchestrate DOT generation from ParsedCircuit)
- [X] T021 [US1] Implement CircuitVisualizer class in scripts/visualizer/src/renderer.ts (constructor with d3-graphviz initialization)
- [X] T022 [US1] Implement CircuitVisualizer.visualize() method in scripts/visualizer/src/renderer.ts (call parser, graph builder, and d3-graphviz renderDot)
- [X] T023 [US1] Implement CircuitVisualizer.clear() method in scripts/visualizer/src/renderer.ts (clear graph container)
- [X] T024 [US1] Implement CircuitVisualizer.destroy() method in scripts/visualizer/src/renderer.ts (cleanup d3-graphviz instance)
- [X] T025 [US1] Create main entry point in scripts/visualizer/src/main.ts (export CircuitVisualizer class as window.CircuitVisualizer)
- [X] T026 [US1] Add event listeners in scripts/visualizer/circuit-topology-visualizer.html (wire up visualize button to CircuitVisualizer.visualize)
- [X] T027 [US1] Test visualizer with sample circuit: verify simple-led-circuit.json loads and renders
- [X] T028 [US1] Test visualizer with sample circuit: verify switch-controlled-led.json loads and renders

**Checkpoint**: At this point, basic visualization should work - circuits can be loaded and displayed as graphs

---

## Phase 4: User Story 2 - Identify Components and Connection Types (Priority: P2)

**Goal**: Display component types, pin labels, and enode identifiers clearly in the graph for debugging

**Independent Test**: Load a circuit with multiple component types and verify each node displays its type label and pins are identifiable

### Implementation for User Story 2

- [X] T029 [P] [US2] Enhance generateComponentSubgraph() in scripts/visualizer/src/graph-builder.ts to include component type in label (format: "Type [shortId]")
- [X] T030 [P] [US2] Enhance generateComponentSubgraph() in scripts/visualizer/src/graph-builder.ts to add pin nodes with semantic labels (format: "pinLabel [shortId]")
- [X] T031 [P] [US2] Enhance generateBranchingPointNode() in scripts/visualizer/src/graph-builder.ts to display shortened UUID in label
- [X] T032 [P] [US2] Enhance generateWireEdge() in scripts/visualizer/src/graph-builder.ts to display shortened UUID as edge label
- [X] T033 [US2] Add DOT styling attributes in scripts/visualizer/src/graph-builder.ts (subgraph fill color, font names)
- [X] T034 [US2] Test visualizer with relay-circuit.json: verify all component types displayed correctly (Battery, Switch, Relay, SmallLED, RectangleLED)
- [X] T035 [US2] Test visualizer with transistor-circuit.json: verify pin labels shown correctly (collector, base, emitter, anode, cathode)
- [X] T036 [US2] Test visualizer with transistor-circuit.json: verify wire UUIDs displayed at edge midpoints

**Checkpoint**: At this point, all semantic information (types, pin labels, UUIDs) should be visible for debugging

---

## Phase 5: User Story 3 - Use Standalone HTML Page (Priority: P3)

**Goal**: Ensure visualizer works offline as a standalone HTML file without server or external dependencies

**Independent Test**: Open HTML file directly in browser (file:// protocol), load circuit JSON, and verify it works without network

### Tests for User Story 3

> **NOTE: Write these tests to validate bundling and integration**

- [X] T037 [P] [US3] Create test suite for parser in tests/visualizer/parser.test.ts
- [X] T038 [P] [US3] Add test: "should parse valid circuit JSON" in tests/visualizer/parser.test.ts
- [X] T039 [P] [US3] Add test: "should throw ValidationError for invalid JSON syntax" in tests/visualizer/parser.test.ts
- [X] T040 [P] [US3] Add test: "should throw IntegrityError for wire with non-existent enode" in tests/visualizer/parser.test.ts
- [X] T041 [P] [US3] Add test: "should classify pin-type and branching-point enodes correctly" in tests/visualizer/parser.test.ts
- [X] T042 [P] [US3] Add test: "should generate 8-character short IDs from UUIDs" in tests/visualizer/parser.test.ts
- [X] T043 [P] [US3] Create test suite for graph builder in tests/visualizer/graph-builder.test.ts
- [X] T044 [P] [US3] Add test: "should generate valid DOT header with digraph declaration" in tests/visualizer/graph-builder.test.ts
- [X] T045 [P] [US3] Add test: "should generate component subgraph with cluster prefix" in tests/visualizer/graph-builder.test.ts
- [X] T046 [P] [US3] Add test: "should include pin nodes within component subgraph" in tests/visualizer/graph-builder.test.ts
- [X] T047 [P] [US3] Add test: "should generate branching point nodes with shape=point" in tests/visualizer/graph-builder.test.ts
- [X] T048 [P] [US3] Add test: "should generate wire edges with UUID labels" in tests/visualizer/graph-builder.test.ts
- [X] T049 [P] [US3] Create integration test suite in tests/visualizer/integration.test.ts
- [X] T050 [P] [US3] Add test: "should render simple-led-circuit.json without errors" in tests/visualizer/integration.test.ts
- [X] T051 [P] [US3] Add test: "should render relay-circuit.json with all components" in tests/visualizer/integration.test.ts
- [X] T052 [P] [US3] Add test: "should render transistor-circuit.json within 3 seconds" in tests/visualizer/integration.test.ts

### Implementation for User Story 3

- [X] T053 [US3] Add error handling UI in scripts/visualizer/circuit-topology-visualizer.html (display error messages, clear button)
- [X] T054 [US3] Implement error display function in scripts/visualizer/src/ui.ts (show ValidationError, IntegrityError, RenderError messages)
- [X] T055 [US3] Update main.ts to wire error handling to UI in scripts/visualizer/src/main.ts
- [X] T056 [US3] Build visualizer bundle: run npm run build:visualizer
- [X] T057 [US3] Copy circuit-topology-visualizer.html to output/ directory as part of build process
- [X] T058 [US3] Test standalone HTML: open output/circuit-topology-visualizer.html in Chrome with file:// protocol
- [X] T059 [US3] Test standalone HTML: verify works offline (disable network, reload page, paste circuit JSON)
- [X] T060 [US3] Test standalone HTML: verify works in Firefox with file:// protocol
- [X] T061 [US3] Test standalone HTML: verify error display for invalid JSON input
- [X] T062 [US3] Test standalone HTML: verify error display for circuit with integrity errors

**Checkpoint**: All user stories should now be independently functional with offline capability verified

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, refinement, and quality improvements

- [X] T063 [P] Add JSDoc comments to all public functions in scripts/visualizer/src/parser.ts
- [X] T064 [P] Add JSDoc comments to all public functions in scripts/visualizer/src/graph-builder.ts
- [X] T065 [P] Add JSDoc comments to CircuitVisualizer class in scripts/visualizer/src/renderer.ts
- [X] T066 [P] Update README.md with visualizer usage section (link to quickstart.md)
- [X] T067 [P] Verify quickstart.md examples work correctly (test all commands and examples)
- [X] T068 [P] Add CSS styling to circuit-topology-visualizer.html (basic layout, error message styling)
- [X] T069 Code review: Verify no `any` types used in TypeScript source files
- [X] T070 Code review: Verify all error cases are handled (JSON parse, validation, integrity, render)
- [X] T071 Run npm test to verify all visualizer tests pass
- [X] T072 Run npm run lint to verify code style compliance
- [X] T073 Manual validation: Test visualizer with all 4 sample circuits (simple-led, switch-led, relay, transistor)
- [X] T074 Manual validation: Test performance with 50-component circuit (verify <3 second render time)
- [X] T075 Manual validation: Verify visualizer works in Safari and Edge browsers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational
  - User Story 2 (P2): Can start after Foundational (independent of US1)
  - User Story 3 (P3): Depends on US1 and US2 being complete (tests validate existing implementation)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 output but can be developed independently
- **User Story 3 (P3)**: Depends on US1 and US2 completion - Validates bundling and adds tests for existing features

### Within Each User Story

**User Story 1**:
- T012-T014 (parser utilities) can run in parallel [P]
- T016-T019 (graph builder utilities) can run in parallel [P]
- T015 (buildParsedCircuit) depends on T012-T014
- T020 (buildDOTGraph) depends on T016-T019
- T021-T024 (renderer) sequential after T020
- T025-T026 (wiring) sequential after T024
- T027-T028 (manual tests) sequential after T026

**User Story 2**:
- T029-T032 (enhancements) can run in parallel [P]
- T033 (styling) can run in parallel [P]
- T034-T036 (tests) sequential after enhancements

**User Story 3**:
- T037-T052 (all test tasks) can run in parallel [P]
- T053-T055 (error handling UI) sequential
- T056-T062 (bundling and validation) sequential after T055

### Parallel Opportunities

- **Setup (Phase 1)**: T002, T003, T004, T005, T006 can run in parallel
- **Foundational (Phase 2)**: T008, T009 can run in parallel; T010, T011 can run in parallel after T007
- **User Story 1**: T012-T014 in parallel, then T016-T019 in parallel
- **User Story 2**: T029-T033 can run in parallel
- **User Story 3**: T037-T052 (all test tasks) can run in parallel
- **Polish**: T063-T068 can run in parallel
- **Cross-story parallelism**: US1 and US2 can be worked on in parallel by different developers (after Foundational phase)

---

## Parallel Example: User Story 1

```bash
# Launch parser utility implementations together:
Task: "Implement parseCircuitJSON() function in scripts/visualizer/src/parser.ts"
Task: "Implement classifyEnodes() function in scripts/visualizer/src/parser.ts"
Task: "Implement generateShortId() utility in scripts/visualizer/src/parser.ts"

# Then launch graph builder utilities together:
Task: "Implement generateDOTHeader() function in scripts/visualizer/src/graph-builder.ts"
Task: "Implement generateComponentSubgraph() function in scripts/visualizer/src/graph-builder.ts"
Task: "Implement generateBranchingPointNode() function in scripts/visualizer/src/graph-builder.ts"
Task: "Implement generateWireEdge() function in scripts/visualizer/src/graph-builder.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch all test suite creations together:
Task: "Create test suite for parser in tests/visualizer/parser.test.ts"
Task: "Add test: 'should parse valid circuit JSON' in tests/visualizer/parser.test.ts"
Task: "Add test: 'should throw ValidationError for invalid JSON syntax' in tests/visualizer/parser.test.ts"
Task: "Add test: 'should throw IntegrityError for wire with non-existent enode' in tests/visualizer/parser.test.ts"
Task: "Create test suite for graph builder in tests/visualizer/graph-builder.test.ts"
Task: "Add test: 'should generate valid DOT header with digraph declaration' in tests/visualizer/graph-builder.test.ts"
# ... (all test tasks T037-T052)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T011) - CRITICAL
3. Complete Phase 3: User Story 1 (T012-T028)
4. **STOP and VALIDATE**:
   - Run `npm run build:visualizer`
   - Open `output/circuit-topology-visualizer.html`
   - Load sample circuits and verify graphs render
5. MVP ready for testing!

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Build system and types ready
2. **User Story 1** (Phase 3) → Basic visualization working → Test independently → Demo
3. **User Story 2** (Phase 4) → Enhanced labels and UUIDs → Test independently → Demo
4. **User Story 3** (Phase 5) → Offline capability validated, full test coverage → Test independently → Complete
5. **Polish** (Phase 6) → Production ready

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

1. **Developer A**: User Story 1 (T012-T028)
   - Implements parser, graph builder, renderer
   - Gets basic visualization working

2. **Developer B**: User Story 2 (T029-T036)
   - Enhances graph output with labels and styling
   - Can start as soon as foundational graph builder structure exists

3. **Developer C**: User Story 3 (T037-T062)
   - Writes comprehensive test suite
   - Validates bundling and offline capability
   - Can start test writing in parallel, runs tests once US1/US2 complete

All three can work in parallel on different files without conflicts.

---

## Task Summary

**Total Tasks**: 75

**By Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 5 tasks
- Phase 3 (User Story 1): 17 tasks
- Phase 4 (User Story 2): 8 tasks
- Phase 5 (User Story 3): 26 tasks
- Phase 6 (Polish): 13 tasks

**By User Story**:
- User Story 1 (P1 - Visualize Circuit Topology): 17 tasks
- User Story 2 (P2 - Identify Components and Connections): 8 tasks
- User Story 3 (P3 - Standalone HTML Page): 26 tasks

**Parallel Opportunities**: 45 tasks marked [P] can run in parallel within their phase

**MVP Scope** (User Story 1 only): 28 tasks (Phase 1 + Phase 2 + Phase 3)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- User Story 3 includes comprehensive test coverage for validation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths are relative to project root
- Use TypeScript strict mode - no `any` types allowed
- Build output: `output/circuit-topology-visualizer.js` and `output/circuit-topology-visualizer.html`
- Sample circuits from feature 001 used for testing
