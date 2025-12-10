# Quickstart: Select Tool & Wire Visual Improvements

**Feature**: 006-select-tool-wires
**Date**: 2025-12-09

## Overview

This guide provides a quick reference for implementing the Select Tool and wire visual improvements. Follow these steps in order for the smoothest implementation path.

## Implementation Order

### Phase 1: Wire Visual Foundation (P1 stories)

1. **Implement WireVisualManager** (`src/scene/shared/WireVisualManager.ts`)
   - Create class with wire mesh tracking (Map<UUID, THREE.Line>)
   - Implement `computeWirePath()` - derive path from ENode positions + intermediatePositions
   - Implement `getPinWorldPosition()` - traverse component group to find pin by enodeId
   - Implement `createOrUpdateWire()` - create Line with proper geometry

2. **Update CircuitSceneManager wire rendering**
   - Replace `_createWireMesh()` to use WireVisualManager
   - Wire endpoints now target pin positions, not component centers

### Phase 2: Selection Foundation (P1 stories)

3. **Implement SelectionManager** (`src/scene/shared/SelectionManager.ts`)
   - Track `selectedComponentId: UUID | null`
   - Implement `select()`, `deselect()`, `isSelected()`
   - Manage callbacks via `onSelectionChange()`

4. **Implement applySelection/removeSelection** in ComponentVisualFactoryBase
   - Orange emissive (#ff8800) at 0.8 intensity
   - Store/restore original material state in userData
   - Handle interaction with hover state

5. **Integrate SelectionManager into CircuitSceneManager**
   - Create SelectionManager instance
   - Wire up selection change callbacks to apply/remove visuals

### Phase 3: Select Tool Core (P1 stories)

6. **Implement SelectTool click handling** (`src/scene/static/tools/SelectTool.ts`)
   - `handleClick()` - select clicked component via SelectionManager
   - Click empty space → deselect
   - Click different component → change selection

7. **Implement SelectTool drag handling**
   - `handleMouseDown()` - start drag if clicking selected component
   - `handleMouseMove()` - update component visual position, update wire visuals
   - `handleMouseUp()` - commit position to Circuit model

8. **Wire updates during drag**
   - Use WireVisualManager.updateWiresForComponent() on each drag move
   - Commit final wire positions on drag end

### Phase 4: Rotation & Deselection (P2 stories)

9. **Implement rotation in SelectTool**
   - `handleDoubleClick()` - rotate 90° clockwise
   - `handleKeyDown('r')` - rotate 90° clockwise
   - Update component rotation in Circuit model
   - Update wire visuals for rotated pin positions

10. **Implement deselection**
    - `handleKeyDown('Escape')` - deselect
    - Already handled: click empty space, click different component

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

- [ ] Click component → visually selected (orange glow)
- [ ] Click empty space → deselected
- [ ] Click different component → selection changes
- [ ] Escape key → deselects
- [ ] Drag selected component → moves with mouse
- [ ] Release drag → snaps to grid
- [ ] Wires follow component during drag
- [ ] Double-click selected → rotates 90°
- [ ] R key with selected → rotates 90°
- [ ] Wires update after rotation
- [ ] Wire endpoints are at pin positions (not component center)
- [ ] Wires with intermediatePositions render as multi-segment

## Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `src/scene/shared/WireVisualManager.ts` | CREATE | P1 |
| `src/scene/shared/SelectionManager.ts` | CREATE | P1 |
| `src/scene/shared/components/ComponentVisualFactory.ts` | MODIFY | P1 |
| `src/scene/static/CircuitSceneManager.ts` | MODIFY | P1 |
| `src/scene/static/tools/SelectTool.ts` | MODIFY | P1 |
| `tests/scene/WireVisualManager.test.ts` | CREATE | P1 |
| `tests/scene/SelectionManager.test.ts` | CREATE | P1 |
| `tests/scene/SelectTool.test.ts` | CREATE | P2 |
