# Quickstart: Position Tool & Wire Visual Improvements

**Feature**: 006-position-tool-wires
**Date**: 2025-12-09
**Updated**: 2025-12-11

## Overview

This guide provides a quick reference for implementing the Position Tool and wire visual improvements. Follow these steps in order for the smoothest implementation path.

**Architecture Note**: Selection behavior (click to select/deselect) is centralized in CircuitController via SelectionManager. The PositionTool handles only drag/move operations on already-selected elements.

## Implementation Order

### Phase 1: Wire Visual Foundation (P1 stories)

1. **Implement WireVisualManager** (`src/scene/shared/WireVisualManager.ts`)
   - Create class with wire mesh tracking (Map<UUID, THREE.Line>)
   - Implement `computeWirePath()` - derive path from ENode positions + intermediatePositions
   - Implement `getPinWorldPosition()` - traverse component group to find pin by enodeId
   - Implement `createOrUpdateWire()` - create Line with proper geometry

2. **Update CircuitController wire rendering**
   - Replace `_createWireMesh()` to use WireVisualManager
   - Wire endpoints now target pin positions, not component centers

### Phase 2: Selection Foundation (P1 stories) ✅ COMPLETE

3. **Implement SelectionManager** (`src/scene/shared/SelectionManager.ts`) ✅
   - Track selection via `SelectionData` discriminated union (mono/multi)
   - Implement `selectOne()`, `deselect()`, `isSelected()`, `hasSelection()`
   - Manage callbacks via `onSelectionChange()`

4. **Integrate SelectionManager into CircuitController** ✅
   - Create SelectionManager instance in `_initializeSelectionManager()`
   - Wire up selection change callbacks to apply/remove visuals via factory

5. **Implement selection click handling in CircuitController** ✅
   - `handlePointerDown()` handles all selection behavior centrally
   - Given a hovered unselected element, click → selectOne() and emit 'select'
   - Given hovering on nothing with selection, click → deselect() and emit 'deselect'

### Phase 3: Position Tool Core (P1 stories) 🔄 IN PROGRESS

6. **PositionTool handles drag only** (`src/scene/static/tools/PositionTool.ts`)
   - Selection is handled by CircuitController, NOT PositionTool
   - PositionTool registers its own event listeners in `onActivate()`

7. **Implement PositionTool drag handling** ✅
   - `handlePointerDown()` - start drag on selected element
   - `handleGridPositionMove()` - update visual positions with grid snapping
   - `handlePointerUp()` - commit position to Circuit model (TODO: actual model update)

8. **Wire updates during drag** ⚠️ TODO
   - Call WireVisualManager.updateWiresForComponent() on each grid move
   - See TODO in PositionTool.handleGridPositionMove()

### Phase 4: Rotation & Deselection (P2 stories) ⏳ PENDING

9. **Implement rotation in PositionTool** ⏳
   - `handleDoubleClick()` - rotate 90° clockwise
   - `handleKeyDown('r')` - rotate 90° clockwise
   - Update component rotation in Circuit model
   - Update wire visuals for rotated pin positions

10. **Deselection behavior** ✅ PARTIALLY COMPLETE
    - Empty space click deselection: Handled in CircuitController.handlePointerDown()
    - Escape key: Cancels drag and restores position (selection preserved)

### Phase 5: Multi-Line Wire Rendering (P2 stories)

11. **Enhance wire path rendering**
    - `computeWirePath()` already includes intermediatePositions
    - Verify geometry renders connected segments through waypoints
    - Test with wires that have 1-10 intermediate positions

## Key Code Patterns

### Getting Pin World Position

```typescript
// In WireVisualManager
getPinWorldPosition(enodeId: UUID, componentGroup: THREE.Object3D): THREE.Vector3 | null {
  const target = new THREE.Vector3();

  componentGroup.traverse((child) => {
    if (child.userData.enodeId === enodeId) {
      child.getWorldPosition(target);
      return; // Found it
    }
  });

  return target.length() > 0 ? target : null;
}
```

### Grid Snapping

```typescript
// World position to grid position
function snapToGrid(worldX: number, worldZ: number): Position {
  return {
    x: Math.round(worldX),
    y: Math.round(-worldZ), // Note: world Z is negative grid Y
  };
}

// Grid position to world position
function gridToWorld(pos: Position): THREE.Vector3 {
  return new THREE.Vector3(pos.x, 0, -pos.y);
}
```

### Selection Visual

```typescript
// In ComponentVisualFactoryBase
applySelection(object3D: THREE.Object3D): void {
  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      // Store original if not already stored
      if (child.userData.originalEmissive === undefined) {
        child.userData.originalEmissive = child.material.emissive.clone();
        child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
      }

      // Apply selection visual
      child.material.emissive.setHex(0xff8800);
      child.material.emissiveIntensity = 0.8;
    }
  });

  object3D.userData.isSelected = true;
}
```

### Wire Path Computation

```typescript
// In WireVisualManager
computeWirePath(wire: Wire, circuit: Circuit): WirePath {
  const node1 = circuit.getENode(wire.node1);
  const node2 = circuit.getENode(wire.node2);

  const startPos = node1.getPosition(circuit);
  const endPos = node2.getPosition(circuit);

  const points = [
    new THREE.Vector3(startPos.x, 0, -startPos.y),
    ...wire.intermediatePositions.map(p => new THREE.Vector3(p.x, 0, -p.y)),
    new THREE.Vector3(endPos.x, 0, -endPos.y),
  ];

  return { wireId: wire.id, points };
}
```

## Testing Checklist

- [X] Click component → visually selected (orange glow)
- [X] Click empty space → deselected
- [X] Click different component → selection changes
- [X] Escape key → cancels drag, restores position (selection preserved)
- [X] Drag selected component → moves with mouse (grid-snapped)
- [X] Release drag → position committed
- [ ] ⚠️ Wires follow component during drag (TODO: T035-T036)
- [ ] Double-click selected → rotates 90° (Phase 7)
- [ ] R key with selected → rotates 90° (Phase 7)
- [ ] Wires update after rotation (Phase 7)
- [X] Wire endpoints are at pin positions (not component center)
- [X] Wires with intermediatePositions render as multi-segment

## Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `src/scene/shared/WireVisualManager.ts` | CREATED | ✅ Done |
| `src/scene/shared/SelectionManager.ts` | CREATED | ✅ Done |
| `src/scene/shared/types.ts` | MODIFIED | ✅ Done (SelectionData types) |
| `src/scene/shared/components/ComponentVisualFactory.ts` | MODIFIED | ✅ Done |
| `src/scene/static/CircuitController.ts` | MODIFIED | ✅ Done |
| `src/scene/static/tools/PositionTool.ts` | MODIFIED | 🔄 In Progress |
| `tests/scene/shared/WireVisualManager.test.ts` | CREATED | ✅ Done |
| `tests/scene/shared/SelectionManager.test.ts` | CREATED | ✅ Done |
| `tests/scene/static/tools/PositionTool.test.ts` | TODO | ⏳ Pending |
