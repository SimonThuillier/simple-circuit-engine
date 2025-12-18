/**
 * Geometry Utilities
 * @module rendering/shared/GeometryUtils
 *
 * Helper functions for creating Three.js geometries for circuit elements
 */

import * as THREE from 'three';
import { Position } from '../../core/types/Position';
import {Rotation} from "@/core/types/Rotation";


/**
 * Create a grid helper for the scene
 *
 * @param size - Size of the grid
 * @param divisions - Number of grid divisions
 * @param colorCenterLine - Color for center lines
 * @param colorGrid - Color for grid lines
 * @returns GridHelper object
 */
export function createGridHelper(
  size: number = 50,
  divisions: number = 50,
  colorCenterLine: number = 0xaaaaaa,
  colorGrid: number = 0x777777
): THREE.GridHelper {
  const helper = new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
  helper.position.set(0, 0, 0);
  return helper;
}

/**
 * Components, branching points and wires intermediate points snap to the nearest integer grid point.
 * @param position
 * @constructor
 */
export function nearestWorldSnapPosition(position: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(Math.round(position.x), 0, Math.round(position.z));
}

/**
 * Converts a world 3D position to the snapped 2D model grid position.
 * @param position
 * @constructor
 */
export function worldToGridPosition(position: THREE.Vector3): Position {
  return new Position(Math.round(position.x), Math.round(-position.z));
}

/**
 * Converts a model grid 2D position to the world 3D position.
 * @param position
 * @constructor
 */
export function gridToWorldPosition(position: Position): THREE.Vector3 {
  return new THREE.Vector3(position.x, 0, -position.y);
}

/**
 * Converts a world 3D rotation to the model grid 2D rotation.
 * @param rotation
 * @constructor
 */
export function worldToGridRotation(rotation: THREE.Euler): Rotation {
  return new Rotation(Math.round(THREE.MathUtils.radToDeg(-rotation.y)));
}

/**
 * Converts model grid 2D rotation to the world 3D rotation.
 * @param rotation
 * @constructor
 */
export function gridToWorldRotation(rotation: Rotation): THREE.Euler {
  return new THREE.Euler(0, THREE.MathUtils.degToRad(-rotation.angle), 0);
}

