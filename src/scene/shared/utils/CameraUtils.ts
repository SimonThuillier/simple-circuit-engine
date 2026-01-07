/**
 * Camera Utilities
 * @module scene/shared/utils/CameraUtils
 *
 * Helper functions for camera setup and management
 */

import * as THREE from 'three';
import { CameraOptions } from '@/core/types/CameraOptions';

/**
 * Create a perspective camera with default or custom parameters
 *
 * @param options -
 * @param aspect - Camera aspect ratio (width / height)
 * @returns Configured PerspectiveCamera
 */
export function createPerspectiveCamera(
  aspect: number = 1,
  options: CameraOptions = new CameraOptions()
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(options.fov, aspect, options.near, options.far);
  // Default camera position for circuit viewing
  const camPos = options.position;
  camera.position.set(camPos.x, camPos.y, camPos.z);
  const camTarget = options.lookAtPosition;
  camera.lookAt(camTarget.x, camTarget.y, camTarget.z);
  return camera;
}

/**
 * update camera position and target from options
 *
 * @param camera - Camera to configure
 * @param options
 */
export function updateCamera(camera: THREE.PerspectiveCamera, options: CameraOptions): void {
  camera.fov = options.fov;
  camera.near = options.near;
  camera.far = options.far;

  const camPos = options.position;
  camera.position.set(camPos.x, camPos.y, camPos.z);
  // NB : if controls are used, they may override the lookAt
  // then you need to update their controls separately
  const camTarget = options.lookAtPosition;
  camera.lookAt(camTarget.x, camTarget.y, camTarget.z);
  camera.updateProjectionMatrix();
}
