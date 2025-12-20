/**
 * Component Visual Factory System
 * @module rendering/shared/ComponentVisualFactory
 *
 * Provides factory pattern for creating Three.js visuals from Circuit components.
 * Supports dynamic registration and fallback for unknown component types.
 */

import type { Component } from '@/core/Component';
import type { ComponentType } from '@/core/types/ComponentType';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import { ENodeSourceType } from '@/core/types/ENodeSourceType';
import * as THREE from 'three';
import { HitboxLayers } from '../LayerConstants';

/**
 * Interface for component visual factories
 *
 * Implementations provide methods for:
 * - Creating the 3D visual representation
 * - Applying/removing hover effects
 * - Applying/removing selection effects
 * - Updating animation based on simulation state
 *
 * @example
 * ```typescript
 * class MyComponentFactory extends ComponentVisualFactoryBase {
 *   createVisual(component: Component): THREE.Object3D {
 *     const group = new THREE.Group();
 *     // ... create visual elements
 *     group.userData.componentId = component.id;
 *     group.userData.componentType = component.type;
 *     return group;
 *   }
 * }
 * ```
 */
export interface IComponentVisualFactory {
  /**
   * Create the Three.js visual representation for a component
   *
   * @param component - The circuit component to visualize
   * @returns THREE.Object3D (typically a Group) containing the visual
   *
   * @remarks
   * Implementations MUST:
   * - Set `object.userData.componentId = component.id`
   * - Set `object.userData.componentType = component.type`
   * - Create component hitbox on HitboxLayers.COMPONENT layer
   * - Create pin groups with enodes on HitboxLayers.ENODE layer
   * - Return objects positioned at origin (scene controllerType handles placement)
   */
  createVisual(component: Component): THREE.Object3D;

  /**
   * Apply hover visual effect to a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Should store original material state in userData for restoration
   * - Default implementation: emissive glow effect (light blue, 0.5 intensity)
   * - Called by scene controllerType when component is hovered
   * - Should be idempotent (safe to call multiple times)
   */
  applyHover(object3D: THREE.Object3D): void;

  /**
   * Remove hover visual effect from a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Should restore original material state from userData
   * - Called by scene controllerType when hover ends
   * - Should be safe to call even if not currently hovered
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
   * Update pin source type visual (optional method)
   *
   * @param pinGroup - The THREE.Group containing the pin visual
   * @param sourceType - The new source type (null for no source)
   *
   * @remarks
   * - Optional method for component factories that support pin source type visualization
   * - Changes pin color based on source type (bronze/red/blue)
   * - Default implementation in ComponentVisualFactoryBase
   */
  updatePinSourceType(pinGroup: THREE.Object3D, sourceType: ENodeSourceType | null): void;

  /**
   * Apply hover effect on a pin
   * @param pinGroup
   */
  applyPinHover(pinGroup: THREE.Object3D): void;

  /**
   * Remove hover effect on a pin
   */
  removePinHover(pinGroup: THREE.Object3D): void;

  /**
   * Update animation state based on simulation data
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The component's current simulation state
   *
   * @remarks
   * - Called by CircuitRunnercontroller during simulation
   * - Animation visual updates have priority over hover effects
   * - Default implementation: no-op (static components)
   * - Subclasses override for component-specific animation
   *   (e.g., LED glow, switch contactor rotation)
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState): void;
}

/**
 * Abstract base class for component visual factories
 *
 * Provides default implementations for:
 * - Hover effect (emissive glow)
 * - Selection effect (placeholder/no-op)
 * - Animation update (placeholder/no-op)
 * - Pin group creation (shared helper)
 * - Component hitbox creation (shared helper)
 *
 * Subclasses must implement:
 * - createVisual() - component-specific visual creation
 *
 * Subclasses may override:
 * - applyHover() / removeHover() - custom hover effect
 * - applySelection() / removeSelection() - custom selection effect (future)
 * - updateAnimation() - component-specific animation
 *
 * @example
 * ```typescript
 * export class BatteryVisualFactory extends ComponentVisualFactoryBase {
 *   createVisual(component: Component): THREE.Object3D {
 *     const group = new THREE.Group();
 *     // ... create battery-specific visual
 *     return group;
 *   }
 *   // Inherits default hover, selection, and animation
 * }
 * ```
 */
export abstract class ComponentVisualFactoryBase implements IComponentVisualFactory {
  /** Default hover glow color (light blue) */
  protected static readonly DEFAULT_HOVER_COLOR = 0x4488ff;

