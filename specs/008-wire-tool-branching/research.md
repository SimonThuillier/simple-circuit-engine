# Research: Wire Tool & Branching Point Visual

**Feature**: 008-wire-tool-branching
**Date**: 2025-12-15

## Research Summary

This document consolidates findings from codebase exploration to resolve implementation questions.

---

## 1. Existing Tool Pattern

**Decision**: Follow PositionTool implementation pattern

**Rationale**: PositionTool (`src/scene/static/tools/PositionTool.ts`) is a complete reference implementation showing:
- Event listener setup in `onActivate()`/`onDeactivate()`
- DragState management for tracking drag operations
- `gridPositionMove` event subscription for position updates
- Escape key handling for cancellation
- Double-click handling for secondary actions
- Integration with CircuitSceneManager for model updates

**Alternatives Considered**:
- New tool abstraction layer → Rejected: Over-engineering for single tool
- Callback-based approach → Rejected: Violates constitution (event-driven API)

---

## 2. ENode and Wire Models

**Decision**: Use existing models without modification

**Rationale**: Core models already support all required functionality:
- `ENode.type` includes `ENodeType.BranchingPoint`
- `ENode.source` stores `ENodeSourceType` (voltage/current)
- `ENode.position` stores grid position for branching points
- `Wire.intermediatePositions` stores waypoints for visual routing

**Key Files**:
- `src/core/ENode.ts` - ENode class with sourceType
- `src/core/Wire.ts` - Wire class with intermediatePositions
- `src/core/types/ENodeType.ts` - Enum includes BranchingPoint
- `src/core/types/ENodeSourceType.ts` - Enum for voltage/current

---

## 3. Circuit Model Operations

**Decision**: Extend Circuit class with new methods

**Rationale**: Circuit class manages all model mutations. Need to add:
- `addBranchingPoint(position: Position, sourceType?: ENodeSourceType): ENode`
- `splitWire(wireId: UUID, position: Position): { eNode: ENode, wires: [Wire, Wire] }`
- `updateWireIntermediatePositions(wireId: UUID, positions: Position[]): Wire`
- `updateENodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void`

