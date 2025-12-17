# Quick Start: Build Tool Merge

**Feature**: 010-build-tool-merge
**Date**: 2025-12-17
**Audience**: Developers working with simple-circuit-engine tools

## What Changed?

Four separate editing tools have been merged into one unified **BuildTool**:

| Old Tool | Operations | New Tool |
|----------|-----------|----------|
| PositionTool | Move components, rotate, drag | **BuildTool** |
| WireTool | Create wires, drag wire points, manage branching points | **BuildTool** |
| DeleteTool | Delete elements | **BuildTool** |
| BranchingPointTool | Create branching points | **BuildTool** |

**Result**: Users no longer need to switch tools for common circuit editing operations.

## Migration Guide

### For Tool Users (Application Code)

#### Before (Multiple Tools)
```typescript
import { CircuitSceneManager } from 'simple-circuit-engine';

// Moving components
sceneManager.setActiveTool('position');
// ... user drags component ...

// Creating wires
sceneManager.setActiveTool('wire');
// ... user creates wire ...

// Deleting elements
sceneManager.setActiveTool('delete');
// ... user clicks element to delete ...
```

#### After (Unified Tool)
```typescript
import { CircuitSceneManager } from 'simple-circuit-engine';

// All circuit editing operations
sceneManager.setActiveTool('build');
// ... user can now:
//   - Drag components/branching points
//   - Create wires
//   - Rotate components (R key or double-click)
//   - Delete elements (Delete/Backspace key)
//   - Create branching points (double-click wire/empty)
// ... all without switching tools!

// Component placement still uses separate tool
sceneManager.setActiveTool('addComponent');
```

### ToolType Updates

#### Before
```typescript
type ToolType = 'position' | 'addComponent' | 'wire' | 'branchingPoint' | 'delete';
```

#### After
```typescript
type ToolType = 'build' | 'addComponent';
```

**Migration**: Replace any tool type strings:
- `'position'` → `'build'`
- `'wire'` → `'build'`
- `'delete'` → `'build'`
- `'branchingPoint'` → `'build'`
- `'addComponent'` → `'addComponent'` (unchanged)

### Code Search & Replace

```bash
# Find all tool activations that need updating
grep -r "setActiveTool\('position'" src/
grep -r "setActiveTool\('wire'" src/
grep -r "setActiveTool\('delete'" src/
grep -r "setActiveTool\('branchingPoint'" src/

# Find all ToolType checks
grep -r "tool.type === 'position'" src/
grep -r "toolType: 'wire'" src/
```

## User Interaction Changes

### Wire Creation
**No change** - Still click enode and drag to target

### Component Movement
**No change** - Still drag selected components

### Component Rotation
**Enhanced** - Now works on unselected components:
- Before: Must select component first, then press R or double-click
- After: Can double-click any component to select AND rotate in one action

### Deletion
**Unified** - Now works on all element types:
- Before: DeleteTool only handled wires/branching points, AddComponentTool handled components
- After: BuildTool handles all deletions (components, wires, branching points)

### Branching Points
**No change** - Still double-click wire or empty space

## Tool Architecture

### BuildTool Class Structure

```typescript
export class BuildTool implements IEditingTool {
  readonly type: ToolType = 'build';

  // State machine
  private mode: BuildToolMode = 'idle';

  // Mode-specific state
  private wireCreatingState: WireCreatingState | null;
  private elementDragState: ElementDragState | null;
  private wirePointDragState: WirePointDragState | null;
  private bpDragState: BPDragState | null;

  // IEditingTool interface
  onActivate(): void { /* Setup */ }
  onDeactivate(): void { /* Cleanup */ }
  getCursorType(): CursorType { /* Dynamic cursor */ }
  getPreviewObjects(): THREE.Object3D[] { /* Previews */ }

  // Event handlers (private)
  private handlePointerDown(event: MouseEvent): void;
  private handlePointerUp(event: MouseEvent): void;
  private handleGridPositionMove(position: THREE.Vector3): void;
  private handleKeyDown(event: KeyboardEvent): void;
  private handleDblClick(event: MouseEvent): void;

  // Operation methods (private)
  private startWireCreation(sourceId: UUID): void;
  private startElementDrag(selection: SelectionData): void;
  private rotateSelectedComponent(): void;
  private deleteSelectedElement(): void;
  // ... etc
}
```

### State Machine Modes

```typescript
type BuildToolMode =
  | 'idle'                   // Default state, no active operation
  | 'wire_creation'          // Creating wire from source to target
  | 'component_drag'       // Dragging component or branching point
  | 'wire_point_dragging'    // Dragging wire intermediate point
  | 'bp_drag';           // Dragging standalone branching point
```

