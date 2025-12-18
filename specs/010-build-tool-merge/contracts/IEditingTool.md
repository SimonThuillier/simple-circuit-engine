# Contract: IEditingTool Interface

**Feature**: 010-build-tool-merge
**Date**: 2025-12-17
**Purpose**: Validate that BuildTool correctly implements the IEditingTool interface

## Interface Definition

```typescript
/**
 * Interface defining contract for editing tool implementations
 * Location: src/scene/shared/types.ts
 */
export interface IEditingTool {
  /**
   * Unique identifier for this tool type
   */
  readonly type: ToolType;

  /**
   * Called when tool becomes active
   * Use this to setup tool state and initialize preview objects
   */
  onActivate(): void;

  /**
   * Called when tool is deactivated
   * Use this to cleanup tool state and dispose preview objects
   */
  onDeactivate(): void;

  /**
   * Get current cursor type based on tool state
   * Used by CircuitSceneManager to update DOM cursor
   */
  getCursorType(): CursorType;

  /**
   * Get preview objects to render in the scene
   * Returns array of Three.js Object3D instances
   */
  getPreviewObjects(): THREE.Object3D[];
}
```

## BuildTool Implementation Contract

### ✅ type: ToolType

**Implementation**:
```typescript
readonly type: ToolType = 'build';
```

**Contract Validation**:
- ✅ Property is readonly
- ✅ Type matches ToolType enum value
- ✅ Value is 'build' (new tool type)
- ⚠️ Requires ToolType update: `type ToolType = 'build' | 'addComponent';`

### ✅ onActivate(): void

**Implementation Requirements**:
1. Reset all mode state to 'idle'
2. Clear all state objects (wireCreatingState, elementDragState, etc.)
3. Attach all event listeners (pointerdown, pointerup, dblclick, keydown)
4. Store bound references for cleanup

**Contract Validation**:
- ✅ Returns void
- ✅ Idempotent (safe to call multiple times)
- ✅ No parameters required
- ✅ Attaches event listeners to container and window

**Example**:
```typescript
onActivate(): void {
  // Reset state
  this.mode = 'idle';
  this.wireCreatingState = null;
  this.elementDragState = null;
  this.wirePointDragState = null;
  this.bpDragState = null;

  // Attach listeners
  const container = this._sceneManager.getContainer();
  container.addEventListener('pointerdown', this.handlePointerDown);
  container.addEventListener('pointerup', this.handlePointerUp);
  container.addEventListener('dblclick', this.handleDblClick);
  window.addEventListener('keydown', this.handleKeyDown);
}
```

### ✅ onDeactivate(): void

**Implementation Requirements**:
1. Remove all event listeners (reverse of onActivate)
2. Cancel any active operations (wire creation, drag, etc.)
3. Dispose preview objects (preview wire, etc.)
4. Clear all state objects
5. Re-enable camera controls (safety net)

**Contract Validation**:
- ✅ Returns void
- ✅ Idempotent (safe to call multiple times)
- ✅ No memory leaks (all listeners removed)
- ✅ No dangling references

**Example**:
```typescript
onDeactivate(): void {
  // Cancel active operations
  if (this.mode === 'wire_creation') {
    this.cancelWireCreation();
  } else if (this.mode === 'component_drag') {
    this.cancelElementDrag();
  }
  // ... other modes

  // Remove listeners
  const container = this._sceneManager.getContainer();
  this._sceneManager.off('gridPositionMove', this.handleGridPositionMove);
  container.removeEventListener('pointerdown', this.handlePointerDown);
  container.removeEventListener('pointerup', this.handlePointerUp);
  container.removeEventListener('dblclick', this.handleDblClick);
  window.removeEventListener('keydown', this.handleKeyDown);

  // Reset state
  this.mode = 'idle';
  this.wireCreatingState = null;
  this.elementDragState = null;
  this.wirePointDragState = null;
  this.bpDragState = null;

  // Safety: re-enable controls
  this._sceneManager.getControls()!.enablePan = true;
}
```

### ✅ getCursorType(): CursorType

**Implementation Requirements**:
1. Return appropriate cursor based on current mode and hover state
2. Support all CursorType values: 'default', 'pointer', 'crosshair', 'move', 'not-allowed', 'grab', 'grabbing'
3. Update dynamically based on hover element

**Contract Validation**:
- ✅ Returns CursorType (not string)
- ✅ No side effects
- ✅ Fast execution (<1ms)

**Cursor Logic**:
```typescript
getCursorType(): CursorType {
  const hoveredElement = this._sceneManager.getHoveredElement();

  // During wire creation
  if (this.mode === 'wire_creation') {
    if (!this.isValidWireTarget(hoveredElement)) {
      return 'not-allowed';
    }
    return 'crosshair';
  }

  // During drag
  if (this.mode === 'component_drag' || this.mode === 'wire_point_dragging'
      || this.mode === 'bp_drag') {
    return 'grabbing';
  }

  // Hover states (idle mode)
  if (hoveredElement) {
    if (hoveredElement.type === 'enode') {
      return 'pointer'; // Can start wire
    }
    const selection = this._sceneManager.getSelectionManager().getSelection();
    if (selection && hoveredElement.id === selection.id) {
      return 'grab'; // Can drag selected element
    }
    if (hoveredElement.type === 'wire' || hoveredElement.type === 'component') {
      return 'pointer'; // Can interact
    }
  }

  return 'default';
}
```