  /** Default hover emissive intensity */
  protected static readonly DEFAULT_HOVER_INTENSITY = 0.6;

  /** Default selection glow color (orange) */
  protected static readonly DEFAULT_SELECTION_COLOR = 0xff8800;

  /** Default selection emissive intensity (higher than hover) */
  protected static readonly DEFAULT_SELECTION_INTENSITY = 0.8;

  /**
   * Create the Three.js visual representation for a component
   * Must be implemented by subclasses
   */
  abstract createVisual(component: Component): THREE.Object3D;

  /**
   * Apply hover visual effect using emissive glow
   *
   * Default implementation traverses all meshes and applies
   * an emissive blue glow effect, storing original values in userData.
   *
   * Note: If component is selected, selection visual takes precedence
   * and hover visual is not applied (but isHovered flag is still set).
   */
  applyHover(object3D: THREE.Object3D): void {
    if (object3D.userData.isSelected) {
      // Component is selected; skip hover visual
      return;
    }

    object3D.traverse((child) => {
      if (child.userData.type === 'enodeHitbox' || child.userData.type === 'enode') {
        return;
      }
      if (child.userData.type === 'enodeGroup') {
        this.applyPinHover(child);
        return;
      }
      if (!(child instanceof THREE.Mesh)) return;
      if (child.userData.materialLocked) return; // this flag indicates material is locked by animation

      const material = child.material;
      if (material.visible === false) return;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.emissive.setHex(ComponentVisualFactoryBase.DEFAULT_HOVER_COLOR);
      material.emissiveIntensity = ComponentVisualFactoryBase.DEFAULT_HOVER_INTENSITY;
    });
  }

  /**
   * Remove hover visual effect, restoring original materials
   */
  removeHover(object3D: THREE.Object3D): void {
    if (object3D.userData.isSelected) {
      // Component is selected; skip unhover visual
      return;
    }
    object3D.traverse((child) => {
      if (child.userData.type === 'enodeHitbox' || child.userData.type === 'enode') {
        return;
      }
      if (child.userData.type === 'enodeGroup') {
        this.removePinHover(child);
        return;
      }
      if (!(child instanceof THREE.Mesh)) return;
      if (child.userData.materialLocked) return; // this flag indicates material is locked by animation

      const material = child.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.emissiveIntensity = 0;
    });
  }

  /**
   * Apply selection visual effect using emissive orange glow
   *
   * Selection takes precedence over hover effect.
   * Stores original material state in userData for restoration.
   *
   * @param object3D - The component's root Three.js object
   */
  applySelection(object3D: THREE.Object3D): void {
    object3D.traverse((child) => {
      if (child.userData.type === 'enodeHitbox' || child.userData.type === 'enode') {
        return;
      }
      if (child.userData.type === 'enodeGroup') {
        this.removePinHover(child);
        return;
      }
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material;
      if (material.visible === false || material.opacity < 0.5) return;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      // Apply selection effect (overrides hover if present)
      material.emissive.setHex(ComponentVisualFactoryBase.DEFAULT_SELECTION_COLOR);
      material.emissiveIntensity = ComponentVisualFactoryBase.DEFAULT_SELECTION_INTENSITY;
    });

    object3D.userData.isSelected = true;
  }

  /**
   * Remove selection visual effect, restoring original or hover state
   *
   * If component was hovered before selection, restores hover visual.
   * Otherwise, restores original material state.
   *
   * @param object3D - The component's root Three.js object
   */
  removeSelection(object3D: THREE.Object3D): void {
    object3D.traverse((child) => {
      if (child.userData.type === 'enodeHitbox' || child.userData.type === 'enode') {
        return;
      }
      if (child.userData.type === 'enodeGroup') {
        this.removePinHover(child);
        return;
      }
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material;
      if (material.visible === false || material.opacity < 0.5) return;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      // remove selection effect
      material.emissiveIntensity = 0;
    });
    object3D.userData.isSelected = false;
  }

