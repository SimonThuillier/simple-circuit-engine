# Tasks: Circuit Runner Controller

**Input**: Design documents from `/specs/013-circuit-runner-controller/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in specification. Test tasks omitted per template guidelines.

**Organization**: Tasks grouped by user story priority (P1, P2) to enable independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend type definitions and prepare shared infrastructure

- [x] T001 [P] Add new simulation events to ControllerEventMap in src/scene/shared/types.ts (simulationPlayed, simulationPaused, simulationStepped, simulationTick)
- [x] T002 [P] Add wire material states 'voltage' and 'current' to WireMaterialState type in src/scene/shared/types.ts
- [x] T003 Add voltage and current LineMaterial instances to WireVisualManager in src/scene/shared/WireVisualManager.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core controller state and accessors that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add private state properties to CircuitRunnerController (_isPlaying, _tickIntervalMs, _simulationLoopId, _pointerDownHandler) in src/scene/simulation/CircuitRunnerController.ts
- [x] T005 Add public accessor getters (isPlaying, tickInterval, currentTick) to CircuitRunnerController in src/scene/simulation/CircuitRunnerController.ts
- [x] T006 Add tickInterval setter with validation (50-2000ms) to CircuitRunnerController in src/scene/simulation/CircuitRunnerController.ts
- [x] T007 Implement setCircuitRunner(runner) method to load circuit and initialize visuals in src/scene/simulation/CircuitRunnerController.ts
- [x] T008 Update onDispose() to clean up simulation loop and event handlers in src/scene/simulation/CircuitRunnerController.ts

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Control Simulation Playback (Priority: P1) 🎯 MVP

**Goal**: Enable users to start, pause, and step through simulation at configurable speed

**Independent Test**: Load circuit, verify play starts auto-advancing, pause stops it, step advances exactly one tick

### Implementation for User Story 1

- [x] T009 [US1] Implement play() method with setInterval loop in src/scene/simulation/CircuitRunnerController.ts
- [x] T010 [US1] Implement pause() method that clears interval in src/scene/simulation/CircuitRunnerController.ts
- [x] T011 [US1] Implement step() method that executes single tick in src/scene/simulation/CircuitRunnerController.ts
- [x] T012 [US1] Implement private _executeTick() method that calls runner.tick() and triggers visual updates in src/scene/simulation/CircuitRunnerController.ts
- [x] T013 [US1] Emit simulationPlayed event from play() in src/scene/simulation/CircuitRunnerController.ts
- [x] T014 [US1] Emit simulationPaused event from pause() in src/scene/simulation/CircuitRunnerController.ts
- [x] T015 [US1] Emit simulationStepped event from step() in src/scene/simulation/CircuitRunnerController.ts
- [x] T016 [US1] Emit simulationTick event from _executeTick() in src/scene/simulation/CircuitRunnerController.ts
- [x] T017 [US1] Handle tickInterval changes while playing (restart interval) in src/scene/simulation/CircuitRunnerController.ts

**Checkpoint**: Simulation playback controls work. Can play/pause/step through simulation.

---

## Phase 4: User Story 2 - Animate Component State Changes (Priority: P1)

**Goal**: Components visually update to reflect their simulation state (switch position, LED glow)

**Independent Test**: Run simulation with switch+LED circuit, verify switch animates and LED lights up when conditions met

### Implementation for User Story 2

- [x] T018 [US2] Implement _updateDirtyComponents(dirty) method using factory.updateAnimation() in src/scene/simulation/CircuitRunnerController.ts
- [x] T019 [US2] Call _updateDirtyComponents from _executeTick() after runner.tick() in src/scene/simulation/CircuitRunnerController.ts
- [x] T020 [US2] Verify SwitchVisualFactory.updateAnimation correctly rotates contactor in src/scene/shared/components/SwitchVisualFactory.ts (read and verify existing implementation)
- [x] T021 [US2] Verify SmallLEDVisualFactory.updateAnimation correctly applies glow in src/scene/shared/components/SmallLEDVisualFactory.ts (read and verify existing implementation)

**Checkpoint**: Components animate based on simulation state. Switch closes/opens, LED lights.

---

## Phase 5: User Story 5 - Interact with Triggerable Components (Priority: P1)

**Goal**: Users can click switches to toggle them during simulation

**Independent Test**: Click switch during simulation, verify it begins state transition and circuit responds

### Implementation for User Story 5

- [x] T022 [US5] Add click event listener registration in onInitialize() in src/scene/simulation/CircuitRunnerController.ts
- [x] T023 [US5] Implement _handlePointerDown(event) method to detect component clicks in src/scene/simulation/CircuitRunnerController.ts
- [x] T024 [US5] Check if clicked component is Switch type using componentObject3Ds userData in src/scene/simulation/CircuitRunnerController.ts
- [x] T025 [US5] Create UserCommand {type: 'toggle_switch', targetId, scheduledAtTick} for Switch clicks in src/scene/simulation/CircuitRunnerController.ts
- [x] T026 [US5] Submit command via runner.submitCommand() in src/scene/simulation/CircuitRunnerController.ts
- [x] T027 [US5] Remove click event listener in onDispose() in src/scene/simulation/CircuitRunnerController.ts

**Checkpoint**: Clicking switches toggles them. Circuit responds to user interaction.
 
---

## Phase 6: User Story 3 - Visualize Wire Electrical State (Priority: P2)

**Goal**: Wires change color based on electrical state (blue=current, red=voltage, white=idle)

**Independent Test**: Run simulation with battery, verify wires show correct colors based on hasVoltage/hasCurrent

### Implementation for User Story 3

- [x] T028 [US3] Implement _updateDirtyWires(dirty) method in src/scene/simulation/CircuitRunnerController.ts
- [x] T029 [US3] Get wire electrical state via runner.getWireState(wireId) in src/scene/simulation/CircuitRunnerController.ts
- [x] T030 [US3] Determine material state: 'current' if hasCurrent, 'voltage' if hasVoltage only, 'idle' otherwise in src/scene/simulation/CircuitRunnerController.ts
- [x] T031 [US3] Apply material state to wire Line2 via WireVisualManager in src/scene/simulation/CircuitRunnerController.ts
- [x] T032 [US3] Call _updateDirtyWires from _executeTick() in src/scene/simulation/CircuitRunnerController.ts

**Checkpoint**: Wires show electrical state visually. Blue for current, red for voltage only, white for idle.

---

## Phase 7: User Story 4 - Visualize ENode Electrical State (Priority: P2)

**Goal**: Pins and branching points show electrical state (blue=current, red=voltage glow)

**Independent Test**: Run simulation, verify pins glow when receiving voltage/current

### Implementation for User Story 4

- [x] T033 [US4] Implement _updateDirtyEnodes(dirty) method in src/scene/simulation/CircuitRunnerController.ts
- [x] T034 [US4] Get enode electrical state via runner.getEnodeState(enodeId) in src/scene/simulation/CircuitRunnerController.ts
- [x] T035 [US4] Apply emissive glow: blue (0x0000ff) for hasCurrent, red (0xff0000) for hasVoltage only, none for idle in src/scene/simulation/CircuitRunnerController.ts
- [x] T036 [US4] Handle both pin groups (on components) and standalone branching points in src/scene/simulation/CircuitRunnerController.ts
- [x] T037 [US4] Call _updateDirtyEnodes from _executeTick() in src/scene/simulation/CircuitRunnerController.ts

**Checkpoint**: Pins and branching points glow based on electrical state.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T038 [P] Add JSDoc comments to all public methods (play, pause, step, setCircuitRunner, isPlaying, tickInterval, currentTick) in src/scene/simulation/CircuitRunnerController.ts
- [x] T039 [P] Validate edge case: play on empty circuit handles gracefully in src/scene/simulation/CircuitRunnerController.ts
- [x] T040 [P] Validate edge case: rapid play/pause toggling works correctly in src/scene/simulation/CircuitRunnerController.ts
- [x] T041 [P] Validate edge case: circuit replacement while playing stops previous simulation in src/scene/simulation/CircuitRunnerController.ts
- [ ] T042 Run quickstart.md validation - verify usage example works
- [x] T043 Run npm test && npm run lint to ensure all existing tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Playback): No story dependencies
  - US2 (Component Animation): Depends on US1 (_executeTick exists)
  - US5 (Click Interaction): Depends on US1 (runner available)
  - US3 (Wire Visualization): Depends on US1 (_executeTick exists)
  - US4 (ENode Visualization): Depends on US1 (_executeTick exists)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - MVP implementation
- **User Story 2 (P1)**: Depends on US1 (uses _executeTick)
- **User Story 5 (P1)**: Depends on US1 (runner must be loaded)
- **User Story 3 (P2)**: Depends on US1 (uses _executeTick)
- **User Story 4 (P2)**: Depends on US1 (uses _executeTick)

### Parallel Opportunities

- T001, T002 (type definitions) can run in parallel
- T020, T021 (verify existing factories) can run in parallel
- T038, T039, T040, T041 (polish tasks) can run in parallel
- US3 and US4 can run in parallel after US1 completes

---

## Parallel Example: Setup Phase

```bash
# Launch all type definition tasks together:
Task: "Add new simulation events to ControllerEventMap in src/scene/shared/types.ts"
Task: "Add wire material states to WireMaterialState type in src/scene/shared/types.ts"
```

## Parallel Example: Polish Phase

```bash
# Launch all validation tasks together:
Task: "Add JSDoc comments to public methods"
Task: "Validate play on empty circuit"
Task: "Validate rapid play/pause toggling"
Task: "Validate circuit replacement while playing"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (type definitions, wire materials)
2. Complete Phase 2: Foundational (state, accessors, setCircuitRunner)
3. Complete Phase 3: User Story 1 (play/pause/step)
4. **STOP and VALIDATE**: Test simulation control independently
5. Can demo basic simulation playback

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Playback) → Test → Deploy (MVP!)
3. Add US2 (Component Animation) → Test → Components animate
4. Add US5 (Click Interaction) → Test → Switches clickable
5. Add US3 (Wire Visualization) → Test → Wires show state
6. Add US4 (ENode Visualization) → Test → Pins show state
7. Polish → Complete feature

### Recommended Order

Given dependencies, execute in this order:
1. Phase 1: Setup (T001-T003)
2. Phase 2: Foundational (T004-T008)
3. Phase 3: US1 Playback (T009-T017) - **MVP checkpoint**
4. Phase 4: US2 Component Animation (T018-T021)
5. Phase 5: US5 Click Interaction (T022-T027)
6. Phase 6: US3 Wire Visualization (T028-T032)
7. Phase 7: US4 ENode Visualization (T033-T037)
8. Phase 8: Polish (T038-T043)

---

## Notes

- All implementation focuses on single file: `src/scene/simulation/CircuitRunnerController.ts`
- Type extensions in `src/scene/shared/types.ts`
- Wire materials in `src/scene/shared/WireVisualManager.ts`
- Existing visual factories already have updateAnimation - just need to call them
- [P] tasks = different files, no dependencies
- Commit after each logical group of tasks
- Stop at any checkpoint to validate story independently
