/**
 * Three.js Layer Constants for Hitbox Organization
 * @module scene/shared/utils/LayerConstants
 *
 * Defines layer assignments for priority-based raycasting and rendering.
 */

/**
 * Three.js layer assignments for hitbox meshes and rendering
 *
 * Layers enable priority-based raycasting by querying layers sequentially.
 * Lower layer numbers = higher priority for hover detection.
 *
 * @remarks
 * - Layer 0 is reserved for default visual rendering
 * - Hitbox layers (1-3) are invisible but raycastable
 * - Camera.layers should include only layer 0 for rendering
 * - Raycaster.layers is set per-query based on priority
 *
 * @example
 * ```typescript
 * import { HitboxLayers } from './LayerConstants';
 *
 * // Assign hitbox to component layer
 * hitboxMesh.layers.set(HitboxLayers.COMPONENT);
 *
 * // Raycast only enode hitboxes
 * raycaster.layers.set(HitboxLayers.ENODE);
 * ```
 */
export const HitboxLayers = {
  /** Default layer for visual rendering (do not use for hitboxes) */
  DEFAULT: 0,
  /** Enode hitboxes - highest hover priority */
  ENODE: 1,
  /** Component hitboxes - medium hover priority */
  COMPONENT: 2,
  /** Wire hitboxes - lowest hover priority */
  WIRE: 3,
} as const;

export type HitboxLayerValue = (typeof HitboxLayers)[keyof typeof HitboxLayers];
