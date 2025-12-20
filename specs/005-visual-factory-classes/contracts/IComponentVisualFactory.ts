/**
 * Component Visual Factory Interface Contract
 * @module scene/shared/ComponentVisualFactory
 *
 * This file defines the contract for class-based component visual factories.
 * It replaces the function-based ComponentVisualFactory type.
 *
 * Feature: 005-visual-factory-classes
 * Date: 2025-12-09
 */

import type { Component } from '../../../src/core/Component';
import type { ComponentState } from '../../../src/core/simulation/states/ComponentState';
import type * as THREE from 'three';

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
 * class MyComponentFactory implements IComponentVisualFactory {
 *   createVisual(component: Component): THREE.Object3D {
 *     const group = new THREE.Group();
 *     // ... create visual elements
 *     group.userData.componentId = component.id;
 *     group.userData.componentType = component.type;
 *     return group;
 *   }
 *
 *   applyHover(object3D: THREE.Object3D): void {
 *     // Apply hover effect
 *   }
 *
 *   removeHover(object3D: THREE.Object3D): void {
 *     // Remove hover effect
 *   }
 *
 *   applySelection(object3D: THREE.Object3D): void {
 *     // Apply selection effect (placeholder)
 *   }
 *
 *   removeSelection(object3D: THREE.Object3D): void {
 *     // Remove selection effect (placeholder)
 *   }
 *
 *   updateAnimation(object3D: THREE.Object3D, state: ComponentState): void {
 *     // Update animation based on simulation state
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
   * - Per FR-006: "dummy non-implemented method"
   */
  applySelection(object3D: THREE.Object3D): void;

  /**
   * Remove selection visual effect from a component's Object3D
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * - Currently a placeholder (no-op) for future implementation
   * - Per FR-007
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
   * - Default implementation: no-op (static components)
   * - Subclasses override for component-specific animation
   *   (e.g., LED glow, switch contactor rotation)
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState): void;
}

/**
 * Extended userData structure for component visual objects
 *
 * Stores both identification and visual state information.
 */
export interface ComponentVisualUserData {
  /** Object type discriminator */
  type: 'componentGroup' | 'component' | 'componentHitbox';

  /** UUID of the circuit component */
  componentId: string;

  /** Component type (e.g., 'Battery', 'Switch', 'SmallLED') */
  componentType?: string;

  /** Group ID for cross-referencing */
  groupId?: number;

  /** Part identifier for sub-components (e.g., 'led', 'contactor') */
  part?: string;

  /** Whether component is currently hovered */
  isHovered?: boolean;

  /** Whether component is currently selected */
  isSelected?: boolean;

  /** Whether animation is active (simulation running) */
  isAnimating?: boolean;

  /** Original emissive color before hover/animation */
  originalEmissive?: THREE.Color;

  /** Original emissive intensity before hover/animation */
  originalEmissiveIntensity?: number;

  /** Placeholder indicator for default factory */
  isPlaceholder?: boolean;
}
