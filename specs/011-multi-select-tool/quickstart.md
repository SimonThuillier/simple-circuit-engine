# Quickstart: Multi-Select Tool

**Feature**: 011-multi-select-tool
**Date**: 2025-12-18

## Overview

The MultiSelectTool enables users to select multiple circuit elements at once and perform bulk operations including move, delete, copy/paste, and cut/paste.

## Prerequisites

- Existing `CircuitSceneManager` instance with a loaded circuit
- Understanding of the existing tool system (`BuildTool`, `AddComponentTool`)

## Integration

### 1. Tool Registration

The MultiSelectTool will be automatically registered when `CircuitSceneManager` is initialized:

```typescript
// In CircuitSceneManager.ts - no user action required
// Tool is registered alongside existing tools
this.tools.set('multiSelect', new MultiSelectTool(this));
```

### 2. Activating the Tool

```typescript
import { CircuitSceneManager } from 'simple-circuit-engine/scene';

const sceneManager = new CircuitSceneManager(factoryRegistry);
sceneManager.initialize(container);
sceneManager.setCircuit(circuit);

// Activate multi-select tool
sceneManager.setActiveTool('multiSelect');
```

### 3. Tool Switching

Users can switch between tools as needed:

```typescript
// Switch to multi-select for bulk operations
sceneManager.setActiveTool('multiSelect');

// Switch back to build tool for single-element editing
sceneManager.setActiveTool('build');

// Switch to add component tool
sceneManager.setActiveTool('addComponent');
```

## User Interactions

### Rectangle Selection

1. **Start**: Click and hold on empty space
2. **Drag**: Move mouse to define selection rectangle
3. **Complete**: Release mouse button to select all elements inside
4. **Cancel**: Press Escape to cancel without selecting

```
+-------------------+
|    Selection      |
|    Rectangle      |   ← Components/BPs inside are selected
|                   |
+-------------------+
```

### Additive Selection

Hold **Shift** while drawing a rectangle to ADD to existing selection:

```typescript
// Shift+drag adds elements to existing selection
// Without Shift, previous selection is replaced
```

### Single-Click Selection

- **Click element**: Select that element only (clears previous)
- **Shift+click element**: Add element to selection
- **Click empty space**: Clear selection

### Bulk Move

1. Select multiple elements
2. Click and drag any selected element
3. All selected elements move together
4. Release to commit, or Escape to cancel

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Delete all selected elements |
| `Ctrl+C` / `Cmd+C` | Copy selection to clipboard |
| `Ctrl+V` / `Cmd+V` | Paste clipboard at cursor |
| `Ctrl+X` / `Cmd+X` | Cut selection (copy + delete) |
| `Escape` | Cancel current operation |

## Events

Listen for multi-select operations:

```typescript
sceneManager.on('toolOperationCompleted', (event) => {
  if (event.toolType === 'multiSelect') {
    console.log('Operation:', event.mode);
    console.log('Data:', event.operationData);
  }
});

sceneManager.on('selectionChange', (event) => {
  const { newSelection, previousSelection } = event;
  if (newSelection?.kind === 'multi') {
    const count = (newSelection.components?.size ?? 0) +
                  (newSelection.enodes?.size ?? 0) +
                  (newSelection.wires?.size ?? 0);
    console.log(`${count} elements selected`);
  }
});
```

## Selection State

Access current selection via SelectionManager:

```typescript
const selection = sceneManager.getSelectionManager().getSelection();

if (selection?.kind === 'multi') {
  // Multi-selection active
  const componentIds = Array.from(selection.components?.keys() ?? []);
  const enodeIds = Array.from(selection.enodes?.keys() ?? []);
  const wireIds = Array.from(selection.wires?.keys() ?? []);
} else if (selection?.kind === 'mono') {
  // Single element selected
  console.log(`Selected: ${selection.type} ${selection.id}`);
}
```

## Example: Copy-Paste Workflow

```typescript
// 1. Activate multi-select tool
sceneManager.setActiveTool('multiSelect');

// 2. User draws selection rectangle (handled by tool)

// 3. Listen for paste to know when new elements created
sceneManager.on('toolOperationCompleted', (event) => {
  if (event.mode === 'paste') {
    const { componentCount, wireCount } = event.operationData;
    console.log(`Pasted ${componentCount} components, ${wireCount} wires`);
  }
});

// 4. User presses Ctrl+C to copy, moves cursor, Ctrl+V to paste
```

## Performance Notes

- Designed for typical circuits (10-50 components)
- Rectangle selection: <2s for 10+ elements
- Bulk move: 30+ FPS with 20 elements
- Copy/paste: <1s for 10+ components with wires

## Limitations

- Clipboard is session-only (not persisted across page reloads)
- No undo/redo support (future enhancement)
- Wire intermediate points move with selection (shape preserved, no individual point editing during bulk move)
