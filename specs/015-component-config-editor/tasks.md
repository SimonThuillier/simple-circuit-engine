# Tasks: Component Config Editor

**Input**: Design documents from `/specs/015-component-config-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec - test tasks omitted. Add if needed.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths follow single project structure: `src/`, `tests/`

---

## Phase 1: Setup

**Purpose**: Add lil-gui dependency and create type definitions

- [x] T001 Install lil-gui dependency: `npm install lil-gui`
- [x] T002 [P] Create config form type definitions in src/scene/shared/types/ConfigTypes.ts (ConfigControlType, ConfigFieldDefinition, ConfigFormDefinition)
- [x] T003 [P] Create color preset utilities in src/scene/shared/utils/ColorPresets.ts (COLOR_PRESETS, isHexColor, hexToPresetOrHex, presetOrHexToHex)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend visual factory interface - MUST complete before user stories

**CRITICAL**: Factory interface extension blocks all user story work

- [x] T004 Extend IComponentVisualFactory interface in src/scene/shared/components/ComponentVisualFactory.ts with getConfigFormDefinition(), mapCoreConfigToForm(), mapFormToCoreConfig() methods
- [x] T005 Add default implementations in ComponentVisualFactoryBase (return null for getConfigFormDefinition, identity mapping for map methods)

**Checkpoint**: Factory interface ready - user story implementation can begin

---

## Phase 3: User Story 1 - Open Config Editor on CTRL+SHIFT+Click (Priority: P1) MVP

**Goal**: CTRL+SHIFT+click on component opens lil-gui panel with config fields

**Independent Test**: CTRL+SHIFT+click on SmallLED shows panel with mode/activeColor/idleColor fields

### Implementation for User Story 1

- [x] T006 [US1] Create ConfigPanelManager class in src/scene/shared/ConfigPanelManager.ts with constructor, open(), close(), dispose(), isOpen, currentComponentId
- [x] T007 [US1] Implement panel container creation and DOM positioning logic in ConfigPanelManager (right side preferred, viewport overflow handling)
- [x] T008 [US1] Implement lil-gui initialization and form building from ConfigFormDefinition in ConfigPanelManager.buildGui()
- [x] T009 [US1] Implement click-outside detection to close panel in ConfigPanelManager
- [x] T010 [US1] Implement Escape key handling to close panel in ConfigPanelManager
- [x] T011 [US1] Add CTRL+SHIFT+click detection in BuildTool.handlePointerDown() in src/scene/static/tools/BuildTool.ts
- [x] T012 [US1] Add mode check in BuildTool to prevent panel open during active operations (wire_creation, component_drag, etc.)
- [x] T013 [US1] Integrate ConfigPanelManager into CircuitController in src/scene/static/CircuitController.ts (instantiate, expose, dispose)
- [x] T014 [US1] Wire BuildTool CTRL+SHIFT+click to ConfigPanelManager.open() with screen position calculation

**Checkpoint**: User Story 1 complete - panel opens on CTRL+SHIFT+click, closes on Escape/click-outside

---

## Phase 4: User Story 2 - Edit Component Configuration Values (Priority: P1)

**Goal**: Changing values in panel updates component config map immediately

**Independent Test**: Change SmallLED activeColor in panel, verify Component.config.get('activeColor') reflects new value

### Implementation for User Story 2

- [x] T015 [US2] Implement onChange handler wiring in ConfigPanelManager.buildGui() for all control types
- [x] T016 [US2] Implement onValueChange() in ConfigPanelManager to call mapFormToCoreConfig and update Component.config
- [x] T017 [US2] Implement boolean control type (checkbox) in ConfigPanelManager.buildGui()
- [x] T018 [US2] Implement dropdown control type in ConfigPanelManager.buildGui()
- [x] T019 [US2] Implement color control type (hybrid preset dropdown + color picker) in ConfigPanelManager.buildGui()
- [x] T020 [US2] Emit 'changed' event from ConfigPanelManager when config value changes

**Checkpoint**: User Story 2 complete - config values update immediately on form change

---

## Phase 5: User Story 3 - Visual Update on Config Change (Priority: P2)

**Goal**: Changing appearance-related config updates 3D visual in real-time

**Independent Test**: Change SmallLED activeColor to blue, verify LED mesh material changes color immediately

### Implementation for User Story 3

- [x] T021 [US3] Call factory.updateFromConfiguration() in ConfigPanelManager.onValueChange() after config update
- [x] T022 [P] [US3] Implement updateFromConfiguration() in SmallLEDVisualFactory in src/scene/shared/components/SmallLEDVisualFactory.ts to update LED material color
- [x] T023 [P] [US3] Implement updateFromConfiguration() in DefaultVisualFactory for Cube color in src/scene/shared/components/DefaultVisualFactory.ts

**Checkpoint**: User Story 3 complete - visuals update in real-time on config change

---

## Phase 6: User Story 4 - Visual Factory Config Form Definition (Priority: P2)

**Goal**: Each factory defines its config form structure with correct control types and mappings

**Independent Test**: Call SwitchVisualFactory.getConfigFormDefinition() and verify it returns boolean field for initialState

### Implementation for User Story 4

- [x] T024 [P] [US4] Implement getConfigFormDefinition(), mapCoreConfigToForm(), mapFormToCoreConfig() in SwitchVisualFactory in src/scene/shared/components/SwitchVisualFactory.ts
- [x] T025 [P] [US4] Implement getConfigFormDefinition(), mapCoreConfigToForm(), mapFormToCoreConfig() in RelayVisualFactory in src/scene/shared/components/RelayVisualFactory.ts
- [x] T026 [P] [US4] Implement getConfigFormDefinition(), mapCoreConfigToForm(), mapFormToCoreConfig() in TransistorVisualFactory in src/scene/shared/components/TransistorVisualFactory.ts
- [x] T027 [P] [US4] Implement getConfigFormDefinition(), mapCoreConfigToForm(), mapFormToCoreConfig() in SmallLEDVisualFactory in src/scene/shared/components/SmallLEDVisualFactory.ts
- [x] T028 [P] [US4] Implement getConfigFormDefinition(), mapCoreConfigToForm(), mapFormToCoreConfig() in DefaultVisualFactory (for RectangleLED, Cube) in src/scene/shared/components/DefaultVisualFactory.ts
- [x] T029 [P] [US4] Verify BatteryVisualFactory and LightbulbVisualFactory return null from getConfigFormDefinition() (no config)

**Checkpoint**: User Story 4 complete - all factories define their config forms

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T030 Run typecheck: `npm run lint` to verify no TypeScript errors
- [x] T031 Manual test: Open circuit-editor, add Switch, CTRL+SHIFT+click to open panel, change initialState, verify config updated
- [x] T032 Manual test: Add SmallLED, CTRL+SHIFT+click, change activeColor via preset dropdown and color picker, verify visual updates
- [x] T033 Manual test: Verify panel doesn't open during wire creation or component drag operations
- [x] T034 Manual test: Verify click-outside and Escape both close panel correctly
- [x] T035 Verify panel repositions correctly when component is near viewport edge
- [x] T036 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on US1 (needs panel to be openable)
- **User Story 3 (Phase 5)**: Depends on US2 (needs onChange to trigger visual update)
- **User Story 4 (Phase 6)**: Depends on Foundational only - can run in parallel with US1/US2/US3
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

```
Setup (T001-T003)
    │
    ▼
