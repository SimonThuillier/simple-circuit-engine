# Quickstart: Component Config Editor

**Date**: 2025-12-28
**Feature**: 015-component-config-editor

## Overview

This feature adds a configuration editor panel to the circuit editor. When users CTRL+SHIFT+click on a component while using the build tool, a lil-gui panel appears allowing them to modify the component's configuration parameters.

## Prerequisites

1. Install lil-gui dependency:
   ```bash
   npm install lil-gui
   ```

2. Ensure the build tool is active in your circuit editor session.

## Usage

### Opening the Config Panel

1. Activate the build tool in the circuit editor
2. Hold **CTRL+SHIFT** and click on any configurable component
3. The config panel appears adjacent to the component

### Editing Values

- **Dropdowns**: Click to open selection, choose new value
- **Color pickers**: Click color swatch to open picker, or select from presets dropdown
- Changes are applied immediately to the component

### Closing the Panel

- Click anywhere outside the panel
- Press **Escape** key
- CTRL+SHIFT+click on a different component (closes current, opens new)

## Configurable Components

| Component | Config Keys | Control Types                                |
|-----------|-------------|----------------------------------------------|
| SmallLED | mode, activeColor, idleColor | dropdown, color, color |
| RectangleLED | mode, activeColor, idleColor | dropdown, color, color |
| Switch | initialState | boolean (true => positive, false => negative) |
| Relay | activationLogic | boolean (true => positive, false => negative) |
| Transistor | activationLogic | boolean (true => positive, false => negative) |
| Cube | color | color                                        |

Components without config (Battery, Lightbulb) will not show a panel.

## Implementation Checklist

### 1. Add lil-gui Dependency

```bash
npm install lil-gui
```

### 2. Create ConfigPanelManager

Location: `src/scene/shared/ConfigPanelManager.ts`

Key responsibilities:
- Create/destroy lil-gui instances
- Position panel relative to component
- Handle dismiss events (click-outside, Escape)
- Wire onChange callbacks to update component config

### 3. Extend IComponentVisualFactory

Location: `src/scene/shared/components/ComponentVisualFactory.ts`

Add method to interface:
```typescript
getConfigFormDefinition(): ConfigFormDefinition | null;
```

### 4. Implement Form Definitions in Factories

Update each visual factory to return its config form:
- SmallLEDVisualFactory
- SwitchVisualFactory
- RelayVisualFactory
- TransistorVisualFactory
- DefaultVisualFactory (for Cube)
- BatteryVisualFactory (returns null)
- LightbulbVisualFactory (returns null)

### 5. Add CTRL+SHIFT+Click Handler to BuildTool

Location: `src/scene/static/tools/BuildTool.ts`

In pointer event handler:
```typescript
if (event.ctrlKey && event.shiftKey && this.mode === 'idle') {
  const component = this.getComponentUnderPointer(event);
  if (component) {
    this.controller.configPanelManager.open(component.id, screenPosition);
  }
}
```

### 6. Integrate with CircuitController

Location: `src/scene/static/CircuitController.ts`

- Instantiate ConfigPanelManager in constructor
- Expose via public property or getter
- Dispose in cleanup

## Testing

Run tests with:
```bash
npm test -- --grep "ConfigPanelManager"
npm test -- --grep "BuildTool.*config"
```

## Troubleshooting

### Panel doesn't appear
- Verify component has configurable options (check COMPONENT_TYPE_METADATA)
- Ensure build tool is active (not in wire creation or drag mode)
- Check that CTRL+SHIFT are both held during click

### Visual doesn't update on color change
- Verify factory's `updateFromConfiguration()` method handles the config key
- Check that the component's Object3D is found in scene

### Panel position is off-screen
- Overflow detection should reposition to left side
- Check viewport bounds calculation in ConfigPanelManager
