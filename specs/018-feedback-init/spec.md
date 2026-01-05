# Feature Specification: Feedback Loop Initialization

**Feature Branch**: `018-feedback-init`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "Core state initialization must be improved to handle circuits with feedback loops (example : RS flip-flops). The goal is to disambiguate concurrent initial states and to choose one possible initial electrical state following power-up. Moreover transistors and relays must support a new initializationPriority config parameter (integer or null) allowing user to modulate (if set) start state on feedback loops circuits."

## Clarifications

### Session 2026-01-03

- Q: Priority ordering - should lower or higher number mean higher priority? → A: Higher number = higher priority (processed first)
- Q: Should sequential initialization model be documented in spec? → A: Yes, document as underlying approach
- Q: Should FR-001 be reframed from "detect feedback loops" to focus on disambiguation? → A: Yes, reframe to focus on disambiguation

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic Feedback Loop Resolution (Priority: P1)

As a user building circuits with feedback loops (such as RS flip-flops), I want the simulation engine to automatically resolve the initial state when I power up the circuit, so that the circuit reaches a valid electrical equilibrium state rather than remaining in an undefined or oscillating state.

**Why this priority**: This is the core functionality that enables any circuit with feedback loops to work correctly. Without proper initialization, feedback circuits cannot function and users cannot simulate fundamental digital circuits like latches and flip-flops.

**Independent Test**: Can be fully tested by creating an RS flip-flop circuit, running initialization, and verifying that the circuit reaches a stable state where both outputs are not simultaneously in an invalid configuration.

**Acceptance Scenarios**:

1. **Given** a circuit containing an RS flip-flop with both inputs LOW, **When** the circuit is initialized for simulation, **Then** the circuit reaches a stable state where one output is HIGH and the other is LOW (either Q=HIGH/Q'=LOW or Q=LOW/Q'=HIGH).

2. **Given** a circuit with multiple independent feedback loops, **When** the circuit is initialized, **Then** each feedback loop resolves to a valid stable state independently.

3. **Given** a circuit with nested feedback loops, **When** the circuit is initialized, **Then** the entire circuit reaches a globally consistent stable state.

---

### User Story 2 - Initialization Priority Configuration (Priority: P2)

As an advanced user, I want to configure an `initializationPriority` parameter on transistors and relays to influence which stable state the feedback loop settles into during initialization, so that I can deterministically control the power-up behavior of my circuit.

**Why this priority**: This provides user control over initialization outcomes. While automatic resolution (P1) gets the circuit working, priority configuration allows users to design predictable power-up sequences for more complex circuits which is good for educational and simplification goals.

**Independent Test**: Can be tested by setting different initializationPriority values on components in an RS flip-flop and verifying the initial state matches the expected outcome based on priorities.

**Acceptance Scenarios**:

1. **Given** an RS flip-flop where the transistor controlling Q has `initializationPriority: 1` and the transistor controlling Q' has `initializationPriority: 2`, **When** the circuit is initialized, **Then** Q' is processed first (due to higher priority number = higher priority), resulting in Q=LOW and Q'=HIGH.

2. **Given** two feedback loop components where one has `initializationPriority: null` and another has `initializationPriority: 5`, **When** the circuit is initialized, **Then** the component with the explicit priority (5) is processed first, and the null-priority component uses default behavior (priority=0).

3. **Given** multiple components with the same initializationPriority value, **When** the circuit is initialized, **Then** ties are broken deterministically (e.g., by UUID alphabetical order asc).

---

### Edge Cases

- What happens when initializationPriority values create a logical contradiction?
  - The system should proceed with the priorities as specified, processing higher numbers first. Amongst all components of equal priority the one with lower UUID alphabetical order asc is processed first.

- What happens with a circuit that has no feedback loops?
  - Initialization proceeds normally with no changes to current behavior; the feature is transparent for non-feedback circuits.

- What happens with null initializationPriority values?
  - Null values are equivalent to priority 0 (default behavior).

- What happens with negative or zero initializationPriority values?
  - Negative values and zero are valid; negative number indicate priority lower than 0.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST disambiguate initial state for circuits with feedback loops, computing one valid stable state among possible equilibria.

- **FR-002**: System MUST resolve feedback loops to choose one valid stable electrical state among the possible ones during initialization.

- **FR-003**: System MUST support an `initializationPriority` configuration parameter on transistor and relay components.

- **FR-004**: The `initializationPriority` parameter MUST accept an integer value or null.

- **FR-005**: When `initializationPriority` is null, the system MUST use default resolution behavior for that component.

- **FR-006**: System MUST process components with higher `initializationPriority` values before those with lower values during feedback loop resolution.

- **FR-007**: System MUST handle ties in `initializationPriority` deterministically (using component ID or creation order as tiebreaker).

- **FR-008**: Initialization behavior for circuits without feedback loops MUST remain unchanged.

### Key Entities

- **initializationPriority**: A configuration parameter on transistor and relay components. Integer or null. Higher integer values indicate higher priority in determining initial state during feedback loop resolution. Null indicates default (priority=0) behavior.

- **Feedback Loop**: A circular dependency in the circuit where the output of component(s) feeds back to influence its own input, either directly or through other components.

- **Stable State**: An electrical configuration where all component states are consistent with their inputs and no further changes propagate through the circuit.

- **Sequential Initialization Model**: The underlying approach for resolving feedback loops. Components are initialized one at a time in priority order, modeling the tiny delays that occur during real power-up. This sequential processing disambiguates concurrent initial states by allowing earlier-initialized components to influence later ones, producing one deterministic stable state among the possible equilibria.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All circuits with standard feedback loop patterns (RS flip-flop, D flip-flop, T flip-flop) successfully initialize to a valid stable state within 100ms.

- **SC-002**: 100% of initialization attempts with explicit `initializationPriority` settings produce the expected deterministic outcome as documented.

- **SC-003**: Users can successfully configure and observe the effect of `initializationPriority` through the existing component configuration interface.

- **SC-004**: Existing circuits without feedback loops initialize identically to before (backward compatibility).