### ✅ getPreviewObjects(): THREE.Object3D[]

**Implementation Requirements**:
1. Return array of preview objects currently visible
2. Empty array when no previews active
3. Include wire preview during wire creation
4. No null/undefined values in array

**Contract Validation**:
- ✅ Returns THREE.Object3D[] (not other types)
- ✅ Array never null (can be empty)
- ✅ No side effects
- ✅ Fast execution (<1ms)

**Example**:
```typescript
getPreviewObjects(): THREE.Object3D[] {
  const previews: THREE.Object3D[] = [];

  // Wire creation preview
  if (this.mode === 'wire_creation' && this.wireCreatingState?.previewWire) {
    previews.push(this.wireCreatingState.previewWire);
  }

  // Could add drag preview highlights in future
  // if (this.mode === 'component_drag') {
  //   previews.push(this.dragHighlight);
  // }

  return previews;
}
```

## Event Handler Contracts

While not part of IEditingTool interface, BuildTool must follow standard event handler contracts:

### MouseEvent Handlers
```typescript
handlePointerDown(event: MouseEvent): void
handlePointerUp(event: MouseEvent): void
handleDblClick(event: MouseEvent): void
```

**Requirements**:
- Check `event.button === 0` (only handle left click)
- No preventDefault() unless necessary (preserve browser defaults)
- Call stopPropagation() only if needed

### KeyboardEvent Handlers
```typescript
handleKeyDown(event: KeyboardEvent): void
```

**Requirements**:
- Check `event.key` (not deprecated `keyCode`)
- Call preventDefault() for handled keys (Escape, Delete, R)
- Don't interfere with browser shortcuts (Ctrl+R, etc.)

### Custom Event Handlers
```typescript
handleGridPositionMove(position: THREE.Vector3): void
```

**Requirements**:
- Only registered when in active mode (not idle)
- Unregistered on return to idle
- Fast execution (<5ms for 60fps)

## CircuitSceneManager Integration Contract

### Tool Registration
```typescript
// In CircuitSceneManager constructor or initialization
this.tools = new Map<ToolType, IEditingTool>([
  ['build', new BuildTool(this)],
  ['addComponent', new AddComponentTool(this)]
]);
```

**Requirements**:
- BuildTool receives CircuitSceneManager instance in constructor
- Tool stored in map keyed by ToolType
- Tool lifecycle managed by CircuitSceneManager (activate/deactivate)

### Tool Activation
```typescript
// CircuitSceneManager.setActiveTool()
const previousTool = this.activeTool;
if (previousTool) {
  previousTool.onDeactivate();
}

const nextTool = this.tools.get(toolType);
if (nextTool) {
  this.activeTool = nextTool;
  nextTool.onActivate();
}
```

**Requirements**:
- Only one tool active at a time
- Previous tool deactivated before new tool activated
- Deactivation always called (even if same tool)

## Testing Contract

### Unit Test Requirements
1. Test each IEditingTool method independently
2. Test state transitions (idle ↔ active modes)
3. Test event handler disambiguation
4. Test cleanup (no memory leaks)

### Integration Test Requirements
1. Test tool activation/deactivation via CircuitSceneManager
2. Test tool switching (build ↔ addComponent)
3. Test full operation flows (wire creation, drag, etc.)
4. Test event emission

### Behavioral Requirements
1. BuildTool must preserve all functionality from merged tools
2. No regressions in existing circuit editing operations
3. Event signatures remain compatible with existing listeners

## Backward Compatibility

### Breaking Changes
- ✅ ToolType enum updated (removes 'position', 'wire', 'delete', 'eNode')
- ✅ Tool string literals must update: 'position' → 'build', 'wire' → 'build'

### Non-Breaking Changes
- ✅ IEditingTool interface unchanged
- ✅ Event payloads unchanged (still emit dragStart, dragEnd, etc.)
- ✅ CircuitSceneManager API unchanged

### Migration Path
```typescript
// Before
sceneManager.setActiveTool('position'); // Move components
sceneManager.setActiveTool('wire');     // Create wires

// After
sceneManager.setActiveTool('build');    // Do both
```

## Validation Checklist

- [x] BuildTool class declared with `implements IEditingTool`
- [x] All interface methods present with correct signatures
- [x] `type` property readonly and correct value
- [x] `onActivate()` attaches all event listeners
- [x] `onDeactivate()` removes all event listeners and cleans state
- [x] `getCursorType()` returns valid CursorType based on state
- [x] `getPreviewObjects()` returns array of valid Object3D instances
- [x] Constructor accepts CircuitSceneManager parameter
- [x] Event handlers follow naming convention (handle*)
- [x] All state properly typed (no `any`)
- [x] JSDoc comments on public methods
- [x] Unit tests cover all interface methods
- [x] Integration tests cover tool lifecycle
