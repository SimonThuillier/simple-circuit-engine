# Tasks: Simulation Speed Control & Component Transition Timing

**Input**: Design documents from `/specs/017-simulation-speed/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included as this is a simulation engine where timing accuracy is critical.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths based on single project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and constants/types shared across all stories

- [x] T001 Add simulation speed constants to src/core/simulation/types/SimulationConstants.ts (MIN_TPS=1, MAX_TPS=20, DEFAULT_TPS=5, DEFAULT_INTERVAL_MS=200)
- [x] T002 [P] Add JSDoc for tickCount parameter in src/core/simulation/types/UserCommand.ts documenting its use for switch toggle commands

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Note**: This feature extends existing infrastructure. No foundational blocking work needed - existing CircuitRunner, behaviors, and controller are already in place.

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Adjust Simulation Speed During Runtime (Priority: P1)

**Goal**: Enable users to adjust simulation speed (1-20 TPS) via slider while simulation is running

**Independent Test**: Start simulation, adjust speed slider from default to 1 TPS and 20 TPS, verify tick rate changes accordingly

### Tests for User Story 1

- [x] T003 [P] [US1] Unit test for simulationSpeed getter/setter in tests/scene/simulation/CircuitRunnerController.test.ts - verify TPS conversion, range clamping (1-20), and immediate effect during playback
- [x] T004 [P] [US1] Unit test for simulationSpeed facade property in tests/scene/CircuitEngine.test.ts - verify delegation to controller

### Implementation for User Story 1

- [x] T005 [US1] Add simulationSpeed getter/setter to CircuitRunnerController in src/scene/simulation/CircuitRunnerController.ts - compute from tickIntervalMs, clamp range 1-20 TPS, restart interval if playing
- [x] T006 [US1] Add minSimulationSpeed and maxSimulationSpeed readonly properties to CircuitRunnerController in src/scene/simulation/CircuitRunnerController.ts
- [x] T007 [US1] Add simulationSpeedChanged event emission to CircuitRunnerController setter in src/scene/simulation/CircuitRunnerController.ts
- [x] T008 [US1] Add simulationSpeed getter/setter facade to CircuitEngine in src/CircuitEngine.ts - delegate to CircuitRunnerController
- [x] T009 [US1] Add speed slider HTML and event handling in demo/main.ts - range input (1-20), positioned under play/pause, updates engine.simulationSpeed on change
- [x] T010 [US1] Add speed display label (e.g., "5 TPS") next to slider in demo/main.ts - update on slider change and simulationSpeedChanged event

**Checkpoint**: User Story 1 complete - speed adjustment works during runtime

---

## Phase 4: User Story 2 - Configure Relay/Transistor Transition Timing (Priority: P2)

**Goal**: Enable configurable transitionSpan (in ticks) for relays and transistors to model realistic switching delays

**Independent Test**: Place relay with transitionSpan=3, activate it, verify output changes after exactly 3 ticks

### Tests for User Story 2

- [x] T011 [P] [US2] Unit test for RelayBehavior transitionSpan in tests/core/simulation/behaviors/RelayBehavior.test.ts - verify transition completes at correct tick count, test default=1, test cancellation when coil power removed mid-transition
- [x] T012 [P] [US2] Unit test for TransistorBehavior transitionSpan in tests/core/simulation/behaviors/TransistorBehavior.test.ts - verify transition completes at correct tick count, test default=1, test cancellation when gate signal removed mid-transition

### Implementation for User Story 2

- [x] T013 [US2] Add helper function getTransitionSpan(config: Map<string,string>): number in src/core/simulation/behaviors/RelayBehavior.ts - parse config, return max(1, parseInt(transitionSpan) || 1)
- [x] T014 [US2] Modify RelayBehavior.onPinsChange() in src/core/simulation/behaviors/RelayBehavior.ts - replace hardcoded +1 with getTransitionSpan() for readyAtTick calculation
- [x] T015 [US2] Add transition cancellation logic to RelayBehavior.onPinsChange() in src/core/simulation/behaviors/RelayBehavior.ts - if in "closing" state and coil unpowered, revert to "open"; if in "opening" state and coil powered, revert to "closed"
- [x] T016 [US2] Add helper function getTransitionSpan(config: Map<string,string>): number in src/core/simulation/behaviors/TransistorBehavior.ts - parse config, return max(1, parseInt(transitionSpan) || 1)
- [x] T017 [US2] Modify TransistorBehavior.onPinsChange() in src/core/simulation/behaviors/TransistorBehavior.ts - replace hardcoded +1 with getTransitionSpan() for readyAtTick calculation
- [x] T018 [US2] Add transition cancellation logic to TransistorBehavior.onPinsChange() in src/core/simulation/behaviors/TransistorBehavior.ts - if in "closing" state and gate off, revert to "open"; if in "opening" state and gate on, revert to "closed"
- [x] T019 [US2] Register transitionSpan in component config editor for relay type in src/scene/tools/ComponentConfigEditor.ts (if exists) or demo config UI - add numeric input field with default=1, min=1 (NOTE: ComponentConfigEditor not yet implemented; transitionSpan config support added to behaviors, UI deferred to 015-component-config-editor)

**Checkpoint**: User Story 2 complete - relay/transistor transitions respect transitionSpan config

---

## Phase 5: User Story 3 - Speed-Adaptive Switch Transition Timing (Priority: P3)

**Goal**: Enable switch transitions to maintain consistent wall-clock duration regardless of simulation speed

**Independent Test**: Configure switch with transitionUserSpan=500ms, toggle at 10 TPS (expect 5 ticks), toggle at 20 TPS (expect 10 ticks), verify both take ~500ms wall-clock

### Tests for User Story 3

- [x] T020 [P] [US3] Unit test for SwitchBehavior tickCount handling in tests/core/simulation/behaviors/SwitchBehavior.test.ts - verify transition uses tickCount from command parameters, test minimum=1 tick
- [x] T021 [P] [US3] Unit test for tickCount computation in CircuitRunnerController in tests/scene/simulation/CircuitRunnerController.test.ts - verify formula ceil(transitionUserSpan × simulationSpeed / 1000), test minimum=1

### Implementation for User Story 3

- [x] T022 [US3] Modify SwitchBehavior.onUserCommand() in src/core/simulation/behaviors/SwitchBehavior.ts - read tickCount from command.parameters, use for readyAtTick calculation instead of hardcoded +1
- [x] T023 [US3] Add getTransitionUserSpan(config: Map<string,string>): number helper to CircuitRunnerController in src/scene/simulation/CircuitRunnerController.ts - parse config, return parseInt(transitionUserSpan) || 200
- [x] T024 [US3] Modify CircuitRunnerController._handleRegularClick() in src/scene/simulation/CircuitRunnerController.ts - compute tickCount = max(1, ceil(transitionUserSpan × simulationSpeed / 1000)), pass in command.parameters
- [x] T025 [US3] Register transitionUserSpan in component config editor for switch type in src/scene/tools/ComponentConfigEditor.ts (if exists) or demo config UI - add numeric input field with default=200, min=0, label "Transition (ms)" (NOTE: ComponentConfigEditor not yet implemented; transitionUserSpan config support added to controller, UI deferred to 015-component-config-editor)

**Checkpoint**: User Story 3 complete - switch transitions maintain wall-clock duration across speed changes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [x] T026 [P] Add JSDoc documentation for all new public methods in src/scene/simulation/CircuitRunnerController.ts (simulationSpeed, minSimulationSpeed, maxSimulationSpeed)
- [x] T027 [P] Add JSDoc documentation for simulationSpeed property in src/scene/CircuitEngine.ts
- [x] T028 Validate backward compatibility - run existing test suite to ensure circuits without new config params work with defaults (transitionSpan=1, transitionUserSpan=200ms) - ALL 912 TESTS PASS
- [ ] T029 Run quickstart.md validation - manually test all scenarios described in specs/017-simulation-speed/quickstart.md
- [ ] T030 Update sample circuits in samples/ to demonstrate new timing features (optional - create sample-relay-delay.json showing transitionSpan usage)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Empty for this feature - no blocking work
- **User Stories (Phase 3-5)**: Can proceed after Setup; can run in parallel with different developers
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - can start after Setup
- **User Story 2 (P2)**: No dependencies on US1 - can start after Setup
- **User Story 3 (P3)**: Depends on US1 (needs simulationSpeed property) - must complete after T005

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Helper functions before behavior modifications
- Behavior core logic before config UI
- Story complete before moving to next priority

### Parallel Opportunities

**User Story 1:**
```
Parallel: T003, T004 (tests in different files)
```

**User Story 2:**
```
Parallel: T011, T012 (tests in different files)
Parallel: T013, T016 (helper functions in different files)
After helpers: T014, T017 can run in parallel (different files)
After core: T015, T018 can run in parallel (different files)
```

**User Story 3:**
```
Parallel: T020, T021 (tests in different files)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 3: User Story 1 (T003-T010)
3. **STOP and VALIDATE**: Speed slider works, simulation speed adjustable 1-20 TPS
4. Demo if ready - core value delivered

### Incremental Delivery

1. MVP: Setup + User Story 1 → Speed control works
2. Add User Story 2 → Relay/transistor timing works → Demo
3. Add User Story 3 → Switch adaptive timing works → Demo
4. Polish phase → Documentation, validation, samples

### Parallel Team Strategy

With multiple developers:
1. Developer A: User Story 1 (speed control - P1)
2. Developer B: User Story 2 (relay/transistor timing - P2)
3. Note: User Story 3 depends on US1 completion (needs simulationSpeed)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All config values stored as strings, parsed to integers in behaviors (existing pattern)
- Default values ensure backward compatibility (transitionSpan=1, transitionUserSpan=200ms)
- Formula for switch tick count: ceil(transitionUserSpan × simulationSpeed / 1000), minimum 1
- Transition cancellation only applies to relay/transistor (input-driven), not switch (command-driven)