  /**
   * Create a pin group with hitbox and visual sphere
   *
   * Creates a THREE.Group containing:
   * - Hemisphere hitbox (on ENODE layer for raycasting)
   * - Hemisphere visual (blue sphere)
   * - Hover callback in userData
   *
   * @param componentId - UUID of the parent component
   * @param pinId - UUID of this pin/enode
   * @param label - Human-readable label (e.g., 'input', 'output', 'cathode')
   * @param sourceType - Optional source type (voltage/current) : if provided this pin will be locked to that type
   * @returns THREE.Group configured as pin group
   */
  protected createPinGroup(
    componentId: string,
    pinId: string,
    label: string,
    sourceType: ENodeSourceType | null = null
  ): THREE.Group {
    const pinGroup = new THREE.Group();
    pinGroup.userData = {
      type: 'enodeGroup',
      componentId: componentId,
      enodeId: pinId,
      label: label,
      lockedSourceType: sourceType,
    };

    // Hitbox (hemisphere, raycastable)
    const hitboxGeom = new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hitbox = new THREE.Mesh(
      hitboxGeom,
      new THREE.MeshStandardMaterial({
        color: ComponentVisualFactoryBase.DEFAULT_HOVER_COLOR,
        transparent: true,
        opacity: 0,
      })
    );
    hitbox.userData = {
      type: 'enodeHitbox',
      componentId: componentId,
      enodeId: pinId,
      label: label,
      lockedSourceType: sourceType,
    };
    hitbox.layers.set(HitboxLayers.ENODE);
    pinGroup.add(hitbox);

    // Visual sphere
    const visual = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: this.pinColorForSourceType(sourceType),
        emissive: this.pinColorForSourceType(sourceType),
        emissiveIntensity: 0,
      })
    );
    visual.userData = {
      type: 'enode',
      componentId: componentId,
      enodeId: pinId,
      label: label,
      lockedSourceType: sourceType,
    };
    pinGroup.add(visual);

    return pinGroup;
  }

  /**
   * Create component hitbox mesh
   *
   * Helper to create standard component hitbox with proper userData and layer.
   *
   * @param componentId - UUID of the component
   * @param groupId - ID of the parent THREE.Group
   * @param width - Hitbox width
   * @param height - Hitbox height
   * @param depth - Hitbox depth
   * @returns THREE.Mesh configured as component hitbox
   */
  protected createComponentHitbox(
    componentId: string,
    groupId: number,
    width: number,
    height: number,
    depth: number
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.2,
      visible: false,
    });
    const hitbox = new THREE.Mesh(geometry, material);
    hitbox.userData = {
      type: 'componentHitbox',
      componentId: componentId,
      groupId: groupId,
    };
    hitbox.layers.set(HitboxLayers.COMPONENT);
    return hitbox;
  }

  protected pinColorForSourceType(sourceType: ENodeSourceType | null): number {
    if (!sourceType) {
      return 0xb87333; // Bronze for no source
    }
    if (sourceType === ENodeSourceType.Voltage) {
      return 0xff0000; // Red for voltage
    } else if (sourceType === ENodeSourceType.Current) {
      return 0x0000ff; // Blue for current
    }
    return 0xb87333; // Bronze by default
  }

  protected pinColorForElectricalState(state: 'current' | 'voltage' | 'vc' | 'idle'): number {
    switch (state) {
      case 'voltage':
        return 0xff0000; // Red
      case 'current':
        return 0x0000ff; // Blue
      case 'vc':
        return 0xcc00cc; // Magenta
      case 'idle':
      default:
        return 0x000000;
    }
  }

  /**
   * Updates the visual color of a component pin based on its source type.
   *
   * This method changes the pin's material color to reflect the source type:
   * - null/undefined: bronze (default pin color)
   * - Voltage: red
   * - Current: blue
   *
   * @param pinGroup - The THREE.Group containing the pin visual (created by createPinGroup)
   * @param sourceType - The new source type (null for no source)
   *
   * @remarks
   * - Searches for the child mesh with userData.type === 'enode'
   * - Updates both color and emissive properties for visual consistency
   * - If sourceType is null/undefined, restores default bronze pin color
   * - Color scheme matches BranchingPointVisualFactory for consistency
   */
  updatePinSourceType(pinGroup: THREE.Object3D, sourceType: ENodeSourceType | null): void {
    if (!!pinGroup.userData.lockedSourceType) return; // Pin is locked to a source type, do not change color
    pinGroup.userData.sourceType = sourceType;

    const visual = pinGroup.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (!visual || !(visual.material instanceof THREE.MeshStandardMaterial)) {
      return;
    }
    const color = this.pinColorForSourceType(sourceType);
    visual.material.color.setHex(color);
    visual.material.emissive.setHex(color);
  }

  /**
   * Apply hover visual effect on this pin
   */
  applyPinHover(pinGroup: THREE.Object3D): void {
    if (pinGroup.userData.isHovered) {
      return; // Already hovered
    }
    pinGroup.userData.isHovered = true;

    pinGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;

        if (child.userData.type === 'enodeHitbox') {
          material.opacity = 0.3;
        } else if (child.userData.type === 'enode') {
          material.color.setHex(0x00ff00);
          // Apply hover effect
          material.emissiveIntensity = 0.9;
        }
      }
    });
  }

  /**
   * remove hover visual effect on this pin
   */
  removePinHover(pinGroup: THREE.Object3D): void {
    if (!pinGroup.userData.isHovered) {
      return; // Already hovered
    }
    pinGroup.userData.isHovered = false;

    const sourceType: ENodeSourceType | null =
      pinGroup.userData.lockedSourceType || pinGroup.userData.sourceType || null;

    pinGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;

        if (child.userData.type === 'enodeHitbox') {
          material.opacity = 0;
        } else if (child.userData.type === 'enode') {
          material.color.setHex(this.pinColorForSourceType(sourceType));
          material.emissiveIntensity = sourceType ? 1 : 0;
          if (!sourceType && pinGroup.userData.electricalState) {
            const emissiveColor = this.pinColorForElectricalState(
              pinGroup.userData.electricalState
            );
            material.emissive.setHex(emissiveColor);
            material.emissiveIntensity = emissiveColor === 0x000000 ? 0 : 1;
          }
        }
      }
    });
  }

  /**
   * Update animation state based on simulation data (placeholder)
   *
   * Default implementation is a no-op for static components.
   * Override in subclasses that have animation (LED, Switch).
   */
  updateAnimation(_object3D: THREE.Object3D, _state: ComponentState): void {
    // Default: no-op for static components
    // Subclasses override for component-specific animation
  }
}

