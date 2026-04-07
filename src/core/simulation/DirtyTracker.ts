/**
 * Tracks which circuit elements have changed state during the current tick
 * @module core/simulation
 */

import type { IDirtyElements } from './types';
import type { UUID } from '../utils/types';

/**
 * Tracks per-element changes for optimized state propagation.
 * Provides granular dirty tracking at component/wire/enode level.
 *
 * Used to avoid re-processing unchanged elements during simulation ticks.
 *
 * @public
 */
export class DirtyTracker {
  private dirtyComponents: Set<UUID>;
  private dirtyWires: Set<UUID>;
  private dirtyEnodes: Set<UUID>;

  /**
   * Create a new dirty tracker with no marked elements.
   */
  constructor() {
    this.dirtyComponents = new Set();
    this.dirtyWires = new Set();
    this.dirtyEnodes = new Set();
  }

  /**
   * Mark a component as having changed state this tick.
   *
   * @param componentId - UUID of the component
   */
  markComponentDirty(componentId: UUID): void {
    this.dirtyComponents.add(componentId);
  }

  /**
   * Mark a wire as having changed electrical state this tick.
   *
   * @param wireId - UUID of the wire
   */
  markWireDirty(wireId: UUID): void {
    this.dirtyWires.add(wireId);
  }

  /**
   * Mark an ENode as having changed electrical state this tick.
   *
   * @param enodeId - UUID of the ENode
   */
  markEnodeDirty(enodeId: UUID): void {
    this.dirtyEnodes.add(enodeId);
  }

  /**
   * Set the entire set of dirty components. Should be only used at CircuitRunner initialization.
   * @param componentIds
   */
  setDirtyComponents(componentIds: Set<UUID>): void {
    this.dirtyComponents = new Set(componentIds);
  }

  /**
   * Set the entire set of dirty components. Should be only used at CircuitRunner initialization.
   * @param enodeIds
   */
  setDirtyEnodes(enodeIds: Set<UUID>): void {
    this.dirtyEnodes = new Set(enodeIds);
  }

  /**
   * Set the entire set of dirty components. Should be only used at CircuitRunner initialization.
   * @param wireIds
   */
  setDirtyWires(wireIds: Set<UUID>): void {
    this.dirtyWires = new Set(wireIds);
  }

  /**
   * Get all dirty elements and clear the tracker.
   * This is typically called at the end of a tick to collect changes.
   *
   * @returns Object containing sets of dirty component/wire/enode UUIDs
   */
  getDirtyElements(): IDirtyElements {
    const result: IDirtyElements = {
      components: new Set(this.dirtyComponents),
      wires: new Set(this.dirtyWires),
      enodes: new Set(this.dirtyEnodes),
    };

    this.clear();

    return result;
  }

  /**
   * Check if any elements are marked dirty.
   *
   * @returns True if at least one element is dirty
   */
  hasDirtyElements(): boolean {
    return this.dirtyComponents.size > 0 || this.dirtyWires.size > 0 || this.dirtyEnodes.size > 0;
  }

  /**
   * Clear all dirty markers without returning them.
   */
  clear(): void {
    this.dirtyComponents.clear();
    this.dirtyWires.clear();
    this.dirtyEnodes.clear();
  }

  /**
   * Get current count of dirty components (for debugging/metrics).
   *
   * @returns Number of dirty components
   */
  getDirtyComponentCount(): number {
    return this.dirtyComponents.size;
  }

  /**
   * Get current count of dirty wires (for debugging/metrics).
   *
   * @returns Number of dirty wires
   */
  getDirtyWireCount(): number {
    return this.dirtyWires.size;
  }

  /**
   * Get current count of dirty enodes (for debugging/metrics).
   *
   * @returns Number of dirty enodes
   */
  getDirtyEnodeCount(): number {
    return this.dirtyEnodes.size;
  }
}
