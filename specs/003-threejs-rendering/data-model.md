# Data Model: 3D Circuit SceneManagers

## Entity Definitions

### 1. CircuitSceneManager

**Purpose**: Render static circuit topology with support for editing interactions via integrated tool system

**Fields**:
- `circuit: Circuit` - The circuit topology to visualize (readonly)
- `factoryRegistry: FactoryRegistry` - Component visual factory registry (readonly)
- `scene: THREE.Scene` - Three.js scene containing all visual elements (private)
- `camera: THREE.PerspectiveCamera` - Camera for viewing the scene (private)
- `container: HTMLElement | null` - DOM container for rendering (private)
- `initialized: boolean` - Initialization state flag (private)
- `eventEmitter: EventEmitter<SceneManagerEventMap>` - Event system (private)
- `componentMeshes: Map<UUID, THREE.Object3D>` - Component ID → visual mesh (private)
- `wireMeshes: Map<UUID, THREE.Line>` - Wire ID → visual line (private)
- `enodeMeshes: Map<UUID, THREE.Mesh>` - ENode ID → visual sphere (private)
- **Tool System Fields**:
- `editMode: boolean` - Edit mode enabled state (private)
- `tools: Map<ToolType, IEditingTool>` - Registered editing tools (private)
- `activeTool: IEditingTool | null` - Currently active tool (private)
- `toolState: ToolState | null` - Active tool's operation state (private)
- `previewObjects: THREE.Object3D[]` - Tool preview visuals (private)

**Methods**:
- `constructor(circuit, factoryRegistry)`
- `initialize(container): void`
- `update(changedData?): void`
- `render(): void`
- `dispose(): void`
- `on(event, callback): void`
- `getScene(): THREE.Scene`
- **Tool System Methods**:
- `setEditMode(enabled: boolean): void`
- `setActiveTool(toolType: ToolType): void`
- `getActiveTool(): ToolType | null`
- `cancelCurrentToolOperation(): void`
- `handleToolClick(cursorGroundPlanePosition: THREE.Vector3): void`
- `handleToolHover(cursorGroundPlanePosition: THREE.Vector3): void`
- `handleToolScroll(delta: number): void`

**State Transitions**:
1. **Uninitialized** → (initialize called) → **Ready (Read-Only)**
2. **Ready (Read-Only)** → (setEditMode(true) called) → **Ready (Edit Mode)**
3. **Ready (Edit Mode)** → (setActiveTool called) → **Ready (Edit Mode, Tool Active)**
4. **Ready (Edit Mode, Tool Active)** → (tool operation) → **Ready (Edit Mode, Tool Active)** (performs edit)
5. **Ready (Edit Mode, Tool Active)** → (setActiveTool(different tool)) → **Ready (Edit Mode, Tool Active)** (switches tool)
6. **Ready (Edit Mode)** → (setEditMode(false)) → **Ready (Read-Only)** (deactivates all tools)
7. **Ready** → (update called) → **Ready** (updates visual elements)
8. **Ready** → (dispose called) → **Disposed**
9. **Disposed** → (terminal state, no transitions)

**Validation Rules**:
- Cannot call `update()` or `render()` before `initialize()`
- Cannot call any methods after `dispose()`
- `container` must be a valid HTMLElement in `initialize()`
- Circuit must be valid (non-null)
- **Tool System Validations**:
- Cannot call `setActiveTool()` when edit mode is disabled
- Cannot call tool interaction methods (`handleToolClick`, etc.) when no tool is active
- Only one tool can be active at a time (enforced automatically)
- Cannot switch tools while current tool has operation in progress (attempting to do so throws error per FR-028)

---

### 2. CircuitRunnerSceneManager

**Purpose**: Render live circuit simulation with animated state changes

**Fields**:
- `circuitRunner: CircuitRunner` - The simulation runner (readonly)
- `factoryRegistry: FactoryRegistry` - Component visual factory registry (readonly)
- `scene: THREE.Scene` - Three.js scene containing all visual elements (private)
- `camera: THREE.PerspectiveCamera` - Camera for viewing the scene (private)
- `container: HTMLElement | null` - DOM container for rendering (private)
- `initialized: boolean` - Initialization state flag (private)
- `eventEmitter: EventEmitter<SceneManagerEventMap>` - Event system (private)
- `componentMeshes: Map<UUID, THREE.Object3D>` - Component ID → visual mesh (private)
- `wireMeshes: Map<UUID, THREE.Line>` - Wire ID → animated line (private)
- `enodeMeshes: Map<UUID, THREE.Mesh>` - ENode ID → visual sphere (private)
- `interpolationController: InterpolationController` - Manages state interpolation (private)
- `lastSimulationTick: number` - Last processed simulation tick (private)
- `lastRenderTime: number` - Last render timestamp for interpolation (private)

