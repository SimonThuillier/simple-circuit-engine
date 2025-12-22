# Research: CircuitEngine Shared Resource Architecture

**Feature**: 014-circuit-engine
**Date**: 2025-12-22

## Research Questions

### RQ1: How can controllers share Three.js resources (scene, camera, controls)?

**Context**: Both `CircuitController` and `CircuitRunnerController` extend `AbstractCircuitController`, which creates scene, camera, and MapControls during `initialize()`. FR-011/FR-012 require sharing these resources.

**Finding**: The `AbstractCircuitController` creates resources in `initialize()`:
- Line 129: `this._scene = new THREE.Scene()`
- Line 135: `this._camera = createPerspectiveCamera(...)`
- Line 141: `_initializeMapControls()` creates MapControls

**Decision**: Inject shared resources via constructor or setter rather than creating them in initialize().

**Approach**:
1. Add optional `sharedResources` parameter to AbstractCircuitController constructor
2. If provided, skip resource creation in initialize() and use injected resources
3. CircuitEngine creates resources once and passes them to both controllers

**Rationale**: Minimal changes to existing controllers; backwards compatible (controllers still work standalone).

**Alternatives Considered**:
- Extract resources to separate class → Rejected: Over-engineering, more refactoring
- Have controllers reference CircuitEngine → Rejected: Circular dependency, violates composition pattern

---

### RQ2: How should visual object maps be shared?

**Context**: Each controller maintains `componentObject3Ds`, `enodeObject3Ds`, `wireObject3Ds` maps. FR-012 requires sharing these.

**Finding**: Maps are declared as `public readonly` in AbstractCircuitController:
- Line 74: `public readonly componentObject3Ds: Map<UUID, THREE.Object3D>`
- Line 75: `public readonly enodeObject3Ds: Map<UUID, THREE.Object3D>`
- Line 76: `public readonly wireObject3Ds: Map<UUID, Line2>`

**Decision**: Pass shared maps via constructor injection, same pattern as other shared resources.

**Approach**:
1. Add `sharedMaps` to the `sharedResources` injection interface
2. If provided, controllers use the injected maps instead of creating new ones
3. CircuitEngine creates maps once and injects into both controllers

**Rationale**: Consistent with RQ1 approach; enables zero-recreation mode switching.

---

### RQ3: How should event forwarding work?

**Context**: FR-007 requires forwarding all events from active controller through CircuitEngine.

**Finding**: Controllers extend `EventEmitter<ControllerEventMap>` with public `on()`, `off()`, `emit()` methods.

**Decision**: CircuitEngine subscribes to both controllers and re-emits through its own EventEmitter.

**Approach**:
1. in EventEmitter Add `onAny()` method to which listens to all events of its event map
2. CircuitEngine extends EventEmitter with combined event map (ControllerEventMap + engine-specific events)
3. On initialization, subscribe/forward all event types on both controllers with onAny((event) => this.emit(event))
4. When an event fires, CircuitEngine re-emits it to its own listeners
5. On dispose, unsubscribe from both controllers

**Rationale**: Clean delegation pattern; no modification to existing controllers needed.

**Alternatives Considered**:
- Proxy pattern → Rejected: More complex, harder to debug
- Shared EventEmitter instance → Rejected: Would require significant refactoring of base class

---

### RQ4: What is the mode switching protocol?

**Context**: Switching from edit→simulation must cancel pending operations; simulation→edit must stop simulation.

**Finding**:
- CircuitController: `setEditMode(false)` deactivates tools, `_activeTool` tracks current tool
- CircuitRunnerController: `pause()` stops simulation loop, `stop()` resets to initial state

**Decision**: Define clear transition protocol.

**Approach for edit → simulation**:
1. Cancel active tool if any: `editController.setEditMode(false)`
2. Create new CircuitRunner from current circuit (if circuit loaded)
3. Set runner on simulation controller: `simulationController.setCircuitRunner(runner)`
4. Set mode state and emit 'modeChanged'

**Approach for simulation → edit**:
1. Stop simulation: `simulationController.stop()` (resets to tick 0)
2. Clear runner: `simulationController.setCircuitRunner(null)`
3. Restore edit mode: `editController.setEditMode(true)`
4. Set mode state and emit 'modeChanged'

**Rationale**: Each controller already has the necessary methods; facade orchestrates the sequence.

---

### RQ5: How to handle setCircuit with shared visuals?

**Context**: FR-008 requires `setCircuit(circuit)` to load circuit in both controllers. With shared visual maps, only one controller should create visuals.

**Finding**:
- CircuitController: `setCircuit()` calls `_fullUpdate()` which creates all visuals
- CircuitRunnerController: `setCircuitRunner()` calls `_fullUpdate()` which also creates all visuals

**Decision**: Only the active controller creates visuals; the other receives them via shared maps.

**Approach**:
1. When in edit mode: `editController.setCircuit(circuit)` creates visuals
2. Simulation controller doesn't need separate loading; it uses shared visual maps
3. When switching to simulation: Create CircuitRunner, call `setCircuitRunner(runner)`
4. Modify CircuitRunnerController to skip visual creation if visuals already exist in shared maps

**Rationale**: Minimizes code changes; leverages existing visual creation logic in edit controller.

---

### RQ6: BehaviorRegistry injection for CircuitRunner

**Context**: CircuitRunner requires a BehaviorRegistry in constructor. How should CircuitEngine obtain this?

**Finding**: `CircuitRunner` constructor: `constructor(circuit: Circuit, behaviorRegistry: BehaviorRegistry, options?)`

**Decision**: CircuitEngine accepts BehaviorRegistry in constructor (required dependency).

**Approach**:
1. Add `behaviorRegistry: BehaviorRegistry` to CircuitEngine constructor params
2. Store reference and use when creating CircuitRunner during mode switch
3. This is already the pattern used in demo applications

**Rationale**: BehaviorRegistry is a core simulation dependency that must be provided externally.

---

## Summary of Architectural Decisions

| Decision | Pattern | Impact |
|----------|---------|--------|
| Resource sharing | Constructor injection | Minimal refactoring to AbstractCircuitController |
| Visual map sharing | Constructor injection | Controllers use injected maps |
| Event forwarding | Delegation/re-emit | No controller changes needed |
| Mode switching | Orchestration | Facade calls existing controller methods |
| Circuit loading | Edit controller primary | Simulation controller skips redundant visual creation |
| BehaviorRegistry | Constructor parameter | Required dependency for engine |

## Refactoring Required

1. **AbstractCircuitController**: Add optional `sharedResources` interface for injection
2. **CircuitRunnerController**: Add check to skip visual creation when maps pre-populated
3. **types.ts**: Add `EngineMode`, `CircuitEngineEventMap`, `SharedResources` types

## No Changes Required

- CircuitController (uses injected resources transparently)
- EventEmitter (works as-is)
- CircuitRunner (no changes)
- All visual factories (work with shared maps)
