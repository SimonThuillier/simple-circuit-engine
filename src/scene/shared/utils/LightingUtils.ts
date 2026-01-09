/**
 * Lighting Utilities
 * @module scene/shared/utils/LightingUtils
 *
 * Helper functions for setting up scene lighting
 */

import * as THREE from 'three';

/**
 * Create an ambient light with default intensity
 *
 * @param color - Light color (hex)
 * @param intensity - Light intensity (0-1)
 * @returns AmbientLight
 */
export function createAmbientLight(
  color: number = 0xffffff,
  intensity: number = 0.6
): THREE.AmbientLight {
  return new THREE.AmbientLight(color, intensity);
}

/**
 * Create a directional light with default positioning
 *
 * @param color - Light color (hex)
 * @param intensity - Light intensity
 * @param position - Light position
 * @returns DirectionalLight
 */
export function createDirectionalLight(
  color: number = 0xffffff,
  intensity: number = 0.8,
  position: THREE.Vector3 = new THREE.Vector3(10, 20, 10)
): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.copy(position);
  return light;
}

/**
 * Setup standard scene lighting (ambient + directional)
 *
 * @param scene - Scene to add lights to
 * @returns Array of created lights
 */
export function setupSceneLights(scene: THREE.Scene): THREE.Light[] {
  const lights: THREE.Light[] = [];

  // Ambient light for base illumination
  const ambient = createAmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  lights.push(ambient);

  // Main directional light from above
  const main = createDirectionalLight(0xffffff, 0.8, new THREE.Vector3(10, 20, 10));
  scene.add(main);
  lights.push(main);

  // Fill light from opposite side
  const fill = createDirectionalLight(0xffffff, 0.3, new THREE.Vector3(-10, 15, -10));
  scene.add(fill);
  lights.push(fill);

  return lights;
}
