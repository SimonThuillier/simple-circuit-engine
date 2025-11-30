# Tasks: Sample Circuit Generation Scripts

**Input**: Design documents from `/specs/001-sample-circuit-scripts/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included based on spec requirements for validation (User Story 3).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `scripts/`, `tests/` at repository root
- Output directory: `output/sample-circuits/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure for sample circuits

- [x] T001 Create scripts/samples directory structure per implementation plan
- [x] T002 [P] Create scripts/samples/circuits directory for circuit factory functions
- [x] T003 [P] Create scripts/samples/utils directory for helper utilities
- [x] T004 [P] Create tests/samples directory for circuit generation tests
- [x] T005 [P] Add output/sample-circuits to .gitignore for generated JSON files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement writeCircuitToFile() utility in scripts/samples/utils/file-writer.ts
- [x] T007 Add JSDoc documentation for writeCircuitToFile() with error handling examples
- [x] T008 Implement createDirectory() helper in scripts/samples/utils/file-writer.ts for recursive directory creation

**Checkpoint**: Foundation ready - circuit factory implementations can now begin in parallel

---

## Phase 3: User Story 1 - Generate Sample Circuit Data (Priority: P1) 🎯 MVP

**Goal**: Create executable scripts that generate 4 distinct sample circuit JSON files with basic functionality

**Independent Test**: Run generation script and verify 4 JSON files are created in output/sample-circuits/ with valid circuit structure

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement createSimpleLedCircuit() factory in scripts/samples/circuits/simple-led-circuit.ts (2-3 components: Battery, SmallLED)
- [x] T010 [P] [US1] Add JSDoc documentation for createSimpleLedCircuit() with circuit structure description
- [x] T011 [P] [US1] Implement createSwitchControlledLedCircuit() factory in scripts/samples/circuits/switch-controlled-led.ts (3-4 components: Battery, Switch, SmallLED)
- [x] T012 [P] [US1] Add JSDoc documentation for createSwitchControlledLedCircuit() with wiring details
- [x] T013 [US1] Create CircuitDefinition type interface in scripts/samples/generate-sample-circuits.ts
- [x] T014 [US1] Implement generateSampleCircuits() orchestrator function in scripts/samples/generate-sample-circuits.ts
- [x] T015 [US1] Add JSDoc documentation for generateSampleCircuits() with usage examples
- [x] T016 [US1] Add main script entry point to scripts/samples/generate-sample-circuits.ts with console logging
- [x] T017 [US1] Add npm script "generate:samples" to package.json for running the generation script
- [x] T018 [US1] Verify script execution creates output/sample-circuits/ directory automatically
- [x] T019 [US1] Verify 2 JSON files are generated (simple-led-circuit.json, switch-controlled-led.json)

**Checkpoint**: At this point, basic sample generation should work - 2 circuits can be generated and saved as JSON

---

## Phase 4: User Story 2 - Validate Circuit Diversity (Priority: P2)

**Goal**: Add diverse circuit topologies demonstrating different component combinations and connection patterns

**Independent Test**: Analyze generated JSON files and verify circuits use different component counts, ComponentTypes, and topologies

### Implementation for User Story 2

- [x] T020 [P] [US2] Implement createRelayCircuit() factory in scripts/samples/circuits/relay-circuit.ts (5-7 components: Batteries, Relay, Switch, LED demonstrating isolated circuits)
- [x] T021 [P] [US2] Add JSDoc documentation for createRelayCircuit() explaining dual circuit topology
- [x] T022 [P] [US2] Implement createTransistorCircuit() factory in scripts/samples/circuits/transistor-circuit.ts (6-10 components: Transistor, Batteries, Switches, LEDs)
- [x] T023 [P] [US2] Add JSDoc documentation for createTransistorCircuit() explaining hierarchical control pattern
- [x] T024 [US2] Add relay-circuit and transistor-circuit entries to CircuitDefinition array in generate-sample-circuits.ts
- [x] T025 [US2] Verify all 4 circuits use different component counts within 2-10 range
- [x] T026 [US2] Verify circuits collectively use at least 5 different ComponentTypes (Battery, Switch, LED variants, Relay, Transistor)
- [x] T027 [US2] Verify each circuit demonstrates unique topology (series, switched, isolated, hierarchical)

