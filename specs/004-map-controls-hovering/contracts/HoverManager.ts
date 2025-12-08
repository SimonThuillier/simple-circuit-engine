/**
 * HoverManager Contract
 * @module scene/shared/HoverManager
 *
 * Handles priority-based hover detection using Three.js Raycaster and Layers.
 */

import type * as THREE from 'three';
import type { UUID } from '../../../src/core/types/Identifier';
import type { RenderObjectType } from '../../../src/scene/shared/types';
import type { HoveredElement, HoverableType } from './types';

/**
 * Callback type for hover state changes
 */
export type HoverCallback = (element: HoveredElement | null) => void;

/**
 * HoverManager Interface
 *
 * Manages hover detection using Three.js Raycaster against hitbox layers.
 * Implements priority-based detection: enode > component > wire.
 *
 * @remarks
 * - HoverManager does not emit events directly; it reports to the scene manager
 * - Scene manager is responsible for emitting hover/unhover events
 * - HoverManager maintains state to prevent duplicate callbacks
 *
 * @example
 * ```typescript
 * const hoverManager = new HoverManager(scene, camera);
 *
 * // Called on every mouse move
 * hoverManager.updateFromMouse(normalizedX, normalizedY);
 *
 * // Query current hover state
 * const hovered = hoverManager.getHoveredElement();
 *
 * // Subscribe to changes
 * hoverManager.onHoverChange((element) => {
 *   if (element) {
 *     emitHoverEvent(element);
 *   } else {
 *     emitUnhoverEvent();
 *   }
 * });
 * ```
 */
export interface IHoverManager {
  /**
   * Update hover state based on normalized mouse coordinates
   *
   * Performs priority-based raycasting against hitbox layers.
   * If hover state changes, triggers onHoverChange callback.
   *
   * @param normalizedX - Mouse X in normalized device coordinates [-1, 1]
   * @param normalizedY - Mouse Y in normalized device coordinates [-1, 1]
   *
   * @remarks
   * Call this on every mousemove event. Coordinates should be computed as:
   * ```
   * x = (clientX / containerWidth) * 2 - 1
   * y = -(clientY / containerHeight) * 2 + 1
   * ```
   */
  updateFromMouse(normalizedX: number, normalizedY: number): void;

  /**
   * Force update hover state at current mouse position
   *
   * Useful after camera changes or scene updates to refresh hover state
   * without requiring a new mouse event.
   */
  refresh(): void;

  /**
   * Clear current hover state
   *
   * Triggers unhover callback if an element was hovered.
   * Call this when mouse leaves the container.
   */
  clear(): void;

  /**
   * Get the currently hovered element
   *
   * @returns HoveredElement if something is hovered, null otherwise
   */
  getHoveredElement(): HoveredElement | null;

  /**
   * Register callback for hover state changes
   *
   * Callback is invoked when:
   * - Hover starts (element becomes non-null)
   * - Hover changes to different element
   * - Hover ends (element becomes null)
   *
   * @param callback - Function to call on hover state change
   */
  onHoverChange(callback: HoverCallback): void;

  /**
   * Remove previously registered hover change callback
   *
   * @param callback - Same function reference passed to onHoverChange
   */
  offHoverChange(callback: HoverCallback): void;

  /**
   * Enable or disable hover detection
   *
   * When disabled, updateFromMouse() becomes a no-op.
   * Useful for temporarily disabling hover during drag operations.
   *
   * @param enabled - Whether to enable hover detection
   */
  setEnabled(enabled: boolean): void;

  /**
   * Check if hover detection is enabled
   *
   * @returns true if enabled
   */
  isEnabled(): boolean;

  /**
   * Clean up resources
   *
   * Removes all callbacks and clears state.
   * Call when disposing the scene manager.
   */
  dispose(): void;
}

/**
 * Factory function signature for creating HoverManager instances
 *
 * @param scene - Three.js scene containing hitbox meshes
 * @param camera - Three.js camera for raycasting
 * @returns IHoverManager instance
 */
export type HoverManagerFactory = (
  scene: THREE.Scene,
  camera: THREE.Camera
) => IHoverManager;

/**
 * Helper type for raycast result processing
 */
export interface RaycastHitInfo {
  /** ID extracted from hitbox userData */
  elementId: UUID;
  /** Type of hovered element */
  elementType: HoverableType;
  /** Object type for event payload */
  objectType: RenderObjectType;
  /** Three.js intersection result */
  intersection: THREE.Intersection;
  /** The hitbox mesh that was hit */
  hitboxMesh: THREE.Object3D;
}
