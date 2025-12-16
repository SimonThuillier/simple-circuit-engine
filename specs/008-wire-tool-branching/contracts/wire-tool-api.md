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
type WireToolMode = 'idle' | 'wire_creating' | 'wire_dragging' | 'bp_dragging';

interface WireCreatingState {
  sourceEnodeId: UUID;
  sourcePosition: THREE.Vector3;
  previewWire: Line2 | null;
  ts: number; // Timestamp for double-click detection
}

interface WireDragState {
  wireId: UUID;
  pointIndex: number; // Index in intermediatePositions array
  initialPosition: THREE.Vector3;
  originalPositions: { x: number; y: number }[]; // For cancellation
  targetType: 'intermediate' | 'new_intermediate';
}

interface BPDragState {
  enodeId: UUID; // Branching point being dragged
  initialPosition: THREE.Vector3; // For cancellation
}
```

### Event Handlers

```typescript
// DOM Event Handlers
handlePointerDown(event: MouseEvent): void;   // Wire creation start, wire drag start, BP drag start
handlePointerUp(event: MouseEvent): void;     // Wire creation complete, drag commit
handleDblClick(event: MouseEvent): void;      // Create branching point, cycle source type
handleKeyDown(event: KeyboardEvent): void;    // Escape (cancel), Delete/Backspace (remove)

// Scene Manager Event Handlers
handleGridPositionMove(position: THREE.Vector3): void; // Update preview/drag position
```

### Internal Methods

```typescript
// Wire Creation
private startWireCreation(sourceEnodeId: UUID): void;
private completeWireCreation(targetEnodeId: UUID): UUID | undefined;
private cancelWireCreation(): void;

// Branching Point Operations
private createBranchingPointOnWire(wireId: UUID, worldPosition: THREE.Vector3): UUID | undefined;
private createStandaloneBranchingPoint(worldPosition: THREE.Vector3): UUID | undefined;

// Wire Dragging (Intermediate Points)
private startWireDrag(
  wireId: UUID,
  targetType: 'intermediate' | 'new_intermediate',
  pointIndex: number,
  worldPosition: THREE.Vector3
): void;
private updateWireDrag(worldPosition: THREE.Vector3): void;
private commitWireDrag(): void;
private cancelWireDrag(): void;

// Branching Point Dragging
private startBPDrag(enodeId: UUID, worldPosition: THREE.Vector3): void;
private updateBPDrag(worldPosition: THREE.Vector3): void;
private commitBPDrag(): void;
private cancelBPDrag(): void;

// Utility
private checkMergeDelete(wire: Wire): { x: number; y: number }[];

// Public
cancelOperation(): void; // Cancel any active operation
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
 * @param persist - Whether to persist the change (default: false for real-time updates)
 * @throws Error if wireId not found
 */
updateWireIntermediatePositions(wireId: UUID, positions: Position[], persist?: boolean): Wire;

/**
 * Simplify wire intermediate positions by removing collinear points.
 * @throws Error if wireId not found
 */
simplifyWireIntermediatePositions(wireId: UUID): void;

/**
 * Remove a branching point and its connected wires.
 * @throws Error if enodeId not found or not a BranchingPoint
 */
removeBranchingPoint(enodeId: UUID): void;

/**
 * Remove a wire from the circuit.
 * @throws Error if wireId not found
 */
removeWire(wireId: UUID): void;
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
 * Update wire visual to reflect current model state.
 * Used during real-time drag operations.
 * @param wireId - Wire to update
 */
updateWire(wireId: UUID): void;

/**
 * Refresh wire geometry after intermediate positions changed.
 * @param wireId - Wire to refresh
 */
refreshWireGeometry(wireId: UUID): void;

/**
 * Get insertion index for a new intermediate point on a wire
 * @param wireId - Wire ID
 * @param worldPosition - Position where user clicked
 * @returns Index where new point should be inserted
 */
getInsertIndexForPosition(wireId: UUID, worldPosition: THREE.Vector3): number;

/**
 * Find nearest intermediate point to screen position.
 * @param wireId - Wire to check
 * @param screenPos - Screen position (pixels)
 * @returns Point index and distance, or null if none found within threshold
 */
findNearestIntermediatePoint(wireId: UUID, screenPos: THREE.Vector2): { pointIndex: number } | null;

/**
 * Compute the complete wire path including endpoints and intermediate positions.
 * @param wire - Wire instance
 * @returns Object with points array representing the complete path
 */
computeWirePath(wire: Wire): { points: THREE.Vector3[] };
```

---

## CircuitSceneManager Extensions

**Location**: `src/scene/static/CircuitSceneManager.ts`

These methods are called by WireTool to modify the circuit model and update visuals.

### New Methods

```typescript
/**
 * Create a branching point at world position.
 */
addBranchingPoint(worldPosition: THREE.Vector3, sourceType?: ENodeSourceType): ENode;

/**
 * Split a wire at world position, creating a branching point.
 */
splitWire(wireId: UUID, worldPosition: THREE.Vector3): {
  branchingPoint: ENode;
  wire1: Wire;
  wire2: Wire;
};

/**
 * Remove a wire from circuit and scene.
 */
removeWire(wireId: UUID): void;

/**
 * Remove a branching point and its connected wires from circuit and scene.
 */
removeBranchingPoint(enodeId: UUID): void;
```

---

## Event Types

### SceneManager Events (Existing + New)

```typescript
interface SceneManagerEventMap {
  // Existing events...

  // Tool lifecycle events (shared by all tools)
  toolOperationStarted: {
    toolType: ToolType;
    operationData: Record<string, any>;
  };

  toolOperationCompleted: {
    toolType: ToolType;
    operationData: Record<string, any>;
    changedData: {
      addedWires?: UUID[];
      removedWires?: UUID[];
      updatedWires?: UUID[];
      addedENodes?: UUID[];
      removedENodes?: UUID[];
    };
  };

  toolOperationCancelled: {
    toolType: ToolType;
  };

  toolValidationError: {
    toolType: ToolType;
    errorMessage: string;
  };
}
```

---

## Error Handling

### Expected Errors

| Operation | Error Condition | Handling |
|-----------|----------------|----------|
| Wire creation | Same source and target | Cancel wire creation |
| Wire creation | Duplicate wire | Emit toolValidationError, cancel |
| Wire split | Wire not found | Emit toolValidationError, no-op |
| Wire drag | Wire deleted during drag | Cancel drag |
| BP drag | Branching point deleted during drag | Cancel drag |
| Deletion | Wire not found | Silent no-op |
| Deletion | Branching point not found | Silent no-op |

### Validation

All position inputs are validated and snapped to grid before use.

### Wire Creation on Wire

When completing wire creation by clicking on an existing wire:
1. Creates a new branching point at the click position
2. Splits the target wire into two wires connecting through the branching point
3. Creates the new wire from the source enode to the new branching point

### Drag Target Resolution Priority

When clicking on a wire in idle mode (to start dragging):
1. **Existing intermediate point** - If click is near an existing intermediate point (within threshold)
2. **New intermediate point** - Otherwise, create new intermediate point at click position

### Branching Point Drag Activation

Double-click-hold gesture:
1. First click on branching point starts wire creation
2. Quick second click (<500ms) on same branching point cancels wire creation
3. Subsequent click-hold within 500ms starts branching point drag
