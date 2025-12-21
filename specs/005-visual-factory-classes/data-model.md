# Data Model: Visual Factory Classes

**Feature**: 005-visual-factory-classes
**Date**: 2025-12-09

## Overview

This document defines the type hierarchy and data structures for the class-based visual factory system. The design refactors the existing function-based factory pattern into an object-oriented structure that supports hover, selection, and animation state management per component type.

## Entity Definitions

### IComponentVisualFactory (Interface)

**Purpose**: Contract for all component visual factories, defining methods for visual creation and state management.

**Location**: `src/scene/shared/components/ComponentVisualFactory.ts`

```typescript
/**
 * Interface for component visual factories
 *
 * Implementations provide methods for:
 * - Creating the 3D visual representation
 * - Applying/removing hover effects
 * - Applying/removing selection effects
 * - Updating animation based on simulation state
 */
export interface IComponentVisualFactory {
  /**
   * Create the Three.js visual representation for a component
   *
   * @param component - The circuit component to visualize
   * @returns THREE.Object3D (typically a Group) containing the visual
   *
   * @remarks
   * - Must set object.userData.componentId = component.id
   * - Must set object.userData.componentType = component.type
   * - Should create component hitbox on COMPONENT layer
   * - Should create pin groups with enodes on ENODE layer
   */
  createVisual(component: Component): THREE.Object3D;

  /**
   * Apply hover visual effect to a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Should store original state in userData for restoration
   * - Default: emissive glow effect
   */
  applyHover(object3D: THREE.Object3D): void;

  /**
   * Remove hover visual effect from a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Should restore original state from userData
   */
  removeHover(object3D: THREE.Object3D): void;

  /**
   * Apply selection visual effect to a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Currently a placeholder (no-op) for future implementation
   */
  applySelection(object3D: THREE.Object3D): void;

  /**
   * Remove selection visual effect from a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Currently a placeholder (no-op) for future implementation
   */
  removeSelection(object3D: THREE.Object3D): void;

  /**
   * Update animation state based on simulation data
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The component's current simulation state
   *
   * @remarks
   * - Called by CircuitRunnerController during simulation
   * - Animation visual updates have priority over hover effects
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState): void;
}
```

---

### ComponentVisualFactoryBase (Abstract Class)

**Purpose**: Base implementation providing default behavior for visual factories. Concrete factories extend this class and override methods as needed.

**Location**: `src/scene/shared/components/ComponentVisualFactory.ts`

```typescript
/**
 * Abstract base class for component visual factories
 *
 * Provides default implementations for hover (emissive glow) and
 * placeholder implementations for selection and animation.
 *
 * @example
 * ```typescript
 * export class MyComponentFactory extends ComponentVisualFactoryBase {
 *   createVisual(component: Component): THREE.Object3D {
 *     // Create component-specific visual
 *   }
 *
 *   // Optionally override hover, selection, or animation methods
 * }
 * ```
 */
export abstract class ComponentVisualFactoryBase implements IComponentVisualFactory {
  /** Default hover glow color (light blue) */
  protected static readonly DEFAULT_HOVER_COLOR = 0x4488ff;

  /** Default hover emissive intensity */
  protected static readonly DEFAULT_HOVER_INTENSITY = 0.5;

  /**
   * Create visual representation - must be implemented by subclasses
   */
  abstract createVisual(component: Component): THREE.Object3D;

  /**
   * Default hover implementation using emissive glow
   */
  applyHover(object3D: THREE.Object3D): void { /* ... */ }

  /**
   * Default unhover implementation restoring original materials
   */
  removeHover(object3D: THREE.Object3D): void { /* ... */ }

  /**
   * Placeholder for selection - no-op by default
   */
  applySelection(object3D: THREE.Object3D): void { /* no-op */ }

  /**
   * Placeholder for deselection - no-op by default
   */
  removeSelection(object3D: THREE.Object3D): void { /* no-op */ }

  /**
   * Placeholder for animation update - no-op by default
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState): void { /* no-op */ }

  /**
   * Helper to create pin group (shared across factory implementations)
   */
  protected createPinGroup(componentId: string, pinId: string, label: string): THREE.Group {
    /* ... existing createPinGroup logic ... */
  }
}
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `DEFAULT_HOVER_COLOR` | `number` (static) | Default emissive color for hover effect |
| `DEFAULT_HOVER_INTENSITY` | `number` (static) | Default emissive intensity for hover |

---

### BatteryVisualFactory (Concrete Class)

**Purpose**: Visual factory for Battery components. Creates cylinder visual with cathode/anode pins.

**Location**: `src/scene/shared/components/BatteryVisualFactory.ts`

```typescript
/**
 * Visual factory for Battery components
 *
 * Creates:
 * - Cylinder mesh (white) for battery body
 * - Cathode pin group at z=-1
 * - Anode pin group at z=+1
 * - Component hitbox for raycasting
 */
