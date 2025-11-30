# Tasks: Discrete-Time Circuit Simulation Engine

**Input**: Design documents from `/specs/001-simulation-engine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests ARE REQUIRED per constitution (TDD approach, 80% coverage minimum)

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Repository root structure: `src/core/simulation/`, `tests/core/simulation/`
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and simulation module structure

- [x] T001 Create directory structure `src/core/simulation/` with subdirectories: `behaviors/`, `states/`, `types/`
- [x] T002 Create directory structure `tests/core/simulation/` with subdirectories: `behaviors/`, `integration/`, `unit/`
- [x] T003 [P] Create `src/core/simulation/index.ts` with module exports placeholder
- [x] T004 [P] Create `src/core/simulation/types/index.ts` with exports placeholder
- [x] T005 [P] Create `src/core/simulation/states/index.ts` with exports placeholder
- [x] T006 [P] Create `src/core/simulation/behaviors/index.ts` with exports placeholder

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 [P] Define `RunnerOptions` interface in `src/core/simulation/types/RunnerOptions.ts`
- [ ] T008 [P] Define `NodeElectricalState` interface in `src/core/simulation/states/NodeElectricalState.ts`
- [ ] T009 [P] Define `ComponentState` base class in `src/core/simulation/states/ComponentState.ts`
- [ ] T010 [P] Define `ScheduledEvent` interface in `src/core/simulation/types/ScheduledEvent.ts`
- [ ] T011 [P] Define `UserCommand` interface in `src/core/simulation/types/UserCommand.ts`
- [ ] T012 Implement `SimulationState` class in `src/core/simulation/SimulationState.ts` (depends on T007-T011)
- [ ] T013 [P] Write unit test for `SimulationState` in `tests/core/simulation/unit/SimulationState.test.ts`
- [ ] T014 [P] Implement `EventQueue` min-heap class in `src/core/simulation/EventQueue.ts`
- [ ] T015 [P] Write unit test for `EventQueue` in `tests/core/simulation/unit/EventQueue.test.ts`
- [ ] T016 [P] Implement `DirtyTracker` class in `src/core/simulation/DirtyTracker.ts`
- [ ] T017 [P] Write unit test for `DirtyTracker` in `tests/core/simulation/unit/DirtyTracker.test.ts`
- [ ] T018 [P] Define `ComponentBehavior` interface in `src/core/simulation/behaviors/ComponentBehavior.ts`
- [ ] T019 Implement `BehaviorRegistry` class in `src/core/simulation/behaviors/BehaviorRegistry.ts` (depends on T018)
- [ ] T020 [P] Write unit test for `BehaviorRegistry` in `tests/core/simulation/unit/behaviors/BehaviorRegistry.test.ts`
- [ ] T021 Implement `StateManager` class in `src/core/simulation/StateManager.ts` (depends on T012)
- [ ] T022 [P] Write unit test for `StateManager` in `tests/core/simulation/unit/StateManager.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Circuit State Simulation (Priority: P1) 🎯 MVP

**Goal**: Simulate simple circuits with binary state propagation from voltage sources through wires to components

**Independent Test**: Create battery → wire → LED circuit, run one step, verify LED turns on and wire is powered

### Tests for User Story 1

> **NOTE: Write these tests FIRST (TDD), ensure they FAIL before implementation**

- [ ] T023 [P] [US1] Write integration test for battery-LED circuit in `tests/core/simulation/integration/basic-circuit.test.ts`
- [ ] T024 [P] [US1] Write unit test for `BatteryBehavior.evaluate()` in `tests/core/simulation/unit/behaviors/BatteryBehavior.test.ts`
- [ ] T025 [P] [US1] Write unit test for `LEDBehavior.evaluate()` in `tests/core/simulation/unit/behaviors/LEDBehavior.test.ts`
- [ ] T026 [P] [US1] Write unit test for `CircuitRunner.tick()` propagation in `tests/core/simulation/unit/CircuitRunner.test.ts`

### Implementation for User Story 1