**Methods**:
- `constructor(circuitRunner, factoryRegistry)`
- `initialize(container): void`
- `update(changedData?): void`
- `render(): void`
- `dispose(): void`
- `on(event, callback): void`
- `getScene(): THREE.Scene`

**State Transitions**:
1. **Uninitialized** → (initialize called) → **Ready**
2. **Ready** → (update called) → **Ready** (updates from simulation state)
3. **Ready** → (render called) → **Ready** (interpolates and renders)
4. **Ready** → (dispose called) → **Disposed**
5. **Disposed** → (terminal state, no transitions)

**Validation Rules**:
- Cannot call `update()` or `render()` before `initialize()`
- Cannot call any methods after `dispose()`
- `container` must be a valid HTMLElement in `initialize()`
- CircuitRunner must be valid (non-null)

---

### 3. ComponentVisualFactory

**Purpose**: Factory function type for creating component visuals

**Type Definition**:
```typescript
type ComponentVisualFactory = (component: Component) => THREE.Object3D;
```

**Contract**:
- Input: Component instance from core module
- Output: THREE.Object3D (Mesh, Group, or other 3D object)
- Must return a non-null object
- Factory should set object.userData.componentId for identification

**Example Implementations**:
- Battery factory: Returns red cylinder
- Switch factory: Returns box with rotation state
- LED factory: Returns sphere with emissive material

---

### 4. FactoryRegistry

**Purpose**: Registry mapping ComponentType to ComponentVisualFactory

**Fields**:
- `factories: Map<ComponentType, ComponentVisualFactory>` - Type → factory mapping (private)
- `fallbackFactory: ComponentVisualFactory` - Default factory for unknown types (private)

**Methods**:
- `constructor(fallbackFactory)`
- `register(type: ComponentType, factory: ComponentVisualFactory): void`
- `get(type: ComponentType): ComponentVisualFactory`
- `has(type: ComponentType): boolean`

**Validation Rules**:
- Fallback factory required in constructor (non-null)
- Cannot register null/undefined factories
- `get()` always returns a factory (fallback if type not registered)

**Identity Rules**:
- ComponentType enum value used as unique identifier
- Factories are stored by reference (function objects)

---

### 5. SceneManagerEvent

**Purpose**: Union type of supported event types (includes tool system events)

**Type Definition**:
```typescript
type SceneManagerEvent =
  | 'hover' | 'unhover' | 'position' | 'deselect' | 'error' | 'ready'
  | 'toolActivated' | 'toolDeactivated' | 'toolOperationStarted'
  | 'toolOperationCompleted' | 'toolOperationCancelled'
  | 'toolValidationError' | 'cursorChangeRequested';
```

**Event Payloads**:
- `hover`: `{ objectId: UUID, objectType: 'component' | 'wire' | 'enode' }`
- `unhover`: `{ objectId: UUID, objectType: 'component' | 'wire' | 'enode' }`
- `position`: `{ objectId: UUID, objectType: 'component' | 'wire' | 'enode' }`
- `deselect`: `{ objectId: UUID, objectType: 'component' | 'wire' | 'enode' }`
- `error`: `{ message: string, error?: Error }`
- `ready`: `{ renderer: 'static' | 'simulation' }`
- **Tool System Event Payloads**:
- `toolActivated`: `{ toolType: ToolType }`
- `toolDeactivated`: `{ toolType: ToolType }`
- `toolOperationStarted`: `{ toolType: ToolType, operationData: any }`
- `toolOperationCompleted`: `{ toolType: ToolType, operationData: any, changedData: ChangedData }`
- `toolOperationCancelled`: `{ toolType: ToolType }`
- `toolValidationError`: `{ toolType: ToolType, errorMessage: string }`
- `cursorChangeRequested`: `{ cursorType: CursorType }`

---

### 6. SceneManagerCallback

**Purpose**: Function signature for event callbacks

**Type Definition**:
```typescript
type SceneManagerCallback<T = any> = (payload: T) => void;
```

