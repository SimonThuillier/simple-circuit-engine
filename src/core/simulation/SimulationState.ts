/**
 * Complete snapshot of circuit electrical state at a specific simulation tick
 * @module core/simulation
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { NodeElectricalState } from './states/NodeElectricalState.js';
import type { ComponentState } from './states/ComponentState.js';

/**
 * Represents the complete electrical state of the circuit at a specific time step.
 * Immutable snapshot that can be stored in history.
 *
 * @public
 */
export class SimulationState {
  /**
   * Current simulation step number (starts at 0).
   * @readonly
   */
  readonly tick: number;

  /**
   * Electrical state for each ENode (component pins and branching points).
   * Key: ENode UUID, Value: NodeElectricalState
   * @readonly
   */
  readonly nodeStates: ReadonlyMap<UUID, NodeElectricalState>;

  /**
   * Electrical state for each Wire connecting ENodes.
   * Key: Wire UUID, Value: NodeElectricalState
   * @readonly
   */
  readonly wireStates: ReadonlyMap<UUID, NodeElectricalState>;

  /**
   * Component-specific state for each component.
   * Key: Component UUID, Value: ComponentState subclass
   * @readonly
   */
  readonly componentStates: ReadonlyMap<UUID, ComponentState>;

  /**
   * Create a new simulation state snapshot.
   *
   * @param tick - Current simulation step number
   */
  constructor(tick: number) {
    if (tick < 0 || !Number.isInteger(tick)) {
      throw new RangeError(`Tick must be a non-negative integer (got ${tick})`);
    }

    this.tick = tick;
    this.nodeStates = new Map();
    this.wireStates = new Map();
    this.componentStates = new Map();
  }

  /**
   * Create a shallow clone of this state for history storage.
   * Maps are cloned but their contents are shared (structural sharing).
   *
   * @returns New SimulationState with same tick and cloned maps
   */
  clone(): SimulationState {
    const cloned = new SimulationState(this.tick);

    // Shallow clone maps (content objects are shared for memory efficiency)
    (cloned as { nodeStates: Map<UUID, NodeElectricalState> }).nodeStates = new Map(
      this.nodeStates
    );
    (cloned as { wireStates: Map<UUID, NodeElectricalState> }).wireStates = new Map(
      this.wireStates
    );
    (cloned as { componentStates: Map<UUID, ComponentState> }).componentStates = new Map(
      this.componentStates
    );

    return cloned;
  }
}
