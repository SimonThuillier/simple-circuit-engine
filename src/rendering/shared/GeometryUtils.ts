/**
 * Geometry Utilities
 * @module rendering/shared/GeometryUtils
 *
 * Helper functions for creating Three.js geometries for circuit elements
 */

import * as THREE from 'three';
import type { Position } from '../../core/types/Position';

/**
 * Create geometry for a wire connection
 *
 * @param start - Start position
 * @param end - End position
 * @returns BufferGeometry for the wire line
 */
export function createWireGeometry(start: Position, end: Position): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [
    new THREE.Vector3(start.x, 0, start.y),
    new THREE.Vector3(end.x, 0, end.y),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

/**
 * Create geometry for a wire with multiple waypoints
 *
 * @param waypoints - Array of positions defining the wire path
 * @returns BufferGeometry for the wire line
 */
export function createWirePathGeometry(waypoints: Position[]): THREE.BufferGeometry {
  const points: THREE.Vector3[] = waypoints.map(
    (pos) => new THREE.Vector3(pos.x, 0, pos.y)
  );

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

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
  colorCenterLine: number = 0x444444,
  colorGrid: number = 0x222222
): THREE.GridHelper {
  return new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
}

/**
 * Create geometry for an electrical node (enode/branching point)
 *
 * @param radius - Radius of the sphere
 * @returns SphereGeometry for the node
 */
export function createEnodeGeometry(radius: number = 0.2): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, 16, 16);
}

/**
 * Create an axes helper for debugging
 *
 * @param size - Size of the axes
 * @returns AxesHelper object
 */
export function createAxesHelper(size: number = 5): THREE.AxesHelper {
  return new THREE.AxesHelper(size);
}
