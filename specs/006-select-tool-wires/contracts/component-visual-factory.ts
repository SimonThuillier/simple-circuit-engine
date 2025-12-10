/**
 * ComponentVisualFactory Contract Extension
 *
 * Documents the selection-related methods that need to be
 * implemented in ComponentVisualFactoryBase.
 *
 * These methods already exist as placeholders; this contract
 * defines their required behavior.
 */

import type * as THREE from 'three';

/**
 * Selection visual configuration
 */
export interface SelectionVisualConfig {
  /** Emissive color for selection highlight */
  color: THREE.ColorRepresentation;

  /** Emissive intensity (0-1) */
  intensity: number;
}

/**
 * Default selection visual: orange glow
 */
export const DEFAULT_SELECTION_CONFIG: SelectionVisualConfig = {
  color: 0xff8800, // Orange
  intensity: 0.8,
};

/**
 * Default hover visual (for reference): blue glow
 */
export const DEFAULT_HOVER_CONFIG: SelectionVisualConfig = {
  color: 0x4488ff, // Blue
  intensity: 0.6,
};

/**
 * existing component visual factory interface with implemented selection methods
 *
 * Selection and hover are mutually exclusive visually:
 * - If selected, show selection visual (orange)
 * - If hovered but not selected, show hover visual (blue)
 * - If both selected and hovered, show selection visual (orange)
 */
export interface IComponentVisualFactory {
  /**
   * Apply selection visual effect to a component
   *
   * Implementation requirements:
   * - Store original material state in userData (if not already stored)
   * - Set emissive color to selection color (orange #ff8800)
   * - Set emissive intensity to 0.8
   * - Mark component as selected in userData.isSelected
   * - Idempotent: safe to call multiple times
   *
   * @param object3D - The component's root Three.js object
   */
  applySelection(object3D: THREE.Object3D): void;

  /**
   * Remove selection visual effect from a component
   *
   * Implementation requirements:
   * - If component was hovered before selection, restore hover visual
   * - Otherwise, restore original material state
   * - Clear userData.isSelected flag
   * - Safe to call even if not selected
   *
   * @param object3D - The component's root Three.js object
   */
  removeSelection(object3D: THREE.Object3D): void;

  /**
   * Check if a component is currently selected
   *
   * @param object3D - The component's root Three.js object
   * @returns true if the component has selection visual applied
   */
  isSelected?(object3D: THREE.Object3D): boolean;
}

/**
 * userData structure for visual state tracking
 *
 * This extends the existing userData pattern used by hover.
 */
export interface ComponentVisualUserData {
  /** Component ID */
  componentId: string;

  /** Component type */
  componentType: string;

  /** Whether hover visual is currently applied */
  isHovered?: boolean;

  /** Whether selection visual is currently applied */
  isSelected?: boolean;

  /** Original emissive color before hover/selection */
  originalEmissive?: THREE.Color;

  /** Original emissive intensity before hover/selection */
  originalEmissiveIntensity?: number;

  /** Factory reference for applying/removing effects */
  factory?: IComponentVisualFactory;
}