**Checkpoint**: At this point, all 4 circuits with diverse topologies should be generated

---

## Phase 5: User Story 3 - Load and Verify Sample Circuits (Priority: P3)

**Goal**: Implement validation tests to verify generated circuits can be loaded and are structurally valid

**Independent Test**: Load each generated JSON file using Circuit.fromJSON() and verify no errors occur

### Tests for User Story 3

> **NOTE: Write these tests to validate generated output**

- [x] T028 [P] [US3] Create test suite for circuit generation in tests/samples/circuit-generation.test.ts
- [x] T029 [P] [US3] Add test: "should generate 4 circuit JSON files" in circuit-generation.test.ts
- [x] T030 [P] [US3] Add test: "should create output directory if missing" in circuit-generation.test.ts
- [x] T031 [P] [US3] Add test: "should overwrite existing files on re-run" in circuit-generation.test.ts
- [x] T032 [P] [US3] Create test suite for JSON validation in tests/samples/json-validation.test.ts
- [x] T033 [P] [US3] Add test: "should load simple-led-circuit.json via Circuit.fromJSON()" in json-validation.test.ts
- [x] T034 [P] [US3] Add test: "should load switch-controlled-led.json via Circuit.fromJSON()" in json-validation.test.ts
- [x] T035 [P] [US3] Add test: "should load relay-circuit.json via Circuit.fromJSON()" in json-validation.test.ts
- [x] T036 [P] [US3] Add test: "should load transistor-circuit.json via Circuit.fromJSON()" in json-validation.test.ts
- [x] T037 [P] [US3] Add test: "should verify all circuits have correct component counts" in json-validation.test.ts
- [x] T038 [P] [US3] Add test: "should verify all components have proper pins and wires" in json-validation.test.ts

### Implementation for User Story 3

- [x] T039 [US3] Run all tests and verify they pass after circuit generation
- [x] T040 [US3] Add error handling for file I/O operations with clear error messages
- [x] T041 [US3] Add error handling for Circuit.fromJSON() failures in validation tests
- [x] T042 [US3] Verify deterministic output (same circuits generated on multiple runs)

**Checkpoint**: All user stories should now be independently functional with test coverage

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, refinement, and quality improvements

- [x] T043 [P] Add README section documenting how to generate sample circuits
- [x] T044 [P] Verify quickstart.md examples work correctly with generated files
- [x] T045 [P] Add console logging for each circuit generation step (e.g., "Written: output/sample-circuits/simple-led-circuit.json")
- [x] T046 [P] Verify all factory functions follow JSDoc standards with @returns and @example tags
- [x] T047 [P] Add comments explaining pin index usage for circuit wiring (e.g., battery.pins[0] = cathode, battery.pins[1] = anode)
- [x] T048 Code review: Verify no `any` types used in scripts
- [x] T049 Code review: Verify all Position and Rotation values are integers
- [x] T050 Run npm test to verify all sample circuit tests pass
- [x] T051 Run npm run lint to verify code style compliance
- [x] T052 Manual validation: Run npm run generate:samples and inspect JSON output
- [x] T053 Manual validation: Load generated circuits in demo application (if available)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational
  - User Story 2 (P2): Can start after Foundational (independent of US1)
  - User Story 3 (P3): Depends on US1 and US2 being complete (needs generated files to test)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1 (adds more circuits)
- **User Story 3 (P3)**: Depends on US1 and US2 completion - Validates generated output from previous stories

### Within Each User Story

**User Story 1**:
- T009-T012 (circuit factories) can run in parallel [P]
- T013-T017 (orchestrator) sequential (use factory functions)
- T018-T019 (verification) sequential (after T017)