Foundational (T004-T005)
    │
    ├───────────────────────────────────────┐
    ▼                                       ▼
US1 (T006-T014)                     US4 (T024-T029) [PARALLEL]
    │
    ▼
US2 (T015-T020)
    │
    ▼
US3 (T021-T023)
    │
    ▼
Polish (T030-T036)
```

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003 can run in parallel (different files)

**Phase 6 (US4)** - All factory implementations can run in parallel:
- T024, T025, T026, T027, T028, T029 (different factory files)

**Phase 5 (US3)**:
- T022, T023 can run in parallel (different factory files)

---

## Parallel Example: User Story 4

```bash
# Launch all factory implementations in parallel:
Task: "Implement form methods in SwitchVisualFactory"
Task: "Implement form methods in RelayVisualFactory"
Task: "Implement form methods in TransistorVisualFactory"
Task: "Implement form methods in SmallLEDVisualFactory"
Task: "Implement form methods in DefaultVisualFactory"
Task: "Verify Battery/Lightbulb return null"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T014) - Panel opens
4. Complete Phase 4: User Story 2 (T015-T020) - Config editable
5. **STOP and VALIDATE**: Open panel, change value, verify config updates
6. Deploy/demo if ready

### Full Implementation

1. MVP (above)
2. Add User Story 3 (T021-T023) - Visual updates
3. Add User Story 4 (T024-T029) - All factory forms (can be parallel with US1-US3)
4. Complete Polish (T030-T036)

### Recommended Execution Order

For single developer, execute in task ID order (T001 → T036).

For parallel team:
- Dev A: Setup + Foundational + US1 + US2 + US3
- Dev B: US4 (all factory implementations in parallel)
- Both: Polish

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story
- US4 (factory definitions) can start as soon as Foundational completes
- US1 → US2 → US3 must be sequential (each builds on previous)
- Commit after each task or logical group
- Manual tests in Polish phase verify end-to-end functionality
