# Data Model: Component Config Editor

**Date**: 2025-12-28
**Feature**: 015-component-config-editor

## Entities

### ConfigControlType (Enum)

Defines the available control types for config form fields.

```typescript
type ConfigControlType = 'dropdown' | 'color' | 'number' | 'text' | 'boolean';
```

| Value | Description | lil-gui Method |
|-------|-------------|----------------|
| `dropdown` | Selection from predefined options | `gui.add(obj, key, options)` |
| `color` | Hybrid color selector (presets + picker) | `gui.addColor(obj, key)` + dropdown |
| `number` | Numeric input with optional min/max | `gui.add(obj, key, min, max)` |
| `text` | Free-form text input | `gui.add(obj, key)` |
| `boolean` | Checkbox toggle | `gui.add(obj, key)` |

### ConfigFieldDefinition (Interface)

Describes a single configurable field in a component's config form.

```typescript
interface ConfigFieldDefinition {
  /** Config map key (e.g., "activeColor", "initialState") */
  key: string;

  /** Human-readable label for the form field */
  label: string;

  /** Control type to render */
  type: ConfigControlType;

  /** Options for dropdown type (array or label-value object) */
  options?: string[] | Record<string, string>;

  /** Minimum value for number type */
  min?: number;

  /** Maximum value for number type */
  max?: number;

  /** Step increment for number type */
  step?: number;
}
```

**Validation Rules**:
- `key` must be non-empty string
- `type` must be valid ConfigControlType
- `options` required when `type === 'dropdown'`
- `min`/`max`/`step` only applicable when `type === 'number'`

### ConfigFormDefinition (Interface)

Complete form definition for a component type.

```typescript
interface ConfigFormDefinition {
  /** Array of field definitions, rendered in order */
  fields: ConfigFieldDefinition[];
}
```

**Validation Rules**:
- `fields` array may be empty (no configurable options)
- Field keys must be unique within the form
- Fields are rendered in array order

### IConfigFormProvider (Interface)

Extension to IComponentVisualFactory for config form support.

```typescript
interface IConfigFormProvider {
  /**
   * Get the config form definition for this component type
   * @returns Form definition with field specifications, or null if no config
   */
  getConfigFormDefinition(): ConfigFormDefinition | null;

  /**
   * Map core component config (string values) to form data (typed values)
   * Called when panel opens to initialize form controls
   * @param config - Core config from Component.config
   * @returns Form data with appropriate types for UI controls
   */
  mapCoreConfigToForm(config: Map<string, string>): Map<string, any>;

  /**
   * Map form data (typed values) back to core config (string values)
   * Called on each value change to update Component.config
   * @param formData - Current form values from UI
   * @returns Core config ready for Component.setAllParameters()
   */
  mapFormToCoreConfig(formData: Map<string, any>): Map<string, string>;
}
```

**Method Call Flow**:
1. `getConfigFormDefinition()` - Called once when panel opens to build UI
2. `mapCoreConfigToForm()` - Called once when panel opens to populate initial values
3. `mapFormToCoreConfig()` - Called on every value change to persist to core

### ConfigPanelState (Interface)

Internal state of the ConfigPanelManager.

```typescript
interface ConfigPanelState {
  /** Whether panel is currently visible */
  isOpen: boolean;

  /** ID of component currently being edited */
  componentId: UUID | null;

  /** Screen position of panel container */
  position: { x: number; y: number };

  /** Reference to lil-gui instance */
  gui: GUI | null;

  /** Reference to container DOM element */
  container: HTMLDivElement | null;
}
```

**State Transitions**:
- `closed → open`: On CTRL+SHIFT+click on configurable component
- `open → closed`: On click-outside, Escape key, or CTRL+SHIFT+click elsewhere
- `open → open`: On CTRL+SHIFT+click on different component (close + reopen)

## Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CircuitController                          │
│  - Owns ConfigPanelManager instance                                  │
│  - Provides access to circuit, camera, container                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ConfigPanelManager                           │
│  - Manages panel lifecycle (open/close/destroy)                      │
│  - Creates lil-gui with form from factory definition                 │
│  - Positions panel adjacent to component                             │
│  - Handles dismiss events (click-outside, Escape)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │  Component   │ │VisualFactory │ │   lil-gui    │
           │  (core)      │ │  (scene)     │ │  (external)  │
           │  - config    │ │  - form def  │ │  - GUI panel │
           │    Map       │ │  - updateFrom│ │  - controls  │
           │              │ │   Config()   │ │              │
           └──────────────┘ └──────────────┘ └──────────────┘
```

## Form Definitions by Component Type

### SmallLED / RectangleLED

```typescript
{
  fields: [
    { key: 'mode', label: 'Mode', type: 'dropdown', options: ['symmetric', 'asymmetric'] },
    { key: 'activeColor', label: 'Active Color', type: 'color' },
    { key: 'idleColor', label: 'Idle Color', type: 'color' },
  ]
}
```

### Switch

```typescript
{
  fields: [
    { key: 'initialState', label: 'Open at start', type: 'boolean' },
  ]
}
```

### Relay

```typescript
{
  fields: [
    { key: 'activationLogic', label: 'Activation Logic', type: 'boolean' },
  ]
}
```

### Transistor

```typescript
{
  fields: [
    { key: 'activationLogic', label: 'Activation Logic', type: 'boolean' },
  ]
}
```

### Cube

```typescript
{
  fields: [
    { key: 'color', label: 'Color', type: 'color' },
  ]
}
```

### Battery / Lightbulb (no config)

```typescript
null // or { fields: [] }
```

## Core-to-Form Mapping Tables

### Switch Mapping

| Direction | Core Key | Core Value | Form Key | Form Value |
|-----------|----------|------------|----------|------------|
| Core → Form | initialState | "open" | initialState | `true` |
| Core → Form | initialState | "closed" | initialState | `false` |
| Form → Core | initialState | `true` | initialState | "open" |
| Form → Core | initialState | `false` | initialState | "closed" |

### Relay / Transistor Mapping

| Direction | Core Key | Core Value | Form Key | Form Value |
|-----------|----------|------------|----------|------------|
| Core → Form | activationLogic | "positive" | activationLogic | `true` |
| Core → Form | activationLogic | "negative" | activationLogic | `false` |
| Form → Core | activationLogic | `true` | activationLogic | "positive" |
| Form → Core | activationLogic | `false` | activationLogic | "negative" |

### SmallLED / RectangleLED Color Mapping

| Direction | Core Key | Core Value | Form Key | Form Value |
|-----------|----------|------------|----------|------------|
| Core → Form | activeColor | "red" | activeColor | "#ff0000" |
| Core → Form | activeColor | "#ff5500" | activeColor | "#ff5500" |
| Form → Core | activeColor | "#ff0000" | activeColor | "red" (matches preset) |
| Form → Core | activeColor | "#ff5500" | activeColor | "#ff5500" (no preset match) |

### SmallLED / RectangleLED Mode Mapping

| Direction | Core Key | Core Value | Form Key | Form Value |
|-----------|----------|------------|----------|------------|
| Core → Form | mode | "symmetric" | mode | "symmetric" |
| Core → Form | mode | "asymmetric" | mode | "asymmetric" |
| Form → Core | mode | "symmetric" | mode | "symmetric" |
| Form → Core | mode | "asymmetric" | mode | "asymmetric" |

> Note: `mode` is a string-to-string mapping (no type conversion needed), uses dropdown control.

### Cube Color Mapping

Same as SmallLED color mapping - converts named presets to hex for color picker, and back.

## Color Presets

Standard color presets for hybrid color controls:

```typescript
const COLOR_PRESETS: Record<string, string> = {
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ff8800',
  purple: '#8800ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#ffffff',
  black: '#000000',
};
```

**Storage Logic**:
- On color selection, check if hex matches any preset
- If match: store named preset (e.g., "red")
- If no match: store hex string (e.g., "#ff5500")
- Pattern `/^#[0-9A-Fa-f]{6}$/` identifies hex values on load
