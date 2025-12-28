# Research: Component Config Editor

**Date**: 2025-12-28
**Feature**: 015-component-config-editor

## Research Tasks

### 1. lil-gui Library Integration

**Decision**: Use lil-gui as the GUI library for the config panel.

**Rationale**:
- Drop-in replacement for dat.GUI, already used in Three.js ecosystem
- Built-in TypeScript support (types included with package)
- Framework-agnostic, attaches directly to DOM
- Supports all required control types: dropdowns, color pickers, text inputs
- Clean lifecycle management with `destroy()` method
- Aligns with project's framework-agnostic constitution

**Alternatives Considered**:
- **dat.GUI**: Legacy, replaced by lil-gui in Three.js examples since r135
- **Custom HTML panel**: More control but significant development overhead
- **Tweakpane**: Good alternative but lil-gui has better Three.js ecosystem integration

**Key API Points**:
```typescript
import GUI from 'lil-gui';

// Create with custom container for positioning
const gui = new GUI({ container: containerElement });

// Dropdown (options array)
gui.add(obj, 'mode', ['symmetric', 'asymmetric']);

// Dropdown (options object with labels)
gui.add(obj, 'initialState', { Open: 'open', Closed: 'closed' });

// Color picker
gui.addColor(obj, 'activeColor');

// Change handler
gui.add(obj, 'value').onChange(newValue => { ... });

// Cleanup
gui.destroy();
```

### 2. Panel Positioning Strategy

**Decision**: Use a container div positioned adjacent to component via CSS absolute positioning.

**Rationale**:
- lil-gui supports custom container element via constructor
- Container can be positioned using world-to-screen coordinate conversion (Three.js Vector3.project)
- Overflow detection can reposition container to keep panel in viewport
- Separates positioning logic from lil-gui internals

**Implementation Approach**:
1. Create a container div in the DOM
2. Convert component's world position to screen coordinates
3. Position container to the right of component (preferred)
4. Check viewport bounds and reposition if overflow detected
5. Attach lil-gui to the container

### 3. Color Picker Integration

**Decision**: Use lil-gui's `addColor()` with hex string format, combined with dropdown for presets.

**Rationale**:
- lil-gui color controllers work with hex strings, RGB objects, or CSS colors
- Project already uses named colors ("red", "green", "blue") in config
- Hybrid approach: dropdown for common presets + addColor for custom
- Pattern matching (`/^#[0-9A-Fa-f]{6}$/`) distinguishes hex from named colors

**Preset Color Mapping**:
```typescript
const COLOR_PRESETS: Record<string, string> = {
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ff8800',
  purple: '#8800ff',
  white: '#ffffff',
  black: '#000000',
};
```

**Storage Format** (per clarification):
- Store as named preset if color matches a preset exactly
- Store as hex string (e.g., "#ff5500") for custom colors

### 4. Form Definition Interface

**Decision**: Add `getConfigFormDefinition()` method to `IComponentVisualFactory` interface.

**Rationale**:
- Factories already know their component's config structure
- Each factory can define appropriate control types for its config keys
- Centralized in factory avoids duplicate logic in panel manager
- Null/empty return indicates no configurable options

**Interface Design**:
```typescript
type ConfigControlType = 'dropdown' | 'color' | 'number' | 'text' | 'boolean';

interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: ConfigControlType;
  options?: string[] | Record<string, string>; // For dropdowns
  min?: number; // For numbers
  max?: number; // For numbers
}

interface ConfigFormDefinition {
  fields: ConfigFieldDefinition[];
}

// Added to IComponentVisualFactory
getConfigFormDefinition(): ConfigFormDefinition | null;
```

### 5. Core-to-Form Mapping Pattern

**Decision**: Add `mapCoreConfigToForm()` and `mapFormToCoreConfig()` methods to visual factories.

**Rationale**:
- Core config uses semantic string values ("open"/"closed", "positive"/"negative") for clarity and JSON serialization
- UI controls may use different types (booleans for checkboxes, hex strings for colors)
- Visual factory is the appropriate place for this mapping (knows both core semantics and UI needs)
- Decouples core model from UI presentation concerns

**Data Flow**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PANEL OPEN FLOW                                  │
│                                                                          │
│  Component.config ──► mapCoreConfigToForm() ──► formData ──► lil-gui    │
│  (Map<string,string>)   (factory method)     (Map<string,any>)          │
│                                                                          │
│  Example: { "initialState": "open" } ──► { "initialState": true }       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        VALUE CHANGE FLOW                                 │
│                                                                          │
│  lil-gui onChange ──► formData ──► mapFormToCoreConfig() ──► Component  │
│                    (Map<string,any>)  (factory method)      .setParameter│
│                                                                          │
│  Example: { "initialState": false } ──► { "initialState": "closed" }    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Mapping Examples**:

| Component | Core Key | Core Value | Form Value | Control Type |
|-----------|----------|------------|------------|--------------|
| Switch | initialState | "open" | true | boolean |
| Switch | initialState | "closed" | false | boolean |
| Relay | activationLogic | "positive" | true | boolean |
| Relay | activationLogic | "negative" | false | boolean |
| SmallLED | activeColor | "red" | "#ff0000" | color |
| SmallLED | activeColor | "#ff5500" | "#ff5500" | color |

**Implementation in Factory**:
```typescript
// SwitchVisualFactory example
mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
  const formData = new Map<string, any>();
  const initialState = config.get('initialState');
  formData.set('initialState', initialState === 'open');
  return formData;
}

mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
  const config = new Map<string, string>();
  const isOpen = formData.get('initialState') as boolean;
  config.set('initialState', isOpen ? 'open' : 'closed');
  return config;
}
```

### 6. Event Handling in BuildTool

**Decision**: Add CTRL+SHIFT+click detection in BuildTool's pointer event handlers.

**Rationale**:
- BuildTool already handles all pointer events for the canvas
- Mode check (idle only) prevents conflicts with active operations
- Consistent with existing modifier key patterns (CTRL+click for source cycling)

**Implementation Approach**:
1. In `handlePointerDown` or `handleClick`, check for `event.ctrlKey && event.shiftKey`
2. Verify mode is 'idle' (not in wire_creation, component_drag, etc.)
3. Raycast to identify clicked component
4. If component found and has config, emit event or call ConfigPanelManager
5. If panel already open for different component, close and reopen

### 6. Panel Dismissal

**Decision**: Close panel on click-outside or Escape key.

**Rationale**:
- Standard UI pattern for overlay/modal elements
- Escape key already used in BuildTool for canceling operations
- Click-outside handled by checking if click target is within panel DOM

**Implementation**:
- Add global `pointerdown` listener to detect clicks outside panel
- Add `keydown` listener for Escape key
- Both trigger `ConfigPanelManager.close()`

## Sources

- [lil-gui npm package](https://www.npmjs.com/package/lil-gui)
- [lil-gui documentation](https://lil-gui.georgealways.com/)
- [lil-gui Guide.md](https://github.com/georgealways/lil-gui/blob/main/Guide.md)
- [lil-gui Three.js tutorial](https://sbcode.net/threejs/lil-gui/)
