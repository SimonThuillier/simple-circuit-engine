# Architecture

Simple Circuit Engine follows a hexagonal (ports and adapters) architecture with strict dependency rules.

## Module Structure

```
┌─────────────────────────────────────┐
│       Application Layer             │
│   (React, Vue, Vanilla, Node.js)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       CircuitEngine (Facade)         │  ← Public API
│     Event-driven, chainable          │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │   playback/                    │  │  ← Adapter
│  │   - ScenarioPlayer             │  │
│  │   - Timeline                   │  │
│  │   - PlaybackController         │  │
│  └─────────────┬──────────────────┘  │
│                │                      │
│  ┌─────────────▼──────────────────┐  │
│  │   rendering/                   │  │  ← Adapter
│  │   - SceneManager (Three.js)    │  │
│  │   - ComponentRenderer          │  │
│  │   - WireRenderer               │  │
│  │   - CameraController           │  │
│  └─────────────┬──────────────────┘  │
│                │                     │
│  ┌─────────────▼──────────────────┐  │
│  │   core/                        │  │  ← Domain Core
│  │   - Circuit types              │  │
│  │   - SimulationEngine           │  │
│  │   - Component logic            │  │
│  │   - Wire propagation           │  │
│  │   - State management           │  │
│  │   - Validators                 │  │
│  │   Pure TypeScript, minimal deps│  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## Dependency Rules

| Module | May Import | May NOT Import | DOM Access |
|--------|-----------|----------------|------------|
| `core/` | nothing | three, rendering, playback | ❌ |
| `rendering/` | core, three | playback | ✅ (via Three.js) |
| `playback/` | core, rendering | - | ❌ |

**Key Principle**: Dependencies point inward. Outer layers know about inner layers, never the reverse.

## Core Module (`src/core/`)

Pure domain logic with no external dependencies.

### Responsibilities
- Define circuit structure (components, wires, connections)
- Implement boolean simulation logic
- Manage discrete-time state propagation
- Validate circuits and detect errors
- Provide immutable data structures

### Key Concepts
- **Component**: A circuit element (switch, gate, LED, etc.) with pins and internal state
- **Wire**: Connection between component pins, propagates boolean signals
- **Circuit**: Complete graph of components and wires
- **SimulationEngine**: Executes discrete time steps, propagates signals

### Characteristics
- Works in Node.js (headless simulation)
- No DOM access
- No side effects
- Fully testable
- 80%+ code coverage required

## Rendering Module (`src/rendering/`)

Three.js visualization adapter.

### Responsibilities
- Create and manage Three.js scene
- Render components as 3D objects
- Animate wire current flow
- Synchronize visual state with core simulation state
- Handle camera and interaction

### Key Concepts
- **SceneManager**: Owns Three.js scene, renderer, camera
- **ComponentRenderer**: Maps core components to 3D meshes
- **WireRenderer**: Draws wires, animates current flow
- **CameraController**: Handles user interaction (orbit, zoom)

### Characteristics
- Depends only on `core/` and Three.js
- Has no knowledge of `playback/`
- Can be used standalone for manual circuit visualization

## Playback Module (`src/playback/`)

Scenario orchestration layer.

### Responsibilities
- Load scenario definitions (JSON)
- Execute scenario steps on timeline
- Coordinate simulation and rendering
- Emit events for application consumption

### Key Concepts
- **Scenario**: Test sequence with timed actions and expectations
- **ScenarioPlayer**: Executes scenario steps
- **Timeline**: Manages playback time and speed
- **PlaybackController**: Provides play/pause/step controls

### Characteristics
- Orchestrates both `core/` and `rendering/`
- Event-driven API
- Supports automated testing workflows

## CircuitEngine (Facade)

Main entry point that hides internal architecture.

### Design Goals
- Simple, intuitive API
- Chainable methods
- Event-based communication
- Hide all Three.js and internal complexity

### Public Surface
```typescript
class CircuitEngine {
  constructor(container?: HTMLElement)
  loadCircuit(data: object): this
  loadScenario(data: object): this
  play(): this
  pause(): this
  step(): this
  reset(): this
  on(event: string, handler: Function): this
  off(event: string, handler: Function): this
  dispose(): void
}
```

## Data Flow

### Initialization
```
Application
  → new CircuitEngine(container)
    → creates core.SimulationEngine
    → creates rendering.SceneManager (if container provided)
    → creates playback.PlaybackController
```

### Circuit Loading
```
Application
  → engine.loadCircuit(data)
    → core validates and builds circuit graph
    → rendering creates 3D representations
    → event: 'circuit-loaded'
```

### Playback
```
Application
  → engine.play()
    → playback.ScenarioPlayer starts
      → each tick:
        → core.SimulationEngine.step()
        → rendering syncs visual state
        → event: 'tick'
```

## Extension Points

Future extensions should follow the adapter pattern:

- **New component types**: Add to `core/components/`
- **New renderers**: Implement `ComponentRenderer` interface
- **Alternative visualization**: Replace `rendering/` with different adapter (e.g., 2D canvas)
- **Export formats**: Add adapters that read core state

## Testing Strategy

- **Unit tests**: Each module independently
- **Integration tests**: Module boundaries (e.g., core ↔ rendering)
- **E2E tests**: Full CircuitEngine API
- **Visual regression**: Screenshot-based rendering tests
