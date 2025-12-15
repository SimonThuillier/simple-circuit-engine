# WireTool Internal API Contract

**Feature**: 008-wire-tool-branching
**Date**: 2025-12-15

## Overview

This document defines the internal API contracts for the WireTool implementation. These are internal APIs within the `scene/` module, not public library APIs.

---

## IEditingTool Interface (Existing)

**Location**: `src/scene/shared/types.ts`

```typescript
interface IEditingTool {
  readonly type: ToolType;
  onActivate(): void;
  onDeactivate(): void;
  getCursorType(): CursorType;
  getPreviewObjects(): THREE.Object3D[];
}

type ToolType = 'position' | 'addComponent' | 'wire' | 'branchingPoint' | 'delete';
type CursorType = 'default' | 'pointer' | 'crosshair' | 'grab' | 'grabbing' | 'not-allowed';
```

---

## WireTool Class

**Location**: `src/scene/static/tools/WireTool.ts`

### Constructor

```typescript
constructor(sceneManager: CircuitSceneManager)
```

### State Types

```typescript
type WireToolMode = 'idle' | 'wire_creating' | 'dragging';

interface WireCreatingState {
  sourceEnodeId: UUID;
}

interface DraggingState {
  wireId: UUID;
  dragTarget: DragTarget;
  originalPosition: Position;
  isNewIntermediatePoint: boolean;
}

type DragTarget =
  | { type: 'branchingPoint'; enodeId: UUID }
  | { type: 'intermediatePoint'; index: number };
```

### Event Handlers

```typescript
// DOM Event Handlers
handlePointerDown(event: MouseEvent): void;
handlePointerUp(event: MouseEvent): void;
handleDblClick(event: MouseEvent): void;
handleKeyDown(event: KeyboardEvent): void;

// Scene Manager Event Handlers
handleGridPositionMove(position: THREE.Vector3): void;
handleHoverChange(hovered: HoveredElement | null): void;
```

### Internal Methods

```typescript
// Wire Creation
private startWireCreation(sourceEnodeId: UUID): void;
private completeWireCreation(targetEnodeId: UUID): void;
private createWireToNewBranchingPoint(position: Position): void;
private cancelWireCreation(): void;

// Branching Point Operations
private createBranchingPointOnWire(wireId: UUID, position: Position): void;
private createStandaloneBranchingPoint(position: Position): void;
private cycleBranchingPointSourceType(enodeId: UUID): void;

// Drag Operations
private startDrag(wireId: UUID, target: DragTarget, position: Position): void;
private updateDrag(position: Position): void;
private commitDrag(): void;
private cancelDrag(): void;

// Utility
private findNearestIntermediatePoint(wireId: UUID, screenPos: THREE.Vector2): { index: number } | null;
private getInsertIndexForPosition(wireId: UUID, position: Position): number;
```

---

## Circuit Class Extensions

**Location**: `src/core/Circuit.ts`

### New Methods

```typescript
/**
 * Create a branching point ENode.
 */
addBranchingPoint(position: Position, sourceType?: ENodeSourceType): ENode;

/**
 * Split a wire at a position, creating a branching point.
 * @throws Error if wireId not found
 */
splitWire(wireId: UUID, position: Position): {
  branchingPoint: ENode;
  wire1: Wire;
  wire2: Wire;
};

/**
 * Update wire intermediate positions.
 * @throws Error if wireId not found
 */
updateWireIntermediatePositions(wireId: UUID, positions: Position[]): Wire;

/**
 * Update ENode source type.
 * @throws Error if enodeId not found or not a BranchingPoint
 */
updateENodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void;
```

---

## BranchingPointVisualFactory

**Location**: `src/scene/shared/components/BranchingPointVisualFactory.ts`

### Interface

