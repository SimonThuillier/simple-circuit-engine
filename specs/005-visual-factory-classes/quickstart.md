# Quickstart: Visual Factory Classes

**Feature**: 005-visual-factory-classes
**Date**: 2025-12-09

## Overview

This guide shows how to use the new class-based component visual factory system to create, register, and use visual factories with hover, selection, and animation support.

## Basic Usage

### Creating a Custom Visual Factory

```typescript
import { ComponentVisualFactoryBase } from '@/scene/shared/ComponentVisualFactory';
import type { Component } from '@/core/Component';
import * as THREE from 'three';

export class MyComponentVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    // Create root group
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Add hitbox
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 2);
    group.add(hitbox);

    // Add visual elements
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'component', componentId: component.id };
    group.add(mesh);

    // Add pins using helper
    const inputPin = this.createPinGroup(component.id, component.pins[0], 'input');
    inputPin.position.set(-1, 0, 0);
    group.add(inputPin);

    const outputPin = this.createPinGroup(component.id, component.pins[1], 'output');
    outputPin.position.set(1, 0, 0);
    group.add(outputPin);

    return group;
  }

  // Uses default hover implementation (emissive glow)
  // Override if custom hover needed
}
```

### Registering Factories

```typescript
import { FactoryRegistry } from '@/scene/shared/FactoryRegistry';
import { DefaultVisualFactory } from '@/scene/shared/ComponentVisualFactory';
import { BatteryVisualFactory, SwitchVisualFactory, SmallLEDVisualFactory } from '@/scene/shared/ComponentVisuals';
import { ComponentType } from '@/core/types/ComponentType';

// Create registry with fallback
const fallback = new DefaultVisualFactory();
const registry = new FactoryRegistry(fallback);

// Register component factories
registry.register(ComponentType.Battery, new BatteryVisualFactory());
registry.register(ComponentType.Switch, new SwitchVisualFactory());
registry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());
```

### Using Factories

```typescript
// Get factory for a component
const factory = registry.get(component.type);

// Create visual
const visual = factory.createVisual(component);
scene.add(visual);

// Apply hover effect
factory.applyHover(visual);

// Remove hover effect
factory.removeHover(visual);

// Update animation (during simulation)
factory.updateAnimation(visual, componentState);
```

## Custom Hover Effect

Override `applyHover` and `removeHover` for custom hover behavior:

```typescript
export class GlowingComponentFactory extends ComponentVisualFactoryBase {
  private static readonly CUSTOM_HOVER_COLOR = 0x00ff00; // Green glow

  createVisual(component: Component): THREE.Object3D {
    // ... create visual ...
  }

  applyHover(object3D: THREE.Object3D): void {
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (child.material.visible === false) return; // Skip hitboxes

        // Store original state
        if (!child.userData.isHovered) {
          child.userData.originalEmissive = child.material.emissive.clone();
          child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
          child.userData.isHovered = true;

          // Apply custom green glow
          child.material.emissive.setHex(GlowingComponentFactory.CUSTOM_HOVER_COLOR);
          child.material.emissiveIntensity = 0.8;
        }
      }
    });
  }

  // removeHover uses default implementation (restores original state)
}
```

## Animation Support

Override `updateAnimation` for components with animation:

```typescript
import type { SmallLEDState } from '@/core/simulation/states/SmallLEDState';

export class SmallLEDVisualFactory extends ComponentVisualFactoryBase {
  private static readonly LED_LIT_COLOR = 0xffff00;
  private static readonly LED_LIT_INTENSITY = 1.0;

  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    // ... create LED visual with userData.part = 'led' ...
    return group;
  }

  updateAnimation(object3D: THREE.Object3D, state: SmallLEDState): void {
    const ledMesh = this.findLedMesh(object3D);
    if (!ledMesh || !(ledMesh.material instanceof THREE.MeshStandardMaterial)) {
      return;
    }

    if (state.isLit) {
      ledMesh.material.emissive.setHex(SmallLEDVisualFactory.LED_LIT_COLOR);
      ledMesh.material.emissiveIntensity = SmallLEDVisualFactory.LED_LIT_INTENSITY;
    } else {
      ledMesh.material.emissive.setHex(0x000000);
      ledMesh.material.emissiveIntensity = 0;
    }

    // Mark as animating (affects hover behavior)
    object3D.userData.isAnimating = true;
  }

  private findLedMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let result: THREE.Mesh | null = null;
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'led') {
        result = child;
      }
    });
    return result;
  }
}
```

