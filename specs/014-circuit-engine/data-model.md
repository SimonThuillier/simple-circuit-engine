# Data Model: CircuitEngine Unified Facade

**Feature**: 014-circuit-engine
**Date**: 2025-12-22

## Entities

### EngineMode

Discriminated union type representing the current operating mode of the engine.

```typescript
type EngineMode = 'edit' | 'simulation';
```

**Validation Rules**:
- Must be one of the two literal values
- Default: `'edit'` (engine starts in edit mode)

---

### SharedResources

Interface for resources shared between controllers. Passed via constructor injection.

```typescript
interface SharedResources {
  // Three.js core objects (created by CircuitEngine)
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mapControls: MapControls;
  grid: THREE.GridHelper | null;

  // Factories (created by CircuitEngine)
  factoryRegistry: IFactoryRegistry;
  branchingPointVisualFactory: BranchingPointVisualFactory;
  wireVisualManager: WireVisualManager;
  hoverManager: HoverManager;

  // Visual object maps (shared between controllers)
  componentObject3Ds: Map<UUID, THREE.Object3D>;
  enodeObject3Ds: Map<UUID, THREE.Object3D>;
  wireObject3Ds: Map<UUID, Line2>;
}
```

**Relationships**:
- Created by: `CircuitEngine`
- Consumed by: `CircuitController`, `CircuitRunnerController`

**Lifecycle**:
- Created during `CircuitEngine.initialize()`
- Disposed during `CircuitEngine.dispose()`

---

### CircuitEngineEventMap

Combined event type map for the unified facade. Extends ControllerEventMap with engine-specific events.

```typescript
interface CircuitEngineEventMap extends ControllerEventMap {
  // Engine-specific events
  modeChanged: {
    mode: EngineMode;
    previousMode: EngineMode;
  };
}
```

**Event Sources**:
- `modeChanged`: Emitted by CircuitEngine after mode transition completes
- All other events: Forwarded from active controller (CircuitController or CircuitRunnerController)

---

### CircuitEngineOptions

Configuration options for engine initialization. Extends ControllerOptions.

```typescript
interface CircuitEngineOptions extends ControllerOptions {
  // Initial mode (default: 'edit')
  initialMode?: EngineMode;

  // Runner options passed when creating CircuitRunner
  runnerOptions?: RunnerOptions;
}
```

---

### CircuitEngine

Main facade class. This is not a data model but the primary entity defined by this feature.

**State Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `_mode` | `EngineMode` | Current operating mode |
| `_editController` | `CircuitController` | Static editing controller |
| `_simulationController` | `CircuitRunnerController` | Live simulation controller |
| `_circuit` | `Circuit \| null` | Currently loaded circuit |
| `_runner` | `CircuitRunner \| null` | Active simulation runner (simulation mode only) |
| `_behaviorRegistry` | `BehaviorRegistry` | Component behavior registry for simulation |
| `_sharedResources` | `SharedResources` | Shared Three.js resources |
| `_initialized` | `boolean` | Initialization state |
| `_disposed` | `boolean` | Disposal state |

**State Transitions**:

```
┌─────────────────────────────────────────────────────────────┐
│                      CircuitEngine                          │
├─────────────────────────────────────────────────────────────┤
│  [uninitialized] ──initialize()──> [initialized:edit]       │
│                                                             │
│  [initialized:edit] ──setMode('simulation')──>              │
│                      [initialized:simulation]               │
│                                                             │
│  [initialized:simulation] ──setMode('edit')──>              │
│                            [initialized:edit]               │
│                                                             │
│  [initialized:*] ──dispose()──> [disposed]                  │
└─────────────────────────────────────────────────────────────┘
```

**Invariants**:
- Only one mode can be active at a time
- Mode-specific operations throw errors if called in wrong mode
- dispose() can be called from any initialized state
- setCircuit() works in both modes

---

## Existing Entities (No Changes)

The following entities from existing code remain unchanged:

- `Circuit`: Circuit topology and metadata
- `CircuitRunner`: Discrete-time simulation engine
- `CircuitController`: Static editing controller (receives SharedResources)
- `CircuitRunnerController`: Live simulation controller (receives SharedResources)
- `ControllerEventMap`: Existing event type map
- `ControllerOptions`: Existing initialization options

---

## Relationships Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        CircuitEngine                             │
│  (extends EventEmitter<CircuitEngineEventMap>)                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────────┐                │
│  │ SharedResources │────>│  CircuitController  │                │
│  │                 │     │  (edit mode)        │                │
│  │  - scene        │     └─────────────────────┘                │
│  │  - camera       │                                            │
│  │  - mapControls  │     ┌─────────────────────┐                │
│  │  - factories    │────>│CircuitRunnerCtrl    │                │
│  │  - visualMaps   │     │  (simulation mode)  │                │
│  └─────────────────┘     └─────────────────────┘                │
│                                    │                             │
│                          ┌─────────┴─────────┐                   │
│                          │   CircuitRunner   │                   │
│                          │ (created on switch│                   │
│                          │  to simulation)   │                   │
│                          └───────────────────┘                   │
│                                    │                             │
│  ┌──────────┐            ┌─────────┴─────────┐                   │
│  │ Circuit  │<───────────│ BehaviorRegistry  │                   │
│  │ (loaded) │            │ (injected)        │                   │
│  └──────────┘            └───────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```
