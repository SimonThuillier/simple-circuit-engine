/**
 * Component Visual Factory Base Class Contract
 * @module scene/shared/ComponentVisualFactory
 *
 * This file defines the abstract base class that provides
 * default implementations for visual factories.
 *
 * Feature: 005-visual-factory-classes
 * Date: 2025-12-09
 */

import type { Component } from '../../../src/core/Component';
import type { ComponentState } from '../../../src/core/simulation/states/ComponentState';
import type { IComponentVisualFactory, ComponentVisualUserData } from './IComponentVisualFactory';
import * as THREE from 'three';
import { HitboxLayers } from '../../../src/scene/shared/LayerConstants';

/**
 * Abstract base class for component visual factories
 *
 * Provides default implementations for:
 * - Hover effect (emissive glow)
 * - Selection effect (placeholder/no-op)
 * - Animation update (placeholder/no-op)
 * - Pin group creation (shared helper)
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
 *
 * export class SmallLEDVisualFactory extends ComponentVisualFactoryBase {
 *   createVisual(component: Component): THREE.Object3D {
 *     // ... create LED visual
 *   }
 *
 *   updateAnimation(object3D: THREE.Object3D, state: SmallLEDState): void {
 *     // Custom animation: LED glow when lit
 *   }
 * }
 * ```
 */
export abstract class ComponentVisualFactoryBase implements IComponentVisualFactory {
  // ============================================
  // Static Configuration
  // ============================================

  /** Default hover glow color (light blue) */
  protected static readonly DEFAULT_HOVER_COLOR = 0x4488ff;

  /** Default hover emissive intensity */
  protected static readonly DEFAULT_HOVER_INTENSITY = 0.5;

  // ============================================
  // Abstract Methods (must implement)
  // ============================================

  /**
   * Create the Three.js visual representation for a component
   *
   * @param component - The circuit component to visualize
   * @returns THREE.Object3D (typically a Group) containing the visual
   *
   * @remarks
   * Implementations MUST:
   * - Create a THREE.Group as the root
   * - Set root.userData.type = 'componentGroup'
   * - Set root.userData.componentId = component.id
   * - Set root.userData.componentType = component.type
   * - Add component hitbox on HitboxLayers.COMPONENT layer
   * - Add pin groups using createPinGroup() helper
   */
  abstract createVisual(component: Component): THREE.Object3D;

  // ============================================
  // Default Implementations
  // ============================================

  /**
   * Apply hover visual effect using emissive glow
   *
   * Default implementation traverses all meshes and applies
   * an emissive blue glow effect, storing original values in userData.
   *
   * @param object3D - The Object3D created by createVisual()
   */
  applyHover(object3D: THREE.Object3D): void {
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          // Skip hitboxes (invisible materials)
          if (material.visible === false || material.opacity < 0.5) {
            return;
          }

          // Store original values if not already stored
          const userData = child.userData as ComponentVisualUserData;
          if (!userData.isHovered) {
            userData.originalEmissive = material.emissive.clone();
            userData.originalEmissiveIntensity = material.emissiveIntensity;
            userData.isHovered = true;

            // Apply hover effect
            material.emissive.setHex(ComponentVisualFactoryBase.DEFAULT_HOVER_COLOR);
            material.emissiveIntensity = ComponentVisualFactoryBase.DEFAULT_HOVER_INTENSITY;
          }
        }
      }
    });
  }

  /**
   * Remove hover visual effect, restoring original materials
   *
   * @param object3D - The Object3D created by createVisual()
   */
  removeHover(object3D: THREE.Object3D): void {
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const userData = child.userData as ComponentVisualUserData;
        if (userData.isHovered) {
          const material = child.material;
          if (material instanceof THREE.MeshStandardMaterial) {
            // Restore original values
            if (userData.originalEmissive) {
              material.emissive.copy(userData.originalEmissive);
            }
            material.emissiveIntensity = userData.originalEmissiveIntensity ?? 0;
          }
          userData.isHovered = false;
        }
      }
    });
  }

  /**
   * Apply selection visual effect (placeholder)
   *
   * Default implementation is a no-op per FR-006.
   * Override in subclasses when selection feature is implemented.
   *
   * @param object3D - The Object3D created by createVisual()
   */
  applySelection(object3D: THREE.Object3D): void {
    // Placeholder - no-op per FR-006
    // Future implementation will add selection visual effect
  }

  /**
   * Remove selection visual effect (placeholder)
   *
   * Default implementation is a no-op per FR-007.
   * Override in subclasses when selection feature is implemented.
   *
   * @param object3D - The Object3D created by createVisual()
   */
  removeSelection(object3D: THREE.Object3D): void {
    // Placeholder - no-op per FR-007
    // Future implementation will remove selection visual effect
  }

  /**
   * Update animation state based on simulation data (placeholder)
   *
   * Default implementation is a no-op for static components.
   * Override in subclasses that have animation (LED, Switch).
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - The component's current simulation state
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState): void {
    // Default: no-op for static components
    // Subclasses override for component-specific animation
  }

  // ============================================
  // Protected Helper Methods
  // ============================================

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
   * @returns THREE.Group configured as pin group
   *
   * @example
   * ```typescript
   * const cathodeGroup = this.createPinGroup(component.id, component.pins[0], 'cathode');
   * cathodeGroup.position.set(0, 0, -1);
   * group.add(cathodeGroup);
   * ```
   */
  protected createPinGroup(componentId: string, pinId: string, label: string): THREE.Group {
    const pinGroup = new THREE.Group();
    pinGroup.userData = {
      type: 'enodeGroup',
      componentId: componentId,
      enodeId: pinId,
      label: label,
    };

    // Hitbox (hemisphere, raycastable)
    const hitboxGeom = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hitbox = new THREE.Mesh(
      hitboxGeom,
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5,
        visible: true,
      })
    );
    hitbox.userData = {
      type: 'enodeHitbox',
      componentId: componentId,
      enodeId: pinId,
      label: label,
      groupId: pinGroup.id,
    };
    hitbox.layers.set(HitboxLayers.ENODE);
    pinGroup.add(hitbox);

    // Visual sphere
    const visual = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0000ff })
    );
    visual.userData = {
      type: 'enode',
      componentId: componentId,
      enodeId: pinId,
      label: label,
    };
    pinGroup.add(visual);

    // Hover callback for enode (pin-specific hover)
    hitbox.userData.hoverCallback = (isHovering: boolean) => {
      if (isHovering) {
        (visual.material as THREE.MeshStandardMaterial).color.setHex(0x00ff00);
      } else {
        (visual.material as THREE.MeshStandardMaterial).color.setHex(0x0000ff);
      }
    };

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
      visible: true,
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
}
