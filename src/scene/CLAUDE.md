# Scene Module (`src/scene`)

The scene module handles Three.js visualization, user interaction and simulation animation.

## Dependencies

- TypeScript 5.9+ (strict mode), targeting ES2022
- `src/core` for domain modeling, objects, types and simulation engine.
- **Three.js** 0.181+ for visualization (scene, camera, controls, 3D objects, Line2)
- lil-gui as helper for small interactive modal forms

## Organization

`CircuitEngine.ts` is the main public facade. It creates shared resources (scene, camera, controls, registries, visual managers) and orchestrates two controllers:

- `static/CircuitController.ts` handles the edition phase (build, edit, delete circuit elements).
- `simulation/CircuitRunnerController.ts` handles the simulation phase (playback, tick animation, switch interaction).

Both controllers extend `shared/AbstractCircuitController.ts` (template method pattern) and receive the same `SharedResources` object for seamless mode switching without recreating visuals.

### Map

```
src/scene/
  +-- CircuitEngine.ts                  # Unified facade, mode switching, shared resources owner
  +-- index.ts                          # Public API exports
  +-- setup.ts                          # Factory registration helpers
  +-- static/
  |     +-- CircuitController.ts        # Edit mode controller
  |     +-- CircuitWriter.ts            # Writes scene changes to core model
  |     +-- tools/
  |           +-- BuildTool.ts              # Unified build tool (state machine: idle/wire/component/bp/drag)
  |           +-- ComponentPickerWidget.ts  # lil-gui widget for component selection
  |           +-- ConfigPanelWidget.ts      # lil-gui widget for component configuration
  |           +-- MultiSelectTool.ts        # Rectangle selection + bulk drag
  +-- simulation/
  |     +-- CircuitRunnerController.ts  # Simulation mode controller (play/pause/step/speed)
  +-- shared/
  |     +-- AbstractCircuitController.ts    # Base controller (lifecycle, hover, loading, visuals)
  |     +-- EventEmitter.ts                 # Generic type-safe event system
  |     +-- HoverManager.ts                 # Priority raycasting (enode > component > wire) via layers
  |     +-- SelectionManager.ts             # Selection state + double-click detection
  |     +-- WireVisualManager.ts            # Line2 wire rendering, material states, preview wire
  |     +-- InterpolationController.ts      # Smooth animation between discrete simulation ticks
  |     +-- BranchingPointVisualFactory.ts  # BP cone visuals with sourceType colors
  |     +-- components/
  |     |     +-- ComponentVisualFactory.ts   # IComponentVisualFactory interface + base class
  |     |     +-- FactoryRegistry.ts          # Maps ComponentType -> factory with fallback
  |     |     +-- GroupedFactoryRegistry.ts   # Extended registry with named groups for UI
  |     |     +-- DefaultVisualFactory.ts     # Fallback white cube for unknown types
  |     |     +-- basic/                      # 8 factories: Battery, Label, Switch, DoubleThrowSwitch,
  |     |     |                               #   Lightbulb, SmallLED, RectangleLED, Relay
  |     |     +-- gates/                      # 11 factories: Inverter, NAND/NOR/XOR (2/4/8-input each)
  |     +-- types.ts                    # Shared type definitions
  |     +-- utils/
  |           +-- CameraUtils.ts        # Perspective camera creation/updates
  |           +-- ColorUtils.ts         # Color preset conversion
  |           +-- ControlsUtils.ts      # MapControls initialization
  |           +-- GeometryUtils.ts      # Grid/snap, world<->grid conversion, screen math, custom extrude Geometries methods
  |           +-- LayerConstants.ts     # Hitbox layer definitions
  |           +-- LightingUtils.ts      # Scene lighting setup
  |           +-- MaterialUtils.ts      # Line2/mesh material creation
  |           +-- Options.ts            # Default configuration merging
```

## Quality Gate

To allow more flexible tinkering and UI/UX experimentations `scene` requested unit test coverage is lowered to 60%.
