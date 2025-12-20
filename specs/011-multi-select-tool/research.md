# Research: Multi-Select Tool

**Feature**: 011-multi-select-tool
**Date**: 2025-12-18

## Research Tasks

### 1. Selection Rectangle Rendering in Three.js

**Decision**: Use HTML/CSS overlay for selection rectangle instead of Three.js 3D object

**Rationale**:
- Selection rectangle needs to stay in screen space, not world space
- CSS-based rectangle is simpler, more performant, and resolution-independent
- Three.js would require orthographic overlay camera and plane geometry
- Existing tools (BuildTool) don't use 3D preview for UI overlays

**Alternatives Considered**:
- Three.js PlaneGeometry with orthographic camera: More complex, unnecessary overhead
- Canvas 2D overlay: Viable but requires additional canvas management
- SVG overlay: Good for complex shapes, overkill for rectangle

**Implementation**:
```typescript
// Create overlay div on tool activation, style with CSS
const selectionRect = document.createElement('div');
selectionRect.style.cssText = `
  position: absolute;
  border: 2px dashed #4a90d9;
  background: rgba(74, 144, 217, 0.1);
  pointer-events: none;
`;
container.appendChild(selectionRect);
```

---

### 2. Element Bounding Box Detection

**Decision**: Use Three.js Box3 for component/enode bounds, and project to screen space for intersection test

**Rationale**:
- Components already have 3D bounding boxes via `THREE.Box3.setFromObject()`
- Selection rectangle is in screen space; need to project element bounds to screen
- Wire bounds require special handling (polyline bounding box)

**Alternatives Considered**:
- Raycasting each point: Too slow for large selections
- 2D spatial index (R-tree): Overengineering for typical circuit sizes (10-50 components)

**Implementation**:
```typescript
function isElementInSelectionRect(
  elementBounds: THREE.Box3,
  camera: THREE.Camera,
  screenRect: { x1: number, y1: number, x2: number, y2: number }
): boolean {
  // Project 8 corners of bounding box to screen space
  // Check if center point (or all corners for "fully inside" mode) is within screenRect
}
```

---

### 3. SelectionManager Multi-Selection API

**Decision**: Extend existing SelectionManager with `selectMultiple()` method

**Rationale**:
- `MultiSelectionData` type already exists in `types.ts`
- `isSelected()` already handles multi-selection checks
- Need to add method to SET multi-selection (currently only `selectOne()` and `deselect()`)

**Alternatives Considered**:
- Create separate MultiSelectionManager: Violates DRY, complicates selection state
- Replace SelectionManager entirely: Too invasive, breaks existing tools

**Implementation**:
```typescript
// Add to SelectionManager.ts
selectMultiple(
  components: Map<UUID, string | null>,
  enodes: Map<UUID, string | null>,
  wires: Map<UUID, string | null>
): void {
  const newSelection: MultiSelectionData = {
    kind: 'multi',
    components,
    enodes,
    wires
  };
  // ... notify callbacks
}

addToSelection(type: HoverableType, objectId: UUID): void {
  // Convert mono to multi if needed, or add to existing multi
}
```

---

### 4. Clipboard Data Structure

**Decision**: Store serialized element data with relative positions in tool-local clipboard

**Rationale**:
- Clipboard is session-only (per spec assumption)
- Need to preserve wire connections between pasted elements
- Relative positions allow paste at cursor location

**Alternatives Considered**:
- System clipboard: Adds complexity, browser compatibility issues, security concerns
- Circuit-level clipboard: Would pollute core module with UI concerns

**Implementation**:
```typescript
interface ClipboardData {
  /** Anchor point for relative positioning (center of selection bounding box) */
  anchor: { x: number; y: number };

  /** Copied components with relative positions */
  components: Array<{
    type: ComponentType;
    relativePosition: { x: number; y: number };
    rotation: number;
    originalId: UUID; // For wire remapping
  }>;

  /** Copied branching points with relative positions */
  branchingPoints: Array<{
    relativePosition: { x: number; y: number };
    sourceType: ENodeSourceType | null;
    originalId: UUID;
  }>;

  /** Copied wires with original endpoint references */
  wires: Array<{
    node1OriginalId: UUID;
    node2OriginalId: UUID;
    intermediatePositions: Array<{ x: number; y: number }>; // Relative
  }>;
}
```