**User Story 2**:
- T020-T023 (circuit factories) can run in parallel [P]
- T024 (add to orchestrator) sequential
- T025-T027 (verification) sequential (after T024)

**User Story 3**:
- T028-T038 (all test tasks) can run in parallel [P] (different test files)
- T039-T042 (validation) sequential (after tests written)

### Parallel Opportunities

- **Setup (Phase 1)**: T002, T003, T004, T005 can run in parallel
- **Foundational (Phase 2)**: All tasks sequential (file-writer.ts)
- **User Story 1**: T009-T012 (circuit factories) can run in parallel
- **User Story 2**: T020-T023 (circuit factories) can run in parallel
- **User Story 3**: T028-T038 (all test files) can run in parallel
- **Polish**: T043-T047 can run in parallel
- **Cross-story parallelism**: US1 and US2 can be worked on in parallel by different developers (after Foundational phase)

---

## Parallel Example: User Story 1

```bash
# Launch circuit factory implementations together:
Task: "Implement createSimpleLedCircuit() factory in scripts/samples/circuits/simple-led-circuit.ts"
Task: "Add JSDoc documentation for createSimpleLedCircuit()"
Task: "Implement createSwitchControlledLedCircuit() factory in scripts/samples/circuits/switch-controlled-led.ts"
Task: "Add JSDoc documentation for createSwitchControlledLedCircuit()"
```

---

## Parallel Example: User Story 3

```bash
# Launch all validation tests together:
Task: "Create test suite for circuit generation in tests/samples/circuit-generation.test.ts"
Task: "Add test: 'should generate 4 circuit JSON files'"
Task: "Add test: 'should create output directory if missing'"
Task: "Create test suite for JSON validation in tests/samples/json-validation.test.ts"
Task: "Add test: 'should load simple-led-circuit.json via Circuit.fromJSON()'"
# ... (all test tasks T028-T038)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T019)
4. **STOP and VALIDATE**:
   - Run `npm run generate:samples`
   - Verify 2 JSON files created
   - Manually inspect JSON structure
   - Try loading with Circuit.fromJSON()
5. MVP ready for testing!

### Incremental Delivery

1. **Foundation** (Phases 1-2) → Utilities ready
2. **User Story 1** (Phase 3) → 2 basic circuits working → Test independently → Demo
3. **User Story 2** (Phase 4) → 4 diverse circuits working → Test independently → Demo
4. **User Story 3** (Phase 5) → Full validation suite → Test independently → Complete
5. **Polish** (Phase 6) → Production ready

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

1. **Developer A**: User Story 1 (T009-T019)
   - Implements simple and switch circuits
   - Gets basic generation working

2. **Developer B**: User Story 2 (T020-T027)
   - Implements relay and transistor circuits
   - Adds diversity to samples

3. **Developer C**: User Story 3 (T028-T042)
   - Writes validation tests
   - Can start once US1/US2 have generated some output

All three can work in parallel on different files without conflicts.

---

## Task Summary

**Total Tasks**: 53

**By Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 3 tasks
- Phase 3 (User Story 1): 11 tasks
- Phase 4 (User Story 2): 8 tasks
- Phase 5 (User Story 3): 15 tasks
- Phase 6 (Polish): 11 tasks

**By User Story**:
- User Story 1 (P1 - Generate Sample Circuit Data): 11 tasks
- User Story 2 (P2 - Validate Circuit Diversity): 8 tasks
- User Story 3 (P3 - Load and Verify Sample Circuits): 15 tasks

**Parallel Opportunities**: 30 tasks marked [P] can run in parallel within their phase

**MVP Scope** (User Story 1 only): 19 tasks (Phase 1 + Phase 2 + Phase 3)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- User Story 3 tests validate output from User Stories 1 and 2
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths are relative to project root
- Use TypeScript strict mode - no `any` types allowed
- All Position/Rotation values must be integers (enforced by constructors)
- Generated JSON must round-trip through Circuit.fromJSON() without errors
