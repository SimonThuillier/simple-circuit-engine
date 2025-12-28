# simple-circuit-engine Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-28

## Active Technologies
- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (scene, camera, controls, Line2) (014-circuit-engine)
- N/A (in-memory circuit model, no persistence in this feature) (014-circuit-engine)
- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+, lil-gui (new dependency to add) (015-component-config-editor)
- N/A (in-memory config map on Component instances) (015-component-config-editor)

- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (for 3D scene interaction and Line2 wire rendering) (013-circuit-runner-controller)

- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (for 3D scene interaction and selection rectangle rendering) (011-multi-select-tool)
- N/A (in-memory circuit model, clipboard is session-only) (011-multi-select-tool)

- N/A (in-memory circuit model) (009-add-component-tool)
- TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (for 3D scene interaction) (010-build-tool-merge)

- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (already installed), three/addons/lines/Line2.js, three/addons/lines/LineGeometry.js, three/addons/lines/LineMaterial.js (007-line2-wire-refactor)
- N/A (in-memory scene state only) (007-line2-wire-refactor)
- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (Line2, LineGeometry, LineMaterial from addons) (008-wire-tool-branching)
- N/A (in-memory circuit model, Wire.intermediatePositions already exists) (008-wire-tool-branching)

- TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already installed) (006-position-tool-wires)
- N/A (in-memory circuit model, no persistence changes) (006-position-tool-wires)

- N/A (visual factories are stateless; state resides in Circuit/CircuitRunner instances) (005-visual-factory-classes)

- TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already in project) (003-threejs-rendering)
- N/A (renderers are stateless; state resides in Circuit/CircuitRunner instances) (003-threejs-rendering)
- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (already installed), three/addons/controls/MapControls.js (004-map-controls-hovering)
- N/A (stateless managers, no persistence) (004-map-controls-hovering)

- TypeScript (strict mode), targeting ES2022 + None for core simulation module (dependency-free per constitution) (001-simulation-engine)
- N/A (simulation engine is stateless; history stored in-memory when enabled) (001-simulation-engine)

- File system - JSON files written to `output/sample-circuits/` directory (001-sample-circuit-scripts)
- TypeScript (strict mode), targeting ES2022 + d3-graphviz (Graphviz DOT rendering using D3), d3 (peer dependency) (002-topology-visualizer)
- N/A (client-side only, no persistence) (002-topology-visualizer)

- TypeScript (strict mode), targeting ES2022 + None (core module is dependency-free per constitution) (001-core-object-model)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (strict mode), targeting ES2022: Follow standard conventions
When possible level of nested conditional structures should be minimized by using guard clauses and early returns. Example below:

```typescript
/**
 * Example of GOOD practice for minimizing nested conditionals
 * DO that
 * @param input
 */
function goodExample(input: number | null): string {
  if (input === null) {
    return 'No input provided';
  }
  // process securized input
  // Main logic (possibily big) continues here without additional nesting : more readable, clearer
  let output = input * 2;

  return `Output is ${output}`;
}
/**
 * Example of BAD practice that increases nested conditionals
 * DONT DO that !
 * @param input
 */
function badExample(input: number | null): string {
  if (input !== null) {
    // Main logic (possibily big) embedded under an if : less readable, less clear
    let output = input * 2;
    return `Output is ${output}`;
  }
  return 'No input provided';
}
```

## Recent Changes
- 015-component-config-editor: Added TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+, lil-gui (new dependency to add)
- 014-circuit-engine: Added TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (scene, camera, controls, Line2)

- 013-circuit-runner-controller: Added TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (for 3D scene interaction and Line2 wire rendering)



<!-- MANUAL ADDITIONS START -->

## BuildTool Architecture (010-build-tool-merge)

### Overview

BuildTool is a unified editing tool that consolidates functionality from four previous tools:

- PositionTool (component/element positioning and rotation)
- WireTool (wire creation and manipulation)
- DeleteTool (element deletion)
- BranchingPointTool (branching point creation)

### State Machine

BuildTool operates in multiple modes with clear state transitions:

**Modes:**

- `idle`: No active operation
- `wire_creation`: Creating wire from source to target
- `component_drag`: Dragging component or branching point
- `wire_drag`: Dragging wire intermediate point
- `bp_drag`: Dragging standalone branching point

**Key Transitions:**

- `idle → wire_creation`: Click on enode (pin/branching point)
- `idle → component_drag`: Pointerdown on selected element
- `idle → wire_drag`: Click on wire or intermediate point
- `idle → bp_drag`: Click on branching point
- `{any active mode} → idle`: Pointerup, Escape, or operation complete

### State Interfaces

**WireCreationState**: Tracks wire creation operation

- `sourceEnodeId`: UUID of source endpoint
- `sourcePosition`: World position of source
- `previewWire`: Line2 preview object
- `ts`: Operation timestamp

**ComponentDragState**: Tracks component drag

- `componentId`: UUID of component being dragged
- `initialPosition`: Starting position (for cancel)

**WireDragState**: Tracks wire point drag

- `wireId`: UUID of wire being modified
- `pointIndex`: Index in intermediatePositions array
- `initialPosition`: Starting position
- `originalPositions`: Snapshot for cancellation
- `targetType`: 'intermediate' | 'new_intermediate'

**BPDragState**: Tracks branching point drag

- `enodeId`: UUID of branching point
- `initialPosition`: Starting position (for cancel)

### Event Handlers

- `handlePointerDown()`: Initiates operations based on hovered element
- `handlePointerUp()`: Commits operations based on current mode
- `handleGridPositionMove()`: Updates preview/positions during drag
- `handleKeyDown()`: Handles Escape (cancel), Delete/Backspace (delete), R (rotate)
- `handleDblClick()`: Handles rotation and BP creation

### Target Priority (disambiguate clicks)

1. Enode (pin/branching point) - highest priority for wire creation
2. Selected element - for drag operations
3. Wire - for intermediate point manipulation
4. Empty space - for standalone BP creation (double-click)

### Best Practices

- Always check `event.button === 0` (left click only)
- Lock camera controls during active operations
- Dispose preview objects on mode transitions
- Use guard clauses to minimize nesting
- All state interfaces must be strongly typed (no `any`)
- Emit events for all operations (started, completed, cancelled, validation errors)

### Integration Points

- **CircuitController**: Tool registration and scene access
- **SelectionManager**: Element selection state
- **WireVisualManager**: Wire geometry updates
- **CircuitWriter**: Model persistence
- **HoverManager**: Element hover detection

### Testing

- All test specifications migrated to BuildTool.test.ts
- 98 passing tests covering all user stories
- Tests organized by user story (US1-US5)

<!-- MANUAL ADDITIONS END -->
