/**
 * WireVisualManager Contract
 *
 * Manages wire visual rendering with support for:
 * - Pin-accurate endpoints
 * - Multi-segment rendering via intermediate positions
 * - Dynamic updates during component movement
 */

import type { UUID } from '../../../src/core/types/UUID';
import type { Circuit } from '../../../src/core/Circuit';
import type { Wire } from '../../../src/core/Wire';
import type * as THREE from 'three';

/**
 * Wire path representation for rendering
 */
export interface WirePath {
  /** Wire ID */
  wireId: UUID;

  /** Ordered points in world space (Three.js coordinates) */
  points: THREE.Vector3[];
}

/**
 * WireVisualManager interface
 *
 * Handles wire rendering with proper pin targeting and
 * real-time updates during component manipulation.
 */
export interface IWireVisualManager {
  /**
   * Create or update the visual for a wire
   * @param wire - Wire to render
   * @param circuit - Circuit containing the wire (for ENode lookup)
   * @param scene - Three.js scene to add wire to
   * @returns The created/updated Line object
   */
  createOrUpdateWire(wire: Wire, circuit: Circuit, scene: THREE.Scene): THREE.Line;

  /**
   * Update wire endpoint for a specific ENode
   * Called when a component moves and its pin positions change
   * @param enodeId - The ENode whose position changed
   * @param newWorldPosition - New position in world coordinates
   */
  updateWireEndpoint(enodeId: UUID, newWorldPosition: THREE.Vector3): void;

  /**
   * Update all wires connected to a component
   * @param componentId - Component that moved
   * @param circuit - Circuit for wire/ENode lookup
   * @param componentGroups - Map of component ID to Three.js objects (for pin position lookup)
   */
  updateWiresForComponent(
    componentId: UUID,
    circuit: Circuit,
    componentGroups: Map<UUID, THREE.Object3D>
  ): void;

  /**
   * Compute the full path for a wire including intermediate positions
   * @param wire - Wire to compute path for
   * @param circuit - Circuit for ENode position lookup
   * @returns Array of Vector3 points from start to end
   */
  computeWirePath(wire: Wire, circuit: Circuit): WirePath;

  /**
   * Get the world position of an enode (pin or branching point) from its visual representation
   * @param enodeId - The ENode ID
   * @param componentGroup - The component's Three.js group
   * @returns World position of the pin, or null if not found
   */
  getENodeWorldPosition(enodeId: UUID, componentGroup: THREE.Object3D): THREE.Vector3 | null;

  /**
   * Remove a wire visual from the scene
   * @param wireId - Wire ID to remove
   * @param scene - Scene to remove from
   */
  removeWire(wireId: UUID, scene: THREE.Scene): void;

  /**
   * Clean up all managed wire visuals
   * @param scene - Scene to clean up from
   */
  dispose(scene: THREE.Scene): void;
}
