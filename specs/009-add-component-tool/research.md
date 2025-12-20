# Research: Add Component Tool

**Feature**: 009-add-component-tool
**Date**: 2025-12-17

## Research Areas

### 1. Existing Tool Patterns in Codebase

**Decision**: Follow the established `IEditingTool` interface pattern used by `WireTool` and `PositionTool`.

**Rationale**: The codebase already has a well-defined tool system with:
- `IEditingTool` interface in `src/scene/shared/types.ts`
- Tool lifecycle methods: `onActivate()`, `onDeactivate()`, `getCursorType()`, `getPreviewObjects()`
- Event emission via `ControllerEventMap` (toolOperationStarted, toolOperationCompleted, toolValidationError)
- Event listeners attached in `onActivate()`, removed in `onDeactivate()`

**Alternatives considered**:
- Creating a new tool abstraction: Rejected - would duplicate existing patterns and increase maintenance burden

### 2. Ghost Preview Implementation

**Decision**: Create a temporary Three.js Object3D using the component's visual factory, then apply 50% opacity and manage in `getPreviewObjects()`.

**Rationale**:
- `ComponentVisualFactory.createVisual()` already creates the visual representation
- Three.js materials support opacity via `material.transparent = true` and `material.opacity = 0.5`
- WireTool already uses `getPreviewObjects()` for preview wire display
- Ghost object is added/removed from scene via CircuitController

**Implementation approach**:
```typescript
// In AddComponentTool
private ghostPreview: THREE.Object3D | null = null;

private createGhostPreview(): void {
  const factory = this._Controller.getFactoryRegistry().get(this._componentType);
  // Create temporary component for visual generation
  const tempComponent = { id: 'preview', type: this._componentType, ... };
  this.ghostPreview = factory.createVisual(tempComponent);
  this.applyGhostEffect(this.ghostPreview); // 50% opacity
}
```

**Alternatives considered**:
- Using shader-based preview: Rejected - overly complex for simple opacity effect
- Reusing placed component visuals: Rejected - would complicate component lifecycle

### 3. Bounding Box Overlap Detection

**Decision**: Use Three.js `Box3` for axis-aligned bounding box (AABB) intersection testing.

**Rationale**:
- Three.js provides `Box3.setFromObject()` to compute AABB from any Object3D
- `Box3.intersectsBox()` provides efficient intersection testing
- Component visuals already have well-defined geometry via factories

**Implementation approach**:
```typescript
private checkOverlap(position: THREE.Vector3, rotation: number): boolean {
  // Get preview bounding box at target position
  const previewBox = new THREE.Box3().setFromObject(this.ghostPreview);

  // Check against all existing components
  for (const [id, obj] of this._Controller.getComponentObject3Ds()) {
    const componentBox = new THREE.Box3().setFromObject(obj);
    if (previewBox.intersectsBox(componentBox)) {
      return true; // Overlap detected
    }
  }
  return false;
}
```

**Alternatives considered**:
- Per-polygon collision: Rejected - too expensive for real-time preview
- Grid-cell based detection: Rejected - components have varying sizes, grid cells don't align

### 4. Adding Components to Circuit Model

**Decision**: Extend `CircuitWriter` with `saveAddComponent()` method, add `addComponent()` wrapper to `CircuitController`.

**Rationale**:
- Follows existing pattern: `saveAddBranchingPoint()`, `saveAddWire()` in CircuitWriter
- CircuitController already has `_createComponentObject3D()` for visual creation
- Maintains separation between model operations and visual operations

**Implementation approach**:
```typescript
// CircuitWriter
saveAddComponent(type: ComponentType, position: Position, rotation: Rotation): Component {
  const circuit = this._Controller.getCircuit();
  const component = circuit.addComponent(type, position, rotation);
  this._Controller.emit('circuitElementAction', { type: 'component', action: 'add', ... });
  return component;
}

// CircuitController
addComponent(type: ComponentType, worldPosition: THREE.Vector3, rotation: number): Component {
  const position = new Position(worldPosition.x, -worldPosition.z);
  const rot = new Rotation(rotation);
  const component = this.circuitWriter.saveAddComponent(type, position, rot);
  this._createComponentObject3D(component);
  return component;
}
```

**Alternatives considered**:
- Direct Circuit.addComponent() call from tool: Rejected - bypasses event system and visual creation

### 5. Component Deletion

**Decision**: Extend `CircuitWriter` with `saveDeleteComponent()` method, reuse existing selection system.

**Rationale**:
- WireTool already handles deletion via Delete key for wires and branching points
- SelectionManager already tracks selected components
- Circuit model has `removeComponent()` method

**Implementation approach**:
```typescript
// In AddComponentTool.handleKeyDown
if ((event.key === 'Delete' || event.key === 'Backspace') && selection?.type === 'component') {
  this._Controller.removeComponent(selection.id);
  this._Controller.getSelectionManager().clearSelection();
}
```

**Alternatives considered**:
- Separate delete tool only: Rejected - spec requires in-tool deletion for workflow efficiency

### 6. Invalid Placement Visual Feedback

**Decision**: Apply red tint via emissive color change + 'not-allowed' cursor via `getCursorType()`.

**Rationale**:
- Existing factories use emissive for hover effects (blue glow)
- Red emissive provides clear contrast for "error" state
- `CursorType` already includes 'not-allowed' option
- Dual feedback (visual + cursor) follows accessibility best practices

**Implementation approach**:
```typescript
private applyInvalidEffect(): void {
  this.ghostPreview.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.emissive.setHex(0xff0000);
      child.material.emissiveIntensity = 0.5;
    }
  });
  this.hasOverlap = true;
}

getCursorType(): CursorType {
  return this.hasOverlap ? 'not-allowed' : 'crosshair';
}
```

## Dependencies Verified

| Dependency | Version | Status |
|------------|---------|--------|
| Three.js | 0.181+ | Available |
| IEditingTool interface | - | Available in types.ts |
| FactoryRegistry | - | Available, has `getRegisteredTypes()` |
| CircuitWriter | - | Available, needs extension |
| SelectionManager | - | Available for component selection |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Box3 inaccurate for rotated components | Low | Medium | Test with rotated components; consider OBB if needed |
| Ghost preview performance | Low | Low | Single object, minimal geometry; cache factory result |
| Material cloning for ghost effect | Medium | Low | Clone materials to avoid affecting placed components |

## Conclusion

All technical questions resolved. Implementation can proceed using established patterns with minimal new abstractions:
1. Extend existing tool system (AddComponentTool)
2. Extend CircuitWriter for model operations
3. Use Three.js Box3 for collision detection
4. Use material properties for visual feedback
