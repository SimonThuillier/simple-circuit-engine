# Feature Specification: Component Config Editor

**Feature Branch**: `015-component-config-editor`
**Created**: 2025-12-28
**Status**: Draft
**Input**: User description: "When edition controller/build tool activated CTRL+SHIFT click on a component must trigger appearance of a lil-gui edition window to edit this component config. Component visual factory must handle the definition of the lil gui form and the visual update according to config change if necessary."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Open Config Editor on CTRL+SHIFT+Click (Priority: P1)

A user is editing a circuit using the build tool. They want to modify configuration parameters of a specific component (e.g., change LED color, switch initial state, relay activation logic). They hold CTRL+SHIFT and click on the component to open a dedicated configuration panel.

**Why this priority**: This is the core interaction pattern that enables users to access component configuration. Without this, no configuration editing is possible.

**Independent Test**: Can be fully tested by CTRL+SHIFT clicking on any configurable component and verifying the lil-gui panel appears with the correct configuration fields for that component type.

**Acceptance Scenarios**:

1. **Given** the build tool is active and a component with configuration options exists on the canvas, **When** the user holds CTRL+SHIFT and clicks on that component, **Then** a lil-gui panel appears near the component with editable fields matching the component's config map entries.
2. **Given** the build tool is active and the user CTRL+SHIFT clicks on a component with no configuration options (e.g., Lightbulb with empty config), **When** the panel would open, **Then** no panel appears (or panel appears with a "No configurable options" message).
3. **Given** the lil-gui panel is open for a component, **When** the user clicks elsewhere on the canvas (not on the panel), **Then** the panel closes.

---

### User Story 2 - Edit Component Configuration Values (Priority: P1)

A user has opened the configuration panel for a component. They modify a configuration value using the lil-gui controls. The underlying component config map is updated immediately.

**Why this priority**: This is the primary value delivery of the feature - actually changing configuration values.

**Independent Test**: Can be tested by opening the config panel, modifying a value, and verifying the component's config map reflects the change.

**Acceptance Scenarios**:

1. **Given** the config panel is open for a SmallLED component, **When** the user changes the "activeColor" dropdown from "red" to "green", **Then** the component's config map is updated with the new value.
2. **Given** the config panel is open for a Switch component, **When** the user toggles the "initialState" between "open" and "closed", **Then** the component's config map reflects the new state.
3. **Given** the config panel is open for a Relay component, **When** the user changes "activationLogic" from "positive" to "negative", **Then** the component's config map is updated accordingly.

---

### User Story 3 - Visual Update on Config Change (Priority: P2)

When a user changes a configuration value that affects the component's visual appearance (e.g., LED color), the component's 3D visual updates in real-time to reflect the change without requiring any additional user action.

**Why this priority**: Provides immediate visual feedback which is important for user experience, but the core functionality (editing config) works even without this.

**Independent Test**: Can be tested by opening a SmallLED config panel, changing the activeColor, and observing the LED visual mesh updates its material color.

**Acceptance Scenarios**:

1. **Given** the config panel is open for a SmallLED with activeColor "red", **When** the user changes activeColor to "blue", **Then** the LED's visual representation immediately updates to show the blue color.
2. **Given** the config panel is open for a Cube component, **When** the user changes the "color" config value, **Then** the Cube's visual material updates to the new color.
3. **Given** the config panel is open for a Switch component, **When** the user changes "initialState", **Then** no visual change occurs (since initialState only affects simulation, not edition appearance).

---

### User Story 4 - Visual Factory Config Form Definition (Priority: P2)

Each component visual factory defines the lil-gui form structure for its component type. The factory specifies which config keys are editable, their control types (dropdown, checkbox, color picker, number input), and any constraints (min/max values, allowed options).

**Why this priority**: Enables extensibility and proper separation of concerns. Each component type knows best how its config should be presented.

**Independent Test**: Can be tested by checking that each visual factory with configurable components provides a form definition method that returns the correct control types for its config keys.

