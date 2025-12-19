# Quickstart: Wire Tool & Branching Point Visual

**Feature**: 008-wire-tool-branching
**Date**: 2025-12-15

## Implementation Priority Order

Based on the spec's user story priorities and dependencies:

### Phase 1: Core Visuals (P1 Stories)

1. **BranchingPointVisualFactory** - Create cone visual for branching points
   - Cone geometry with sourceType-based colors
   - Hitbox on ENODE layer
   - Hover/selection feedback

2. **CircuitController integration** - Register factory, render existing branching points

### Phase 2: Wire Creation (P1 Story 1)

3. **WireTool basic wire creation** - Click-to-click wire between enodes
   - Source selection on first click
   - Preview line during creation
   - Wire commit on second click
   - Escape cancellation

### Phase 3: Branching Operations (P2 Stories)

4. **Double-click branching point creation** - On wire or empty space
   - Wire split logic in Circuit class
   - Standalone branching point creation

5. **SourceType cycling** - Double-click on existing branching point
   - Cycle null → voltage → current → null
   - Visual update

### Phase 4: Intermediate Points (P2 Story 3b)

6. **Single-click drag on wire** - Intermediate point manipulation
   - Proximity detection (10px screen space)
   - Drag state management
   - Grid snapping
   - Merge/delete on drop to endpoint

---

## Key Files to Create/Modify

### New Files

```
src/scene/shared/components/BranchingPointVisualFactory.ts
tests/scene/shared/BranchingPointVisualFactory.test.ts
tests/scene/tools/WireTool.test.ts
```

### Files to Modify

```
src/core/Circuit.ts                    # Add branching point methods
src/scene/static/tools/WireTool.ts     # Full implementation
src/scene/shared/WireVisualManager.ts  # Preview wire, geometry refresh
src/scene/static/CircuitController.ts # Branching point visual integration
src/scene/static/CircuitWriter.ts # Wire/branching point persistence
```

---

## Test-First Development Approach

For each implementation step, write tests first:

### Example: BranchingPointVisualFactory Tests

```typescript
describe('BranchingPointVisualFactory', () => {
  describe('createVisual', () => {
    it('should create a cone geometry for branching point', () => {
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, new Position(10, 20));
      const visual = factory.createVisual(enode);

      expect(visual.children).toHaveLength(2); // cone + hitbox
      expect(visual.children[0].geometry).toBeInstanceOf(THREE.ConeGeometry);
    });

    it('should set white color for null sourceType', () => {
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, new Position(10, 20));
      const visual = factory.createVisual(enode);
      const material = visual.children[0].material as THREE.MeshStandardMaterial;

      expect(material.color.getHex()).toBe(0xffffff);
    });

    it('should set red color for voltage sourceType', () => {
      const enode = new ENode(ENodeType.BranchingPoint, undefined, undefined, new Position(10, 20), 'voltage');
      const visual = factory.createVisual(enode);
      const material = visual.children[0].material as THREE.MeshStandardMaterial;

      expect(material.color.getHex()).toBe(0xff0000);
    });
  });
});
```

### Example: WireTool Tests

```typescript
describe('WireTool', () => {
  describe('wire creation', () => {
    it('should enter wire_creation state on first enode click', () => {
      // Setup: create scene with two components
      // Action: click on first pin
      // Assert: tool state is wire_creation, source is set
    });

    it('should create wire on second enode click', () => {
      // Setup: tool in wire_creation state
      // Action: click on second pin
      // Assert: wire created in circuit model
    });

    it('should show preview line during creation', () => {
      // Setup: tool in wire_creation state
      // Action: move mouse
      // Assert: preview line updates
    });

    it('should cancel on Escape', () => {
      // Setup: tool in wire_creation state
      // Action: press Escape
      // Assert: tool returns to idle, no wire created
    });
  });

  describe('double-click branching point creation', () => {
    it('should create branching point on wire double-click', () => {
      // Setup: create wire
      // Action: double-click on wire
      // Assert: branching point created, wire split into two
    });

    it('should cycle sourceType on branching point double-click', () => {
      // Setup: create branching point
      // Action: double-click on branching point
      // Assert: sourceType cycles null → voltage
    });
  });

  describe('intermediate point drag', () => {
    it('should start drag on wire single-click', () => {
      // Setup: create wire
      // Action: single-click on wire
      // Assert: drag state initiated
    });

    it('should create new intermediate point if none nearby', () => {
      // Setup: drag started on wire with no intermediate points
      // Assert: new intermediate point created
    });

    it('should drag existing intermediate point if within 10px', () => {
      // Setup: wire with intermediate point, click near it
      // Assert: existing point becomes drag target
    });

    it('should delete intermediate point when dropped on endpoint', () => {
      // Setup: drag intermediate point
      // Action: drop on wire endpoint
      // Assert: intermediate point removed
    });
  });
});
```

---

## Implementation Checklist

### BranchingPointVisualFactory
- [ ] Create cone geometry (radius: 0.3, height: 0.6)
- [ ] Create hitbox sphere (larger for easy clicking)
- [ ] Implement color mapping (white/red/blue)
- [ ] Implement hover feedback (emissive shift)
- [ ] Implement selection feedback (emissive shift)
- [ ] Set userData for raycasting identification
- [ ] Register with CircuitController

### Circuit Class Extensions
- [ ] Implement `addBranchingPoint()`
- [ ] Implement `splitWire()`
- [ ] Implement `updateWireIntermediatePositions()`
- [ ] Implement `updateENodeSourceType()`
- [ ] Add tests for each method

### WireTool Implementation
- [ ] State machine (idle, wire_creation, dragging)
- [ ] Event listener setup/teardown
- [ ] Single-click on enode → start wire creation
- [ ] Single-click on wire → start drag
- [ ] Double-click on wire → create branching point
- [ ] Double-click on branching point → cycle sourceType
- [ ] Double-click on empty → create standalone branching point
- [ ] Escape handling for all states
- [ ] Preview wire during creation
- [ ] Cursor type updates

### WireVisualManager Extensions
- [ ] Implement `createPreviewWire()`
- [ ] Implement `updatePreviewWire()`
- [ ] Implement `removePreviewWire()`
- [ ] Implement `refreshWireGeometry()`

### CircuitWriter Extensions
- [ ] Wire creation persistence
- [ ] Branching point creation persistence
- [ ] Wire split persistence
- [ ] Intermediate positions update persistence
- [ ] SourceType update persistence

---

## Common Gotchas

1. **Double-click timing**: Use 200ms timeout to distinguish from single-click
2. **Grid snapping**: Always snap positions before storing in model
3. **Screen-space projection**: Remember to account for camera and container size
4. **Wire immutability**: Create new Wire instance when updating intermediate positions
5. **Event listener cleanup**: Remove all listeners in `onDeactivate()`
6. **Hitbox layers**: Use `HitboxLayers.ENODE` for branching point hitbox
7. **Preview cleanup**: Always remove preview wire on commit, cancel, or deactivate
