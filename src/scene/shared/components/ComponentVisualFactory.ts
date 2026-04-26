/**
 * Component Visual Factory System
 * @module scene/shared/ComponentVisualFactory
 *
 * Provides factory pattern for creating Three.js visuals from Circuit components.
 * Supports dynamic registration and fallback for unknown component types.
 */

import {
  type Component,
  type ComponentType,
  type ComponentState,
  ENode,
} from 'simple-circuit-engine/core';
import { ENodeSourceType } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import { HitboxLayers } from '../utils/LayerConstants';

import type { AnimationContext, ConfigFormDefinition, VisualContext } from '../types';
import type { Direction2D } from '../utils/GeometryUtils';
import { MeshLambertMaterial } from 'three';
import { CMP_MATERIALS, CmpMatCategory, CmpMatType, CmpMatVariant } from './types';

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
 *   createVisual(component: Component, context?: VisualContext): THREE.Object3D {
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
   * @returns nominal rotation along the Y axis when component added (angle in radian)
   */
  defaultRotation(): number;

  /**
   * Create the Three.js visual representation for a component
   *
   * @param component - The circuit component to visualize
   * @param context - Optional visual context providing access to ENode data
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
  createVisual(component: Component, context: VisualContext): THREE.Object3D;

  /**
   * Update visual based on component configuration
   *
   * @param object3D - The Object3D created by createVisual()
   * @param config - The core component configuration Map
   *
   */
  updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void;

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
   * @param state - The component's current simulation state or null to reset to edition mode
   *
   * @remarks
   * - Called by CircuitRunnerController during simulation
   * - Animation visual updates have priority over hover effects
   * - Default implementation: no-op (static components)
   * - Subclasses override for component-specific animation
   *   (e.g., LED glow, switch contactor rotation)
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void;

  /**
   * Get the config form definition for this component type
   *
   * @param config - Optional current component config to compute field states (e.g., disabled)
   * @returns Form definition with field specifications, or null if no config
   *
   * @remarks
   * Defines the UI controls for editing component configuration.
   * Return null for components with no configurable options.
   * When config is provided, implementations may use it to set field.disabled
   * based on interdependencies (e.g., transitionSpan disabled when defaultLogicFamily != Sandbox).
   */
  getConfigFormDefinition(config?: Map<string, string>): ConfigFormDefinition | null;

  /**
   * Map core component config (string values) to form data (typed values)
   *
   * @param config - Core config from Component.config
   * @returns Form data with appropriate types for UI controls
   *
   * @remarks
   * Called when config panel opens to initialize form controls.
   * Converts core string values to UI-appropriate types (e.g., "open" → true).
   */
  mapCoreConfigToForm(config: Map<string, string>): Map<string, any>;

  /**
   * Map form data (typed values) back to core config (string values)
   *
   * @param formData - Current form values from UI
   * @returns Core config ready for Component.setAllParameters()
   *
   * @remarks
   * Called on each value change to update Component.config.
   * Converts UI values back to core string format (e.g., true → "open").
   */
  mapFormToCoreConfig(formData: Map<string, any>): Map<string, string>;

  /**
   * Set the shared animation context for simulation-aware factories.
   * Called by the registry fan-out when entering/leaving simulation.
   *
   * @param ctx - Animation context, or null when leaving simulation
   */
  setAnimationContext(ctx: AnimationContext | null): void;
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
 *   createVisual(component: Component, context?: VisualContext): THREE.Object3D {
 *     const group = new THREE.Group();
 *     // ... create battery-specific visual
 *     return group;
 *   }
 *   // Inherits default hover, selection, and animation
 * }
 * ```
 */
export abstract class ComponentVisualFactoryBase implements IComponentVisualFactory {
  /** Shared animation context injected by the registry during simulation */
  protected _animationContext: AnimationContext | null = null;

  /** ComponentType handled by this factory, set in each subclass constructor */
  protected _componentType: ComponentType | null = null;

  /** Default hover glow color (light blue) */
  protected static readonly DEFAULT_HOVER_COLOR = 0x4488ff;

  /** Default hover emissive intensity */
  protected static readonly DEFAULT_HOVER_INTENSITY = 0.6;

  protected getMat(
    category: CmpMatCategory,
    variant: CmpMatVariant = CmpMatVariant.NORMAL
  ): MeshLambertMaterial {
    const matCat = CMP_MATERIALS[category];
    if (!matCat) {
      return CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.NORMAL];
    }
    return matCat[variant] || CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.NORMAL];
  }

  defaultRotation() {
    return 0;
  }

  /**
   * Create the Three.js visual representation for a component
   * Must be implemented by subclasses
   */
  abstract createVisual(component: Component, context: VisualContext): THREE.Object3D;

  /**
   * By default no visual configuration-based updates is needed
   */
  updateFromConfiguration(_object3D: THREE.Object3D, _config: Map<string, string>) {
    // Default: no-op
  }

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

      const material = child.material;
      if (material.visible === false || material.userData?.matType !== CmpMatType.SHARED) return;

      const matCategory = CMP_MATERIALS[material.userData.matCat as CmpMatCategory];
      if (!matCategory) return;
      child.material = matCategory[CmpMatVariant.HOVERED];
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

      const material = child.material;
      if (material.visible === false || material.userData?.matType !== CmpMatType.SHARED) return;

      const matCategory = CMP_MATERIALS[material.userData.matCat as CmpMatCategory];
      if (!matCategory) return;
      child.material = matCategory[CmpMatVariant.NORMAL];
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
      if (material.visible === false || material.userData?.matType !== CmpMatType.SHARED) return;

      const matCategory = CMP_MATERIALS[material.userData.matCat as CmpMatCategory];
      if (!matCategory) return;
      child.material = matCategory[CmpMatVariant.SELECTED];
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
      if (material.visible === false || material.userData?.matType !== CmpMatType.SHARED) return;

      const matCategory = CMP_MATERIALS[material.userData.matCat as CmpMatCategory];
      if (!matCategory) return;
      child.material = matCategory[CmpMatVariant.NORMAL];
    });
    object3D.userData.isSelected = false;
  }

  /**
   * @private
   */
  private pointPinGroupToward(group: THREE.Group, direction: Direction2D) {
    switch (direction) {
      case 'right':
        group.rotateZ(-Math.PI / 2);
        group.rotateY(Math.PI);
        break;
      case 'bottom':
        group.rotateX(Math.PI / 2);
        break;
      case 'left':
        group.rotateZ(Math.PI / 2);
        group.rotateY(Math.PI);
        break;
      case 'top':
        group.rotateX(-Math.PI / 2);
        break;
    }
  }

  /**
   * Create a pin group with hitbox and visual sphere
   *
   * Creates a THREE.Group containing:
   * - Hemisphere hitbox (on ENODE layer for raycasting)
   * - Hemisphere visual (blue sphere)
   * - Hover callback in userData
   *
   * @param node - ENode to create as visual pin
   * @param pointsTo - rotate pin to make it point the wanted direction
   * @param visualRotation - if set rotate the visual of the pin to adjust display without affecting hitbox
   * @returns THREE.Group configured as pin group
   */
  protected createPinGroup(
    node: ENode,
    pointsTo: Direction2D = 'right',
    visualRotation: THREE.Euler | null = null
  ): THREE.Group {
    if (!node.component) {
      throw new Error('This method only manage components eNodes (pins)');
    }

    // pins with this subtype will be considered locked (not possible to change their source type)
    const lockedSubtypes = ['mainVcc', 'vcc', 'mainGnd', 'gnd', 'logicOutput'];
    // pins with this subtype will be represented smaller (not intended to be wired on anything so they're just a reminder for the user)
    const smallSubtypes = ['vcc', 'gnd'];

    const userInfos = {
      componentId: node.component,
      enodeId: node.id,
      pointsTo: pointsTo,
      label: node.pinLabel,
      subtype: node.subtype,
      lockedSourceType: lockedSubtypes.includes(node.subtype),
      logicMetadata: node.logicMetadata,
    };

    const pinGroup = new THREE.Group();
    pinGroup.userData = { ...userInfos, type: 'enodeGroup', sourceType: node.source || null };
    // default radius
    let hitboxRadius = 0.9;
    let visualRadius = 0.3;
    // since those pins won't be used for wiring they can be smaller
    if (smallSubtypes.includes(node.subtype)) {
      hitboxRadius = 0.25;
      visualRadius = 0.2;
    }

    // Hitbox (hemisphere, raycastable)
    const hitboxGeom = new THREE.SphereGeometry(
      hitboxRadius,
      16,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const hitbox = new THREE.Mesh(
      hitboxGeom,
      new THREE.MeshBasicMaterial({
        color: ComponentVisualFactoryBase.DEFAULT_HOVER_COLOR,
        transparent: true,
        opacity: 0,
      })
    );
    hitbox.userData = { ...userInfos, type: 'enodeHitbox', componentType: this._componentType };
    hitbox.layers.set(HitboxLayers.ENODE);
    pinGroup.add(hitbox);

    // Visual sphere
    const visual = new THREE.Mesh(
      new THREE.SphereGeometry(visualRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({
        color: this.pinColorForSourceType(node.source || null),
        emissive: this.pinColorForSourceType(node.source || null),
        emissiveIntensity: 0,
      })
    );
    visual.userData = {
      ...userInfos,
      type: 'enode',
      sourceType: node.source || null,
      radius: visualRadius,
    };
    pinGroup.add(visual);
    if (!!visualRotation) {
      visual.setRotationFromEuler(visualRotation);
    }

    this.pointPinGroupToward(pinGroup, pointsTo);
    return pinGroup;
  }

  /**
   * Utility to create semi spheres visually closing pins
   * @param pinGroup
   * @param material
   * @protected
   */
  protected createPinCounterpart(
    pinGroup: THREE.Group,
    material: THREE.MeshLambertMaterial
  ): THREE.Mesh | null {
    const pinVisual = this.findPinVisualFromGroup(pinGroup);
    if (!pinVisual) {
      return null;
    }

    const visual = new THREE.Mesh(
      new THREE.SphereGeometry(pinVisual.userData.radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      material
    );
    visual.userData = {
      type: 'component',
      componentId: pinVisual.userData.componentId,
      part: 'pinCounterpart',
    };
    visual.position.copy(pinGroup.position);

    const pinVisualRotation = pinVisual.rotation.clone();

    visual.rotation.copy(
      new THREE.Euler(
        -pinGroup.rotation.x,
        -pinGroup.rotation.y,
        -pinGroup.rotation.z,
        pinGroup.rotation.order
      )
    );
    visual.rotateX(-pinVisualRotation.x);
    visual.rotateY(-pinVisualRotation.y);
    visual.rotateZ(pinVisualRotation.z);

    return visual;
  }

  /**
   * Find pin group by label within a component Object3D
   * @param object3D
   * @param label
   */
  findPinGroup(object3D: THREE.Object3D, label: string): THREE.Group | null {
    let pinGroup: THREE.Group | null = null;
    object3D.traverse((child) => {
      if (
        child.userData.type === 'enodeGroup' &&
        child.userData.label === label &&
        child instanceof THREE.Group
      ) {
        pinGroup = child;
      }
    });
    return pinGroup;
  }

  /**
   * fin pin inner visual from within its pin group
   * @param pinGroup
   */
  findPinVisualFromGroup(pinGroup: THREE.Group): THREE.Mesh | null {
    let pinVisual: THREE.Mesh | null;
    pinGroup.traverse((child) => {
      if (child.userData.type === 'enode' && child instanceof THREE.Mesh) {
        pinVisual = child;
      }
    });
    // @ts-ignore
    return pinVisual;
  }

  /**
   * Find pin group visual by label within a component Object3D
   * @param object3D
   * @param label
   */
  findPinVisual(object3D: THREE.Object3D, label: string): THREE.Mesh | null {
    let pinGroup: THREE.Group | null = this.findPinGroup(object3D, label);
    if (!pinGroup) {
      return null;
    }
    return this.findPinVisualFromGroup(pinGroup);
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

  protected findHitbox(object3D: THREE.Object3D): THREE.Mesh | null {
    let hitbox: THREE.Mesh | null = null;
    object3D.traverse((child) => {
      if (child.userData.type === 'componentHitbox' && child instanceof THREE.Mesh) {
        hitbox = child;
      }
    });
    return hitbox;
  }

  protected pinColorForSourceType(sourceType: ENodeSourceType | null): number {
    if (!sourceType) {
      return 0xd4894c; // Copper for no source
    }
    if (sourceType === ENodeSourceType.Voltage) {
      return 0xff0000; // Red for voltage
    } else if (sourceType === ENodeSourceType.Current) {
      return 0x0000ff; // Blue for current
    }
    return 0xd4894c; // Copper by default
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
   * Updates the visual color of a component pin based on its sourceType type.
   *
   * This method changes the pin's material color to reflect the sourceType type:
   * - null/undefined: copper (default pin color)
   * - Voltage: red
   * - Current: blue
   *
   * @param pinGroup - The THREE.Group containing the pin visual (created by createPinGroup)
   * @param sourceType - The new sourceType (null for no sourceType)
   *
   * @remarks
   * - Searches for the child mesh with userData.type === 'enode'
   * - Updates both color and emissive properties for visual consistency
   * - If sourceType is null/undefined, restores default copper pin color
   * - Color scheme matches BranchingPointVisualFactory for consistency
   */
  updatePinSourceType(pinGroup: THREE.Object3D, sourceType: ENodeSourceType | null): void {
    if (!!pinGroup.userData.lockedSourceType) return; // Pin is locked to a sourceType type, do not change color
    pinGroup.userData.sourceType = sourceType;

    const visual = pinGroup.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (!visual) {
      return;
    }
    visual.userData.sourceType = sourceType;
    const color = this.pinColorForSourceType(sourceType);
    const material = visual.material as THREE.MeshLambertMaterial;
    material.color.setHex(color);
    material.emissive.setHex(color);
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
        const material = child.material as THREE.MeshLambertMaterial;

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

    const source: ENodeSourceType | null = pinGroup.userData.sourceType || null;

    pinGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshLambertMaterial;

        if (child.userData.type === 'enodeHitbox') {
          material.opacity = 0;
        } else if (child.userData.type === 'enode') {
          material.color.setHex(this.pinColorForSourceType(source));
          material.emissiveIntensity = source ? 1 : 0;
          if (!source && pinGroup.userData.electricalState) {
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
  updateAnimation(_object3D: THREE.Object3D, _state: ComponentState | null): void {
    // Default: no-op for static components
    // Subclasses override for component-specific animation
  }

  /**
   * Get config form definition (default: null - no config)
   *
   * Override in subclasses that have configurable options.
   */
  getConfigFormDefinition(_config?: Map<string, string>): ConfigFormDefinition | null {
    return null;
  }

  /**
   * Map core config to form data (default: identity mapping)
   *
   * Override in subclasses that need type conversions.
   */
  mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    return new Map(config);
  }

  /**
   * Map form data to core config (default: convert all to strings)
   *
   * Override in subclasses that need type conversions.
   */
  mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    for (const [key, value] of formData.entries()) {
      config.set(key, String(value));
    }
    return config;
  }

  /**
   * Set the shared animation context for simulation-aware factories.
   */
  setAnimationContext(ctx: AnimationContext | null): void {
    this._animationContext = ctx;
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

  /**
   * Fan out animation context to all registered factories and the fallback.
   *
   * @param ctx - Animation context, or null when leaving simulation
   */
  setAnimationContext(ctx: AnimationContext | null): void;
}