---

### 5. Bulk Move Implementation

**Decision**: Track initial positions, apply delta during drag, commit on pointerup

**Rationale**:
- Matches existing BuildTool pattern for single-element drag
- Need to update all selected elements in sync
- Cancel reverts to initial positions (stored at drag start)

**Alternatives Considered**:
- Transform group: Would require parenting elements, complicates wire updates
- Command pattern with undo: Future enhancement, not in current scope

**Implementation**:
```typescript
interface BulkDragState {
  /** Initial positions for all selected elements */
  initialPositions: Map<UUID, THREE.Vector3>;
  /** Starting cursor position */
  dragStart: THREE.Vector3;
  /** Current cursor position for delta calculation */
  dragCurrent: THREE.Vector3;
}

// During drag:
// newPosition = initialPosition + (dragCurrent - dragStart)
// Apply to all elements, update connected wires
```

---

### 6. Wire Geometry Updates During Bulk Move

**Decision**: Use existing WireVisualManager.updateWireById() for each affected wire

**Rationale**:
- WireVisualManager already handles wire geometry updates
- Need to call for both fully-selected wires AND boundary wires
- Performance acceptable for typical circuit sizes per spec (30+ FPS with 20 elements)

**Alternatives Considered**:
- Batch wire update API: Could optimize later if performance issues arise
- Skip boundary wire updates: Violates spec requirement (FR-005)

**Implementation**:
```typescript
// During bulk move:
const affectedWireIds = new Set<UUID>();
for (const componentId of selectedComponents) {
  for (const wire of circuit.getWiresByComponent(componentId)) {
    affectedWireIds.add(wire.id);
  }
}
for (const enodeId of selectedEnodes) {
  const enode = circuit.getENode(enodeId);
  for (const wireId of enode.wires) {
    affectedWireIds.add(wireId);
  }
}
for (const wireId of affectedWireIds) {
  wireVisualManager.updateWireById(wireId);
}
```

---

### 7. Tool Type Extension

**Decision**: Add 'multiSelect' to ToolType union in types.ts

**Rationale**:
- Follows existing pattern (ToolType = 'build' | 'addComponent')
- Enables tool registration in CircuitController
- Minimal change to existing code

**Implementation**:
```typescript
// types.ts
export type ToolType = 'build' | 'addComponent' | 'multiSelect';
```

---

### 8. Bulk Delete Order

**Decision**: Delete wires first, then components, then branching points

**Rationale**:
- Deleting component before its wires would leave dangling wire references
- Branching points may need to trigger wire merging (existing behavior)
- Order ensures clean state at each step

**Implementation**:
```typescript
function bulkDelete(selection: MultiSelectionData): void {
  // 1. Delete selected wires
  for (const wireId of selection.wires?.keys() ?? []) {
    Controller.removeWire(wireId);
  }
  // 2. Delete selected components (cascades to connected wires)
  for (const componentId of selection.components?.keys() ?? []) {
    Controller.removeComponent(componentId);
  }
  // 3. Delete selected branching points
  for (const enodeId of selection.enodes?.keys() ?? []) {
    Controller.removeBranchingPoint(enodeId);
  }
}
```

---

## Summary

All research items resolved. Key decisions:
1. CSS overlay for selection rectangle (simplest, most performant)
2. Box3 projection for element-in-rectangle detection
3. Extend SelectionManager with `selectMultiple()` and `addToSelection()`
4. Tool-local clipboard with relative positions and ID remapping for paste
5. Delta-based bulk move with initial position tracking
6. Reuse WireVisualManager for wire updates during drag
7. Add 'multiSelect' to ToolType union
8. Delete in order: wires → components → branching points
