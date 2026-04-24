/**
 * Controls utilities
 * @module scene/shared/utils/ControlsUtils
 */

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import type { MapControlsOptions } from '../types';
import { mapControlsOptions } from './Options';

export function createMapControls(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  options: MapControlsOptions
): MapControls {
  const controls = new MapControls(camera, canvas);
  options = mapControlsOptions(options);

  controls.enablePan = options.enablePan!;
  controls.screenSpacePanning = options.screenSpacePanning!;
  controls.enableZoom = options.enableZoom!;
  controls.enableRotate = options.enableRotate!;
  controls.enableDamping = options.enableDamping!;
  controls.dampingFactor = options.dampingFactor!;
  controls.minDistance = options.minDistance!;
  controls.maxDistance = options.maxDistance!;
  controls.panSpeed = options.panSpeed!;
  controls.zoomSpeed = options.zoomSpeed!;
  controls.rotateSpeed = options.rotateSpeed!;

  return controls;
}