**Contract**:
- Receives event-specific payload object
- Return value ignored
- Should not throw errors (wrapped in try-catch by EventEmitter)

---

### 7. ChangedData

**Purpose**: Optional parameter for incremental renderer updates

**Type Definition**:
```typescript
interface ChangedData {
  addedComponents?: UUID[];
  removedComponents?: UUID[];
  updatedComponents?: UUID[];
  addedWires?: UUID[];
  removedWires?: UUID[];
  updatedWires?: UUID[];
  addedENodes?: UUID[];
  removedENodes?: UUID[];
  stateChanged?: boolean;  // For simulation renderer
}
```

**Usage**:
- If `changedData` is provided, renderer performs incremental update
- If `changedData` is null/undefined, renderer performs full update
- Empty object `{}` treated as full update

---

### 8. EventEmitter<EventMap>

**Purpose**: Type-safe event system base class

**Fields**:
- `listeners: Map<keyof EventMap, Set<Function>>` - Event → callbacks mapping (private)

**Methods**:
- `on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): void`
- `off<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): void`
- `emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void`

**Generic Parameter**:
```typescript
interface SceneManagerEventMap {
  hover: { objectId: UUID; objectType: 'component' | 'wire' | 'enode' };
  unhover: { objectId: UUID; objectType: 'component' | 'wire' | 'enode' };
  position: { objectId: UUID; objectType: 'component' | 'wire' | 'enode' };
  deselect: { objectId: UUID; objectType: 'component' | 'wire' | 'enode' };
  error: { message: string; error?: Error };
  ready: { renderer: 'static' | 'simulation' };
}
```

---

### 9. InterpolationController

**Purpose**: Manages state interpolation for smooth animations

**Fields**:
- `previousStates: Map<UUID, any>` - Last known state for each object (private)
- `currentStates: Map<UUID, any>` - Current state for each object (private)
- `transitionStart: number` - Timestamp when transition began (private)
- `transitionDuration: number` - Duration of transition in ms (private)

**Methods**:
- `updateState(objectId: UUID, newState: any): void`
- `getInterpolatedState(objectId: UUID, currentTime: number): any`
- `setTransitionDuration(duration: number): void`

**Interpolation Algorithm**:
1. Track previous and current state for each object
2. Calculate elapsed time since transition start
3. Compute progress ratio: `progress = Math.min(elapsedTime / duration, 1.0)`
4. Apply easing function: `easedProgress = easeInOutCubic(progress)`
5. Interpolate numeric values: `lerp(previous, current, easedProgress)`

---

### 10. IEditingTool

**Purpose**: Interface defining contract for editing tool implementations

**Type Definition**:
```typescript
interface IEditingTool {
  readonly type: ToolType;
  onActivate(): void;
  onDeactivate(): void;
  getCursorType(): CursorType;
  getPreviewObjects(): THREE.Object3D[];
}
```

**Contract**:
- `type`: Unique identifier for the tool ('position', 'addComponent', 'wire', 'branchingPoint', 'delete')
- `onActivate()`: Called when tool becomes active (setup state, show previews)
- `onDeactivate()`: Called when tool is deactivated (cleanup state, hide previews)
- `getCursorType()`: Returns current cursor style for this tool
- `getPreviewObjects()`: Returns array of Three.js objects to render as previews

**Implementations**:
- **PositionTool**: Click to position, drag to move, double-click to rotate
- **AddComponentTool**: Palette choose type, click to place, scroll to rotate before placement
- **WireTool**: Click source pin/branching point, click target, Escape to cancel
- **BranchingPointTool**: Click on wire to split and insert branching point
- **DeleteTool**: Click component/wire/branching point to delete

---

### 11. ToolType

**Purpose**: Union type of available editing tools

**Type Definition**:
```typescript
type ToolType = 'position' | 'addComponent' | 'wire' | 'branchingPoint' | 'delete';
```

**Values**:
- `position`: Select/move/rotate components
- `addComponent`: Place new components with preview
- `wire`: Create wires between pins/branching points
- `branchingPoint`: Insert branching points on wires
- `delete`: Delete components/wires/branching points

---

### 12. CursorType

**Purpose**: Union type for cursor styles

**Type Definition**:
```typescript
type CursorType = 'default' | 'pointer' | 'crosshair' | 'move' | 'not-allowed' | 'grab' | 'grabbing';
```

