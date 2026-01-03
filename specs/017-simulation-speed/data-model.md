# Data Model: Simulation Speed Control & Component Transition Timing

**Feature**: 017-simulation-speed
**Date**: 2025-12-29

## Entity Overview

This feature extends existing entities rather than introducing new ones. The core simulation model remains unchanged; we add configuration parameters and runtime state tracking.

---

## Extended Entities

### 1. Component Configuration Extensions

Components use a `config: Map<string, string>` for type-specific parameters. This feature adds:

#### Relay/Transistor Config

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `transitionSpan` | string (parsed as int) | "1" | ≥ 1 | Number of ticks required for state change (opening→open, closing→closed) |

#### Switch Config

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `transitionUserSpan` | string (parsed as int) | "200" | ≥ 0 | Transition duration in milliseconds (user-perceived time) |

**Note**: Config values stored as strings per existing convention. Parse to integers in behaviors.

---

### 2. UserCommand Parameters Extension

The existing `UserCommand.parameters` field (nullable Map) is used to pass computed values:

| Parameter Key | Type | Usage |
|--------------|------|-------|
| `tickCount` | string (parsed as int) | For `toggle_switch` commands: number of ticks for this transition |

**Computation** (in CircuitRunnerController):
```
tickCount = max(1, ceil(transitionUserSpan × simulationSpeed / 1000))
```

---

### 3. CircuitRunnerController State

New runtime state on the controller:

| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `_tickIntervalMs` | number | 500 | 50-1000 | Milliseconds between ticks (existing) |
| (derived) `simulationSpeed` | number | 2 | 1-20 | Ticks per second (1000 / tickIntervalMs) |

**Note**: `tickIntervalMs` already exists. The `simulationSpeed` property is a convenience getter/setter.

---

## State Transitions

### Relay/Transistor State Machine

```
                    transitionSpan ticks
        ┌──────────────────────────────────────┐
        │                                      ▼
    ┌───────┐     coil powered          ┌──────────┐     event fires    ┌────────┐
    │ open  │ ────────────────────────▶ │ closing  │ ──────────────────▶│ closed │
    └───────┘                           └──────────┘                    └────────┘
        ▲                                      │
        │        coil unpowered                │
        │        (transition cancelled)        │
        └──────────────────────────────────────┘

                    transitionSpan ticks
        ┌──────────────────────────────────────┐
        │                                      ▼
    ┌────────┐    coil unpowered         ┌──────────┐     event fires   ┌───────┐
    │ closed │ ────────────────────────▶ │ opening  │ ─────────────────▶│ open  │
    └────────┘                           └──────────┘                   └───────┘
        ▲                                      │
        │        coil powered                  │
        │        (transition cancelled)        │
        └──────────────────────────────────────┘
```

**Key Points**:
- Transition starts immediately when trigger condition met
- `startTick` recorded when entering "closing"/"opening" state
- Event scheduled for `startTick + transitionSpan` ticks
- If trigger removed before event fires, state reverts (cancellation)

### Switch State Machine

```
                    tickCount ticks
        ┌──────────────────────────────────────┐
        │                                      ▼
    ┌───────┐     toggle command          ┌──────────┐    event fires   ┌────────┐
    │ open  │ ───────────────────────────▶│ closing  │ ────────────────▶│ closed │
    └───────┘                             └──────────┘                  └────────┘

                    tickCount ticks
        ┌──────────────────────────────────────┐
        │                                      ▼
    ┌────────┐    toggle command          ┌──────────┐    event fires   ┌───────┐
    │ closed │ ──────────────────────────▶│ opening  │ ────────────────▶│ open  │
    └────────┘                            └──────────┘                  └───────┘
```

**Key Points**:
- `tickCount` computed when toggle command issued
- Formula: `ceil(transitionUserSpan × simulationSpeed / 1000)`, minimum 1
- Pending toggle commands are not overwritten (existing behavior)

---

## Simulation Speed Impact

| Entity | Affected by Speed Change? | Explanation |
|--------|--------------------------|-------------|
| Relay/Transistor | No (tick-based) | `transitionSpan` is in ticks; wall-clock duration changes with speed |
| Switch | Yes (computed at toggle) | `tickCount` recalculated based on current speed to maintain wall-clock duration |
| EventQueue | No | Events fire at scheduled tick regardless of wall-clock speed |

---

## Validation Rules

### Configuration Validation

| Parameter | Rule | On Violation |
|-----------|------|--------------|
| `transitionSpan` | Must parse to integer ≥ 1 | Use default (1) |
| `transitionUserSpan` | Must parse to integer ≥ 0 | Use default (200) |
| `simulationSpeed` | Must be 1-20 TPS | Clamp to range |

### Runtime Invariants

1. **Transition Consistency**: A component cannot be in two transitional states simultaneously
2. **Event Ordering**: Events are processed in tick order (guaranteed by EventQueue min-heap)
3. **State Integrity**: After simulation stop/reset, no pending transitions remain

---

## JSON Serialization Examples

### Component with transitionSpan

```json
{
  "id": "relay-1",
  "type": "relay",
  "position": [0, 0, 0],
  "config": {
    "transitionSpan": "3",
    "activationLogic": "positive"
  }
}
```

### Component with transitionUserSpan

```json
{
  "id": "switch-1",
  "type": "switch",
  "position": [0, 0, 0],
  "config": {
    "transitionUserSpan": "500"
  }
}
```

### Backward Compatibility

Existing circuits without these config parameters continue to work:
- Missing `transitionSpan` → default 1 (instant)
- Missing `transitionUserSpan` → default 200ms

---

## Relationships

```
CircuitRunnerController
    │
    ├── simulationSpeed: number ──────────────────────┐
    │                                                  │
    ▼                                                  ▼
CircuitRunner ◄──── Component ◄──── config: Map ──── transitionSpan
    │                   │                              transitionUserSpan
    │                   │
    ▼                   ▼
EventQueue         ComponentState
    │                   │
    ▼                   ▼
ScheduledEvent      state: "open" | "closing" | "closed" | "opening"
    │               startTick: number
    │
    ▼
readyAtTick (computed from transitionSpan or tickCount)
```