- [ ] T027 [P] [US1] Implement `BatteryState` class in `src/core/simulation/states/BatteryState.ts`
- [ ] T028 [P] [US1] Implement `LEDState` class in `src/core/simulation/states/LEDState.ts`
- [ ] T029 [US1] Implement `BatteryBehavior` class in `src/core/simulation/behaviors/BatteryBehavior.ts` (always outputs voltage)
- [ ] T030 [US1] Implement `LEDBehavior` class in `src/core/simulation/behaviors/LEDBehavior.ts` (turns on when input powered)
- [ ] T031 [US1] Implement `CircuitRunner` constructor in `src/core/simulation/CircuitRunner.ts` (initialize state, registry, managers)
- [ ] T032 [US1] Implement `CircuitRunner.tick()` method with topological state propagation
- [ ] T033 [US1] Implement `CircuitRunner.getCurrentTick()` getter method
- [ ] T034 [US1] Implement `CircuitRunner.getComponentState()` query method
- [ ] T035 [US1] Implement `CircuitRunner.getEnodeState()` query method
- [ ] T036 [US1] Implement `CircuitRunner.getWireState()` query method
- [ ] T037 [US1] Implement `CircuitRunner.reset()` method to clear all states
- [ ] T038 [US1] Register default behaviors (Battery, LED) in `BehaviorRegistry` during `CircuitRunner` init
- [ ] T039 [US1] Add JSDoc documentation to all public `CircuitRunner` methods
- [ ] T040 [US1] Export `CircuitRunner` and related types from `src/core/simulation/index.ts`
- [ ] T041 [US1] Verify all US1 tests pass and achieve 80%+ coverage

**Checkpoint**: At this point, User Story 1 should be fully functional - battery can power LED through wires

---

## Phase 4: User Story 2 - Switch and Interactive Component Behavior (Priority: P2)

**Goal**: Add interactive components (switches) that can change state via commands and affect circuit behavior

**Independent Test**: Create battery → switch → LED circuit, toggle switch, verify LED only powers when switch closed

### Tests for User Story 2

- [ ] T042 [P] [US2] Write integration test for switch circuit in `tests/core/simulation/integration/switch-circuit.test.ts`
- [ ] T043 [P] [US2] Write unit test for `SwitchBehavior.evaluate()` in `tests/core/simulation/unit/behaviors/SwitchBehavior.test.ts`
- [ ] T044 [P] [US2] Write unit test for `CircuitRunner.queueCommand()` in `tests/core/simulation/unit/CircuitRunner-commands.test.ts`
- [ ] T045 [P] [US2] Write unit test for `CircuitRunner.executeCommand()` in `tests/core/simulation/unit/CircuitRunner-commands.test.ts`

### Implementation for User Story 2

- [ ] T046 [P] [US2] Implement `SwitchState` class in `src/core/simulation/states/SwitchState.ts` (open/closed states)
- [ ] T047 [US2] Implement `SwitchBehavior` class in `src/core/simulation/behaviors/SwitchBehavior.ts` (propagates if closed)
- [ ] T048 [US2] Implement `CircuitRunner.queueCommand()` method to schedule future user commands
- [ ] T049 [US2] Implement `CircuitRunner.executeCommand()` method for immediate command execution
- [ ] T050 [US2] Add command processing logic to `CircuitRunner.tick()` (process commands before propagation)
- [ ] T051 [US2] Implement `toggle_switch` command handler in switch behavior
- [ ] T052 [US2] Register `SwitchBehavior` in default behaviors during `CircuitRunner` init
- [ ] T053 [US2] Add event emission for `command-executed` in `CircuitRunner`
- [ ] T054 [US2] Add JSDoc for command-related methods
- [ ] T055 [US2] Verify all US2 tests pass and maintain 80%+ coverage

**Checkpoint**: At this point, User Stories 1 AND 2 work independently - switches control circuit power flow

---

## Phase 5: User Story 3 - Delayed Component Transitions (Priority: P3)

**Goal**: Support components with time-based delays (e.g., transistors with N-step activation delay)

**Independent Test**: Create circuit with transistor (3-step delay), apply power to gate, verify activation after exactly 3 steps

### Tests for User Story 3

- [ ] T056 [P] [US3] Write integration test for delayed transistor in `tests/core/simulation/integration/delayed-transitions.test.ts`
- [ ] T057 [P] [US3] Write unit test for `TransistorBehavior.evaluate()` in `tests/core/simulation/unit/behaviors/TransistorBehavior.test.ts`
- [ ] T058 [P] [US3] Write unit test for event scheduling in `tests/core/simulation/unit/CircuitRunner-events.test.ts`
- [ ] T059 [P] [US3] Write unit test for FIFO event ordering in `tests/core/simulation/unit/EventQueue-fifo.test.ts`

### Implementation for User Story 3