/**
 * Registry interface for managing component visual factories
 *
 * Provides type-safe registration and retrieval of component factories.
 * Falls back to a default factory for unregistered component types.
 *
 * @remarks
 * Updated to support both function-based and class-based factories.
 * Prefer using IComponentVisualFactory class instances.
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(new DefaultVisualFactory());
 * registry.register(ComponentType.Battery, new BatteryVisualFactory());
 * registry.register(ComponentType.LED, new SmallLEDVisualFactory());
 *
 * const factory = registry.get(ComponentType.Battery);
 * const mesh = factory.createVisual(batteryComponent);
 * ```
 */
export interface IFactoryRegistry {
  /**
   * Register a visual factory for a specific component type
   *
   * @param type - Component type identifier
   * @param factory - Factory (class instance or function) to create visuals for this type
   * @throws {TypeError} If factory is null or undefined
   */
  register(type: ComponentType, factory: IComponentVisualFactory): void;

  /**
   * Retrieve the factory for a component type
   *
   * @param type - Component type identifier
   * @returns Factory (fallback factory if type not registered)
   *
   * @remarks
   * This method NEVER returns null/undefined. If the type is not registered,
   * the fallback factory provided in the constructor is returned.
   */
  get(type: ComponentType): IComponentVisualFactory;

  /**
   * Check if a factory is registered for a component type
   *
   * @param type - Component type identifier
   * @returns true if explicitly registered, false if would use fallback
   */
  has(type: ComponentType): boolean;

  /**
   * Get the fallback factory used for unregistered component types
   */
  getFallbackFactory(): IComponentVisualFactory;

  /**
   * Unregister a factory for a component type
   *
   * @param type - Component type identifier
   * @returns true if factory was registered and removed, false otherwise
   *
   * @remarks
   * After unregistering, get() will return the fallback factory for this type.
   */
  unregister(type: ComponentType): boolean;

  /**
   * Get all registered component types
   *
   * @returns Array of ComponentType values that have registered factories
   */
  getRegisteredTypes(): ComponentType[];
}
