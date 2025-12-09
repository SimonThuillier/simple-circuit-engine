# Feature Specification: Visual Factory Classes

**Feature Branch**: `005-visual-factory-classes`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "scene ComponentVisualFactory must become full classes instead of functions : the reason is that in the future these classes should handle not only the visual making logic, but also specific visuals for hover, and later selection & animation for each component type"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Component Visual Factory as Class (Priority: P1)

As a developer creating component visualizations, I want to define a class for each component type that encapsulates all visual behaviors (creation, hover, selection, animation) in one place, so that I can maintain clean separation of concerns and easily extend visual behavior per component type.

**Why this priority**: This is the foundational change that enables all subsequent visual behaviors. Without refactoring factories to classes, hover/selection/animation handling cannot be cleanly implemented per component type.

**Independent Test**: Can be fully tested by verifying that existing component visuals (battery, switch, LED) continue to render correctly after refactoring from functions to classes.

**Acceptance Scenarios**:

1. **Given** a Battery component, **When** rendered using the new class-based factory, **Then** the visual output is identical to the current function-based factory output
2. **Given** a Switch component, **When** rendered using the new class-based factory, **Then** the visual output is identical to the current function-based factory output
3. **Given** a SmallLED component, **When** rendered using the new class-based factory, **Then** the visual output is identical to the current function-based factory output
4. **Given** a component type with no registered factory class, **When** rendered, **Then** the default placeholder visual is displayed (magenta cube)

---

### User Story 2 - Hover Visual Support (Priority: P2)

As a user interacting with a circuit visualization, I want components to display a distinct hover visual when my mouse hovers over them, so that I can clearly see which component I am about to interact with.

**Why this priority**: Hover feedback is essential for user interaction and is the most immediate visual feedback users expect. This builds on P1 but adds the hover-specific visual method.

**Independent Test**: Can be tested by hovering over a component and verifying visual feedback is applied, then moving away and verifying the visual returns to normal state.

**Acceptance Scenarios**:

1. **Given** a component is rendered and not hovered, **When** the user's mouse enters the component's hitbox, **Then** the factory class applies the hover visual effect
2. **Given** a component is hovered, **When** the user's mouse leaves the component's hitbox, **Then** the factory class removes the hover visual effect and restores the normal visual
3. **Given** a component type with custom hover visuals, **When** hovered, **Then** that component type's specific hover effect is shown (not a generic effect)

---

### User Story 3 - Animation Visual Support (Priority: P3)

As a user viewing a circuit simulation, I want components to display animations that reflect their operational state (e.g., LED glowing when powered), so that I can visually understand the circuit's behavior.

**Why this priority**: Animation is the most complex visual behavior and depends on the simulation runner integration. It builds on the class foundation but requires additional state management.

**Independent Test**: Can be tested by running a simulation with an LED component and verifying the LED's visual changes based on power state.

**Acceptance Scenarios**:

1. **Given** a component with animation capability in a running simulation, **When** the simulation state changes, **Then** the factory class updates the component's animation accordingly
2. **Given** an LED component in an unpowered state, **When** the simulation powers the LED, **Then** the LED's visual animates to show it is lit
3. **Given** an LED component in a powered state, **When** the simulation removes power, **Then** the LED's visual animates to show it is off

---

### Edge Cases

- What happens when a component type class does not implement a visual state method (e.g., no hover method)? : Q : ComponentVisualFactory should enforce that these methods exist, even if they are no-ops.
- How does the system handle rapid state transitions (e.g., quick hover on/off)? : during simulation, visual changes linked to the simulation have highest priority over all other visual changes (hover, etc...)
- What happens when animation is requested but no simulation is running? : in static mode, no animation methods should be called.
- How are visual states managed when a component is removed from the scene while in a hover/selected state? : the component's group is removed and all animations on its children disposed of.

## Clarifications

### Session 2025-12-09

- Q: What visual effect should the default hover behavior apply to components? → A: Outline/glow effect (add colored outline around component)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST refactor ComponentVisualFactory from a function type to a class-based interface/abstract class
- **FR-002**: System MUST maintain backward compatibility with the existing FactoryRegistry pattern
- **FR-003**: Each factory class MUST implement a `createVisual(component)` method that produces the same visual output as the current factory functions
- **FR-004**: Factory classes MUST provide a method to apply hover visual state to a component's Group/Object3D
- **FR-005**: Factory classes MUST provide a method to remove/clear hover visual state from a component's Group/Object3D
- **FR-006**: Factory classes MUST provide a dummy non-implemented method to apply selection visual state to a component's Group/Object3D
- **FR-007**: Factory classes MUST provide a method to remove/clear selection visual state from a component's Group/Object3D
- **FR-008**: Factory classes MUST provide a method to update animation state based on simulation data
- **FR-009**: System MUST provide sensible default implementations for hover (outline/glow effect around component) and animation that can be overridden per component type
- **FR-010**: The existing `batteryFactory`, `switchFactory`, and `smallLedFactory` functions MUST be converted to equivalent class implementations
- **FR-011**: System MUST support graceful degradation when a state method is not overridden (use default behavior)
- **FR-012**: Visual state methods MUST receive the Group/Object3D reference created by `createVisual` to modify it in place

### Key Entities

- **ComponentVisualFactory**: Abstract class or interface defining the contract for component visual factories, including methods for creation and state management (hover, selection, animation) - `src/scene/shared/components/ComponentVisualFactory.ts`
- **BatteryVisualFactory**: Concrete class implementing battery-specific visuals and state behaviors - `src/scene/shared/components/BatteryVisualFactory.ts`
- **SwitchVisualFactory**: Concrete class implementing switch-specific visuals and state behaviors - `src/scene/shared/components/SwitchVisualFactory.ts`
- **SmallLEDVisualFactory**: Concrete class implementing LED-specific visuals and state behaviors (including glow animation) - `src/scene/shared/components/SmallLEDVisualFactory.ts`
- **DefaultVisualFactory**: Fallback class providing placeholder visuals and generic state behaviors - `src/scene/shared/components/ComponentVisualFactory.ts`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All existing component visual tests continue to pass after refactoring
- **SC-002**: Developers can add new component types by creating a single class that handles all visual aspects
- **SC-003**: Hover state changes are visually reflected on components when hover events occur
- **SC-004**: Animation state changes are visually reflected on components during simulation
- **SC-005**: Code for each component type's visuals is contained in a single class file rather than scattered across multiple functions/modules
- **SC-006**: Default visual behaviors work correctly for component types that don't override specific methods
