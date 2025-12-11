/**
 * Camera Utilities
 * @module rendering/shared/CameraUtils
 *
 * Helper functions for camera setup and management
 */

import * as THREE from 'three';
import type { SceneManagerOptions } from './types';

/**
 * Create a perspective camera with default or custom parameters
 *
 * @param options - Optional renderer configuration
 * @param aspect - Camera aspect ratio (width / height)
 * @returns Configured PerspectiveCamera
 */
export function createPerspectiveCamera(
  options: SceneManagerOptions = {},
  aspect: number = 1
): THREE.PerspectiveCamera {
  const fov = options.cameraFov ?? 75;
  const near = options.cameraNear ?? 0.1;
  const far = options.cameraFar ?? 1000;

  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  // Default camera position for circuit viewing
  camera.position.set(0, 15, 0);
  camera.lookAt(0, 0, 0);

  return camera;
}

/**
 * Setup camera position and target from circuit metadata
 *
 * @param camera - Camera to configure
 * @param circuitSize - Size of the circuit bounding box
 * @param circuitCenter - Center position of the circuit
 */
export function setupCameraFromMetadata(
  camera: THREE.PerspectiveCamera,
  circuitSize: { width: number; height: number },
  circuitCenter: THREE.Vector3
): void {
  // Calculate distance to fit circuit in view
  const maxDim = Math.max(circuitSize.width, circuitSize.height);
  const fov = camera.fov * (Math.PI / 180);
  const distance = maxDim / (2 * Math.tan(fov / 2));

  // Position camera above and away from circuit
  camera.position.set(circuitCenter.x, circuitCenter.y, circuitCenter.z + distance * 1.2);
  camera.lookAt(circuitCenter);
  camera.updateProjectionMatrix();
}