**Alternatives Considered**:
- Mutations in WireTool directly → Rejected: Violates separation (scene shouldn't modify core)
- New CircuitMutator class → Rejected: Over-engineering, Circuit already handles mutations

---

## 4. Visual Factory Pattern

**Decision**: Create BranchingPointVisualFactory following ComponentVisualFactoryBase pattern

**Rationale**: Existing factory pattern provides:
- Consistent hitbox layer assignment (`HitboxLayers.ENODE`)
- Standard hover/selection feedback via emissive
- UserData structure for raycasting identification
- Separation of visual creation from scene management

**Implementation Details**:
```typescript
// Geometry: ConeGeometry(radius, height, segments)
const coneGeometry = new THREE.ConeGeometry(0.3, 0.6, 16);

// Colors based on sourceType
const COLORS = {
  null: 0xffffff,      // white
  'voltage': 0xff0000, // red
  'current': 0x0000ff  // blue
};

// Brightness shift for hover/selection (emissive)
const HOVER_EMISSIVE = 0x222222;    // slight brightening
const SELECTED_EMISSIVE = 0x444444; // more brightening
```

---

## 5. HoverManager Integration

**Decision**: Use existing HoverManager API without modification

**Rationale**: HoverManager already supports:
- Priority-based raycasting: ENODE > COMPONENT > WIRE
- Line2 threshold of 10px for wire hover detection
- `getHoveredElement()` returns type, id, object3D
- `getGroundPlanePosition()` for click position calculation

**Usage in WireTool**:
```typescript
const hovered = this._sceneManager.getHoverManager().getHoveredElement();
if (hovered?.type === 'wire') {
  // Wire interaction
} else if (hovered?.type === 'enode') {
  // ENode interaction (pin or branching point)
}
```

---

## 6. Wire Visual Updates

**Decision**: Extend WireVisualManager for intermediate point updates

**Rationale**: WireVisualManager already handles:
- Wire path computation from node positions
- Line2 geometry creation and updates
- Wire visual state (idle/hovered/selected)

**New Methods Needed**:
- `updateWireGeometry(wireId: UUID): void` - Refresh geometry after intermediatePositions change
- `createPreviewWire(startPosition: Vector3): Line2` - Temporary wire during creation
- `updatePreviewWire(endPosition: Vector3): void` - Update preview endpoint
- `removePreviewWire(): void` - Cleanup after commit/cancel

---

## 7. Screen-Space Proximity Detection

**Decision**: Implement in WireTool using Three.js projection

**Rationale**: 10px screen-space threshold requires projecting world positions to screen coordinates.

**Implementation**:
```typescript
function getScreenPosition(worldPos: THREE.Vector3, camera: THREE.Camera, container: HTMLElement): THREE.Vector2 {
  const projected = worldPos.clone().project(camera);
  return new THREE.Vector2(
    (projected.x + 1) / 2 * container.clientWidth,
    (-projected.y + 1) / 2 * container.clientHeight
  );
}

function findNearestIntermediatePoint(
  mouseScreen: THREE.Vector2,
  wire: Wire,
  camera: THREE.Camera,
  container: HTMLElement
): { index: number; distance: number } | null {
  const THRESHOLD = 10; // pixels
  let nearest: { index: number; distance: number } | null = null;

  wire.intermediatePositions.forEach((pos, index) => {
    const worldPos = gridToWorld(pos);
    const screenPos = getScreenPosition(worldPos, camera, container);
    const distance = mouseScreen.distanceTo(screenPos);

    if (distance < THRESHOLD && (!nearest || distance < nearest.distance)) {
      nearest = { index, distance };
    }
  });

  return nearest;
}
```

---

## 8. Double-Click vs Single-Click Disambiguation

**Decision**: Use native DOM `dblclick` event with click suppression

**Rationale**:
- Native `dblclick` fires after two rapid `click` events
- Need to prevent single-click action from firing on double-click
- Use timeout-based approach (300ms delay on single-click)

**Implementation Pattern**:
```typescript
private clickTimeout: number | null = null;
private pendingClick: { event: MouseEvent; handler: () => void } | null = null;

handlePointerDown(event: MouseEvent): void {
  if (this.clickTimeout) {
    clearTimeout(this.clickTimeout);
    this.clickTimeout = null;
    // This is a double-click, ignore single-click action
    return;
  }

  this.pendingClick = { event, handler: () => this.executeSingleClick(event) };
  this.clickTimeout = window.setTimeout(() => {
    this.pendingClick?.handler();
    this.pendingClick = null;
    this.clickTimeout = null;
  }, 200);
}

handleDblClick(event: MouseEvent): void {
  if (this.clickTimeout) {
    clearTimeout(this.clickTimeout);
    this.clickTimeout = null;
    this.pendingClick = null;
  }
  this.executeDoubleClick(event);
}
```

---

## 9. Drag State Management

**Decision**: Extend PositionTool's DragState pattern for intermediate points

**Rationale**: PositionTool already demonstrates:
- Start position tracking
- Position restoration on cancel
- Model commit on release

**WireTool DragState**:
```typescript
interface WireDragState {
  wireId: UUID;
  dragTarget:
    | { type: 'eNode'; enodeId: UUID; originalPosition: Position }
    | { type: 'intermediatePoint'; index: number; originalPosition: Position; isNew: boolean }
    | { type: 'newIntermediatePoint'; insertIndex: number };
  startMousePosition: THREE.Vector3;
}
```

---

## 10. Event Emission

**Decision**: Use existing SceneManager event types

**Rationale**: CircuitSceneManager already emits events for tool operations:
- `toolOperationStarted` - Wire creation started
- `toolOperationCompleted` - Wire created successfully
- `toolOperationCancelled` - Operation cancelled via Escape

**Additional Events** (if needed):
- `branchingPointCreated` - New branching point added
- `wireIntermediatePointChanged` - Intermediate points modified

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Where to create BranchingPoint visuals? | New `BranchingPointVisualFactory` in `scene/shared/components/` |
| How to detect intermediate point proximity? | Screen-space projection with 10px threshold |
| How to handle double-click vs single-click? | Timeout-based disambiguation (200ms delay) |
| How to update wire geometry after drag? | Extend WireVisualManager with `updateWireGeometry()` |
| Where to store drag state? | In WireTool instance, following PositionTool pattern |

---

## Dependencies Identified

**Existing (no changes needed)**:
- Three.js ConeGeometry, MeshStandardMaterial
- Line2, LineGeometry, LineMaterial (already imported)
- HoverManager, SelectionManager, WireVisualManager
- CircuitEditionManager for model persistence

**New internal dependencies**:
- BranchingPointVisualFactory → used by CircuitSceneManager
- Circuit.addBranchingPoint() → used by CircuitEditionManager
- Circuit.splitWire() → used by CircuitEditionManager
