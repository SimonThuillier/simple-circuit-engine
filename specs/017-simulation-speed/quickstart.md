# Quickstart: Simulation Speed Control & Component Transition Timing

**Feature**: 017-simulation-speed
**Date**: 2025-12-29

## Overview

This feature adds:
1. **Adjustable simulation speed** (1-20 TPS) via slider under play/pause button
2. **Configurable transition timing** for relays/transistors (`transitionSpan` in ticks)
3. **Speed-adaptive switch timing** (`transitionUserSpan` in ms, maintains wall-clock duration)

---

## Quick Usage

### Adjusting Simulation Speed

```typescript
// Get/set speed in ticks per second
engine.simulationSpeed = 10;  // 10 TPS
console.log(engine.simulationSpeed);  // 10

// Or use tick interval directly (milliseconds)
engine.tickInterval = 100;  // 100ms = 10 TPS
```

### Configuring Relay/Transistor Transition Delay

```typescript
// In circuit JSON
{
  "id": "relay-1",
  "type": "relay",
  "config": {
    "transitionSpan": "5"  // 5 ticks to change state
  }
}

// Or programmatically
relay.config.set('transitionSpan', '5');
```

### Configuring Switch Transition Duration

```typescript
// In circuit JSON
{
  "id": "switch-1",
  "type": "switch",
  "config": {
    "transitionUserSpan": "500"  // 500ms user-perceived duration
  }
}

// Switch transitions maintain ~500ms regardless of simulation speed:
// - At 10 TPS: 5 ticks (500ms)
// - At 20 TPS: 10 ticks (500ms)
```

---

## Default Behavior

| Component | Parameter | Default | Effect |
|-----------|-----------|---------|--------|
| Relay | `transitionSpan` | 1 | Instant (same as before) |
| Transistor | `transitionSpan` | 1 | Instant (same as before) |
| Switch | `transitionUserSpan` | 200ms | Quick toggle |
| Simulation | speed | 5 TPS | Moderate pace |

**Backward Compatibility**: Existing circuits work identically with default values.

---

## Key Concepts

### Tick-Based vs Wall-Clock Timing

- **Relays/Transistors**: Transition in N *ticks* regardless of speed
  - At 5 TPS with `transitionSpan=5`: 1 second wall-clock
  - At 20 TPS with `transitionSpan=5`: 0.25 seconds wall-clock

- **Switches**: Transition in *wall-clock time* regardless of speed
  - At 5 TPS with `transitionUserSpan=500`: 3 ticks (600ms actual)
  - At 20 TPS with `transitionUserSpan=500`: 10 ticks (500ms actual)

### Transition Cancellation

- **Relays/Transistors**: If trigger signal removed mid-transition, transition cancels
- **Switches**: Toggle commands are not cancellable (existing behavior)

---

## Testing Checklist

1. [ ] Speed slider visible under play/pause button
2. [ ] Speed change takes effect immediately (< 100ms)
3. [ ] Relay with `transitionSpan=3` takes exactly 3 ticks to transition
4. [ ] Switch maintains ~500ms transition at different speeds
5. [ ] Existing circuits work without config changes

---

## Common Patterns

### Observing Timing-Dependent Behavior

```typescript
// Slow down to watch race conditions
engine.simulationSpeed = 1;  // 1 TPS

// Speed up to see long-term patterns
engine.simulationSpeed = 20;  // 20 TPS
```

### Creating Realistic Relay Delays

```typescript
// Electromechanical relay with realistic delay
{
  "type": "relay",
  "config": {
    "transitionSpan": "10"  // 10 ticks = 1 second at 10 TPS
  }
}
```

### Fast User Interactions

```typescript
// Quick-toggle switch for responsive feel
{
  "type": "switch",
  "config": {
    "transitionUserSpan": "100"  // 100ms - very responsive
  }
}
```