**Acceptance Scenarios**:

1. **Given** a SmallLED component type, **When** the system requests the config form definition from SmallLEDVisualFactory, **Then** it returns a form definition with "mode" as dropdown (options: symmetric/asymmetric), "activeColor" as hybrid color control (dropdown with common colors + color picker for custom), and "idleColor" as hybrid color control.
2. **Given** a Switch component type, **When** the system requests the config form definition from SwitchVisualFactory, **Then** it returns a form definition with "initialState" as dropdown (options: open/closed).
3. **Given** a Battery component type (no configurable options), **When** the system requests the config form definition from BatteryVisualFactory, **Then** it returns an empty form definition or null.

---

### Edge Cases

- What happens when CTRL+SHIFT+click is performed while another mode is active (e.g., wire creation)? The config editor should not open during active operations to avoid conflicting interactions.
- How does the system handle components that are currently selected vs hovered? The config editor should work regardless of selection state.
- What happens if the user attempts to close the panel while the panel is processing a change? Changes should be applied immediately and the panel should close cleanly.
- What happens if multiple CTRL+SHIFT+clicks occur rapidly? Only one config panel should be open at a time; clicking on a different component should close the current panel and open a new one.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST detect CTRL+SHIFT+click events on components when the build tool is active
- **FR-002**: System MUST display a lil-gui panel when CTRL+SHIFT+click is performed on a configurable component
- **FR-003**: System MUST position the config panel adjacent to the clicked component (right side preferred), repositioning to avoid viewport overflow
- **FR-004**: System MUST close the config panel when the user clicks outside the panel or presses Escape
- **FR-005**: System MUST update the component's config map immediately when a value is changed in the panel
- **FR-006**: Component visual factories MUST define the form structure for their configurable options through a new interface method
- **FR-007**: System MUST call the visual factory's updateFromConfiguration method after config changes to update visuals
- **FR-008**: System MUST only allow one config panel open at a time
- **FR-009**: System MUST NOT open the config panel when the build tool is in an active mode (wire_creation, component_drag, etc.)
- **FR-010**: System MUST NOT open the config panel for components with no configurable options (empty config map)
- **FR-011**: Color configuration fields MUST provide both a dropdown with common preset colors and a color picker for custom color selection
- **FR-012**: Color values MUST be stored as named preset if matching, or as hex string (e.g., "#ff5500") for custom colors

### Key Entities

- **ConfigPanelManager**: Manages the lifecycle of the lil-gui config panel (creation, positioning, disposal)
- **ConfigFormDefinition**: Interface describing the form structure for a component type (control types, options, constraints)
- **IComponentVisualFactory.getConfigFormDefinition()**: New method on visual factory interface to retrieve form definition

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can open the config editor for any configurable component within 2 clicks (CTRL+SHIFT+click)
- **SC-002**: Configuration changes are reflected in the component's config map immediately (no save button required)
- **SC-003**: Visual updates for appearance-affecting config changes occur within 100ms of the change
- **SC-004**: All currently configurable component types (Switch, Relay, Transistor, SmallLED, RectangleLED, Cube) have functional config panels
- **SC-005**: Users can complete a config change workflow (open panel, change value, close panel) without errors

## Clarifications

### Session 2025-12-28

- Q: Where should the config panel appear relative to the clicked component? → A: Adjacent to component (right side preferred, repositions to avoid overflow)
- Q: How should users select color config values (LED colors, Cube color)? → A: Both dropdown for common colors + color picker for custom
- Q: How should custom colors be stored in config map? → A: Named if matches preset, hex string otherwise (pattern matching distinguishes format)
- Q: Should Escape key close the config panel? → A: Yes, Escape closes the panel

## Assumptions

- lil-gui library will be added as a project dependency (or is already available)
- The config panel will use screen-space positioning relative to the clicked component
- Form control types (dropdown, color picker) will be mapped from simple type hints in the form definition
- The panel will be a singleton managed by a dedicated manager class attached to the CircuitController or scene
