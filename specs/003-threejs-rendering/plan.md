# Implementation Plan: 3D Circuit SceneManagers

**Branch**: `003-threejs-rendering` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)

## Summary

Implement two independent Three.js-based renderer classes (CircuitSceneManager for static/editing visualization, SimulationCircuitSceneManager for live simulation visualization) plus a shared utilities module. SceneManagers expose programmatic APIs with hookable callbacks but do not implement DOM event handling. External consumers own the animation loop and call render() each frame. Component visuals are provided via injected factory registries.

**Update 2025-12-02**: CircuitSceneManager includes integrated tool system for circuit editing operations. Five core editing tools (Select, PlaceComponent, Wire, BranchingPoint, Delete) are built-in, each with distinct interaction patterns, preview rendering, and validation logic. Tools delegate circuit modifications to core Circuit API while providing visual feedback and event emission for consumer integration.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already in project)
**Storage**: N/A (renderers are stateless; state resides in Circuit/CircuitRunner instances)
**Testing**: Vitest 4.0+ with mocked Three.js dependencies
**Target Platform**: Modern browsers with WebGL 2.0 support (ES2022+)
**Project Type**: Single library module (part of simple-circuit-engine)
**Performance Goals**: 60 FPS for static rendering, 30 FPS minimum for simulation with up to 500 components
**Constraints**: <100ms update latency, no framework dependencies (vanilla TS), core module remains dependency-free
**Scale/Scope**: 2 renderer classes + 5 editing tool classes + 1 shared utilities module, ~25-30 unit tests (including tool tests)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate 1: Framework Agnosticism ✅ PASS

**Requirement**: SceneManagers must not depend on any UI framework (React, Vue, Angular). Must accept HTMLElement for mounting and manage own lifecycle.

**Status**: ✅ **PASS**
- SceneManagers accept container via `initialize(container: HTMLElement)`
- No framework dependencies introduced
- Event-driven API via `on(event, callback)`
- Can be wrapped by any framework's binding layer

### Gate 2: Modular Separation ✅ PASS

**Requirement**: Strict dependency rules - `core/` (pure TS, no deps), `rendering/` (depends only on core + Three.js), `playback/` (depends on core + rendering)

**Status**: ✅ **PASS**
- Feature adds code to `src/scene/` only
- Depends on `src/core/` (Circuit, CircuitRunner, types) and Three.js
- No dependencies on playback layer
- Core module remains untouched and dependency-free

### Gate 3: Public API Shape ✅ PASS

**Requirement**: Event-based communication, no callbacks in method signatures, all Three.js internals hidden from consumers

**Status**: ✅ **PASS**
- SceneManagers use `on(event, callback)` for all events
- Methods return void or simple types (no callback parameters)
- Three.js internals accessed only via `getScene()` (intentional for camera access per clarifications)

### Gate 4: Resource Management ✅ PASS

**Requirement**: `dispose()` must clean up all WebGL resources, no global state

**Status**: ✅ **PASS**
- Both renderers expose `dispose()` method
- All state scoped to renderer instance
- No global state introduced

### Gate 5: Quality Standards ✅ PASS

**Requirement**: No `any` types, public APIs have JSDoc, 80% test coverage for core, all tests pass

