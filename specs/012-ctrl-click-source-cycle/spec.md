# Feature Specification: Ctrl+Click Source Type Cycling

**Feature Branch**: `012-ctrl-click-source-cycle`
**Created**: 2025-12-19
**Status**: Draft
**Input**: User description: "In the buildTool upon click on branching point or component enode, if ctrl is held I want the sourceType of the enode to cycle (sourceType: none -> voltage -> current -> none)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cycle Source Type on Branching Point (Priority: P1)

A user building a circuit wants to designate a branching point as a voltage source or current source. They hold Ctrl and click on the branching point, and the sourceType cycles through the available values: none → Voltage → Current → none. The visual representation (cone color) updates immediately to reflect the change.

**Why this priority**: This is the primary use case and extends existing branching point functionality. Branching points already support sourceType cycling via double-click; this adds a more discoverable Ctrl+click mechanism.

**Independent Test**: Can be fully tested by creating a branching point, Ctrl+clicking to cycle through states, and verifying both the ENode.source attribute and visual cone color update correctly (white → red → blue → white).

**Acceptance Scenarios**:

1. **Given** a branching point exists with no source type (white cone), **When** user Ctrl+clicks on it, **Then** sourceType becomes "Voltage" and cone turns red.
2. **Given** a branching point has sourceType "Voltage" (red cone), **When** user Ctrl+clicks on it, **Then** sourceType becomes "Current" and cone turns blue.
3. **Given** a branching point has sourceType "Current" (blue cone), **When** user Ctrl+clicks on it, **Then** sourceType becomes null/none and cone turns white.
4. **Given** a branching point exists, **When** user clicks on it without holding Ctrl, **Then** sourceType does not change (existing behavior preserved).

---

### User Story 2 - Cycle Source Type on Component Pin (Priority: P2)

A user wants to designate a component pin (enode) as a voltage or current source point. They hold Ctrl and click on a component's pin, and the sourceType cycles through the available values: none → Voltage → Current → none. The pin color updates immediately to reflect the change (white → red → blue → white), matching branching point behavior.

**Why this priority**: Extends sourceType functionality to component pins, enabling more flexible circuit source designation. This is slightly lower priority as branching points are the more common source designation points.

**Independent Test**: Can be fully tested by creating a component with pins, Ctrl+clicking on a pin to cycle through states, and verifying both the ENode.source attribute and pin color update correctly (white → red → blue → white).

**Acceptance Scenarios**:

1. **Given** a component with a pin with no source type (white), **When** user Ctrl+clicks on the pin, **Then** sourceType becomes "Voltage" and pin turns red.
2. **Given** a pin has sourceType "Voltage" (red), **When** user Ctrl+clicks on it, **Then** sourceType becomes "Current" and pin turns blue.
3. **Given** a pin has sourceType "Current" (blue), **When** user Ctrl+clicks on it, **Then** sourceType becomes null/none and pin turns white.
4. **Given** a component pin, **When** user clicks on it without holding Ctrl, **Then** sourceType does not change and normal click behavior occurs (wire creation initiation).

---

### Edge Cases

- Ctrl+click on an enode during an active wire creation operation is ignored; the wire creation continues uninterrupted.
- What happens when Ctrl+clicking on an enode that is part of a multi-selection? The operation should apply only to the clicked enode, not to all selected elements.
- What happens when Ctrl+clicking in empty space? No action should occur (existing behavior preserved).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST cycle enode sourceType when user Ctrl+clicks on a branching point: null → Voltage → Current → null
- **FR-002**: System MUST cycle enode sourceType when user Ctrl+clicks on a component pin: null → Voltage → Current → null
- **FR-003**: System MUST update the visual representation immediately after sourceType change (white/red/blue color for both branching points and component pins)
- **FR-004**: System MUST persist the sourceType change to the circuit model via CircuitWriter
- **FR-005**: System MUST NOT cycle sourceType on regular click (without Ctrl held)
- **FR-006**: System MUST ignore Ctrl+click sourceType cycling during active operations (wire creation, component drag, etc.)
- **FR-007**: Ctrl+click on enode MUST take precedence over wire creation initiation when Ctrl is held
- **FR-008**: System MUST emit appropriate events when sourceType is changed (for undo/redo support and external listeners)

### Key Entities

- **ENode**: Electrical connection point with `source` attribute (ENodeSourceType | undefined). Can be a component pin or standalone branching point.
- **ENodeSourceType**: Enum with values `Voltage` and `Current`. Undefined/null represents no source type.
- **BranchingPointVisualFactory**: Handles visual rendering of branching points; already supports sourceType-based coloring (white/red/blue).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can cycle sourceType on any enode (branching point or pin) with a single Ctrl+click interaction
- **SC-002**: Visual feedback (color change for branching points and pins) appears instantly after Ctrl+click
- **SC-003**: All existing click behaviors remain unchanged when Ctrl is not held
- **SC-004**: 100% of sourceType cycle operations are persisted to the circuit model

## Clarifications

### Session 2025-12-19

- Q: What happens when Ctrl+clicking on an enode during an active wire creation operation? → A: Ignore Ctrl+click during active wire creation (preserve wire operation)
- Q: What visual change occurs on component pins when sourceType changes? → A: Same color scheme (white/red/blue) applied to pin visuals
