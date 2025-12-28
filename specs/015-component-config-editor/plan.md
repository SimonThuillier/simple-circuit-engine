# Implementation Plan: Component Config Editor

**Branch**: `015-component-config-editor` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-component-config-editor/spec.md`

## Summary

Implement a lil-gui-based configuration editor that opens when users CTRL+SHIFT+click on components during build tool operation. Visual factories define form structure for their component types, and config changes trigger immediate visual updates via the existing `updateFromConfiguration` method.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+, lil-gui (new dependency to add)
**Storage**: N/A (in-memory config map on Component instances)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single library project
**Performance Goals**: Visual updates within 100ms of config change
**Constraints**: Must work within existing BuildTool event handling; singleton panel pattern
**Scale/Scope**: 6 configurable component types (Switch, Relay, Transistor, SmallLED, RectangleLED, Cube)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | PASS | lil-gui is framework-agnostic, attaches to DOM directly |
| Modular Separation | PASS | ConfigPanelManager lives in scene/ layer, uses core/ Component.config |
| Discrete Boolean Model | N/A | Config editing doesn't affect simulation model |
| Data-Driven Circuits | PASS | Config stored in Component.config Map, serializable to JSON |
| Specification-Driven | PASS | Feature spec defines all requirements |
| Developer Experience | PASS | Clear interface for factory config form definitions |
| No `any` types | PASS | All interfaces will be strongly typed |
| Public APIs have JSDoc | PASS | New interfaces will be documented |

**Gate Result**: PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/015-component-config-editor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── Component.ts              # Existing - has config Map
├── scene/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ComponentVisualFactory.ts  # Extend interface with getConfigFormDefinition()
│   │   │   ├── SmallLEDVisualFactory.ts   # Add form definition + updateFromConfiguration
│   │   │   ├── SwitchVisualFactory.ts     # Add form definition + updateFromConfiguration
│   │   │   ├── RelayVisualFactory.ts      # Add form definition
│   │   │   ├── TransistorVisualFactory.ts # Add form definition
│   │   │   └── DefaultVisualFactory.ts    # Add form definition (null/empty)
│   │   └── ConfigPanelManager.ts          # NEW - lil-gui panel lifecycle
│   └── static/
│       ├── CircuitController.ts           # Integrate ConfigPanelManager
│       └── tools/
│           └── BuildTool.ts               # Add CTRL+SHIFT+click handler

tests/
├── scene/
│   ├── shared/
│   │   └── ConfigPanelManager.test.ts     # NEW
│   └── static/
│       └── tools/
│           └── BuildTool.test.ts          # Extend with config editor tests
```

**Structure Decision**: Single library project. New ConfigPanelManager class in scene/shared/, with integration points in BuildTool and CircuitController.

## Data Flow & Integration

### Core-to-Form Mapping Architecture

The feature uses a mapping layer to decouple core config representation from UI controls:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OPEN PANEL                                      │
│                                                                              │
│  1. BuildTool detects CTRL+SHIFT+click on component                         │
│  2. ConfigPanelManager.open(componentId, screenPosition)                    │
│  3. Get factory via FactoryRegistry.get(component.type)                     │
│  4. Get form definition: factory.getConfigFormDefinition()                  │
│  5. Map core config to form: factory.mapCoreConfigToForm(component.config)  │
│  6. Build lil-gui controls from form definition + formData                  │
│  7. Position and display panel                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            ON VALUE CHANGE                                   │
│                                                                              │
│  1. lil-gui onChange fires with new form value                              │
│  2. Update formData Map with new value                                      │
│  3. Map form to core: factory.mapFormToCoreConfig(formData)                 │
│  4. Update component: component.setAllParameters(coreConfig)                │
│  5. Update visual: factory.updateFromConfiguration(object3D, coreConfig)   │
│  6. Emit 'changed' event                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOSE PANEL                                     │
│                                                                              │
│  1. Escape key or click-outside detected                                    │
│  2. ConfigPanelManager.close()                                              │
│  3. Destroy lil-gui instance: gui.destroy()                                 │
│  4. Remove container from DOM                                               │
│  5. Emit 'closed' event                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mapping Method Responsibilities

| Method | Called When | Input | Output | Purpose |
|--------|-------------|-------|--------|---------|
| `getConfigFormDefinition()` | Panel opens | - | `ConfigFormDefinition` | Define UI controls |
| `mapCoreConfigToForm()` | Panel opens | `Map<string,string>` | `Map<string,any>` | Convert core values to UI types |
| `mapFormToCoreConfig()` | Value changes | `Map<string,any>` | `Map<string,string>` | Convert UI values back to core |
| `updateFromConfiguration()` | Value changes | `Object3D, Map<string,string>` | void | Update 3D visual |

### Factory Implementation Pattern

Each visual factory with configurable options must implement:

```typescript
class SwitchVisualFactory extends ComponentVisualFactoryBase {

  getConfigFormDefinition(): ConfigFormDefinition {
    return {
      fields: [
        { key: 'initialState', label: 'Open at start', type: 'boolean' }
      ]
    };
  }

  mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    // Core "open"/"closed" → Form boolean
    formData.set('initialState', config.get('initialState') === 'open');
    return formData;
  }

  mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    // Form boolean → Core "open"/"closed"
    config.set('initialState', formData.get('initialState') ? 'open' : 'closed');
    return config;
  }

  updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    // Update visual if needed (switch visual doesn't change based on initialState)
  }
}
```

### ConfigPanelManager Integration Points

```typescript
class ConfigPanelManager {

  open(componentId: UUID, screenPosition: { x: number; y: number }): boolean {
    const component = this.circuit.getComponent(componentId);
    const factory = this.factoryRegistry.get(component.type);

    // Get form definition
    const formDef = factory.getConfigFormDefinition();
    if (!formDef || formDef.fields.length === 0) return false;

    // Map core config to form data
    this.formData = factory.mapCoreConfigToForm(component.config);

    // Build lil-gui from formDef and formData
    this.buildGui(formDef, this.formData);

    // Wire onChange to update flow
    for (const field of formDef.fields) {
      this.gui.add(this.formDataObject, field.key).onChange(() => {
        this.onValueChange(component, factory);
      });
    }

    return true;
  }

  private onValueChange(component: Component, factory: IComponentVisualFactory): void {
    // Convert form data back to core config
    const coreConfig = factory.mapFormToCoreConfig(this.formData);

    // Update component
    component.setAllParameters(coreConfig);

    // Update visual
    const object3D = this.getComponentObject3D(component.id);
    factory.updateFromConfiguration(object3D, coreConfig);
  }
}
```
