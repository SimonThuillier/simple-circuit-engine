/**
 * ComponentVisualFactory Contract Extension
 *
 * Documents the selection-related methods implemented in ComponentVisualFactoryBase.
 * Updated 2025-12-11 to match actual implementation.
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
 * Component visual factory interface with selection methods
 *
 * Selection and hover are mutually exclusive visually:
 * - If selected, show selection visual (orange) - hover visual is skipped
 * - If hovered but not selected, show hover visual (blue)
 * - If both selected and hovered, show selection visual (orange)
 *
 * Implementation Note: The current implementation uses a simplified approach
 * where emissive intensity is reset to 0 on remove (instead of tracking
 * original values). This works because components have 0 emissive by default.
 */
export interface IComponentVisualFactory {
  /**
   * Apply selection visual effect to a component
   *
   * Implementation:
   * - Traverses all meshes with MeshStandardMaterial
   * - Skips invisible materials (hitboxes)
   * - Sets emissive color to orange (#ff8800)
   * - Sets emissive intensity to 0.8
   * - Sets userData.isSelected = true on root object
   *
   * @param object3D - The component's root Three.js object
   */
  applySelection(object3D: THREE.Object3D): void;

  /**
   * Remove selection visual effect from a component
   *
   * Implementation:
   * - Traverses all meshes with MeshStandardMaterial
   * - Resets emissive intensity to 0
   * - Sets userData.isSelected = false on root object
   *
   * Note: Does not restore original emissive values (assumes default is 0)
   *
   * @param object3D - The component's root Three.js object
   */
  removeSelection(object3D: THREE.Object3D): void;
}

/**
 * userData structure for visual state tracking
 *
 * Stored on the component's root THREE.Group object.
 */
export interface ComponentVisualUserData {
  /** Component ID */
  componentId: string;

  /** Component type - enables factory lookup by type */
  componentType: string;

  /** Whether selection visual is currently applied (on root group) */
  isSelected?: boolean;
}
