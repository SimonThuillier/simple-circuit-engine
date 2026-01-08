import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from 'simple-circuit-engine/core';
import { presetOrHexToHex, hexToPresetOrHex } from '../utils/ColorUtils';
import * as THREE from 'three';
import type {ConfigFormDefinition} from "../types";

/**
 * Default Visual factory for not yet defined components
 *
 * Creates:
 * - Box squared mesh (white)
 * - Component hitbox for raycasting
 *
 * This default visual is pinless no matter the component definition.
 */
export class DefaultVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
      isPlaceholder: true,
    };

    // Component hitbox (invisible, raycastable)
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 2, 2);
    group.add(hitbox);

    // Visual box
    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5, 4, 4, 4);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.userData = {
      type: 'component',
      componentId: component.id,
    };
    group.add(box);

    return group;
  }

  /**
   * Get config form definition (T028)
   * Returns form for Cube (color) - RectangleLED uses SmallLEDVisualFactory
   *
   * @returns Form definition with color field for Cube
   */
  override getConfigFormDefinition(): ConfigFormDefinition | null {
    // Default factory is used for Cube, which has a simple color config
    return {
      fields: [{ key: 'color', label: 'Color', type: 'color' }],
    };
  }

  /**
   * Map core config to form data (T028)
   * Converts hex/preset strings to hex values for color picker
   *
   * @param config - Core component config
   * @returns Form data with hex color string
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    const color = config.get('color') || '#ffffff';

    // Convert preset names to hex if needed
    formData.set('color', presetOrHexToHex(color));

    return formData;
  }

  /**
   * Map form data to core config (T028)
   * Converts hex colors to preset names if they match, otherwise keeps hex
   *
   * @param formData - Form data with hex color string
   * @returns Core config with hex or preset name string
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const color = formData.get('color');

    // Convert hex to preset name if it matches a preset
    if (color) {
      config.set('color', hexToPresetOrHex(color));
    }

    return config;
  }

  /**
   * Update visual from configuration (T023)
   * Updates Cube/RectangleLED color based on color config
   *
   * @param object3D - The Object3D created by createVisual()
   * @param config - Component configuration map
   *
   * @remarks
   * Updates the box mesh color if 'color' config exists
   * Supports both hex colors and color presets
   */
  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    const color = config.get('color');
    if (!color) return;

    // Find the box mesh
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.type === 'component') {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          // Convert preset to hex if needed, then parse
          const hexColor = presetOrHexToHex(color);
          const colorHex = parseInt(hexColor.replace('#', ''), 16);
          child.material.color.setHex(colorHex);
        }
      }
    });
  }
}
