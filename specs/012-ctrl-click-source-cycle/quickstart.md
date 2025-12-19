# Quickstart: Ctrl+Click Source Type Cycling

**Feature**: 012-ctrl-click-source-cycle
**Date**: 2025-12-19

## Overview

This feature adds Ctrl+click interaction to cycle enode sourceType (none → Voltage → Current → none) on branching points and component pins. The visual color updates immediately (white/red/blue for branching points, bronze/red/blue for pins).

## Implementation Sequence

### Step 1: Relax Circuit.updateENodeSourceType() Constraint

**File**: `src/core/Circuit.ts`

Remove the BranchingPoint-only restriction to allow updating sourceType on component pins.

```typescript
// Before (line 932-934)
if (enode.type !== ENodeType.BranchingPoint) {
  throw new Error(`ENode ${enodeId} is not a branching point`);
}

// After
// Remove this check entirely - allow any enode type
```

**Test**: Unit test in `tests/core/Circuit.test.ts`

---

### Step 2: Add updatePinSourceType() to ComponentVisualFactory

**File**: `src/scene/shared/components/ComponentVisualFactory.ts`

Add method to update pin color based on sourceType.

```typescript
/**
 * Updates the visual color of a component pin based on its source type.
 * @param pinGroup - The THREE.Group containing the pin visual
 * @param sourceType - The new source type (null for no source)
 */
updatePinSourceType(pinGroup: THREE.Object3D, sourceType: ENodeSourceType | null): void {
  const visual = pinGroup.children.find(
    (child) => child.userData.type === 'enode'
  ) as THREE.Mesh | undefined;

  if (visual && visual.material instanceof THREE.MeshStandardMaterial) {
    const color = sourceType
      ? (sourceType === ENodeSourceType.Voltage ? 0xff0000 : 0x0000ff)
      : ComponentVisualFactoryBase.DEFAULT_PIN_COLOR;
    visual.material.color.setHex(color);
    visual.material.emissive.setHex(color);
  }
}
```

**Test**: Unit test verifying color changes in `tests/scene/shared/components/ComponentVisualFactory.test.ts`

---

### Step 3: Add Cycling Helper Function

**File**: `src/scene/static/tools/BuildTool.ts`

Add helper function at module level or as private method.

```typescript
/**
 * Returns the next sourceType in the cycle: null → Voltage → Current → null
 */
function getNextSourceType(
  current: ENodeSourceType | undefined
): ENodeSourceType | undefined {
  if (!current) return ENodeSourceType.Voltage;
  if (current === ENodeSourceType.Voltage) return ENodeSourceType.Current;
  return undefined;
}
```

---

### Step 4: Add Ctrl+Click Handler in BuildTool

**File**: `src/scene/static/tools/BuildTool.ts`

Add early check in `handlePointerDown()` after button check, before wire creation logic.

```typescript
handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;

  // NEW: Handle Ctrl+click for sourceType cycling
  if ((event.ctrlKey || event.metaKey) && this._mode === 'idle') {
    const hoverState = this._sceneManager.getHoverManager().getHoverState();
    if (hoverState?.type === 'enode') {
      this.cycleEnodeSourceType(hoverState.id);
      return;  // Early exit - don't start wire creation
    }
  }

  // ... existing pointer down handling
}

/**
 * Cycles the sourceType of an enode: null → Voltage → Current → null
 * Updates both model and visual immediately.
 */
private cycleEnodeSourceType(enodeId: UUID): void {
  const circuit = this._sceneManager.getCircuit();
  if (!circuit) return;

  const enode = circuit.enodes.get(enodeId);
  if (!enode) return;

  const nextSourceType = getNextSourceType(enode.source);

  // Persist change and emit event
  this._sceneManager
    .getCircuitEditionManager()
    .saveEditENodeSourceType(enodeId, nextSourceType ?? null);

  // Update visual
  this.updateEnodeVisual(enodeId, enode.type, nextSourceType);
}

private updateEnodeVisual(
  enodeId: UUID,
  enodeType: ENodeType,
  sourceType: ENodeSourceType | undefined
): void {
  const object3D = this._sceneManager.getEnodeObject3D(enodeId);
  if (!object3D) return;

  if (enodeType === ENodeType.BranchingPoint) {
    this._sceneManager
      .getBranchingPointVisualFactory()
      .updateSourceType(object3D, sourceType ?? null);
  } else {
    // Component pin
    const factory = this._sceneManager.getComponentFactory(/* component type */);
    factory.updatePinSourceType(object3D, sourceType ?? null);
  }
}
```

**Note**: Implementation detail for getting component factory may need adjustment based on actual API.

---

### Step 5: Add Tests

**File**: `tests/scene/tools/BuildTool.test.ts`

Add test cases for Ctrl+click behavior:

```typescript
describe('Ctrl+Click Source Type Cycling', () => {
  it('should cycle branching point sourceType: null → Voltage', () => {
    // Setup: Create branching point with no source
    // Action: Ctrl+click on branching point
    // Assert: sourceType is Voltage, visual is red
  });

  it('should cycle branching point sourceType: Voltage → Current', () => {
    // Setup: Create branching point with Voltage source
    // Action: Ctrl+click on branching point
    // Assert: sourceType is Current, visual is blue
  });

  it('should cycle branching point sourceType: Current → null', () => {
    // Setup: Create branching point with Current source
    // Action: Ctrl+click on branching point
    // Assert: sourceType is undefined, visual is white
  });

  it('should cycle component pin sourceType', () => {
    // Setup: Create component with pin
    // Action: Ctrl+click on pin
    // Assert: sourceType cycles correctly
  });

  it('should not cycle sourceType on regular click', () => {
    // Setup: Create branching point
    // Action: Click without Ctrl
    // Assert: sourceType unchanged, wire creation initiated
  });

  it('should ignore Ctrl+click during active wire creation', () => {
    // Setup: Start wire creation
    // Action: Ctrl+click on another enode
    // Assert: Wire creation continues, sourceType unchanged
  });
});
```

## Verification Checklist

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] Ctrl+click on branching point cycles sourceType
- [ ] Ctrl+click on component pin cycles sourceType
- [ ] Visual color updates immediately
- [ ] Regular click still initiates wire creation
- [ ] Ctrl+click during wire creation is ignored
- [ ] `enodeSourceTypeChanged` event emitted on each cycle