## Event Handling

### Pointer Events

**pointerdown** → Route to appropriate operation:
1. Check hover element type (enode, wire, component, etc.)
2. Check selection state
3. Start appropriate operation (wire creation, drag, etc.)

**pointerup** → Commit or complete current operation:
1. Check current mode
2. Commit changes to circuit model
3. Return to idle mode

### Keyboard Events

**Escape** → Cancel current operation:
- Wire creation → Remove preview wire
- Drag → Restore original positions
- Always → Return to idle mode

**Delete/Backspace** → Delete selected element:
- Component → Remove component + connected wires
- Wire → Remove wire
- Branching point → Remove BP + merge wires

**R** → Rotate selected component:
- Only works when component selected
- Rotates 90° clockwise
- Updates connected wires

### Double-Click Events

**Component** → Rotate (+ select if not selected)
**Wire** → Create branching point at position (splits wire)
**Empty space** → Create standalone branching point

## Testing Your Migration

### Manual Testing Checklist

- [ ] Create wire between two component pins
- [ ] Create wire from pin to empty space (creates BP)
- [ ] Create wire from pin to existing wire (creates BP, splits wire)
- [ ] Drag component with selection
- [ ] Drag branching point
- [ ] Drag wire intermediate point
- [ ] Create new intermediate point by clicking wire
- [ ] Rotate component with R key
- [ ] Rotate component with double-click
- [ ] Double-click unselected component (should select + rotate)
- [ ] Delete wire with Delete key
- [ ] Delete component with Delete key
- [ ] Delete branching point with Backspace key
- [ ] Cancel wire creation with Escape
- [ ] Cancel drag with Escape
- [ ] Switch between build and addComponent tools

### Automated Test Migration

If you have tests that reference old tool types:

```typescript
// Before
describe('PositionTool', () => {
  it('should drag components', () => {
    const tool = new PositionTool(sceneManager);
    tool.onActivate();
    // ... test logic ...
  });
});

// After
describe('BuildTool', () => {
  it('should drag components', () => {
    const tool = new BuildTool(sceneManager);
    tool.onActivate();
    // ... test logic (unchanged) ...
  });
});
```

## Troubleshooting

### Issue: Tool not found error
**Symptom**: `Error: Tool type 'position' not found`
**Solution**: Update tool type string from 'position'/'wire'/'delete' to 'build'

### Issue: Can't create wires
**Symptom**: Clicking enode doesn't start wire creation
**Solution**: Ensure BuildTool is active: `sceneManager.setActiveTool('build')`

### Issue: Delete key doesn't work
**Symptom**: Pressing Delete does nothing
**Solution**:
1. Check element is selected (BuildTool only deletes selected elements)
2. Ensure BuildTool is active
3. Check keyboard event not intercepted by parent component

### Issue: Component won't rotate on double-click
**Symptom**: Double-click does nothing or creates branching point
**Solution**: Ensure clicking directly on component mesh (not wire or empty space)

### Issue: Tool switching doesn't work
**Symptom**: setActiveTool doesn't change behavior
**Solution**: Check CircuitSceneManager is properly calling onDeactivate/onActivate

## Performance Considerations

BuildTool maintains same performance characteristics as individual tools:

| Operation | Target | Notes |
|-----------|--------|-------|
| Wire creation preview | 60fps | Real-time line updates during drag |
| Component drag | 60fps | Grid snapping + wire geometry updates |
| Wire point drag | 60fps | Real-time path updates |
| Tool activation | <50ms | Setup event listeners |
| Tool deactivation | <50ms | Cleanup resources |

## API Compatibility

### ✅ No Breaking Changes
- IEditingTool interface unchanged
- Event payloads unchanged
- CircuitSceneManager methods unchanged

### ⚠️ Breaking Changes
- ToolType enum values changed (see Migration Guide above)
- Old tool classes deleted (PositionTool, WireTool, etc.)

### 📝 Deprecation Timeline
- **v1.x**: Old tools deprecated but functional
- **v2.0**: Old tools removed, only BuildTool + AddComponentTool remain

## Further Reading

- [Implementation Plan](./plan.md) - Technical architecture details
- [Data Model](./data-model.md) - State machine and data structures
- [Research](./research.md) - Design decisions and alternatives
- [IEditingTool Contract](./contracts/IEditingTool.md) - Interface validation

## Getting Help

If you encounter issues during migration:

1. Check this guide's Troubleshooting section
2. Review the [Feature Specification](./spec.md) for expected behavior
3. Examine the [Research document](./research.md) for design rationale
4. Open an issue on GitHub with reproduction steps
