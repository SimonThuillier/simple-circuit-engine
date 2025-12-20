# Data Model: Circuit Runner Controller

**Date**: 2025-12-20
**Feature**: 013-circuit-runner-controller

## Overview

This feature extends the existing `CircuitRunnerController` class. All core domain entities (Circuit, Component, Wire, ENode, CircuitRunner, etc.) already exist. This document defines the new state and configuration introduced by this feature.

## New State Properties

### CircuitRunnerController State

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `_runner` | `CircuitRunner \| null` | `null` | Reference to simulation engine (existing) |
| `_isPlaying` | `boolean` | `false` | Whether simulation is auto-advancing |
| `_tickIntervalMs` | `number` | `500` | Milliseconds between simulation ticks |
| `_simulationLoopId` | `number \| null` | `null` | setInterval ID for cleanup |
| `_pointerDownHandler` | `Function \| null` | `null` | Click event handler reference |

### Simulation State Query

Already exists in CircuitRunner:
- `getCurrentTick(): number`
- `getCurrentState(): SimulationState`

New accessor on controller:
- `isPlaying: boolean` (getter)
- `tickInterval: number` (getter/setter)
- `currentTick: number` (getter, delegates to runner)

## Wire Material States (Extended)

**Location**: `WireVisualManager.wireMaterials: Map<WireMaterialState, LineMaterial>`

| State | Color | Width | Use Case |
|-------|-------|-------|----------|
| `idle` | White (0xffffff) | 2px | No voltage/current |
| `hovered` | Cyan (0x40dfff) | 4px | Mouse hover (existing) |
| `selected` | Orange (0xffaa00) | 3px | Selected (existing) |
| `voltage` | Red (0xff0000) | 2px | hasVoltage only, no current |
| `current` | Blue (0x0000ff) | 2px | hasCurrent (priority over voltage) |

**Type Extension**:
```typescript
type WireMaterialState = 'idle' | 'hovered' | 'selected' | 'voltage' | 'current';
```

## ENode Electrical Visualization

No new data model. Visual update uses existing `NodeElectricalState`:

```typescript
interface NodeElectricalState {
  hasVoltage: boolean;
  hasCurrent: boolean;
  locked: boolean;
}
```

Visual mapping:
- `hasCurrent === true` → Blue emissive glow
- `hasVoltage === true && !hasCurrent` → Red emissive glow
- Neither → No emissive (default pin color)

## Events (ControllerEventMap Extension)

New events emitted by CircuitRunnerController:

| Event | Payload | Trigger |
|-------|---------|---------|
| `simulationPlayed` | `{ tick: number }` | `play()` called |
| `simulationPaused` | `{ tick: number }` | `pause()` called |
| `simulationStepped` | `{ tick: number, result: RunnerResult }` | `step()` called |
| `simulationTick` | `{ tick: number, dirty: DirtyElements }` | Each auto-tick during play |

**Type Definition**:
```typescript
interface ControllerEventMap {
  // ... existing events ...
  simulationPlayed: { tick: number };
  simulationPaused: { tick: number };
  simulationStepped: { tick: number; result: RunnerResult };
  simulationTick: { tick: number; dirty: DirtyElements };
}
```

## State Transitions

### Playback State Machine

```
                    ┌─────────────┐
                    │   PAUSED    │◄──────────────┐
                    │ (initial)   │               │
                    └──────┬──────┘               │
                           │ play()               │
                           ▼                      │
                    ┌─────────────┐               │
                    │   PLAYING   │───────────────┤ pause()
                    │             │               │
                    └──────┬──────┘               │
                           │ tick interval        │
                           │ elapsed              │
                           ▼                      │
                    ┌─────────────┐               │
                    │ TICK + UPDATE│──────────────┘
                    │   VISUALS   │      (continues playing)
                    └─────────────┘
```

### step() Behavior

```
PAUSED ──step()──► TICK + UPDATE ──► PAUSED
```

Step always returns to PAUSED state.

## Entity Relationships

```
CircuitRunnerController
    │
    ├──► CircuitRunner (1:1, nullable)
    │        │
    │        ├──► Circuit (1:1)
    │        ├──► DirtyTracker (1:1)
    │        └──► SimulationState (current)
    │
    ├──► componentObject3Ds: Map<UUID, Object3D>
    ├──► wireObject3Ds: Map<UUID, Line2>
    ├──► enodeObject3Ds: Map<UUID, Object3D>
    │
    └──► WireVisualManager
             └──► wireMaterials: Map<WireMaterialState, LineMaterial>
```

## Validation Rules

1. **Play/Pause**:
   - `play()` requires `_runner !== null`
   - `pause()` is always safe (no-op if not playing)

2. **Step**:
   - `step()` requires `_runner !== null`
   - `step()` while playing: pauses first, then steps

3. **Tick Interval**:
   - Must be >= 50ms and <= 2000ms
   - Setting while playing: restarts interval with new value

4. **Circuit Replacement**:
   - `setCircuitRunner(newRunner)` must pause current simulation first
   - Clears all visuals before loading new circuit