- [ ] T060 [P] [US3] Implement `TransistorState` class in `src/core/simulation/states/TransistorState.ts` (inactive/activating/active/deactivating states)
- [ ] T061 [US3] Implement `TransistorBehavior` class in `src/core/simulation/behaviors/TransistorBehavior.ts` (schedules delayed transitions)
- [ ] T062 [US3] Add scheduled event processing to `CircuitRunner.tick()` (process ready events from EventQueue)
- [ ] T063 [US3] Implement delay counter decrement logic in component state updates
- [ ] T064 [US3] Add transition start tick tracking in `ComponentState` base class
- [ ] T065 [US3] Register `TransistorBehavior` in default behaviors during `CircuitRunner` init
- [ ] T066 [US3] Implement event scheduling helper methods in `CircuitRunner`
- [ ] T067 [US3] Add JSDoc for delay-related properties and methods
- [ ] T068 [US3] Verify all US3 tests pass and maintain 80%+ coverage

**Checkpoint**: All core user stories functional - delays work correctly with FIFO ordering

---

## Phase 6: User Story 4 - Performance for Large Circuits (Priority: P2)

**Goal**: Optimize simulation to handle 300+ component circuits at 60 FPS (≤16ms per step)

**Independent Test**: Create 300-component, 400-wire circuit, run 1000 steps, measure average step time <16ms

### Tests for User Story 4

- [ ] T069 [P] [US4] Write performance benchmark for 100-component circuit in `tests/core/simulation/integration/performance.test.ts`
- [ ] T070 [P] [US4] Write performance benchmark for 300-component circuit in `tests/core/simulation/integration/performance.test.ts`
- [ ] T071 [P] [US4] Write performance benchmark for 10,000-step stability in `tests/core/simulation/integration/performance.test.ts`
- [ ] T072 [P] [US4] Write unit test for dirty tracking optimization in `tests/core/simulation/unit/DirtyTracker-optimization.test.ts`

### Implementation for User Story 4

- [ ] T073 [US4] Implement topological sort caching in `CircuitRunner` (build once, reuse)
- [ ] T074 [US4] Optimize state propagation to skip unchanged subgraphs (dirty-driven)
- [ ] T075 [US4] Implement lazy component evaluation (only evaluate if inputs changed)
- [ ] T076 [US4] Add performance profiling instrumentation (optional, for debugging)
- [ ] T077 [US4] Optimize `EventQueue` heap operations (consider TypedArray if needed)
- [ ] T078 [US4] Optimize state map lookups (consider caching frequently accessed states)
- [ ] T079 [US4] Add memory pooling for state objects if benchmarks show allocations as bottleneck
- [ ] T080 [US4] Run performance benchmarks and verify all targets met (<10ms for 100 comp, <16ms for 300 comp)
- [ ] T081 [US4] Document performance characteristics in JSDoc comments
- [ ] T082 [US4] Verify all US4 tests pass and maintain 80%+ coverage

**Checkpoint**: Simulation meets all performance targets for production use

---

## Phase 7: CircuitEngine Integration & API

**Purpose**: Integrate CircuitRunner into existing CircuitEngine facade

- [ ] T083 Update `src/CircuitEngine.ts` to instantiate `CircuitRunner` in `loadCircuit()` method
- [ ] T084 [P] Implement `CircuitEngine.step()` to delegate to `CircuitRunner.tick()`
- [ ] T085 [P] Implement `CircuitEngine.reset()` to delegate to `CircuitRunner.reset()`
- [ ] T086 [P] Implement `CircuitEngine.getDirtyElements()` to expose dirty tracking
- [ ] T087 Add event forwarding from `CircuitRunner` to `CircuitEngine` (tick, state-changed events)
- [ ] T088 [P] Write integration test for `CircuitEngine` with simulation in `tests/CircuitEngine-simulation.test.ts`
- [ ] T089 Update `src/index.ts` to export simulation-related types
- [ ] T090 [P] Add JSDoc examples showing `CircuitEngine` + simulation usage
- [ ] T091 Verify facade integration tests pass

---

## Phase 8: Additional Component Behaviors

**Purpose**: Implement remaining standard component behaviors for complete library

