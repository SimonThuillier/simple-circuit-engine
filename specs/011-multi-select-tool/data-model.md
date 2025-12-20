# Data Model: Multi-Select Tool

**Feature**: 011-multi-select-tool
**Date**: 2025-12-18

## Entities

### 1. MultiSelectTool

The main editing tool implementing `IEditingTool` interface.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| type | `'multiSelect'` | Tool type identifier (readonly) |
| mode | `MultiSelectToolMode` | Current operating mode |
| selectionRectState | `SelectionRectState \| null` | State during rectangle drag |
| bulkDragState | `BulkDragState \| null` | State during bulk move |
| clipboard | `ClipboardData \| null` | Copied element data |

**Relationships**:
- Uses `CircuitController` for scene access
- Uses `SelectionManager` for selection state
- Uses `WireVisualManager` for wire updates
- Uses `CircuitWriter` for model persistence

---

### 2. MultiSelectToolMode

Discriminated union of tool operating modes.

```typescript
type MultiSelectToolMode =
  | 'idle'           // No active operation
  | 'selecting'      // Drawing selection rectangle
  | 'dragging';      // Bulk moving selected elements
```

**State Transitions**:
```
idle → selecting     (pointerdown on empty space)
idle → dragging      (pointerdown on selected element)
selecting → idle     (pointerup commits selection, Escape cancels)
dragging → idle      (pointerup commits move, Escape cancels)
```

---

### 3. SelectionRectState

State maintained during rectangle selection operation.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| startScreen | `{ x: number, y: number }` | Starting mouse position (screen coords) |
| currentScreen | `{ x: number, y: number }` | Current mouse position (screen coords) |
| overlayElement | `HTMLDivElement` | DOM element for visual rectangle |
| shiftHeld | `boolean` | Whether Shift is held (additive mode) |
| previewedElements | `Set<UUID>` | Elements currently highlighted as "will be selected" |

**Lifecycle**:
1. Created on pointerdown (empty space)
2. Updated on pointermove (resize rectangle, update preview)
3. Destroyed on pointerup (commit) or Escape (cancel)

---

### 4. BulkDragState

State maintained during bulk move operation.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| dragStartWorld | `THREE.Vector3` | Starting cursor position (world coords) |
| initialPositions | `Map<UUID, THREE.Vector3>` | Snapshot of all selected element positions |
| affectedWireIds | `Set<UUID>` | Wire IDs that need geometry updates |

**Lifecycle**:
1. Created on pointerdown (selected element)
2. Updated on gridPositionMove (apply delta to all elements)
3. Committed on pointerup, or reverted on Escape

---

### 5. ClipboardData

Serializable data structure for copy/paste operations.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| anchor | `{ x: number, y: number }` | Center of selection bounding box (grid coords) |
| components | `ClipboardComponent[]` | Copied component definitions |
| branchingPoints | `ClipboardBranchingPoint[]` | Copied branching point definitions |
| wires | `ClipboardWire[]` | Copied wire definitions |

---

### 6. ClipboardComponent

Component data within clipboard.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| type | `ComponentType` | Component type (AND, OR, LED, etc.) |
| relativePosition | `{ x: number, y: number }` | Position relative to clipboard anchor |
| rotation | `number` | Rotation angle in degrees |
| originalId | `UUID` | Original element ID (for wire remapping) |

---

### 7. ClipboardBranchingPoint

Branching point data within clipboard.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| relativePosition | `{ x: number, y: number }` | Position relative to clipboard anchor |
| sourceType | `ENodeSourceType \| null` | Source type if set |
| originalId | `UUID` | Original element ID (for wire remapping) |

---

### 8. ClipboardWire

Wire data within clipboard.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| node1OriginalId | `UUID` | Original ID of first endpoint |
| node2OriginalId | `UUID` | Original ID of second endpoint |
| relativeIntermediatePositions | `Array<{ x: number, y: number }>` | Intermediate points relative to anchor |

**Validation Rules**:
- Wire is only included if BOTH endpoints are in the clipboard
- On paste, original IDs are remapped to newly created element IDs

---

## Type Extensions

### ToolType (types.ts)

```typescript
// Before
export type ToolType = 'build' | 'addComponent';

// After
export type ToolType = 'build' | 'addComponent' | 'multiSelect';
```

### SelectionManager (SelectionManager.ts)

New methods to add:

```typescript
/**
 * Select multiple elements at once
 */
selectMultiple(
  components?: Map<UUID, string | null>,
  enodes?: Map<UUID, string | null>,
  wires?: Map<UUID, string | null>
): void;

/**
 * Add a single element to current selection
 * Converts mono selection to multi if needed
 */
addToSelection(type: HoverableType, objectId: UUID, userData?: object): void;

/**
 * Remove a single element from current selection
 */
removeFromSelection(type: HoverableType, objectId: UUID): void;

/**
 * Get count of selected elements
 */
getSelectionCount(): number;
```

---

## Validation Rules

### Selection Rectangle

1. Minimum size: 5px in both dimensions (smaller is treated as click, not rectangle)
2. Components/BranchingPoints: Selected if center point is inside rectangle
3. Wires: Selected only if BOTH endpoint enodes are selected

### Bulk Move

1. All positions snap to integer grid coordinates
2. Boundary wires stretch to maintain connections (not broken)
3. Selected wire intermediate points move with selection (shape preserved)

### Clipboard

1. Empty selection → no-op on copy (clipboard unchanged)
2. Wires without both endpoints selected → excluded from clipboard
3. Paste position: cursor becomes center of pasted group bounding box

### Bulk Delete

1. Order: wires → components → branching points
2. Orphaned wires (after component deletion) are auto-removed
3. Selection cleared after delete operation
