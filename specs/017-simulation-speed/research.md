# Research: Simulation Speed Control & Component Transition Timing

**Feature**: 017-simulation-speed
**Date**: 2025-12-29

## Research Summary

All technical unknowns have been resolved through codebase exploration. The existing architecture supports all required changes with minimal modification.

---

## R1: Simulation Speed Infrastructure

**Decision**: Use existing `tickIntervalMs` property on CircuitRunnerController

**Rationale**:
- CircuitRunnerController already has `tickIntervalMs` property (default 500ms = 2 TPS)
- Range validation exists: 50-2000ms (implicitly supports 0.5-20 TPS)
- Property setter automatically restarts simulation if currently playing
- CircuitEngine facade already exposes `tickInterval` getter/setter

**Alternatives Considered**:
- New SimulationSpeedManager class: Rejected as over-engineering; single property suffices
- Web Worker for timing: Rejected; `setInterval` is adequate for 1-20 TPS educational use

**Implementation Insight**:
```typescript
// Existing in CircuitRunnerController
set tickIntervalMs(value: number) {
  this._tickIntervalMs = Math.max(50, Math.min(2000, value));
  if (this._isPlaying) {
    this.pause();
    this.play(); // Restarts interval with new timing
  }
}
```

Add TPS-based convenience:
```typescript
get simulationSpeed(): number { return 1000 / this._tickIntervalMs; }
set simulationSpeed(tps: number) { this.tickIntervalMs = 1000 / tps; }
```

---

## R2: Transition Timing in Behaviors

**Decision**: Replace hardcoded `+1` tick delays with config-driven `transitionSpan`

**Rationale**:
- RelayBehavior and TransistorBehavior both use `readyAtTick: targetTick + 1`
- Event scheduling system already supports arbitrary tick delays
- Component.config map already exists for storing parameters

**Alternatives Considered**:
- Per-component-instance delay tracking: Rejected; config on Component is cleaner
- Behavior constructor parameter: Rejected; config map is more flexible for UI editing

**Implementation Pattern**:
```typescript
// Current (hardcoded)
readyAtTick: targetTick + 1

// New (configurable)
const transitionSpan = parseInt(component.config.get('transitionSpan') || '1', 10);
readyAtTick: targetTick + Math.max(1, transitionSpan)
```

---

## R3: Switch Toggle Tick Count Computation

**Decision**: Compute tickCount at toggle submission time, pass via UserCommand.parameters

**Rationale**:
- UserCommand interface already has `parameters: Map<string, string> | null` field
- SwitchBehavior receives command in `onUserCommand()` with access to parameters
- Computation must happen when toggle is submitted (captures current speed)
- Formula: `ceil(transitionUserSpan × simulationSpeed / 1000)`

**Alternatives Considered**:
- Pass simulationSpeed to behavior, compute in behavior: Rejected; behavior shouldn't know about scene-layer timing
- Store speed on CircuitRunner: Possible but adds cross-layer knowledge
- Store tickCount on command parameters: Chosen; keeps behavior pure

**Implementation Pattern**:
```typescript
// In CircuitRunnerController.toggleSwitch()
const transitionUserSpan = parseInt(component.config.get('transitionUserSpan') || '200', 10);
const tickCount = Math.max(1, Math.ceil(transitionUserSpan * this.simulationSpeed / 1000));
const command: UserCommand = {
  type: 'toggle_switch',
  targetId: componentId,
  scheduledAtTick: this._runner.getCurrentTick(),
  parameters: new Map([['tickCount', String(tickCount)]]),
};
```

---

## R4: Transition State Tracking

**Decision**: Use existing `startTick` field on ComponentState for transition tracking

**Rationale**:
- ComponentState already has `startTick: number` field
- Combined with `state` ("opening" | "closing"), transition progress is derivable
- No need for additional tracking; EventQueue handles completion timing
- Transition cancellation: Just change state back, event becomes no-op

**Alternatives Considered**:
- Add `transitionTicksRemaining` field: Unnecessary; `readyAtTick - currentTick` computable
- Separate TransitionTracker: Over-engineering; state machine already handles this

**Key Insight**: The event-driven system already works. When a component enters "closing" state, an event is scheduled for N ticks later. If conditions change before that, the behavior can cancel by changing state back - the event fires but `onEventFiring` can check current state.

---

## R5: Transition Cancellation Logic

**Decision**: Cancel transitions by detecting input signal removal during "opening"/"closing" states

**Rationale**:
- Current behaviors already track intermediate states
- `onPinsChange()` is called every tick when inputs change
- Can detect if coil power removed while in transitional state
- Reset state to original, transition effectively cancelled

**Implementation Pattern**:
```typescript
// In RelayBehavior.onPinsChange()
if (state.state === 'closing' && !coilPowered) {
  state.state = 'open'; // Cancel transition
  return { ... }; // No new events scheduled
}
```

---

## R6: Speed Slider UI Placement

**Decision**: Add HTML slider element positioned directly under play/pause buttons

**Rationale**:
- User specified "slider under play/pause button"
- Demo currently creates buttons dynamically in main.ts
- CircuitRunnerController can emit events for speed changes
- lil-gui optional; native `<input type="range">` simpler for demo

**Alternatives Considered**:
- lil-gui integration: Valid but adds dependency for simple slider
- Keyboard-only control: Poor UX for continuous value
- Custom canvas slider: Over-engineering

**Implementation Approach**:
```html
<!-- Demo HTML structure -->
<div id="simulation-controls">
  <button id="play">Play</button>
  <button id="pause">Pause</button>
  <input type="range" id="speed" min="1" max="20" value="5" />
  <span id="speed-display">5 TPS</span>
</div>
```

---

## R7: Default Values

**Decision**: Use sensible defaults that maintain backward compatibility

| Parameter | Default | Rationale |
|-----------|---------|-----------|
| `transitionSpan` | 1 | Instant transition (current behavior) |
| `transitionUserSpan` | 200ms | Quick but perceptible toggle |
| `simulationSpeed` | 5 TPS | Moderate pace for observation |

**Rationale**: Existing circuits without config parameters must work identically. Default `transitionSpan=1` means relay/transistor transitions happen in 1 tick (current behavior).

---

## R8: Pause/Stop Behavior with Pending Transitions

**Decision**: Pause preserves transition state; Stop clears all pending

**Rationale**:
- Pause: Simulation resumes where it left off, including mid-transitions
- Stop: Full reset to initial state, all scheduled events cleared
- CircuitRunner.reset() already clears EventQueue

**Implementation**: No additional work needed for Stop (reset clears queue). For Pause, interval simply stops - tick counter preserved, events remain scheduled.

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/core/simulation/behaviors/RelayBehavior.ts` | Add transitionSpan config reading |
| `src/core/simulation/behaviors/TransistorBehavior.ts` | Add transitionSpan config reading |
| `src/core/simulation/behaviors/SwitchBehavior.ts` | Read tickCount from parameters |
| `src/scene/simulation/CircuitRunnerController.ts` | Add simulationSpeed getter/setter, UI slider |
| `src/CircuitEngine.ts` | Add simulationSpeed facade property |
| `demo/main.ts` | Add speed slider HTML/handlers |

---

## No Further Research Needed

All technical decisions resolved. Proceed to Phase 1: Design & Contracts.