```typescript
interface IBranchingPointVisualFactory {
  /**
   * Create visual representation for a branching point.
   * @param enode - The branching point ENode
   * @returns THREE.Group containing cone mesh and hitbox
   */
  createVisual(enode: ENode): THREE.Group;

  /**
   * Update visual to reflect sourceType change.
   * @param visual - The visual group
   * @param sourceType - New source type
   */
  updateSourceType(visual: THREE.Group, sourceType: ENodeSourceType | null): void;

  /**
   * Apply hover visual feedback.
   * @param visual - The visual group
   */
  applyHover(visual: THREE.Group): void;

  /**
   * Remove hover visual feedback.
   * @param visual - The visual group
   */
  removeHover(visual: THREE.Group): void;

  /**
   * Apply selection visual feedback.
   * @param visual - The visual group
   */
  applySelection(visual: THREE.Group): void;

  /**
   * Remove selection visual feedback.
   * @param visual - The visual group
   */
  removeSelection(visual: THREE.Group): void;
}
```

### Visual Structure

```typescript
// THREE.Group structure
{
  name: 'branchingPoint',
  userData: {
    type: 'enode',
    enodeId: UUID,
    enodeType: 'BranchingPoint'
  },
  children: [
    // Cone mesh (visual)
    {
      type: 'Mesh',
      geometry: ConeGeometry,
      material: MeshStandardMaterial,
      layers: [HitboxLayers.VISUAL]
    },
    // Hitbox (invisible, for raycasting)
    {
      type: 'Mesh',
      geometry: SphereGeometry, // Larger for easier clicking
      material: { visible: false },
      layers: [HitboxLayers.ENODE]
    }
  ]
}
```

---

## WireVisualManager Extensions

**Location**: `src/scene/shared/WireVisualManager.ts`

### New Methods

```typescript
/**
 * Create a preview wire for wire creation mode.
 * @param startPosition - World position of wire start
 * @returns Line2 object for preview
 */
createPreviewWire(startPosition: THREE.Vector3): Line2;

/**
 * Update preview wire endpoint.
 * @param endPosition - World position of wire end
 */
updatePreviewWire(endPosition: THREE.Vector3): void;

/**
 * Remove preview wire from scene.
 */
removePreviewWire(): void;

/**
 * Refresh wire geometry after intermediate positions changed.
 * @param wireId - Wire to refresh
 */
refreshWireGeometry(wireId: UUID): void;
```

---

## CircuitEditionManager Extensions

**Location**: `src/scene/static/CircuitEditionManager.ts`

### New Methods

```typescript
/**
 * Save branching point creation to circuit model.
 */
saveBranchingPointAction(
  position: Position,
  sourceType?: ENodeSourceType
): ENode;

/**
 * Save wire split operation to circuit model.
 */
saveWireSplitAction(
  wireId: UUID,
  position: Position
): { branchingPoint: ENode; wire1: Wire; wire2: Wire };

/**
 * Save wire intermediate positions update.
 */
saveWireIntermediatePositionsAction(
  wireId: UUID,
  positions: Position[]
): Wire;

/**
 * Save ENode source type update.
 */
saveENodeSourceTypeAction(
  enodeId: UUID,
  sourceType: ENodeSourceType | null
): void;
```

---

## Event Types

### SceneManager Events (Existing + New)

```typescript
interface SceneManagerEventMap {
  // Existing events...

  // New events for wire tool
  wireCreated: { wireId: UUID; node1: UUID; node2: UUID };
  branchingPointCreated: { enodeId: UUID; position: Position };
  wireSplit: { originalWireId: UUID; branchingPointId: UUID; wire1Id: UUID; wire2Id: UUID };
  wireIntermediatePositionsChanged: { wireId: UUID; positions: Position[] };
  enodeSourceTypeChanged: { enodeId: UUID; sourceType: ENodeSourceType | null };
}
```

---

## Error Handling

### Expected Errors

| Operation | Error Condition | Handling |
|-----------|----------------|----------|
| Wire creation | Same source and target | Reject with not-allowed cursor |
| Wire creation | Duplicate wire | Reject with not-allowed cursor |
| Wire split | Wire not found | Log error, no-op |
| Drag | Wire deleted during drag | Cancel drag, log warning |
| Source type cycle | ENode not a BranchingPoint | Log error, no-op |

### Validation

All position inputs are validated and snapped to grid before use.
