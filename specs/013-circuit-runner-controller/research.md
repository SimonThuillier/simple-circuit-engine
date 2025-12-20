# Research: Circuit Runner Controller

**Date**: 2025-12-20
**Feature**: 013-circuit-runner-controller

## Executive Summary

No external research required. All technical infrastructure exists in the codebase. This document consolidates findings from codebase exploration.

## Existing Infrastructure Analysis

### 1. Simulation Engine (CircuitRunner)

**Location**: `src/core/simulation/CircuitRunner.ts`

**Key Methods Available**:
- `tick(): RunnerResult` - Execute one simulation step
- `tickN(count): RunnerResult[]` - Execute multiple ticks
- `reset()` - Reset simulation to tick 0
- `submitCommand(command: UserCommand)` - Queue user interaction
- `getCurrentTick(): number` - Get current tick number
- `getCurrentState(): SimulationState` - Get state snapshot
- `getComponentState(id): ComponentState` - Get component state
- `getWireState(id): NodeElectricalState` - Get wire electrical state
- `getEnodeState(id): NodeElectricalState` - Get enode electrical state

**Decision**: Use existing CircuitRunner API directly. No wrapper needed.

### 2. Dirty Tracking (DirtyTracker)

**Location**: `src/core/simulation/DirtyTracker.ts`

**Key Methods**:
- `getDirtyElements(): DirtyElements` - Returns and clears dirty sets
- `hasDirtyElements(): boolean` - Check if any changes pending

**DirtyElements Interface**:
```typescript
interface DirtyElements {
  components: ReadonlySet<UUID>;
  wires: ReadonlySet<UUID>;
  enodes: ReadonlySet<UUID>;
}
```

**Decision**: Call `runner.dirtyTracker.getDirtyElements()` after each tick to get changed element IDs for targeted visual updates.

### 3. Visual Animation (Visual Factories)

**Location**: `src/scene/shared/components/`

**updateAnimation Interface**:
```typescript
updateAnimation(object3D: THREE.Object3D, state: ComponentState): void
```

**Existing Implementations**:
- `SwitchVisualFactory`: Rotates contactor based on `SwitchState.isClosed`
- `SmallLEDVisualFactory`: Applies emissive glow based on `SmallLEDState.isLit`
- `ComponentVisualFactoryBase`: Default no-op for static components

**Decision**: Call `factory.updateAnimation(object3D, state)` for each dirty component after tick.

### 4. Wire Visual State

**Location**: `src/scene/shared/WireVisualManager.ts`

**Current Material States**:
- `idle`: White, 2px width
- `hovered`: Cyan, 4px width
- `selected`: Orange, 3px width

**Missing**: No "energized" material state for electrical visualization.

**Decision**: Add new wire material states for electrical state visualization:
- `voltage`: Red color for hasVoltage only
- `current`: Blue color for hasCurrent (takes priority when both present)
- Keep `idle`: White for no voltage/current

### 5. ENode Visual State

**Current Implementation**: Pins use color based on `ENodeSourceType` (bronze/red/blue for none/voltage/current sources).

**Decision**: Extend pin coloring to reflect electrical state during simulation:
- Blue emissive when `hasCurrent`
- Red emissive when `hasVoltage` only
- No emissive when idle

### 6. User Command Handling

**Location**: `src/core/simulation/types/UserCommand.ts`

**Interface**:
```typescript
interface UserCommand {
  type: 'toggle_switch';
  targetId: UUID;
  scheduledAtTick: number;
  parameters?: Map<string, string> | null;
}
```

**Decision**: Create `toggle_switch` command when user clicks a Switch component. Use existing `runner.submitCommand()` API.

### 7. Click Event Handling

**Base Class**: `AbstractCircuitController` provides hover detection via `HoverManager`.

**Decision**: Add click handler that:
1. Checks if clicked element is a Switch component
2. Creates UserCommand with `type: 'toggle_switch'`
3. Submits to CircuitRunner

### 8. Simulation Loop Strategy

**Options Considered**:

| Approach | Pros | Cons |
|----------|------|------|
| `setInterval` | Simple, fixed timing | Timer drift, not frame-synced |
| `requestAnimationFrame` + time accumulator | Frame-synced, smooth | More complex, tied to render loop |
| `setTimeout` recursive | Adjustable timing | Still not frame-synced |

**Decision**: Use `setInterval` for tick scheduling. Reasoning:
- Simulation ticks (50-2000ms) are much slower than frame rate (16ms)
- Frame synchronization not critical at these intervals
- Simplest implementation, easy to adjust interval
- Store interval ID for cleanup on pause/dispose

## Design Decisions Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Simulation loop | `setInterval` | Simple, sufficient for 50-2000ms intervals |
| Tick execution | Direct `runner.tick()` | Existing API, no wrapper needed |
| Dirty tracking | `getDirtyElements()` after tick | Built-in optimization |
| Component animation | `factory.updateAnimation()` | Existing interface |
| Wire state colors | Add voltage/current materials | Blue for current, red for voltage |
| Click handling | Listen for click on Switch | Submit toggle_switch command |
| Initial state | Paused | Per clarification session |

## Alternatives Considered

### Alternative: Use InterpolationController for state transitions

**Rejected Because**: InterpolationController is designed for smooth animation between discrete states within a tick. Our tick intervals (50-2000ms) are already visible to users. Direct state application is sufficient.

### Alternative: Separate render loop from simulation loop

**Rejected Because**: Over-engineering for current scope. A single `setInterval` that ticks and updates visuals is simpler and sufficient. Render loop separation would be needed for sub-tick animation interpolation, which is out of scope.

## Open Items

None - all technical questions resolved from existing codebase analysis.