## Integration with Scene Managers

### CircuitSceneManager (Static Mode)

```typescript
// In CircuitSceneManager._createComponentMesh
private _createComponentMesh(component: Component): void {
  const factory = this.factoryRegistry.get(component.type);
  const mesh = factory.createVisual(component);
  mesh.position.set(component.position.x, 0, -component.position.y);

  // Store factory reference for hover handling
  mesh.userData.factory = factory;

  this._componentMeshes.set(component.id, mesh);
  this._scene.add(mesh);
}

// In hover callback
private _handleHover(hoveredElement: HoveredElement | null): void {
  // Unhover previous
  if (this._previousHovered) {
    const mesh = this._componentMeshes.get(this._previousHovered.id);
    const factory = mesh?.userData.factory as IComponentVisualFactory;
    if (mesh && factory) {
      factory.removeHover(mesh);
    }
  }

  // Hover new
  if (hoveredElement?.type === 'component') {
    const mesh = this._componentMeshes.get(hoveredElement.id);
    const factory = mesh?.userData.factory as IComponentVisualFactory;
    if (mesh && factory) {
      factory.applyHover(mesh);
    }
  }
}
```

### CircuitRunnerSceneManager (Simulation Mode)

```typescript
// In simulation state update loop
private _updateComponentVisuals(states: Map<string, ComponentState>): void {
  for (const [componentId, state] of states) {
    const mesh = this._componentMeshes.get(componentId);
    const factory = mesh?.userData.factory as IComponentVisualFactory;
    if (mesh && factory) {
      factory.updateAnimation(mesh, state);
    }
  }
}
```

## Testing Factories

```typescript
import { describe, it, expect } from 'vitest';
import { BatteryVisualFactory } from '@/scene/shared/ComponentVisuals';
import { createMockComponent } from '../helpers';

describe('BatteryVisualFactory', () => {
  const factory = new BatteryVisualFactory();

  it('creates visual with correct structure', () => {
    const component = createMockComponent('Battery');
    const visual = factory.createVisual(component);

    expect(visual).toBeInstanceOf(THREE.Group);
    expect(visual.userData.componentId).toBe(component.id);
    expect(visual.userData.componentType).toBe('Battery');
  });

  it('applies and removes hover effect', () => {
    const component = createMockComponent('Battery');
    const visual = factory.createVisual(component);

    factory.applyHover(visual);
    // Verify hover state
    let hovered = false;
    visual.traverse((child) => {
      if (child.userData.isHovered) hovered = true;
    });
    expect(hovered).toBe(true);

    factory.removeHover(visual);
    // Verify hover removed
    hovered = false;
    visual.traverse((child) => {
      if (child.userData.isHovered) hovered = true;
    });
    expect(hovered).toBe(false);
  });
});
```

## Migration from Function Factories

### Before (Function-based)

```typescript
// Old: Function type
export type ComponentVisualFactory = (component: Component) => THREE.Object3D;

// Old: Function implementation
export const batteryFactory: ComponentVisualFactory = (component) => {
  const group = new THREE.Group();
  // ... create visual ...
  return group;
};

// Old: Registration
registry.register(ComponentType.Battery, batteryFactory);

// Old: Usage
const factory = registry.get(ComponentType.Battery);
const visual = factory(component);
```

### After (Class-based)

```typescript
// New: Class implementation
export class BatteryVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    // ... create visual ...
    return group;
  }
}

// New: Registration
registry.register(ComponentType.Battery, new BatteryVisualFactory());

// New: Usage
const factory = registry.get(ComponentType.Battery);
const visual = factory.createVisual(component);
factory.applyHover(visual);
```

## Summary

| Task | Method |
|------|--------|
| Create component visual | `factory.createVisual(component)` |
| Apply hover effect | `factory.applyHover(object3D)` |
| Remove hover effect | `factory.removeHover(object3D)` |
| Apply selection (future) | `factory.applySelection(object3D)` |
| Remove selection (future) | `factory.removeSelection(object3D)` |
| Update animation | `factory.updateAnimation(object3D, state)` |
| Create custom factory | `extend ComponentVisualFactoryBase` |
| Register factory | `registry.register(type, factoryInstance)` |
| Get factory | `registry.get(componentType)` |
