/**
 * Material Utilities
 * @module rendering/shared/MaterialUtils
 *
 * Helper functions for creating and managing Three.js materials
 */

import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Create a standard material with common defaults
 *
 * @param color - Base color (hex)
 * @param options - Additional material options
 * @returns MeshStandardMaterial
 */
export function createStandardMaterial(
  color: number,
  options: {
    emissive?: number;
    emissiveIntensity?: number;
    metalness?: number;
    roughness?: number;
    transparent?: boolean;
    opacity?: number;
  } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metalness: options.metalness ?? 0.3,
    roughness: options.roughness ?? 0.7,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

/**
 * Create a material for wire lines
 *
 * @param color - Line color (hex)
 * @param linewidth - Line width (note: may not work on all platforms)
 * @returns LineBasicMaterial
 */
export function createLineMaterial(
  color: number = 0xffffff,
  linewidth: number = 1
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    linewidth,
  });
}

/**
 * Create a LineMaterial for Line2 rendering with consistent line width
 *
 * Note: Resolution must be set after creation using material.resolution.set(width, height)
 *
 * @param color - Line color (hex, default: 0xffffff/white)
 * @param linewidth - Line width in pixels (default: 2)
 * @returns LineMaterial for Line2 objects
 *
 * @example
 * ```typescript
 * const material = createLine2Material(0xffffff, 2);
 * material.resolution.set(window.innerWidth, window.innerHeight);
 * ```
 */
export function createLine2Material(color: number = 0xffffff, linewidth: number = 2): LineMaterial {
  return new LineMaterial({
    color,
    linewidth,
  });
}

/**
 * Update material state for component state changes
 *
 * @param material - Material to update
 * @param state - Component state data
 */
export function updateMaterialState(
  material: THREE.MeshStandardMaterial,
  state: {
    isActive?: boolean;
    isHighlighted?: boolean;
    customColor?: number;
    emissiveIntensity?: number;
  }
): void {
  if (state.customColor !== undefined) {
    material.color.setHex(state.customColor);
  }

  if (state.isHighlighted) {
    material.emissive.setHex(0x00ff00);
    material.emissiveIntensity = 0.3;
  } else if (state.isActive) {
    material.emissive.setHex(material.color.getHex());
    material.emissiveIntensity = state.emissiveIntensity ?? 0.5;
  } else {
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
  }
}

/**
 * Create a semi-transparent preview material
 *
 * @param baseColor - Base color
 * @param opacity - Transparency level (0-1)
 * @returns MeshStandardMaterial configured for preview
 */
export function createPreviewMaterial(
  baseColor: number,
  opacity: number = 0.5
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    transparent: true,
    opacity,
    emissive: baseColor,
    emissiveIntensity: 0.2,
  });
}

/**
 * Create an error state material (for validation feedback)
 *
 * @returns MeshStandardMaterial in error state (red tint)
 */
export function createErrorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.6,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });
}