export class BatteryVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    /* ... existing batteryFactory logic ... */
  }

  // Uses default hover implementation
  // No animation (battery is static)
}
```

---

### SwitchVisualFactory (Concrete Class)

**Purpose**: Visual factory for Switch components. Creates poles and contactor visual with input/output pins.

**Location**: `src/scene/shared/components/SwitchVisualFactory.ts`

```typescript
/**
 * Visual factory for Switch components
 *
 * Creates:
 * - Input pole (sphere)
 * - Output pole (box)
 * - Contactor (cylinder, rotatable for animation)
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 */
export class SwitchVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    /* ... existing switchFactory logic ... */
  }

  /**
   * Animate switch contactor based on open/closed state
   */
  updateAnimation(object3D: THREE.Object3D, state: SwitchState): void {
    /* ... rotate contactor based on state.isClosed ... */
  }
}
```

---

### SmallLEDVisualFactory (Concrete Class)

**Purpose**: Visual factory for SmallLED components. Creates LED visual with glow animation when lit.

**Location**: `src/scene/shared/components/SmallLEDVisualFactory.ts`

```typescript
/**
 * Visual factory for SmallLED components
 *
 * Creates:
 * - LED cylinder mesh
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when LED is lit (from simulation state)
 */
export class SmallLEDVisualFactory extends ComponentVisualFactoryBase {
  /** LED lit color (yellow glow) */
  private static readonly LED_LIT_COLOR = 0xffff00;

  /** LED lit emissive intensity */
  private static readonly LED_LIT_INTENSITY = 1.0;

  createVisual(component: Component): THREE.Object3D {
    /* ... existing smallLedFactory logic ... */
  }

  /**
   * Animate LED glow based on lit state
   */
  updateAnimation(object3D: THREE.Object3D, state: LightbulbState): void {
    const ledMesh = this.findLedMesh(object3D);
    if (!ledMesh) return;

    if (state.isLit) {
      ledMesh.material.emissive.setHex(SmallLEDVisualFactory.LED_LIT_COLOR);
      ledMesh.material.emissiveIntensity = SmallLEDVisualFactory.LED_LIT_INTENSITY;
    } else {
      ledMesh.material.emissive.setHex(0x000000);
      ledMesh.material.emissiveIntensity = 0;
    }
  }

  /**
   * Find the LED mesh within the component group
   */
  private findLedMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    /* ... traverse to find mesh with userData.part === 'led' ... */
  }
}
```

---

### DefaultVisualFactory (Concrete Class)

**Purpose**: Fallback factory for unknown component types. Creates a magenta placeholder cube.

**Location**: `src/scene/shared/components/ComponentVisualFactory.ts`

```typescript
/**
 * Default fallback factory for unknown component types
 *
 * Creates a 1x1x1 magenta cube with placeholder flag.
 * Used when no factory is registered for a component type.
 */
export class DefaultVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.componentId = component.id;
    mesh.userData.componentType = component.type;
    mesh.userData.isPlaceholder = true;
    return mesh;
  }
}
```

---

### IFactoryRegistry (Updated Interface)

**Purpose**: Registry for component visual factories. Updated to work with class instances.

**Location**: `src/scene/shared/FactoryRegistry.ts`

```typescript
/**
 * Registry interface for managing component visual factories
 *
 * @remarks
 * Updated to accept IComponentVisualFactory instances instead of functions.
 */