- [ ] T092 [P] Implement `GroundBehavior` class in `src/core/simulation/behaviors/GroundBehavior.ts`
- [ ] T093 [P] Write unit test for `GroundBehavior` in `tests/core/simulation/unit/behaviors/GroundBehavior.test.ts`
- [ ] T094 [P] Implement `ResistorBehavior` class (passthrough for binary model) in `src/core/simulation/behaviors/ResistorBehavior.ts`
- [ ] T095 [P] Write unit test for `ResistorBehavior` in `tests/core/simulation/unit/behaviors/ResistorBehavior.test.ts`
- [ ] T096 [P] Implement `DiodeBehavior` class (one-way conduction) in `src/core/simulation/behaviors/DiodeBehavior.ts`
- [ ] T097 [P] Write unit test for `DiodeBehavior` in `tests/core/simulation/unit/behaviors/DiodeBehavior.test.ts`
- [ ] T098 Register all additional behaviors in `BehaviorRegistry` defaults
- [ ] T099 [P] Write integration tests for multi-component circuits using all behaviors
- [ ] T100 Verify all behavior tests pass and achieve 80%+ coverage

---

## Phase 9: History & Debugging Features

**Purpose**: Implement optional history tracking for debugging

- [ ] T101 Implement history storage logic in `StateManager.advance()` (circular buffer)
- [ ] T102 [P] Implement `CircuitRunner.getStateAt(tick)` historical state query
- [ ] T103 [P] Implement `CircuitRunner.clearHistory()` method
- [ ] T104 [P] Write unit test for history storage in `tests/core/simulation/unit/StateManager-history.test.ts`
- [ ] T105 [P] Write unit test for history queries in `tests/core/simulation/unit/CircuitRunner-history.test.ts`
- [ ] T106 [P] Write test for history limit enforcement (circular buffer wraparound)
- [ ] T107 Add configuration validation for `historyLimit` in `RunnerOptions`
- [ ] T108 Add JSDoc explaining history memory implications
- [ ] T109 Verify history tests pass and maintain 80%+ coverage

---

## Phase 10: Event System & Observability

**Purpose**: Complete event emission system for integration with rendering/playback

- [ ] T110 [P] Implement `CircuitRunner.on()` event listener registration (extends EventEmitter or custom)
- [ ] T111 [P] Implement `CircuitRunner.off()` event listener removal
- [ ] T112 Add `tick` event emission in `CircuitRunner.tick()`
- [ ] T113 [P] Add `state-changed` event emission with dirty elements payload
- [ ] T114 [P] Add `command-executed` event emission in command handlers
- [ ] T115 [P] Write unit test for event emissions in `tests/core/simulation/unit/CircuitRunner-events.test.ts`
- [ ] T116 [P] Write integration test demonstrating event-driven rendering updates
- [ ] T117 Add JSDoc examples for event listeners
- [ ] T118 Verify event tests pass

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements, documentation, and validation

- [ ] T119 [P] Run full test suite and verify 80%+ coverage for all simulation modules
- [ ] T120 [P] Add comprehensive JSDoc to all public APIs (classes, methods, interfaces)
- [ ] T121 [P] Create example circuits in `demo/` demonstrating each component type
- [ ] T122 Update `README.md` with simulation engine section and quick example
- [ ] T123 [P] Validate quickstart.md examples execute correctly
- [ ] T124 [P] Run linter (`npm run lint`) and fix all violations
- [ ] T125 [P] Run type checker (`tsc --noEmit`) and fix all type errors
- [ ] T126 Review and refactor any code smells (long methods, duplicated logic)
- [ ] T127 [P] Add performance monitoring examples to quickstart.md
- [ ] T128 Validate CircuitEngine facade integration end-to-end
- [ ] T129 Run full regression test suite (all tests pass)
- [ ] T130 Create demo showing battery → switch → transistor → LED chain

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational
  - US2 (P2): Can start after Foundational (independent of US1)
  - US3 (P3): Can start after Foundational (independent of US1, US2)
  - US4 (P2): Can start after US1 (needs basic simulation to benchmark)
- **Integration (Phase 7)**: Depends on US1 completion (MVP simulation working)
- **Additional Behaviors (Phase 8)**: Can run in parallel with US2/US3
- **History (Phase 9)**: Depends on Foundational (StateManager exists)
- **Events (Phase 10)**: Depends on Foundational (CircuitRunner exists)
- **Polish (Phase 11)**: Depends on all desired features being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational only - No dependencies on other stories ✅ TRUE INDEPENDENCE
- **User Story 2 (P2)**: Foundational only - No dependencies on other stories ✅ TRUE INDEPENDENCE
- **User Story 3 (P3)**: Foundational only - No dependencies on other stories ✅ TRUE INDEPENDENCE
- **User Story 4 (P2)**: Requires US1 complete (needs working simulation to measure performance)

### Within Each User Story

- Tests FIRST (fail before implementation)
- State classes before behaviors (behaviors depend on state types)
- Behaviors before runner integration (runner uses behaviors)
- Basic methods before advanced features
- Tests verify completion before moving to next story