**Usage**:
- `default`: No special cursor (read-only mode)
- `pointer`: Hovering over selectable object
- `crosshair`: Placement or targeting mode
- `move`: Dragging component
- `not-allowed`: Invalid operation (overlap, invalid endpoint)
- `grab`: Ready to drag
- `grabbing`: Currently dragging

---

### 13. ToolState

**Purpose**: Runtime state for active tool operations

**Fields** (varies by tool type):
- **Common**:
  - `operationInProgress: boolean` - Multi-step operation active
  - `previewObjects: THREE.Object3D[]` - Visual previews
- **PositionTool**:
  - `selectedComponent: UUID | null` - Currently selected component
  - `dragStart: THREE.Vector3 | null` - Drag operation start position
  - `rotationAngle: number` - Current rotation angle
- **AddComponentTool**:
  - `componentType: ComponentType | null` - Type to place
  - `previewPosition: THREE.Vector3` - Ghost preview position
  - `previewRotation: number` - Preview rotation angle
- **WireTool**:
  - `sourceEndpoint: UUID | null` - Source pin/branching point ID
  - `wireInProgress: boolean` - Wire creation started
  - `previewPath: THREE.Line | null` - Path preview object
- **BranchingPointTool**:
  - `targetWire: UUID | null` - Wire to split
  - `insertionPosition: THREE.Vector3 | null` - Where to insert
- **DeleteTool**:
  - `targetObject: { id: UUID, type: CircuitSceneObjectType } | null` - Object to delete

**Lifecycle**:
- Created when tool activated
- Updated during tool operations
- Reset when tool operation completes or is cancelled
- Destroyed when tool deactivated

---

## Relationships

### Dependency Graph

```
CircuitSceneManager
  ├─ depends on → Circuit (core module)
  ├─ depends on → FactoryRegistry (shared)
  ├─ depends on → EventEmitter (shared)
  ├─ depends on → IEditingTool (5 implementations)
  └─ uses → THREE.Scene, THREE.Camera (Three.js)

SimulationCircuitSceneManager
  ├─ depends on → CircuitRunner (core module)
  ├─ depends on → FactoryRegistry (shared)
  ├─ depends on → EventEmitter (shared)
  ├─ depends on → InterpolationController (shared)
  └─ uses → THREE.Scene, THREE.Camera (Three.js)

IEditingTool (implementations)
  ├─ PositionTool → depends on Circuit (for modification)
  ├─ AddComponentTool → depends on Circuit, ComponentType
  ├─ WireTool → depends on Circuit
  ├─ BranchingPointTool → depends on Circuit
  └─ DeleteTool → depends on Circuit

FactoryRegistry
  └─ depends on → ComponentType (core module)

InterpolationController
  └─ no external dependencies (pure utility)

EventEmitter<T>
  └─ no external dependencies (pure utility)
```

### Composition Relationships

- **CircuitSceneManager** *contains* EventEmitter<SceneManagerEventMap>
- **CircuitSceneManager** *contains* Map<ToolType, IEditingTool> (tool registry)
- **CircuitSceneManager** *contains* ToolState | null (active tool state)
- **SimulationCircuitSceneManager** *contains* EventEmitter<SceneManagerEventMap>
- **SimulationCircuitSceneManager** *contains* InterpolationController
- **Both renderers** *contain* THREE.Scene, THREE.Camera
- **Both renderers** *reference* FactoryRegistry (injected dependency)
- **Each IEditingTool** *contains* tool-specific ToolState instance

### Association Relationships

- **CircuitSceneManager** → **Circuit** (1:1, immutable after construction)
- **SimulationCircuitSceneManager** → **CircuitRunner** (1:1, immutable after construction)
- **FactoryRegistry** → **ComponentVisualFactory** (1:many, registered dynamically)
- **SceneManagers** → **THREE.Object3D** (1:many, created from circuit data)

---

## Data Flow

### Initialization Flow

1. **Consumer creates FactoryRegistry**
   ```typescript
   const registry = new FactoryRegistry(defaultFactory);
   registry.register(ComponentType.Battery, batteryFactory);
   ```

2. **Consumer creates renderer**
   ```typescript
   const renderer = new CircuitSceneManager(circuit, registry);
   ```

3. **Consumer initializes renderer**
   ```typescript
   renderer.initialize(containerElement);
   // Emits 'ready' event
   ```

### Update Flow (Static SceneManager)