**Status**: ✅ **PASS**
- Strict TypeScript mode enforced
- All public methods will have JSDoc
- Unit tests with mocked Three.js (rendering module doesn't require 80% but will aim for comprehensive coverage)

**Summary**: All constitutional gates passed. Feature aligns with project architecture and principles.

## Project Structure

### Documentation (this feature)

```text
specs/003-threejs-rendering/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (entity model)
├── quickstart.md        # Phase 1 output (usage guide)
└── contracts/           # Phase 1 output (API contracts)
    ├── CircuitSceneManager.ts
    ├── SimulationCircuitSceneManager.ts
    ├── ComponentVisualFactory.ts
    └── types.ts
```

### Source Code (repository root)

```text
src/
├── core/                           # (existing - not modified)
│   ├── Circuit.ts
│   ├── simulation/CircuitRunner.ts
│   └── types/
├── rendering/                      # (NEW - primary work location)
│   ├── index.ts                    # Exports CircuitSceneManager, SimulationCircuitSceneManager, shared utils
│   ├── static/                     # Static circuit renderer module
│   │   ├── CircuitSceneManager.ts
│   │   ├── StaticScene.ts
│   │   ├── EditController.ts
│   │   └── tools/                  # Editing tool implementations
│   │       ├── IEditingTool.ts     # Tool interface definition
│   │       ├── SelectTool.ts       # Select/drag/rotate tool
│   │       ├── PlaceComponentTool.ts  # Component placement tool
│   │       ├── WireTool.ts         # Wire creation tool
│   │       ├── BranchingPointTool.ts  # Branching point insertion tool
│   │       └── DeleteTool.ts       # Deletion tool
│   ├── simulation/                 # Simulation circuit renderer module
│   │   ├── SimulationCircuitSceneManager.ts
│   │   ├── SimulationScene.ts
│   │   └── AnimationController.ts
│   └── shared/                     # Shared utilities module
│       ├── ComponentVisualFactory.ts
│       ├── FactoryRegistry.ts
│       ├── CameraUtils.ts
│       ├── GeometryUtils.ts
│       ├── MaterialUtils.ts
│       ├── LightingUtils.ts
│       └── types.ts
└── playback/                       # (existing - not modified)

tests/
├── unit/
│   └── rendering/                  # (NEW - unit tests for renderers)
│       ├── CircuitSceneManager.test.ts
│       ├── SimulationCircuitSceneManager.test.ts
│       ├── ComponentVisualFactory.test.ts
│       ├── FactoryRegistry.test.ts
│       ├── tools/                  # Tool system unit tests
│       │   ├── SelectTool.test.ts
│       │   ├── PlaceComponentTool.test.ts
│       │   ├── WireTool.test.ts
│       │   ├── BranchingPointTool.test.ts
│       │   ├── DeleteTool.test.ts
│       │   └── ToolSystem.test.ts  # Tool activation/state management
│       └── __mocks__/
│           └── three.ts            # Mock Three.js for unit tests
└── integration/                    # (not in scope for this feature)
```

**Structure Decision**: Single project structure maintained. New code added to `src/scene/` with three submodules: `static/`, `simulation/`, and `shared/`. This aligns with constitution's modular separation and existing repository structure. Tests added to `tests/unit/scene/` with Three.js mocks.

## Complexity Tracking

> No constitution violations - this section not needed.

## Phase 0: Outline & Research

### Research Tasks

1. **Three.js SceneManager Pattern for Library Context**
   - Research best practices for Three.js renderers in library (non-application) context
   - How to manage WebGLSceneManager lifecycle when consumer owns animation loop
   - Pattern for exposing Scene while maintaining encapsulation

2. **Component Visual Factory Pattern**
   - Research registry pattern implementations for dynamic factory injection
   - Fallback strategies for missing component types
   - Type-safe factory function signatures

3. **State Interpolation for Discrete Simulation**
   - Research animation interpolation techniques for discrete state transitions
   - Three.js tweening/easing patterns without external animation libraries
   - Frame-independent interpolation based on elapsed time

4. **Event Emitter Pattern for TypeScript**
   - Type-safe event emitter patterns without external dependencies
   - Event callback management (add/remove listeners)
   - Error handling in event callbacks

5. **Testing Strategy for Three.js Code**
   - Mocking strategies for Three.js classes (Scene, Camera, WebGLSceneManager, etc.)
   - Unit testing 3D scene construction without actual rendering
   - Verifying object creation, materials, geometries without visual output

**Output**: `research.md` with decisions, rationales, and alternatives for each research area.

## Phase 1: Design & Contracts

### Data Model

**Entities**:
1. **CircuitSceneManager**: Main class for static/editing visualization with integrated tool system
2. **SimulationCircuitSceneManager**: Main class for live simulation visualization
3. **ComponentVisualFactory**: Factory function type for creating component visuals
4. **FactoryRegistry**: Registry mapping ComponentType → ComponentVisualFactory
5. **RenderEvent**: Union type of supported event types (includes tool events)
6. **RenderCallback**: Function signature for event callbacks
7. **ChangedData**: Optional parameter type for incremental updates
8. **IEditingTool**: Interface defining tool contract (onActivate, onDeactivate, getCursorType, getPreviewState)
9. **ToolType**: Union type of available tools ('select' | 'placeComponent' | 'wire' | 'branchingPoint' | 'delete')
10. **ToolState**: Runtime state for active tool (operation tracking, preview objects, tool-specific data)
11. **CursorType**: Union type for cursor styles ('default' | 'pointer' | 'crosshair' | 'move' | 'not-allowed' | 'grab' | 'grabbing')

**Relationships**:
- Both renderers depend on FactoryRegistry (constructor injection)
- Both renderers maintain their own Three.js Scene
- CircuitSceneManager operates on Circuit instances
- SimulationCircuitSceneManager operates on CircuitRunner instances
- SceneManagers emit RenderEvents to registered RenderCallbacks
- **CircuitSceneManager manages collection of IEditingTool instances**
- **Each IEditingTool maintains ToolState and delegates Circuit modifications to core Circuit API**
- **Tools emit tool-specific events through CircuitSceneManager's event system**

### API Contracts

**Public Interfaces** (to be generated in `/contracts/`):

1. **CircuitSceneManager.ts**: Class signature with public methods
   - `constructor(circuit: Circuit, factoryRegistry: FactoryRegistry)`
   - `initialize(container: HTMLElement): void`
   - `update(changedData?: ChangedData): void`
   - `render(): void`
   - `dispose(): void`
   - `on(event: RenderEvent, callback: RenderCallback): void`
   - `getScene(): THREE.Scene`
   - **Tool System Methods**:
   - `setEditMode(enabled: boolean): void`
   - `setActiveTool(toolType: ToolType): void`
   - `getActiveTool(): ToolType | null`
   - `cancelCurrentToolOperation(): void`
   - `handleToolClick(worldPosition: THREE.Vector3): void`
   - `handleToolHover(worldPosition: THREE.Vector3): void`
   - `handleToolScroll(delta: number): void`

2. **SimulationCircuitSceneManager.ts**: Class signature with public methods
   - `constructor(circuitRunner: CircuitRunner, factoryRegistry: FactoryRegistry)`
   - `initialize(container: HTMLElement): void`
   - `update(changedData?: ChangedData): void`
   - `render(): void`
   - `dispose(): void`
   - `on(event: RenderEvent, callback: RenderCallback): void`
   - `getScene(): THREE.Scene`

3. **ComponentVisualFactory.ts**: Factory function types and registry interface
   - `ComponentVisualFactory`: Function type signature
   - `FactoryRegistry`: Interface with register/get/has methods
   - `VisualMesh`: Return type from factories (THREE.Object3D wrapper)

4. **types.ts**: Shared types and enums
   - `RenderEvent`: 'hover' | 'unhover' | 'select' | 'deselect' | 'error' | 'ready' | 'toolActivated' | 'toolDeactivated' | 'toolOperationStarted' | 'toolOperationCompleted' | 'toolOperationCancelled' | 'toolValidationError' | 'cursorChangeRequested'
   - `RenderEventMap`: Type-safe event payload mapping
   - `RenderCallback`: Function signature
   - `ChangedData`: Object type for incremental updates
   - `SceneManagerOptions`: Optional configuration
   - **Tool System Types**:
   - `ToolType`: 'select' | 'placeComponent' | 'wire' | 'branchingPoint' | 'delete'
   - `CursorType`: 'default' | 'pointer' | 'crosshair' | 'move' | 'not-allowed' | 'grab' | 'grabbing'
   - `IEditingTool`: Tool interface with lifecycle methods
   - `RenderObjectType`: 'component' | 'wire' | 'enode'

### Quickstart Guide

**Output**: `quickstart.md` with:
- Installation (already part of simple-circuit-engine)
- Basic usage example (create renderer, mount, render loop)
- Factory registry setup example
- Event handling example
- Switch between static/simulation renderers
- **Tool system usage examples**:
  - Enabling edit mode
  - Activating tools programmatically
  - Handling tool events (toolActivated, toolOperationCompleted, toolValidationError)
  - Implementing consumer event listeners that call handleToolClick/handleToolHover
  - Tool preview rendering and cursor changes

## Phase 2: Task Decomposition

**NOT CREATED BY THIS COMMAND** - Use `/speckit.tasks` to generate `tasks.md`

---

## Next Steps

1. ✅ Phase 0 complete after `research.md` is written
2. ✅ Phase 1 complete after `data-model.md`, `/contracts/*`, and `quickstart.md` are written
3. ⏭️ Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md
4. ⏭️ Run `/speckit.tasks` to generate implementation tasks

