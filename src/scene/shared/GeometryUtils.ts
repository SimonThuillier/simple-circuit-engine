/**
 * Geometry Utilities
 * @module rendering/shared/GeometryUtils
 *
 * Helper functions for creating Three.js geometries for circuit elements
 */

import * as THREE from 'three';
import { Position } from '../../core/types/Position';
import { Rotation } from '@/core/types/Rotation';
import {ExtrudeGeometry} from "three";

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
  size: number = 10,
  divisions: number = 10,
  colorCenterLine: number = 0xaaaaaa,
  colorGrid: number = 0x777777
): THREE.GridHelper {
  const helper = new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
  helper.position.set(0, 0, 0);
  // set z-index to be behind other objects
  helper.renderOrder = -1;
  return helper;
}

/**
 * optimal number of grid divisions for a given size
 * @param size
 */
export function computeDivisionsForSize(size: number): number {
  if(size <= 10) return size;
  let basis = 10;
  let threshold = 10;
  if(size <= 30){
    return basis + Math.floor((size - threshold) / 2);
  }
  basis = 20;
  threshold = 30;
  if(size <= 70){
    return basis + Math.floor((size - threshold) / 4);
  }
  basis = 30;
  threshold = 70;
  if(size <= 150){
    return basis + Math.floor((size - threshold) / 8);
  }
  basis = 40;
  threshold = 150;
  if(size <= 310){
    return basis + Math.floor((size - threshold) / 16);
  }
  basis = 50;
  threshold = 310;
  if(size <= 630){
    return basis + Math.floor((size - threshold) / 32);
  }
  basis = 60;
  threshold = 630;
  return Math.min(70, basis + Math.floor((size - threshold) / 64));
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

/**
 * Get the bounding box of a Three.js object in world space
 *
 * @param object - The Three.js object to get bounds for
 * @returns Box3 representing the world-space bounding box
 */
export function getObjectBoundingBox(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(object);
  return box;
}

/**
 * Project a 3D world position to 2D screen coordinates
 *
 * @param worldPosition - Position in world space
 * @param camera - Camera to use for projection
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 * @returns Screen coordinates {x, y} where (0,0) is top-left
 */
export function worldToScreenPosition(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): { x: number; y: number } {
  const vector = worldPosition.clone();
  vector.project(camera);

  const x = ((vector.x + 1) / 2) * width;
  const y = ((-vector.y + 1) / 2) * height;

  return { x, y };
}

/**
 * Check if a 3D point (projected to screen space) is inside a 2D screen rectangle
 *
 * @param worldPosition - Position in world space
 * @param camera - Camera to use for projection
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 * @param rect - Screen rectangle with min/max coordinates
 * @returns true if the projected point is inside the rectangle
 */
export function isPointInScreenRect(
  worldPosition: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  rect: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  const screen = worldToScreenPosition(worldPosition, camera, width, height);
  return (
    screen.x >= rect.minX && screen.x <= rect.maxX && screen.y >= rect.minY && screen.y <= rect.maxY
  );
}

/**
 * Check if an object's center point is inside a screen rectangle
 * Used for rectangle selection of components and branching points
 *
 * @param object - The Three.js object to check
 * @param camera - Camera to use for projection
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 * @param rect - Screen rectangle with min/max coordinates
 * @returns true if object's center is inside the rectangle
 */
export function isObjectInScreenRect(
  object: THREE.Object3D,
  camera: THREE.Camera,
  width: number,
  height: number,
  rect: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  const worldPosition = new THREE.Vector3();
  object.getWorldPosition(worldPosition);
  return isPointInScreenRect(worldPosition, camera, width, height, rect);
}

/**
 * Create a ring geometry with given inner/outer radius and height
 * @param innerRadius
 * @param outerRadius
 * @param height
 * @param steps
 * @constructor
 */
export function RingGeometry(
    innerRadius: number,
    outerRadius: number,
    height:number,
    steps: number): ExtrudeGeometry {
  // Create the outer ring shape
  const shape = new THREE.Shape();
  shape.moveTo(outerRadius, 0);
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  // Create the inner ring path (hole)
  const holePath = new THREE.Path();
  holePath.moveTo(innerRadius, 0);
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  // Extrude settings
  const extrudeSettings = {
    depth: height,
    bevelEnabled: false,
    steps: steps,
  };

  // Create the extruded geometry
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}