1. **Circuit topology changes** (external to renderer)
2. **Consumer calls update()**
   ```typescript
   renderer.update({ addedComponents: [newId] });
   ```
3. **SceneManager processes changes**:
   - Adds new visual meshes for added components
   - Removes meshes for deleted components
   - Updates positions/rotations for modified components

### Render Flow (Simulation SceneManager)

1. **Consumer calls render() in animation loop**
   ```typescript
   function animate() {
     renderer.render();
     requestAnimationFrame(animate);
   }
   ```

2. **SceneManager computes interpolated states**:
   - Gets current simulation tick from CircuitRunner
   - Interpolates between last tick and current tick based on elapsed time

3. **SceneManager updates visual properties**:
   - Sets material colors based on electrical state
   - Animates current flow on wires
   - Updates component visual states

4. **Consumer renders scene** (external):
   ```typescript
   webGLSceneManager.render(renderer.getScene(), camera);
   ```

### Tool Interaction Flow (Static SceneManager)

1. **Consumer enables edit mode**
   ```typescript
   renderer.setEditMode(true);
   // Emits 'ready' with edit mode enabled
   ```

2. **Consumer activates a tool**
   ```typescript
   renderer.setActiveTool('addComponent');
   // Emits 'toolActivated' with toolType
   // Emits 'cursorChangeRequested' with cursorType
   ```

3. **Consumer implements event listeners and translates to tool API calls**
   ```typescript
   canvas.addEventListener('mousemove', (e) => {
     const worldPos = screenToWorld(e.clientX, e.clientY);
     renderer.handleToolHover(worldPos);
     // Tool updates preview position
   });

   canvas.addEventListener('click', (e) => {
     const worldPos = screenToWorld(e.clientX, e.clientY);
     renderer.handleToolClick(worldPos);
     // Tool processes click
   });

   canvas.addEventListener('wheel', (e) => {
     renderer.handleToolScroll(e.deltaY);
     // Tool updates rotation (if applicable)
   });
   ```

4. **Tool processes operation**:
   - **If validation fails**: Emits 'toolValidationError', shows error preview
   - **If validation succeeds**:
     a. Tool calls Circuit API to modify topology
     b. Tool constructs ChangedData delta
     c. SceneManager calls internal update(changedData)
     d. Emits 'toolOperationCompleted' with changedData
     e. Consumer reacts to event (e.g., update UI)

5. **Multi-step tools (Wire)**:
   - First click: Emits 'toolOperationStarted', stores source endpoint
   - Second click: Completes operation, emits 'toolOperationCompleted'
   - Escape key: Consumer calls `cancelCurrentToolOperation()`, emits 'toolOperationCancelled'

6. **Consumer switches tools**:
   ```typescript
   renderer.setActiveTool('delete');
   // Deactivates previous tool (emits 'toolDeactivated')
   // Activates new tool (emits 'toolActivated')
   // Emits 'cursorChangeRequested' with new cursor
   ```

7. **Consumer disables edit mode**:
   ```typescript
   renderer.setEditMode(false);
   // Deactivates current tool (emits 'toolDeactivated')
   // Resets tool state
   // Returns to read-only mode
   ```

---

## Scale Considerations

### Memory Management

- Each component creates 1 THREE.Object3D (~1KB)
- Each wire creates 1 THREE.Line (~500 bytes)
- Each ENode creates 1 THREE.Mesh (~500 bytes)
- Target: 500 components = ~500KB + overhead
- Scene graph depth: 3 levels maximum (Scene → Group → Mesh)
- **Tool System**:
  - 5 tool instances: ~5KB total (persistent)
  - Tool preview objects: ~1-5KB (temporary, depends on active tool)
  - Tool state: <1KB per tool (only when active)

### Performance Targets

- Full update (500 components): <100ms
- Incremental update (10 changes): <10ms
- Render frame (interpolation + updates): <16ms (60 FPS)
- Event emission overhead: <1ms per event
- **Tool Operations**:
  - Tool activation/deactivation: <5ms
  - Tool preview update (per frame): <3ms
  - Tool validation check: <2ms
  - Tool operation completion (with Circuit API call + update): <100ms (per FR-037)

### Data Volume

- CircuitSceneManager: ~500 components, ~1000 wires, ~1500 enodes
- SimulationCircuitSceneManager: Same + interpolation state (~2x memory)
- FactoryRegistry: ~10-20 registered factories
- EventEmitter: ~10-50 registered listeners per event type
