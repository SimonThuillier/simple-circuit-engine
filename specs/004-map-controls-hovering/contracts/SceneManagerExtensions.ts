/**
 * Controller Extensions Contract
 * @module scene/static/CircuitController (extensions)
 * @module scene/simulation/CircuitRunnerController (extensions)
 *
 * Defines the API additions for MapControls and hover detection.
 */

import type * as THREE from 'three';
import type { MapControls } from 'three/addons/controls/MapControls.js';
import type { HoveredElement, MapControlsOptions } from './types';
import type { UUID } from '../../../src/core/types/Identifier';

/**
 * MapControls and Hover Detection extensions for Controllers
 *
 * These methods are added to both CircuitController and CircuitRunnerController.
 *
 * @example
 * ```typescript
 * // Initialize with custom MapControls options
 * controllerType.initialize(container, {
 *   mapControls: { enableRotate: false }
 * });
 *
 * // Query hover state
 * const hovered = controllerType.getHoveredElement();
 *
 * // Listen for hover events (existing event system)
 * controllerType.on('hover', ({ objectId, objectType }) => {
 *   console.log(`Hovering ${objectType}: ${objectId}`);
 * });
 *
 * // Listen for unhover events
 * controllerType.on('unhover', ({ objectId, objectType }) => {
 *   console.log(`Left ${objectType}: ${objectId}`);
 * });
 * ```
 */
export interface IControllerHoverExtensions {
  /**
   * Get the currently hovered circuit element
   *
   * @returns HoveredElement if an element is under cursor, null otherwise
   *
   * @remarks
   * This method does not emit events - use it for querying current state.
   * Hover/unhover events are emitted automatically on state changes.
   */
  getHoveredElement(): HoveredElement | null;

  /**
   * Enable or disable hover detection
   *
   * When disabled, no hover/unhover events are emitted and
   * getHoveredElement() always returns null.
   *
   * @param enabled - Whether to enable hover detection
   *
   * @remarks
   * Hover detection is enabled by default after initialization.
   * Useful for temporarily disabling during drag operations or tool interactions.
   */
  setHoverEnabled(enabled: boolean): void;

  /**
   * Check if hover detection is enabled
   *
   * @returns true if hover detection is active
   */
  isHoverEnabled(): boolean;
}

/**
 * MapControls extensions for Controllers
 */
export interface IControllerMapControlsExtensions {
  /**
   * Get the MapControls instance for direct manipulation
   *
   * @returns MapControls instance or null if not initialized
   *
   * @remarks
   * Use this for advanced control manipulation not exposed through options.
   * Changes made directly to MapControls will not be reflected in options.
   */
  getMapControls(): MapControls | null;

  /**
   * Update MapControls options at runtime
   *
   * @param options - Partial options to update
   *
   * @remarks
   * Only provided options are updated; others retain current values.
   * Some options (like enableDamping) take effect immediately.
   */
  updateMapControlsOptions(options: Partial<MapControlsOptions>): void;

  /**
   * Reset camera to default position
   *
   * Resets the camera to view the entire circuit.
   * Animates smoothly if damping is enabled.
   *
   * @param animate - Whether to animate the transition (default: true)
   */
  resetCamera(animate?: boolean): void;

  /**
   * Focus camera on a specific element
   *
   * Centers the camera on the specified element.
   *
   * @param elementId - UUID of the element to focus on
   * @param animate - Whether to animate the transition (default: true)
   *
   * @throws {Error} If element is not found in scene
   */
  focusOnElement(elementId: UUID, animate?: boolean): void;
}

/**
 * Combined extension interface
 *
 * Both CircuitController and CircuitRunnerController implement this.
 */
export interface IControllerExtensions
  extends IControllerHoverExtensions,
    IControllerMapControlsExtensions {}

/**
 * Internal state for hover/controls management
 *
 * Not exposed publicly - used by scene controllerType implementations.
 */
export interface ControllerInteractionState {
  /** MapControls instance */
  mapControls: MapControls | null;
  /** Current MapControls configuration */
  mapControlsOptions: MapControlsOptions;
  /** HoverManager instance */
  hoverManager: import('./HoverManager').IHoverManager | null;
  /** Bound event handlers for cleanup */
  boundHandlers: {
    onMouseMove: ((event: MouseEvent) => void) | null;
    onMouseLeave: ((event: MouseEvent) => void) | null;
    onControlsChange: (() => void) | null;
  };
}
