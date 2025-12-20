# Research: Select Tool & Wire Visual Improvements

**Feature**: 006-position-tool-wires
**Date**: 2025-12-09

## Research Topics

### 1. Three.js Drag Implementation Patterns

**Decision**: Use raycasting to project mouse position onto a horizontal plane at y=0, then snap to grid

**Rationale**:
- The project already uses raycasting via HoverManager for hover detection
- Components exist on a discrete grid at y=0, so projecting to this plane gives accurate world coordinates
- Grid snapping (rounding to nearest integer x, z) matches the existing position model
- This approach is simpler than TransformControls which adds unnecessary complexity for 2D grid movement

**Alternatives Considered**:
- Three.js TransformControls: Rejected - too heavyweight for simple grid-based movement, adds visual gizmos not aligned with project aesthetic
- Screen-space delta tracking: Rejected - requires complex camera-relative calculations and doesn't naturally produce grid positions
- DragControls addon: Rejected - designed for free-form 3D movement, not grid-snapped 2D

### 2. Selection State Management Pattern

**Decision**: Create a dedicated SelectionManager class following the existing HoverManager pattern

**Rationale**:
- Separates concerns: SelectionManager owns selection state, CircuitController and tools request selection changes
- Consistent with existing architecture (HoverManager handles hover, SelectionManager handles selection)
- Enables centralized event emission for selection changes
- Allows future extension to multi-position without changing tool implementations

**Alternatives Considered**:
- Store selection in PositionTool directly: Rejected - selection state should persist across tool switches
- Store selection in CircuitController: Rejected - bloats the already large controllerType class; better to delegate
- Global state: Rejected - violates constitution's "no global state" rule
- Have SelectionManager trigger visual changes through visual factories: Rejected - violates separation of concerns and mixes visual logic into pure selection management

### 3. Pin Position Calculation for Wire Endpoints

**Decision**: Calculate pin world positions by combining component position, component rotation, and per-pin local offset defined in visual factories

**Rationale**:
- Each visual factory already positions pin groups relative to component origin (e.g., BatteryVisualFactory places cathode at z=-1, anode at z=+1)
- The 3D visual Object3D hierarchy already encodes pin positions via `pinGroup.position`
- Can traverse component's children to find pin groups by `userData.enodeId` and read their world position
- Rotation is automatically handled by Three.js parent-child transform hierarchy

**Alternatives Considered**:
- Store pin offsets in core model: Rejected - violates separation (core shouldn't know visual layout)
- Hardcode pin positions per component type: Rejected - duplicates information already in factories, prone to drift
- Calculate from scratch each frame: Rejected - inefficient; better to read from existing visual hierarchy

### 4. Wire Visual Update Strategy During Drag

**Decision**: On each drag frame, update wire geometry in-place by modifying BufferGeometry positions

**Rationale**:
- More efficient than recreating wire meshes each frame
- BufferGeometry.setFromPoints() + needsUpdate = true is the standard Three.js pattern for dynamic geometry
- Only wires connected to the dragged component need updates (can be determined from ENode.wires)

**Alternatives Considered**:
- Recreate wire meshes: Rejected - creates garbage, causes visual flicker
- Use Line2 with dynamic updates: Rejected - adds fatLines dependency; standard Line sufficient for now
- Defer updates until drag ends: Rejected - user needs real-time visual feedback

### 5. Multi-Segment Wire Rendering with IntermediatePositions

**Decision**: Use THREE.BufferGeometry.setFromPoints() with full path array [startPin, ...intermediatePositions, endPin]

**Rationale**:
- Three.js Line naturally supports polylines with multiple vertices
- createWirePathGeometry() already exists in GeometryUtils.ts for this purpose
- Order is: start pin position → intermediate positions in order → end pin position
- Coordinate transform: Position(x,y) → Vector3(x, 0, -y) matches existing convention

**Alternatives Considered**:
- Separate Line segments for each segment: Rejected - more objects to manage, harder to apply uniform styling
- TubeGeometry for 3D wires: Rejected - over-engineered for current needs; simple lines match project aesthetic
- Bezier curves through waypoints: Rejected - spec requires straight segments through waypoints

### 6. Selection Visual Feedback (Orange/Yellow Glow)

**Decision**: Implement applySelection/removeSelection in ComponentVisualFactoryBase using orange emissive (#ff8800) at 0.8 intensity

**Rationale**:
- Follows same pattern as existing applyHover/removeHover (blue emissive)
- Orange provides clear visual distinction from blue hover
- Higher intensity (0.8 vs 0.6) makes selection more prominent than hover
- Stores original state in userData for restoration, same as hover

**Alternatives Considered**:
- Different color schemes tested: Orange/yellow chosen for contrast with blue hover
- Outline effect: Rejected - requires additional render passes or shader modifications
- Scale change: Rejected - changes hitbox size, complicates raycasting

### 7. Rotation Trigger Mechanism

**Decision**: Double-click rotates selected component 90° clockwise; also support 'R' key as shortcut

**Rationale**:
- Double-click is intuitive for "do something more" with selected item
- Keyboard shortcut ('R' for rotate) is standard in design tools
- 90° increments align with grid-based layout
- Clockwise is conventional direction; counter-clockwise via Shift+R if needed later

**Alternatives Considered**:
- Context menu: Rejected - adds UI complexity not aligned with direct manipulation philosophy
- Drag rotation handle: Rejected - over-engineered for discrete 90° steps
- Mouse wheel: Rejected - conflicts with zoom (already used by MapControls)

### 8. Deselection Behavior

**Decision**: Click on empty space OR press Escape deselects; click on different component changes selection

**Rationale**:
- Matches standard UI conventions (Escape as universal cancel/deselect)
- Clicking empty space is intuitive "click away to deselect"
- Clicking another component naturally transfers selection (no explicit deselect needed)

**Alternatives Considered**:
- Require explicit deselect button: Rejected - adds unnecessary friction
- Double-click to deselect: Rejected - conflicts with rotation trigger

## Key Implementation Notes

### Existing Code to Leverage
- `HoverManager.ts` - Pattern for state management with callbacks
- `ComponentVisualFactoryBase.applyHover/removeHover` - Pattern for visual state changes
- `createWirePathGeometry()` in GeometryUtils.ts - Already supports waypoint arrays
- `IEditingTool` interface - Defines tool contract (handlePointerDown, handleGridPositionMove, etc.)
- `CircuitController._createWireMesh` - Current wire rendering to enhance

### New Capabilities Required
- Drag events (handleDragStart, handleDragMove, handleDragEnd) on IEditingTool interface
- SelectionManager class for centralized selection state
- Pin world position lookup from visual hierarchy
- Wire geometry update method for dynamic repositioning

### Coordinate System Reference
- Grid positions: `{x: integer, y: integer}` in Position type (2D)
- World coordinates: `Vector3(x, 0, -y)` - note y becomes negative z
- Grid snapping: `Math.round(worldX)`, `Math.round(-worldZ)`
