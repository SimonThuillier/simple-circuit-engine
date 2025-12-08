/**
 * HoverManager Implementation
 * @module scene/shared/HoverManager
 *
 * Handles priority-based hover detection using Three.js Raycaster and Layers.
 * Implements priority: enode > component > wire
 */

import * as THREE from 'three';
import type { HoveredElement, HitboxUserData } from './types';
import { HitboxLayers } from './LayerConstants';

/**
 * Callback type for hover state changes
 */
export type HoverCallback = (element: HoveredElement | null) => void;

/**
 * HoverManager Class
 *
 * Manages hover detection using Three.js Raycaster against hitbox layers.
 * Implements priority-based detection: enode > component > wire.
 */
export class HoverManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private currentlyHovered: HoveredElement | null = null;
  private callbacks: Set<HoverCallback> = new Set();
  private enabled: boolean = true;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastUpdateTime: number = 0;
  private throttleMs: number = 8; // ~120fps max update rate (performance optimization)

  /**
   * Create a new HoverManager
   *
   * @param scene - Three.js scene containing hitbox meshes
   * @param camera - Three.js camera for raycasting
   */
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Update hover state based on normalized mouse coordinates
   *
   * Performs priority-based raycasting against hitbox layers.
   * If hover state changes, triggers onHoverChange callback.
   *
   * @param normalizedX - Mouse X in normalized device coordinates [-1, 1]
   * @param normalizedY - Mouse Y in normalized device coordinates [-1, 1]
   */
  updateFromMouse(normalizedX: number, normalizedY: number): void {
    if (!this.enabled) {
      return;
    }

    // Performance optimization: Throttle updates to max ~120fps (T033)
    const now = performance.now();
    if (now - this.lastUpdateTime < this.throttleMs) {
      return;
    }
    this.lastUpdateTime = now;

    // Store mouse position for refresh()
    this.lastMouseX = normalizedX;
    this.lastMouseY = normalizedY;

    // Setup raycaster
    this.raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera);

    // Try to find a hit in priority order: ENODE > COMPONENT > WIRE
    let hitElement: HoveredElement | null = null;

    // Priority 1: Check ENODE layer
    hitElement = this._raycastLayer(HitboxLayers.ENODE, 'enode', 'enodeHitbox');

    // Priority 2: Check COMPONENT layer if no enode hit
    if (!hitElement) {
      hitElement = this._raycastLayer(HitboxLayers.COMPONENT, 'component', 'componentHitbox');
    }

    // Priority 3: Check WIRE layer if no component hit
    if (!hitElement) {
      hitElement = this._raycastLayer(HitboxLayers.WIRE, 'wire', 'wireHitbox');
    }

    // Compare with current state and trigger callbacks if changed
    this._updateHoverState(hitElement);
  }

  /**
   * Force update hover state at current mouse position
   *
   * Useful after camera changes or scene updates to refresh hover state
   * without requiring a new mouse event.
   */
  refresh(): void {
    if (this.enabled) {
      this.updateFromMouse(this.lastMouseX, this.lastMouseY);
    }
  }

  /**
   * Clear current hover state
   *
   * Triggers unhover callback if an element was hovered.
   * Call this when mouse leaves the container.
   */
  clear(): void {
    this._updateHoverState(null);
  }

  /**
   * Get the currently hovered element
   *
   * @returns HoveredElement if something is hovered, null otherwise
   */
  getHoveredElement(): HoveredElement | null {
    return this.currentlyHovered;
  }

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
  onHoverChange(callback: HoverCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Remove previously registered hover change callback
   *
   * @param callback - Same function reference passed to onHoverChange
   */
  offHoverChange(callback: HoverCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Enable or disable hover detection
   *
   * When disabled, updateFromMouse() becomes a no-op.
   * Useful for temporarily disabling hover during drag operations.
   *
   * @param enabled - Whether to enable hover detection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Clear hover state when disabling
      this.clear();
    }
  }

  /**
   * Check if hover detection is enabled
   *
   * @returns true if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clean up resources
   *
   * Removes all callbacks and clears state.
   * Call when disposing the scene manager.
   */
  dispose(): void {
    this.clear();
    this.callbacks.clear();
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Perform raycasting on a specific layer and extract hit information
   *
   * @param layer - Hitbox layer number to raycast against
   * @param hoverableType - Type for HoveredElement
   * @param objectType - RenderObjectType for event payload
   * @returns HoveredElement if hit found, null otherwise
   */
  private _raycastLayer(
    layer: number,
    hoverableType: 'enode' | 'component' | 'wire',
    objectType: 'enodeHitbox' | 'componentHitbox' | 'wireHitbox'
  ): HoveredElement | null {
    // Configure raycaster to only check the specified layer
    this.raycaster.layers.set(layer);

    // Perform raycast (recursive to check all children)
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);

    // Find first valid hit with proper userData
    for (const intersection of intersections) {
      const obj = intersection.object;
      const userData = obj.userData as HitboxUserData;

      // Validate userData has correct type
      if (userData && userData.type === objectType) {
        // Extract element ID based on hitbox type
        let elementId: string;
        if (userData.type === 'enodeHitbox') {
          // For enode hitboxes, use componentId (the component that owns the pin)
          elementId = userData.enodeId;
        } else if (userData.type === 'componentHitbox') {
          elementId = userData.componentId;
        } else if (userData.type === 'wireHitbox') {
          elementId = userData.wireId;
        } else {
          continue;
        }

        return {
          id: elementId,
          type: hoverableType,
          objectType: objectType,
          object3D: obj,
        };
      }
    }

    return null;
  }

  /**
   * Update hover state and trigger callbacks if changed
   *
   * Compares new hit with currentlyHovered and only triggers callbacks on change.
   *
   * @param newHit - New hover element or null
   */
  private _updateHoverState(newHit: HoveredElement | null): void {
    // Check if state has changed
    const hasChanged = !this._isSameHover(this.currentlyHovered, newHit);

    if (hasChanged) {
      this.currentlyHovered = newHit;

      // Trigger all registered callbacks
      for (const callback of this.callbacks) {
        callback(newHit);
      }
    }
  }

  /**
   * Compare two hover elements for equality
   *
   * @param a - First element
   * @param b - Second element
   * @returns true if both represent the same hover state
   */
  private _isSameHover(a: HoveredElement | null, b: HoveredElement | null): boolean {
    // Both null = same
    if (a === null && b === null) {
      return true;
    }

    // One null, one not = different
    if (a === null || b === null) {
      return false;
    }

    // Compare id and type
    return a.id === b.id && a.type === b.type;
  }
}