### Parallel Opportunities

- **Setup tasks (T001-T006)**: All can run in parallel (different directories/files)
- **Foundational types (T007-T011)**: All can run in parallel (independent type definitions)
- **Foundational tests (T013, T015, T017, T020, T022)**: All can run in parallel after their implementations
- **US1 tests (T023-T026)**: All can run in parallel (different test files)
- **US1 state classes (T027-T028)**: Can run in parallel (independent files)
- **US2 tests (T042-T045)**: Can run in parallel
- **US3 tests (T056-T059)**: Can run in parallel
- **US4 tests (T069-T072)**: Can run in parallel
- **Different user stories**: US1, US2, US3 can be developed in parallel by different team members (all depend only on Foundational)
- **Component behaviors (Phase 8)**: All behaviors (T092-T097) can run in parallel
- **Polish tasks (most)**: Documentation, linting, examples can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch all US1 tests together:
Task: "Write integration test for battery-LED circuit"
Task: "Write unit test for BatteryBehavior.evaluate()"
Task: "Write unit test for LEDBehavior.evaluate()"
Task: "Write unit test for CircuitRunner.tick()"

# Then launch state implementations together:
Task: "Implement BatteryState class"
Task: "Implement LEDState class"

# Multiple team members can work US1, US2, US3 simultaneously:
Developer A: User Story 1 (Basic Simulation)
Developer B: User Story 2 (Switches)
Developer C: User Story 3 (Delays)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T022) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T023-T041)
4. **STOP and VALIDATE**: Run `npm test`, verify battery-LED circuit works
5. Integration check: Test via CircuitEngine facade (partial Phase 7)
6. Deploy/demo if ready - **Working simulation engine!**

### Incremental Delivery

1. **Foundation** → Setup + Foundational complete
2. **MVP (US1)** → Basic simulation working, independently testable
3. **Iteration 2 (US2)** → Add switches, independently testable
4. **Iteration 3 (US3)** → Add delays, independently testable
5. **Iteration 4 (US4)** → Performance optimization, benchmarks pass
6. **Final Polish** → All behaviors, events, documentation complete

Each iteration adds value without breaking previous functionality.

### Parallel Team Strategy

With 3 developers after Foundational phase:

1. **Phase 1-2**: Team completes Setup + Foundational together (critical path)
2. **Phase 3-5**: Once Foundational done:
   - Developer A: User Story 1 (T023-T041)
   - Developer B: User Story 2 (T042-T055)
   - Developer C: User Story 3 (T056-T068)
3. **Phase 6**: Developer A tackles US4 (depends on US1 being done)
4. **Phase 7-10**: Developers collaborate on integration, behaviors, events
5. **Phase 11**: All developers contribute to polish

---

## Notes

- **[P] marker**: Tasks marked [P] can run in parallel (different files, no dependencies)
- **[Story] label**: Maps task to specific user story for traceability and independent testing
- **TDD Required**: Per constitution, tests MUST be written first and MUST fail before implementation
- **80% Coverage**: Minimum test coverage required for core module per constitution
- **File Paths**: All paths are exact and complete for immediate executability
- **Independent Testing**: Each user story checkpoint validates that story works standalone
- **Vitest**: Use Vitest 4.0+ for all tests (per constitution)
- **TypeScript Strict**: All code must compile with strict mode enabled
- **JSDoc**: All public APIs require comprehensive JSDoc comments
- **Commit Strategy**: Commit after each task or logical group (tests + implementation)
- **Performance Baseline**: US4 establishes < 16ms per step for 300 components as acceptance criterion

---

## Total Task Count: 130 tasks

- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 16 tasks
- **Phase 3 (US1 - MVP)**: 19 tasks
- **Phase 4 (US2)**: 14 tasks
- **Phase 5 (US3)**: 13 tasks
- **Phase 6 (US4)**: 14 tasks
- **Phase 7 (Integration)**: 9 tasks
- **Phase 8 (Behaviors)**: 9 tasks
- **Phase 9 (History)**: 9 tasks
- **Phase 10 (Events)**: 9 tasks
- **Phase 11 (Polish)**: 12 tasks

**Parallel Opportunities**: 67 tasks marked [P] (51% parallelizable)

**MVP Scope**: Phases 1-3 = 41 tasks for working simulation engine

**Story Distribution**:
- US1 (P1 - MVP): 19 tasks
- US2 (P2): 14 tasks
- US3 (P3): 13 tasks
- US4 (P2): 14 tasks