export interface IFactoryRegistry {
  /**
   * Register a visual factory for a specific component type
   */
  register(type: ComponentType, factory: IComponentVisualFactory): void;

  /**
   * Retrieve the factory for a component type
   *
   * @returns Factory instance (fallback factory if type not registered)
   */
  get(type: ComponentType): IComponentVisualFactory;

  /**
   * Check if a factory is registered for a component type
   */
  has(type: ComponentType): boolean;

  /**
   * Unregister a factory for a component type
   */
  unregister(type: ComponentType): boolean;

  /**
   * Get all registered component types
   */
  getRegisteredTypes(): ComponentType[];
}
```

---

## UserData Structures

### Component Visual State (Extended)

**Purpose**: Track hover/selection/animation state in Object3D userData.

```typescript
/**
 * Extended userData for component visual objects
 */
interface ComponentVisualUserData {
  // Existing fields
  type: 'componentGroup' | 'component' | 'componentHitbox';
  componentId: string;
  componentType?: string;

  // New fields for visual state management
  isHovered?: boolean;
  isSelected?: boolean;
  isAnimating?: boolean;

  // Original material state for restoration
  originalEmissive?: THREE.Color;
  originalEmissiveIntensity?: number;
}
```

---

## State Transitions

### Hover State Machine

```
                    ┌─────────────┐
                    │   NORMAL    │
                    └──────┬──────┘
                           │ onMouseEnter
                           ▼
                    ┌─────────────┐
          ┌────────│   HOVERED   │────────┐
          │        └──────┬──────┘        │
          │               │               │
          │ onMouseLeave  │ onSelect      │ onAnimationStart
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │   NORMAL    │ │  SELECTED   │ │  ANIMATING  │
   └─────────────┘ └─────────────┘ └─────────────┘
```

### Animation Priority Rule

- When `isAnimating === true`, hover effects use alternative visual (e.g., slight scale) instead of emissive glow
- Animation state is managed by CircuitRunnerController during simulation
- Static mode (CircuitController) does not set `isAnimating`

---

## Validation Rules

### Factory Registration
- `type` must be a non-empty string
- `factory` must be a valid `IComponentVisualFactory` instance
- Duplicate registration overwrites previous factory

### Visual Creation
- `component` must have valid `id` and `type`
- `component.pins` must match expected count for component type
- Output `Object3D` must have `userData.componentId` set

### State Application
- `object3D` must be a valid reference (non-null)
- Original state must be stored before modification
- State restoration must handle missing original values gracefully

---

## Relationships

```
                           IComponentVisualFactory
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ComponentVisualFactoryBase   (abstract)
                    │
    ┌───────────────┼───────────────┬───────────────┐
    │               │               │               │
    ▼               ▼               ▼               ▼
BatteryVisual   SwitchVisual   SmallLEDVisual   DefaultVisual
  Factory         Factory        Factory         Factory

                         ┌─────────────┐
                         │FactoryRegistry│
                         └──────┬──────┘
                                │ manages
                                ▼
                    Map<ComponentType, IComponentVisualFactory>
                                │
                                │ falls back to
                                ▼
                       DefaultVisualFactory
```

---

## Migration Notes

### Breaking Changes
1. `ComponentVisualFactory` type changes from function to interface
2. `IFactoryRegistry.register()` now accepts class instances
3. `IFactoryRegistry.get()` returns class instances
4. Callers must use `factory.createVisual(component)` instead of `factory(component)`

### Files Affected
- `src/scene/shared/components/ComponentVisualFactory.ts` - New interface and base class
- `src/scene/shared/components/BatteryVisualFactory.ts` - Battery factory class
- `src/scene/shared/components/SwitchVisualFactory.ts` - Switch factory class
- `src/scene/shared/components/SmallLEDVisualFactory.ts` - SmallLED factory class
- `src/scene/shared/FactoryRegistry.ts` - Update to use interface
- `src/scene/static/CircuitController.ts` - Update factory usage
- `src/scene/simulation/CircuitRunnerController.ts` - Update factory usage
- `scripts/viewer/src/main.ts` - Update factory registration

### Backward Compatibility
- Legacy function type `ComponentVisualFactory` can be deprecated with warning
- Can provide adapter function to wrap function factories if needed
