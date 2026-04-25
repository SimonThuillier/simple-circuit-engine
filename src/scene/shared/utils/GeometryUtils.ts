/**
 * Geometry Utilities
 * @module scene/shared/utils/GeometryUtils
 *
 * Helper functions for creating Three.js geometries for grid and circuit elements
 */

import * as THREE from 'three';
import { Position, Rotation } from 'simple-circuit-engine/core';
import { ExtrudeGeometry } from 'three';

/**
 * convenience to control standard rotations of meshes on X-Z plan
 */
export type Direction2D = 'right' | 'bottom' | 'left' | 'top';

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
  size: number,
  divisions: number,
  colorCenterLine: number,
  colorGrid: number
): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid);
  grid.position.set(0, 0, 0);
  // set z-index to be behind other objects
  grid.renderOrder = -1;
  return grid;
}

/**
 * optimal number of grid divisions for a given size
 * @param size
 */
export function computeDivisionsForSize(size: number): number {
  if (size <= 10) return size;
  let basis = 10;
  let threshold = 10;
  if (size <= 30) {
    return basis + Math.floor((size - threshold) / 2);
  }
  basis = 20;
  threshold = 30;
  if (size <= 70) {
    return basis + Math.floor((size - threshold) / 4);
  }
  basis = 30;
  threshold = 70;
  if (size <= 150) {
    return basis + Math.floor((size - threshold) / 8);
  }
  basis = 40;
  threshold = 150;
  if (size <= 310) {
    return basis + Math.floor((size - threshold) / 16);
  }
  basis = 50;
  threshold = 310;
  if (size <= 630) {
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
 * Create a ring geometry with given inner/outer radius and depth (y axis)
 * @param innerRadius
 * @param outerRadius
 * @param depth
 * @param steps
 * @constructor
 */
export function RingGeometry(
  innerRadius: number,
  outerRadius: number,
  depth: number,
  steps: number
): ExtrudeGeometry {
  // Create the outer ring shape
  const shape = new THREE.Shape();
  shape.moveTo(outerRadius, 0);
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  // Extrude settings
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false,
    steps: steps,
  };
  // if innerRadius is less than 10% of outerRadius we consider the geometry full (inner hole would be too small)
  if (innerRadius < 0.1 * outerRadius) {
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  // Create the inner ring path (hole)
  const holePath = new THREE.Path();
  holePath.moveTo(innerRadius, 0);
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  // Create the extruded geometry
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Returns the inner hole path for an AND gate body of the given dimensions.
 * Handles both standard (width > height / 2) and tall (width ≤ height / 2) proportions.
 * Returns null when thickness is large enough that the shape should be solid (no hole).
 *
 * @param width     - Total width, from left flat edge to rightmost arc point
 * @param height    - Total height
 * @param thickness - Wall thickness of the gate shell
 */
function _andGateHolePath(width: number, height: number, thickness: number): THREE.Path | null {
  const halfW = width / 2;
  const halfH = height / 2;
  if (thickness > 0.9 * Math.min(halfH, halfW)) return null;

  const hole = new THREE.Path();

  if (width <= height / 2) {
    // Tall case: inner hole uses the same arc formula as _AndGateTallGeometry
    const innerHalfW = halfW - thickness;
    const innerHalfH = halfH - thickness;
    const cx_inner = -(innerHalfH * innerHalfH) / (4 * innerHalfW);
    const radius_inner = (innerHalfH * innerHalfH + 4 * innerHalfW * innerHalfW) / (4 * innerHalfW);
    const xComp_inner = -innerHalfW - cx_inner;
    const angle_top_inner = Math.atan2(innerHalfH, xComp_inner);

    hole.moveTo(-halfW + thickness, innerHalfH);
    hole.lineTo(-halfW + thickness, -innerHalfH); // inner left side, going down
    hole.absarc(cx_inner, 0, radius_inner, -angle_top_inner, angle_top_inner, false); // CCW, sweeping right
    // arc ends at (-halfW + thickness, innerHalfH) = moveTo → Three.js auto-closes
    return hole;
  }

  // Standard case: inner hole is AND gate shape shrunk by thickness, opposite winding
  const arcCenterX = halfW - halfH;
  const innerHalfH = halfH - thickness;
  hole.moveTo(-halfW + thickness, -innerHalfH);
  hole.lineTo(arcCenterX, -innerHalfH); // inner bottom edge, going right
  hole.absarc(arcCenterX, 0, innerHalfH, -Math.PI / 2, Math.PI / 2, false); // inner right semicircle, CCW
  hole.lineTo(-halfW + thickness, innerHalfH); // inner top edge, going left
  // Three.js auto-closes back to moveTo point (inner left side, going down)
  return hole;
}

/**
 * Internal variant of AndGateGeometry for tall gates where width ≤ height / 2.
 * In this regime a standard semicircle does not fit, so the entire right side is
 * a single circular arc passing through the top-left corner (-halfW, +halfH),
 * the output tip (+halfW, 0), and the bottom-left corner (-halfW, -halfH).
 *
 * The arc center and radius are derived analytically from those three points.
 * By symmetry the center lies on the x-axis: cx = -halfH² / (4·halfW).
 * The inner hole reuses the same formula applied to the inset dimensions
 * (halfW - thickness, halfH - thickness), so the right-side wall is uniform.
 *
 * @param width     - Total width, from left flat edge to rightmost arc point
 * @param height    - Total height; also determines the arc radius (= height / 2)
 * @param thickness - Wall thickness of the gate shell
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 */
function _AndGateTallGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number
): ExtrudeGeometry {
  if (width > height / 2) {
    throw new Error(
      'this method only handle the tall case : use regular AndGateGeometry in this case.'
    );
  }
  const halfW = width / 2;
  const halfH = height / 2;
  // Unique circle through (-halfW, ±halfH) and (halfW, 0), center on x-axis.
  // From (cx - halfW)² = (cx + halfW)² + halfH²  →  cx = -halfH² / (4·halfW)
  const cx = -(halfH * halfH) / (4 * halfW);
  const radius = (halfH * halfH + 4 * halfW * halfW) / (4 * halfW);
  // x-distance from center to the back-left corners; always > 0 in the tall regime (halfH ≥ 2·halfW)
  const xComp = -halfW - cx; // = (halfH² - 4·halfW²) / (4·halfW)
  const angle_top = Math.atan2(halfH, xComp);

  // Outer shape: flat left side (up) + single right arc CW from top to bottom
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(-halfW, halfH); // left flat side, going up
  shape.absarc(cx, 0, radius, angle_top, -angle_top, true); // right arc CW, sweeping through (halfW, 0)
  // arc ends exactly at (-halfW, -halfH) = moveTo → Three.js auto-closes

  const extrudeSettings = {
    depth,
    bevelEnabled: false,
    steps,
  };
  const hole = _andGateHolePath(width, height, thickness);
  if (hole !== null) shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create an ExtrudeGeometry for the body of an AND gate.
 * Shape is centered at origin: flat side on the left, semicircle on the right,
 * matching the standard logic gate schematic representation.
 * Handles both standard (width > height / 2) and tall (width ≤ height / 2) proportions.
 *
 * Input pins attach on the left flat side (x = -width/2).
 * Output pin attaches at the rightmost point of the arc (x = +width/2).
 *
 * The thickness parameter controls a visual state trick:
 * - LOW state:         thin thickness → gate appears as an empty shell
 * - HIGH state:        thick thickness → gate appears filled
 * - TRANSITIONING:     medium thickness → gate appears half-filled
 *
 * @param width     - Total width, from left flat edge to rightmost arc point
 * @param height    - Total height; also determines the arc radius (= height / 2)
 * @param thickness - Wall thickness of the gate shell
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @constructor
 */
export function AndGateGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  // Tall gate: the semicircle does not fit when width ≤ height / 2; use the arc variant
  if (width <= height / 2) {
    return _AndGateTallGeometry(width, height, thickness, depth, steps);
  }

  const halfW = width / 2;
  const halfH = height / 2;

  // The semicircle center sits at the boundary between the rectangular and curved portions
  const arcCenterX = halfW - halfH;

  // Outer shape: left flat side, top edge, clockwise right semicircle, bottom edge
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(-halfW, halfH); // left flat side, going up
  shape.lineTo(arcCenterX, halfH); // top edge, going right
  shape.absarc(arcCenterX, 0, halfH, Math.PI / 2, -Math.PI / 2, true); // right semicircle, clockwise
  shape.lineTo(-halfW, -halfH);

  const extrudeSettings = {
    depth,
    bevelEnabled: false,
    steps,
  };
  const hole = _andGateHolePath(width, height, thickness);
  if (hole !== null) shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create an ExtrudeGeometry for the inner hole of an AND gate body.
 * Returns null when thickness is large enough that the gate has no hole.
 * Handles both standard (width > height / 2) and tall (width ≤ height / 2) proportions.
 *
 * @param width     - Total width, from left flat edge to rightmost arc point
 * @param height    - Total height
 * @param thickness - Wall thickness of the gate shell
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 */
export function AndGateHoleGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry | null {
  const hole = _andGateHolePath(width, height, thickness);
  if (hole === null) return null;
  const shape = new THREE.Shape(hole.getPoints(64).reverse());
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Returns the inner hole path for an OR gate body of the given dimensions.
 * Handles both standard (width > height / 2) and tall (width ≤ height / 2) proportions.
 * Returns null when thickness is large enough that the shape should be solid (no hole).
 *
 * @param width     - Total width
 * @param height    - Total height
 * @param thickness - Wall thickness of the gate shell
 */
function _orGateHolePath(width: number, height: number, thickness: number): THREE.Path | null {
  const halfW = width / 2;
  const halfH = height / 2;
  if (thickness > 0.9 * Math.min(halfH, halfW)) return null;

  // Back arc parameters — shared between standard and tall cases
  const backInset = halfH * 0.4;
  const u_b = (halfH * halfH - backInset * backInset) / (2 * backInset);
  const cx_b = -halfW - u_b;
  const r_b = u_b + backInset;

  const innerHalfH = halfH - thickness;
  const backWallThickness = Math.max(0.1, thickness / 2);
  const r_b_inner = r_b + backWallThickness;
  const inner_x_comp = Math.sqrt(r_b_inner * r_b_inner - innerHalfH * innerHalfH);
  const angle_b_inner = Math.atan2(innerHalfH, inner_x_comp);
  const inner_back_x = cx_b + inner_x_comp;

  const hole = new THREE.Path();

  if (width <= height / 2) {
    // Tall case: inner right arc solved analytically from three points
    const p = halfW - thickness; // inner output tip x-coordinate
    const q = inner_back_x;
    const cx_r = (q * q + innerHalfH * innerHalfH - p * p) / (2 * (q - p));
    const radius_r = p - cx_r;
    const angle_top_r = Math.atan2(innerHalfH, inner_back_x - cx_r);

    hole.moveTo(inner_back_x, innerHalfH);
    hole.absarc(cx_b, 0, r_b_inner, angle_b_inner, -angle_b_inner, true); // CW, top to bottom
    hole.absarc(cx_r, 0, radius_r, -angle_top_r, angle_top_r, false); // CCW, bottom to top
    // arc ends at (inner_back_x, innerHalfH) = moveTo → Three.js auto-closes
    return hole;
  }

  // Standard case
  const arcCenterX = halfW - halfH;
  hole.moveTo(inner_back_x, innerHalfH);
  hole.absarc(cx_b, 0, r_b_inner, angle_b_inner, -angle_b_inner, true); // CW from top to bottom
  hole.lineTo(arcCenterX, -innerHalfH); // inner bottom edge, going right
  hole.absarc(arcCenterX, 0, innerHalfH, -Math.PI / 2, Math.PI / 2, false); // inner right semicircle, CCW
  hole.lineTo(inner_back_x, innerHalfH); // inner top edge, going left
  // Three.js auto-closes back to moveTo point
  return hole;
}

/**
 * Internal variant of OrGateGeometry for tall gates where width ≤ height / 2.
 * In this regime the right output semicircle does not fit, so the right side becomes
 * a single circular arc through the back-left corners (-halfW, ±halfH) and (halfW, 0),
 * exactly as in _AndGateTallGeometry — the only difference is the back (left) side
 * which remains the OR gate's characteristic concave arc.
 *
 * The inner hole back arc uses the same concentric offset trick (fixed backWallThickness).
 * The inner right arc is solved from the three points it must pass through:
 * (inner_back_x, ±innerHalfH) and (halfW - thickness, 0), where inner_back_x is where
 * the concentric back arc intersects y = ±innerHalfH. The circle center is found
 * analytically from (p - cx_r)² = (q - cx_r)² + innerHalfH² where p = halfW - thickness
 * and q = inner_back_x.
 */
function _OrGateTallGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number
): ExtrudeGeometry {
  if (width > height / 2) {
    throw new Error(
      '_OrGateTallGeometry only handles the tall case: use regular OrGateGeometry instead.'
    );
  }
  const halfW = width / 2;
  const halfH = height / 2;

  // Back (left) concave arc — identical to standard OrGateGeometry
  const backInset = halfH * 0.4;
  const u_b = (halfH * halfH - backInset * backInset) / (2 * backInset);
  const cx_b = -halfW - u_b;
  const r_b = u_b + backInset;
  const angle_b = Math.atan2(halfH, u_b);

  // Right arc: unique circle through (-halfW, ±halfH) and (halfW, 0), center on x-axis
  // Same derivation as _AndGateTallGeometry: cx = -halfH² / (4·halfW)
  const cx = -(halfH * halfH) / (4 * halfW);
  const radius = (halfH * halfH + 4 * halfW * halfW) / (4 * halfW);
  const xComp = -halfW - cx;
  const angle_top = Math.atan2(halfH, xComp);

  // Outer shape: concave back arc (CCW) flows directly into right arc (CW) — no horizontal edges
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.absarc(cx_b, 0, r_b, -angle_b, angle_b, false); // concave back, CCW bottom to top
  shape.absarc(cx, 0, radius, angle_top, -angle_top, true); // right arc CW, top to bottom through (halfW, 0)
  // arc ends at (-halfW, -halfH) = moveTo → Three.js auto-closes

  const extrudeSettings = { depth, bevelEnabled: false, steps };
  const hole = _orGateHolePath(width, height, thickness);
  if (hole !== null) shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create an ExtrudeGeometry for the body of an OR gate.
 * Same structure as AndGateGeometry but the left side is a concave arc (curves inward)
 * instead of a flat edge, matching the standard logic gate schematic representation.
 * Handles both standard (width > height / 2) and tall (width ≤ height / 2) proportions.
 *
 * Input pins attach on the left curved side (nominally at x = -width/2).
 * Output pin attaches at the rightmost point of the right arc (x = +width/2).
 *
 * The thickness parameter controls the same visual state trick as AndGateGeometry:
 * - LOW state:         thin thickness → gate appears as an empty shell
 * - HIGH state:        thick thickness → gate appears filled
 * - TRANSITIONING:     medium thickness → gate appears half-filled
 *
 * Back arc geometry: the concave left side bows inward (rightward) by backInset = halfH * 0.4.
 * The arc center sits far to the left; u_b is its x-distance to the back-left corners.
 * The inner hole back arc is concentric with the outer (same center, radius += 0.1), giving a
 * truly constant perpendicular wall thickness of 0.1 along the entire back curve, independent
 * of the thickness parameter.
 *
 * @param width     - Total width, from leftmost back curve point to rightmost arc point
 * @param height    - Total height; also determines the right arc radius (= height / 2)
 * @param thickness - Wall thickness of the gate shell
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @constructor
 */
export function OrGateGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  // Tall gate: the output semicircle does not fit when width ≤ height / 2; use the arc variant
  if (width <= height / 2) {
    return _OrGateTallGeometry(width, height, thickness, depth, steps);
  }

  const halfW = width / 2;
  const halfH = height / 2;

  // Back (left) concave arc: midpoint bows rightward by backInset from the left edge
  const backInset = halfH * 0.4;
  // u_b: x-distance from arc center (cx_b, 0) to the back-left corners (-halfW, ±halfH)
  // Derived from: arc passes through (-halfW, ±halfH) and midpoint (-halfW + backInset, 0)
  const u_b = (halfH * halfH - backInset * backInset) / (2 * backInset);
  const cx_b = -halfW - u_b; // arc center, far to the left of the gate
  const r_b = u_b + backInset; // = sqrt(u_b² + halfH²), by construction
  const angle_b = Math.atan2(halfH, u_b); // angle from center to the back-left corners

  // Right output semicircle center (same as AndGateGeometry)
  const arcCenterX = halfW - halfH;

  // Outer shape: concave back arc (CCW, bottom to top) + top edge + CW right semicircle + bottom edge
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.absarc(cx_b, 0, r_b, -angle_b, angle_b, false); // concave back, CCW bottom to top
  shape.lineTo(arcCenterX, halfH); // top edge, going right
  shape.absarc(arcCenterX, 0, halfH, Math.PI / 2, -Math.PI / 2, true); // right output semicircle, CW
  shape.lineTo(-halfW, -halfH); // bottom edge, back to start

  const extrudeSettings = { depth, bevelEnabled: false, steps };
  const hole = _orGateHolePath(width, height, thickness);
  if (hole !== null) shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create an ExtrudeGeometry for the inner hole of an OR gate body.
 * Returns null when thickness is large enough that the gate has no hole.
 * Handles both standard (width > height / 2) and tall (width ≤ height / 2) proportions.
 *
 * @param width     - Total width
 * @param height    - Total height
 * @param thickness - Wall thickness of the gate shell
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 */
export function OrGateHoleGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry | null {
  const hole = _orGateHolePath(width, height, thickness);
  if (hole === null) return null;
  const shape = new THREE.Shape(hole.getPoints(64).reverse());
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Create an ExtrudeGeometry for the XOR gate tail — the distinctive extra curved bar
 * placed to the left of an OrGateGeometry body to form the full XOR gate symbol.
 *
 * Back-arc parameters (backInset, u_b, cx_b, r_b, angle_b) are identical to those in
 * OrGateGeometry so this geometry aligns correctly when placed at the same centre.
 *
 * Note: the tail arc's centre is shifted left by tailWidth (radius stays constant = r_b), so
 * the tail always spans the full gate height regardless of tailWidth.
 * For bars to be visible, barsSeparation must be less than orHeight − 2 × thickness.
 *
 * @param orWidth        - Width of the paired OR gate body
 * @param orHeight       - Height of the paired OR gate body
 * @param tailWidth      - How far left the tail arc's corners are from the OR gate's left corners
 * @param thickness      - Wall thickness of the arc shell AND height of each bar
 * @param barsSeparation - Vertical gap between the two bars (centred on y = 0)
 * @param depth          - Extrusion depth
 * @param steps          - Number of extrusion steps
 */
export function XorGateTailGeometry(
  orWidth: number,
  orHeight: number,
  tailWidth: number,
  thickness: number,
  barsSeparation: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  const halfW = orWidth / 2;
  const halfH = orHeight / 2;

  // OR gate back-arc parameters — identical to OrGateGeometry
  const backInset = halfH * 0.4;
  const u_b = (halfH * halfH - backInset * backInset) / (2 * backInset);
  const cx_b = -halfW - u_b;
  const r_b = u_b + backInset;
  const angle_b = Math.atan2(halfH, u_b);

  // Tail arc: SAME radius r_b and angular sweep ±angle_b as the OR gate back arc,
  // but centre shifted left by tailWidth.
  //   • arc corners land at (−halfW − tailWidth, ±halfH) — full gate height, always
  //   • r_b never changes → never negative regardless of tailWidth value
  //   • curvature is identical to the OR gate back arc (concentric shift of the centre)
  const cx_b_tail = cx_b - tailWidth; // = −(halfW + u_b + tailWidth)

  // Inner face of the arc shell: larger radius (further right from cx_b_tail = toward OR gate)
  const r_inner = r_b + thickness;

  // Corner x of the outer arc at y = ±halfH  (= −halfW − tailWidth)
  const x_outer_corner = cx_b_tail + r_b * Math.cos(angle_b);
  // Flat right face aligned with the OR gate left-corner plane
  const x_flat = -halfW;

  // Bar vertical boundaries
  const y3 = barsSeparation / 2; // inner edge of bars (middle-gap boundary)
  const y4 = y3 + thickness; // outer edge of bars

  // x-coordinate and angle on the inner arc r_inner at height y
  const xInner = (y: number): number =>
    cx_b_tail + Math.sqrt(Math.max(0, r_inner * r_inner - y * y));
  const thetaInner = (y: number): number =>
    Math.atan2(y, Math.sqrt(Math.max(0, r_inner * r_inner - y * y)));

  // Whether bars and top/bottom caps are geometrically feasible given the parameters
  const barsExist = y3 < halfH && xInner(y3) < x_flat;
  const capsExist = barsExist && y4 < halfH; // caps sit above/below the bars inside the shape

  const extrudeSettings = { depth, bevelEnabled: false, steps };

  // Single closed CCW path — NO holes (avoids Three.js hole-border artefacts).
  // Strategy: trace the full solid boundary directly.
  //   moveTo(x_outer_corner, -halfH)
  //   EAST along bottom → NORTH up the right side (CCW inner arc + bar kinks) → WEST along top → CW outer arc SOUTH
  //
  // Three cases for the right side:
  //   • No bars       : single CCW inner arc from −halfH to +halfH
  //   • Bars, no caps : flat face spans −halfH→+halfH, split by inner arc at ±y3
  //   • Bars + caps   : inner arc sections join bar segments between ±y3 and ±y4

  const shape = new THREE.Shape();
  shape.moveTo(x_outer_corner, -halfH);

  if (!barsExist) {
    // ── arc wall only ──────────────────────────────────────────────────────────
    shape.lineTo(xInner(-halfH), -halfH); // E — arc wall bottom
    shape.absarc(cx_b_tail, 0, r_inner, thetaInner(-halfH), thetaInner(halfH), false); // N — CCW inner arc all the way up
  } else if (!capsExist) {
    // ── bars reach the top/bottom of the shape (no cap regions) ───────────────
    // Flat face starts right at y = ±halfH; inner arc only spans the middle gap.
    shape.lineTo(x_flat, -halfH); // E — bottom edge spans arc wall + bar
    shape.lineTo(x_flat, -y3); // N — right face of bottom bar
    shape.lineTo(xInner(-y3), -y3); // W — top of bottom bar → inner arc
    shape.absarc(cx_b_tail, 0, r_inner, thetaInner(-y3), thetaInner(y3), false); // N — CCW inner arc through gap
    shape.lineTo(x_flat, y3); // E — bottom of top bar
    shape.lineTo(x_flat, halfH); // N — right face of top bar
  } else {
    // ── full shape: arc wall + top & bottom caps + two bars ───────────────────
    shape.lineTo(xInner(-halfH), -halfH); // E — arc wall bottom
    shape.absarc(cx_b_tail, 0, r_inner, thetaInner(-halfH), thetaInner(-y4), false); // N — CCW inner arc to bottom cap top
    shape.lineTo(x_flat, -y4); // E — bottom of bottom bar
    shape.lineTo(x_flat, -y3); // N — right face of bottom bar
    shape.lineTo(xInner(-y3), -y3); // W — top of bottom bar → inner arc
    shape.absarc(cx_b_tail, 0, r_inner, thetaInner(-y3), thetaInner(y3), false); // N — CCW inner arc through gap
    shape.lineTo(x_flat, y3); // E — bottom of top bar
    shape.lineTo(x_flat, y4); // N — right face of top bar
    shape.lineTo(xInner(y4), y4); // W — top of top bar → inner arc
    shape.absarc(cx_b_tail, 0, r_inner, thetaInner(y4), thetaInner(halfH), false); // N — CCW inner arc to top
  }

  shape.lineTo(x_outer_corner, halfH); // W — top edge
  shape.absarc(cx_b_tail, 0, r_b, angle_b, -angle_b, true); // S — CW outer arc down (left side)
  // Three.js auto-closes back to moveTo at (x_outer_corner, -halfH)

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create an ExtrudeGeometry shaped like an L (or mirrored L) with a configurable
 * angle between the two arms.
 *
 * Default orientation (`invert = false`) produces a `|_`-like shape:
 *   base arm extends to the right, stem arm extends upward at the given angle.
 * When `invert = true` the shape is mirrored horizontally (`_|`-like):
 *   base arm extends to the left, stem arm mirrors accordingly.
 *
 * The `angle` parameter (in degrees) controls the inner angle between the two arms:
 *   - 90°  → standard right-angle L
 *   - 120° → obtuse junction (`\_`-like)
 *   - 60°  → acute junction
 *
 * Both the inner (concave) and outer (convex) junction corners are rounded
 * equally with `junctionRadius` (similar to CSS border-radius).
 * When 0 both corners are sharp. The arc sweep adapts to the angle: (180° − angle).
 *
 * The geometry is centered on its bounding box.
 *
 * At 90°, `width` and `height` correspond exactly to the bounding box dimensions.
 * At other angles the bounding box changes but the arm lengths remain consistent:
 * base inner arm = width − thickness, stem inner arm = height − thickness.
 *
 * @param width           - Base arm length (bounding-box width at 90°)
 * @param height          - Stem arm length (bounding-box height at 90°)
 * @param thickness       - Arm thickness of the L
 * @param angle           - Inner angle between the two arms, in degrees (typically 30–150)
 * @param invert          - If true, mirror horizontally
 * @param junctionRadius  - Radius of the rounded junction corners, inner and outer (0 = sharp)
 * @param depth           - Extrusion depth
 * @param steps           - Number of extrusion steps
 */
export function LGeometry(
  width: number,
  height: number,
  thickness: number,
  angle: number,
  invert: boolean,
  junctionRadius: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  const t = thickness;
  const alpha = THREE.MathUtils.degToRad(angle);
  const halfAlpha = alpha / 2;
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);
  const cotHalf = Math.cos(halfAlpha) / Math.sin(halfAlpha);

  // Inner arm lengths from junction inner corner to arm tips
  const W = width - t;
  const H = height - t;

  // Clamp junction radius: tangent points must stay within both arms
  // Tangent distance from inner corner along each arm = r · cot(α/2)
  const maxR = cotHalf > 0 ? Math.min(W, H) / cotHalf : Infinity;
  const r = Math.min(Math.max(0, junctionRadius), maxR);

  // Inner arc center offset from inner corner along each arm = r · cot(α/2)
  const arcCX = r * cotHalf;

  // Outer arc center: at distance r inside the polygon from both outer edges
  // Center = ((r − t) · cotHalf, r − t) for non-inverted
  const outerCX = (r - t) * cotHalf;
  const outerCY = r - t;

  const shape = new THREE.Shape();

  if (!invert) {
    // Base arm extends RIGHT, stem arm at angle α from base
    // All coordinates relative to the inner junction corner at origin, CCW winding

    if (r > 0) {
      // Start at outer base tangent (on base outer edge, near junction)
      shape.moveTo(outerCX, -t);
      shape.lineTo(W, -t); // base outer edge →
      shape.lineTo(W, 0); // base tip cap ↑
      shape.lineTo(arcCX, 0); // base inner edge ← to inner arc tangent
      shape.absarc(arcCX, r, r, -Math.PI / 2, alpha + Math.PI / 2, true); // CW inner arc
      shape.lineTo(H * cosA, H * sinA); // stem tip inner
      shape.lineTo(H * cosA - t * sinA, H * sinA + t * cosA); // stem tip outer
      // Stem outer edge ↙ to outer arc tangent
      shape.lineTo(outerCX - r * sinA, outerCY + r * cosA);
      // CCW outer arc (convex corner rounding)
      shape.absarc(outerCX, outerCY, r, alpha + Math.PI / 2, -Math.PI / 2, false);
      // auto-close back to outer base tangent
    } else {
      shape.moveTo(-t * cotHalf, -t); // outer junction corner
      shape.lineTo(W, -t); // base outer edge →
      shape.lineTo(W, 0); // base tip cap ↑
      shape.lineTo(0, 0); // sharp inner corner
      shape.lineTo(H * cosA, H * sinA); // stem tip inner
      shape.lineTo(H * cosA - t * sinA, H * sinA + t * cosA); // stem tip outer
      // auto-close: stem outer edge back to outer junction corner
    }
  } else {
    // Mirrored: base arm extends LEFT, stem arm mirrored
    // Stem direction becomes (-cosA, sinA), outward perpendicular (sinA, cosA)

    if (r > 0) {
      // Start at outer stem tangent (on stem outer edge, near junction)
      shape.moveTo(-outerCX + r * sinA, outerCY + r * cosA);
      shape.lineTo(-H * cosA + t * sinA, H * sinA + t * cosA); // stem outer edge
      shape.lineTo(-H * cosA, H * sinA); // stem tip inner (cap)
      shape.lineTo(-arcCX * cosA, arcCX * sinA); // stem inner edge to inner arc tangent
      shape.absarc(-arcCX, r, r, Math.PI / 2 - alpha, -Math.PI / 2, true); // CW inner arc
      shape.lineTo(-W, 0); // base tip inner
      shape.lineTo(-W, -t); // base tip outer (cap)
      // Base outer edge → to outer arc tangent
      shape.lineTo(-outerCX, -t);
      // CCW outer arc (convex corner rounding)
      shape.absarc(-outerCX, outerCY, r, -Math.PI / 2, Math.PI / 2 - alpha, false);
      // auto-close back to outer stem tangent
    } else {
      shape.moveTo(t * cotHalf, -t); // outer junction corner
      shape.lineTo(-H * cosA + t * sinA, H * sinA + t * cosA); // stem tip outer
      shape.lineTo(-H * cosA, H * sinA); // stem tip inner (cap)
      shape.lineTo(0, 0); // sharp inner corner
      shape.lineTo(-W, 0); // base tip inner
      shape.lineTo(-W, -t); // base tip outer (cap)
      // auto-close: base outer edge → back to outer junction corner
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
  /*geometry.rotateX(-0.23);
  geometry.rotateY(0.95);
  geometry.rotateZ(-0.22);*/
  return geometry;
}

/**
 * Returns the inner hole path for a cyclic trapezoid of the given dimensions.
 * Returns null when the geometry should be solid (no hole).
 *
 * @param width      - Total width
 * @param tailHeight - Height of the left (tail) side
 * @param headHeight - Height of the right (head) side (0 for triangle)
 * @param thickness  - Wall thickness
 */
function _cyclicTrapezoidHolePath(
  width: number,
  tailHeight: number,
  headHeight: number,
  thickness: number
): THREE.Path | null {
  const halfW = width / 2;
  const halfTailH = tailHeight / 2;
  const halfHeadH = headHeight / 2;

  if (thickness > 0.9 * Math.min(halfTailH, halfW)) return null;

  // Perpendicular inset of the slanted edges.
  // Top slant from (-halfW, halfTailH) to (halfW, halfHeadH):
  //   dH = halfTailH − halfHeadH (height drop along the slant, ≥ 0)
  //   L  = slant length = √(width² + dH²)
  // Inner top-left  y = halfTailH  − thickness·(L + dH) / width
  // Inner top-right y = halfHeadH  − thickness·(L − dH) / width
  // (bottom corners symmetric about y = 0)
  const dH = halfTailH - halfHeadH;
  const L = Math.sqrt(width * width + dH * dH);
  const innerTailHalfH = halfTailH - (thickness * (L + dH)) / width;
  if (innerTailHalfH <= 0) return null;

  const hole = new THREE.Path();

  if (headHeight > 0) {
    const innerHeadHalfH = halfHeadH - (thickness * (L - dH)) / width;
    if (innerHeadHalfH <= 0 || width - 2 * thickness <= 0) return null;

    // CW hole: TL → BL → BR → TR
    hole.moveTo(-halfW + thickness, innerTailHalfH);
    hole.lineTo(-halfW + thickness, -innerTailHalfH);
    hole.lineTo(halfW - thickness, -innerHeadHalfH);
    hole.lineTo(halfW - thickness, innerHeadHalfH);
  } else {
    // Triangle case: top and bottom inner slants meet at a single tip on the x-axis.
    // tipX = halfW − thickness·L / halfTailH
    const tipX = halfW - (thickness * L) / halfTailH;
    if (tipX <= -halfW + thickness) return null;

    // CW hole: TL → BL → tip
    hole.moveTo(-halfW + thickness, innerTailHalfH);
    hole.lineTo(-halfW + thickness, -innerTailHalfH);
    hole.lineTo(tipX, 0);
  }

  return hole;
}

export function CyclicTrapezoidGeometry(
  width: number,
  tailHeight: number,
  headHeight: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  const halfW = width / 2;
  const halfTailH = tailHeight / 2;
  const halfHeadH = headHeight / 2;

  // Outer shape (CCW): BL → BR (→ TR if trapezoid) → TL
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfTailH);
  if (headHeight > 0) {
    shape.lineTo(halfW, -halfHeadH);
    shape.lineTo(halfW, halfHeadH);
  } else {
    shape.lineTo(halfW, 0);
  }
  shape.lineTo(-halfW, halfTailH);
  // Three.js auto-closes back to moveTo

  const extrudeSettings = { depth, bevelEnabled: false, steps };
  const hole = _cyclicTrapezoidHolePath(width, tailHeight, headHeight, thickness);
  if (hole !== null) shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create an ExtrudeGeometry shaped like an empty rectangle (frame/border).
 * Shape is centered at origin. The inner hole is a smaller rectangle inset
 * by `thickness` on all four sides.
 *
 * @param width     - Total width of the outer rectangle
 * @param height    - Total height of the outer rectangle
 * @param thickness - Wall thickness of the frame (inset on each side)
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @constructor
 */
export function EmptyRectangleGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  const halfW = width / 2;
  const halfH = height / 2;

  // Outer shape (CCW): BL → BR → TR → TL
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  // Three.js auto-closes back to (-halfW, -halfH)

  const innerHalfW = halfW - thickness;
  const innerHalfH = halfH - thickness;

  if (innerHalfW > 0 && innerHalfH > 0) {
    // Inner hole (CW): TL → BL → BR → TR
    const hole = new THREE.Path();
    hole.moveTo(-innerHalfW, innerHalfH);
    hole.lineTo(-innerHalfW, -innerHalfH);
    hole.lineTo(innerHalfW, -innerHalfH);
    hole.lineTo(innerHalfW, innerHalfH);
    // auto-closes back to (-innerHalfW, innerHalfH)
    shape.holes.push(hole);
  }

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Create an ExtrudeGeometry shaped like a rectangle with a rectangular "nail"
 * (intrusion or protrusion)
 * The main rectangle is centered at origin; the nail hangs inside or outside it.
 *
 * @param width      - Total width of the rectangle
 * @param height     - Height of the main rectangle body
 * @param nailWidth  - Width of the nail intrusion
 * @param nailHeight - Height of the nail
 * @param nailX      - Horizontal center of the nail, measured from the rectangle's left edge
 * @param protusion  - if false nail will enter inside the rectangle (intrusion), else outside (protusion)
 * @param depth      - Extrusion depth
 * @param steps      - Number of extrusion steps
 * @throws Error if nail dimensions or position are geometrically invalid
 * @constructor
 */
export function RectangleWithNailGeometry(
  width: number,
  height: number,
  nailWidth: number,
  nailHeight: number,
  nailX: number,
  protusion: boolean,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  if (!protusion && nailHeight >= height) throw new Error(`when intrusion nailHeight (${nailHeight}) must be < height (${height})`);
  if (nailWidth >= width) throw new Error(`nailWidth (${nailWidth}) must be < width (${width})`);
  if (nailX - nailWidth / 2 <= 0) throw new Error(`nailX - nailWidth/2 (${nailX - nailWidth / 2}) must be > 0`);
  if (nailX + nailWidth / 2 >= width) throw new Error(`nailX + nailWidth/2 (${nailX + nailWidth / 2}) must be < width (${width})`);

  const halfW = width / 2;
  const halfH = height / 2;
  const nailL = nailX - halfW - nailWidth / 2; // nail left x in centered coords
  const nailR = nailX - halfW + nailWidth / 2; // nail right x in centered coords

  const nailYPos = -halfH + (protusion ? -1 : 1) * nailHeight;

  // Outer shape (CCW): BL → nail-slot-left → nail-BL → nail-BR → nail-slot-right → BR → TR → TL
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(nailL, -halfH);
  shape.lineTo(nailL, nailYPos);
  shape.lineTo(nailR, nailYPos);
  shape.lineTo(nailR, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  // Three.js auto-closes back to (-halfW, -halfH)

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Create an ExtrudeGeometry for the inner hole of a cyclic trapezoid.
 * Returns null when the geometry should be solid (no hole).
 *
 * @param width      - Total width
 * @param tailHeight - Height of the left (tail) side
 * @param headHeight - Height of the right (head) side (0 for triangle)
 * @param thickness  - Wall thickness
 * @param depth      - Extrusion depth
 * @param steps      - Number of extrusion steps
 */
export function CyclicTrapezoidHoleGeometry(
  width: number,
  tailHeight: number,
  headHeight: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry | null {
  const hole = _cyclicTrapezoidHolePath(width, tailHeight, headHeight, thickness);
  if (hole === null) return null;
  const shape = new THREE.Shape(hole.getPoints(64).reverse());
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Returns the inner hole path for a drip (teardrop) shape.
 * Returns null when thickness is large enough that the shape should be solid.
 *
 * @param width     - Total width
 * @param height    - Total height (must be > width)
 * @param thickness - Wall thickness
 */
function _dripHolePath(width: number, height: number, thickness: number): THREE.Path | null {
  const halfW = width / 2;
  const halfH = height / 2;
  if (thickness > 0.9 * Math.min(halfW, halfH)) return null;

  const yc = -halfH + halfW; // bottom circle center y
  const d = height - halfW; // distance from tip to circle center
  const sinA = halfW / d;
  const cosA = Math.sqrt(1 - sinA * sinA);
  const alpha = Math.asin(sinA);

  const rInner = halfW - thickness;
  const tipInsetY = halfH - thickness / sinA; // inner tip y (moved down from outer tip)
  const innerTanY = yc - rInner * sinA; // y of inner tangent points

  if (rInner <= 0) return null;
  if (tipInsetY <= innerTanY) return null; // tip would fall below tangent points

  // Hole path (CCW): inner tip → inner T_left → [CCW arc through bottom] → inner T_right → auto-close to tip
  const hole = new THREE.Path();
  hole.moveTo(0, tipInsetY); // inner tip
  hole.lineTo(-rInner * cosA, innerTanY); // inner T_left
  hole.absarc(0, yc, rInner, alpha - Math.PI, -alpha, false); // CCW arc through bottom
  // Arc ends at inner T_right = (rInner * cosA, innerTanY)
  // Three.js auto-closes back to inner tip
  return hole;
}

/**
 * Create an ExtrudeGeometry for a drip (teardrop) shape.
 * The shape has a sharp pointed tip at the top and a rounded bottom.
 * Shape is centered at origin.
 *
 * Construction: the rounded bottom is a circle of radius width/2 centered at
 * y = -height/2 + width/2. Two straight tangent lines connect the circle to the
 * tip at (0, +height/2). This requires height > width so the tip sits above the
 * circle and the tangent lines exist.
 *
 * @param width     - Total width
 * @param height    - Total height (must be > width)
 * @param thickness - Wall thickness of the shell
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @throws Error if height <= width (tip too low for tangent construction)
 * @constructor
 */
export function DripGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry {
  if (height <= width) throw new Error(`DripGeometry: height (${height}) must be > width (${width})`);

  const halfW = width / 2;
  const halfH = height / 2;
  const yc = -halfH + halfW; // bottom circle center y
  const d = height - halfW; // distance from tip to circle center
  const sinA = halfW / d;
  const cosA = Math.sqrt(1 - sinA * sinA);
  const alpha = Math.asin(sinA);
  const theta_r = -alpha; // angle of right tangent point on circle
  const theta_l = alpha - Math.PI; // angle of left tangent point on circle (= -(π − alpha))

  // Outer shape: tip → T_right → [CW arc through bottom] → T_left → [auto-close to tip]
  const shape = new THREE.Shape();
  shape.moveTo(0, halfH); // tip
  shape.lineTo(halfW * cosA, yc - halfW * sinA); // T_right
  shape.absarc(0, yc, halfW, theta_r, theta_l, true); // CW arc through bottom
  // Arc ends at T_left = (-halfW * cosA, yc - halfW * sinA)
  // Three.js auto-closes back to tip (left side tangent line)

  const hole = _dripHolePath(width, height, thickness);
  if (hole !== null) shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Create an ExtrudeGeometry for the inner hole of a drip shape.
 * Returns null when thickness is large enough that the drip has no hole.
 *
 * @param width     - Total width
 * @param height    - Total height (must be > width)
 * @param thickness - Wall thickness
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @throws Error if height <= width
 */
export function DripHoleGeometry(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  steps: number = 1
): ExtrudeGeometry | null {
  if (height <= width) throw new Error(`DripHoleGeometry: height (${height}) must be > width (${width})`);
  const hole = _dripHolePath(width, height, thickness);
  if (hole === null) return null;
  const shape = new THREE.Shape(hole.getPoints(64).reverse());
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Create an ExtrudeGeometry shaped like japanese hiragana Ku and katakana Ko (くコ)
 * Shape is centered horizontally at the junction between the two and vertically at the middle height
 * by `kuThickness` on all four sides.
 *
 * @param kuWidth     - width of the left ku part (outer)
 * @param koWidth     - width of the right ko part (outer)
 * @param height    - Total height of the outer geometry
 * @param kuThickness - Wall kuThickness of the frame (inset on ku side)
 * @param koThickness - Wall koThickness of the frame (inset on ko side)
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @constructor
 */
export function KuKoGeometry(
    kuWidth: number,
    koWidth: number,
    height: number,
    kuThickness: number,
    koThickness: number,
    depth: number,
    steps: number = 1
): ExtrudeGeometry {
  const halfH = height / 2;

  // Outer shape
  const shape = new THREE.Shape();
  shape.moveTo(0, -halfH);
  shape.lineTo(-kuWidth, 0);
  shape.lineTo(0, halfH);
  shape.lineTo(koWidth, halfH);
  shape.lineTo(koWidth, -halfH);
  // Three.js auto-closes back to (0, -halfH)

  let hasKuHole = kuThickness < 0.45*kuWidth && kuThickness < 0.45*height;
  let hasKoHole = koThickness < 0.45*koWidth && koThickness < 0.45*height;

  if(hasKuHole && hasKoHole){
    const hole = new THREE.Path();
    hole.moveTo(0, -halfH + koThickness);
    hole.lineTo(-kuWidth + kuThickness, 0);
    hole.lineTo(0, halfH - koThickness);
    hole.lineTo(koWidth - koThickness, halfH - koThickness);
    hole.lineTo(koWidth - koThickness, -halfH + koThickness);
    // Three.js auto-closes back to (0, -halfH + kuThickness)
    shape.holes.push(hole);
  }
  else if(!hasKuHole && hasKoHole){
    const hole = new THREE.Path();
    hole.moveTo(0, -halfH + koThickness);
    hole.lineTo(0, halfH - koThickness);
    hole.lineTo(koWidth - koThickness, halfH - koThickness);
    hole.lineTo(koWidth - koThickness, -halfH + koThickness);
    // Three.js auto-closes back to (0, -halfH + kuThickness)
    shape.holes.push(hole);
  }
  else if(hasKuHole && !hasKoHole){
    const hole = new THREE.Path();
    hole.moveTo(0, -halfH + kuThickness);
    hole.lineTo(-kuWidth + kuThickness, 0);
    hole.lineTo(0, halfH - kuThickness);
    // Three.js auto-closes back to (0, -halfH + kuThickness)
    shape.holes.push(hole);
  }
  console.log(shape);
  // both false : no hole -> whole form
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}

/**
 * Create an ExtrudeGeometry shaped like a rectangle (frame/border) with rectangular holes in it
 * Shape is centered at origin.
 * by `thickness` on all four sides.
 *
 * @param width     - Total width of the outer rectangle
 * @param height    - Total height of the outer rectangle
 * @param holeWidth - width of a rectangular hole
 * @param holeHeight - height of a rectangular hole
 * @param holePositions - array of xy positions of the center of holes
 * @param depth     - Extrusion depth
 * @param steps     - Number of extrusion steps
 * @constructor
 */
export function IceBoxGeometry(
    width: number,
    height: number,
    holeWidth: number,
    holeHeight: number,
    holePositions: Array<{x: number, y: number}>,
    depth: number,
    steps: number = 1
): ExtrudeGeometry {
  const halfW = width / 2;
  const halfH = height / 2;

  // Outer shape (CCW): BL → BR → TR → TL
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  // Three.js auto-closes back to (-halfW, -halfH)

  const holeHalfW = holeWidth / 2;
  const holeHalfH = holeHeight / 2;
  for(const holePos of holePositions){
    const hole = new THREE.Path();
    hole.moveTo(holePos.x -holeHalfW, holePos.y + holeHalfH);
    hole.lineTo(holePos.x -holeHalfW, holePos.y - holeHalfH);
    hole.lineTo(holePos.x +holeHalfW, holePos.y - holeHalfH);
    hole.lineTo(holePos.x +holeHalfW, holePos.y + holeHalfH);
    // auto-closes
    shape.holes.push(hole);
  }

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps });
}