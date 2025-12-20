# Quickstart: Add Component Tool

**Feature**: 009-add-component-tool
**Date**: 2025-12-17

## Overview

The Add Component Tool enables placing circuit components on the canvas. It provides:
- Component type selection from available types
- Ghost preview with grid snapping
- Scroll-to-rotate before placement
- Overlap detection with visual feedback
- Click-to-place workflow
- Delete key to remove selected components

## Basic Usage

### Activating the Tool

```typescript
// Get the scene controllerType instance
const Controller: CircuitController = /* your instance */;

// Activate the add component tool
Controller.setActiveTool('addComponent');

// Listen for tool activation
Controller.on('toolActivated', (event) => {
  if (event.toolType === 'addComponent') {
    // Tool is now active, show component type selector UI
  }
});
```

### Setting Component Type

```typescript
// Get available component types from FactoryRegistry
const registry = Controller.getFactoryRegistry();
const availableTypes: ComponentType[] = registry.getRegisteredTypes();

// Set the component type to place
const tool = Controller.getActiveTool() as AddComponentTool;
tool.setComponentType(ComponentType.Battery);
```

### Placing Components

Once the tool is active with a component type selected:

1. **Hover** over the canvas to see the ghost preview
2. **Scroll** mouse wheel to rotate (90° increments)
3. **Click** on empty space to place the component

```typescript
// Listen for component placement
Controller.on('toolOperationCompleted', (event) => {
  if (event.toolType === 'addComponent') {
    const { componentId, position, componentType } = event.operationData;
    console.log(`Placed ${componentType} at (${position.x}, ${position.y})`);
  }
});
```

### Handling Invalid Placements

```typescript
// Listen for validation errors
Controller.on('toolValidationError', (event) => {
  if (event.toolType === 'addComponent') {
    // Show error to user
    showNotification(event.errorMessage);
  }
});
```

### Selecting and Deleting Components

```typescript
// While AddComponentTool is active:
// - Click on existing component to select it
// - Press Delete or Backspace to remove selected component

Controller.on('toolOperationCompleted', (event) => {
  if (event.toolType === 'addComponent' && event.operationData.action === 'delete') {
    console.log(`Deleted component ${event.operationData.componentId}`);
  }
});
```

## Integration Example

```typescript
import { CircuitController } from 'simple-circuit-engine/scene';
import { ComponentType } from 'simple-circuit-engine/core';

// Initialize scene controllerType
const container = document.getElementById('circuit-canvas');
const Controller = new CircuitController();
await Controller.initialize(container, circuit);

// Create component type selector UI
const typeSelector = document.getElementById('component-types');
const registry = Controller.getFactoryRegistry();

registry.getRegisteredTypes().forEach(type => {
  const button = document.createElement('button');
  button.textContent = type;
  button.onclick = () => {
    Controller.setActiveTool('addComponent');
    const tool = Controller.getActiveTool() as AddComponentTool;
    tool.setComponentType(type);
  };
  typeSelector.appendChild(button);
});

// Handle events
Controller.on('toolOperationCompleted', (event) => {
  if (event.toolType === 'addComponent') {
    console.log('Component operation:', event.operationData);
  }
});

Controller.on('toolValidationError', (event) => {
  alert(event.errorMessage);
});
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Scroll Up | Rotate preview 90° clockwise |
| Scroll Down | Rotate preview 90° counter-clockwise |
| Delete / Backspace | Delete selected component |
| Click (empty space) | Place component |
| Click (on component) | Select component |

## Visual States

| State | Ghost Preview | Cursor |
|-------|---------------|--------|
| Valid placement | 50% opacity, normal color | `crosshair` |
| Invalid placement (overlap) | 50% opacity + red tint | `not-allowed` |
| No component type selected | No preview | `crosshair` |
| Hovering existing component | N/A | `pointer` |

## Error Messages

| Condition | Error Message |
|-----------|---------------|
| Click without component type | "No component type selected" |
| Click on occupied position | "Cannot place component: position occupied" |

## API Reference

### AddComponentTool

```typescript
class AddComponentTool implements IEditingTool {
  readonly type: ToolType = 'addComponent';

  /** Lifecycle - called when tool becomes active */
  onActivate(): void;

  /** Lifecycle - called when tool is deactivated */
  onDeactivate(): void;

  /** Get current cursor type based on hover state */
  getCursorType(): CursorType;

  /** Get preview objects to render (ghost preview) */
  getPreviewObjects(): THREE.Object3D[];

  /** Set the component type to place */
  setComponentType(type: ComponentType): void;

  /** Get the currently selected component type */
  getComponentType(): ComponentType | null;
}
```

### New CircuitController Methods

```typescript
class CircuitController {
  /** Add a component to the circuit and scene */
  addComponent(
    type: ComponentType,
    worldPosition: THREE.Vector3,
    rotation: number
  ): Component;

  /** Remove a component from the circuit and scene */
  removeComponent(componentId: UUID): void;
}
```
