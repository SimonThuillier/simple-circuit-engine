/**
 * Complete snapshot of circuit electrical state at a specific simulation tick
 * @module core/simulation
 */

import type { ComponentState, INodeElectricalState } from './index';
import type { UUID } from '../../utils';

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
  tick: number;

  /**
   * Electrical state for each ENode (component pins and branching points).
   * Key: ENode UUID, Value: INodeElectricalState
   * @readonly
   */
  readonly nodeStates: ReadonlyMap<UUID, INodeElectricalState>;

  /**
   * Electrical state for each Wire connecting ENodes.
   * Key: Wire UUID, Value: INodeElectricalState
   * @readonly
   */
  readonly wireStates: ReadonlyMap<UUID, INodeElectricalState>;

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

  setTick(tick: number) {
    this.tick = tick;
  }

  /**
   * Create a deep copy of this state for historical storage.
   *
   * @returns Cloned SimulationState
   */
  clone(): SimulationState {
    const clonedState = new SimulationState(this.tick);

    const clonedNodeStates: Map<UUID, INodeElectricalState> = new Map();
    for (const [id, state] of this.nodeStates.entries()) {
      clonedNodeStates.set(id, { ...state });
    }
    const clonedWireStates: Map<UUID, INodeElectricalState> = new Map();
    for (const [id, state] of this.wireStates.entries()) {
      clonedWireStates.set(id, { ...state });
    }
    const clonedComponentStates: Map<UUID, ComponentState> = new Map();
    for (const [id, state] of this.componentStates.entries()) {
      clonedComponentStates.set(
        id,
        Object.assign(Object.create(Object.getPrototypeOf(state)), state)
      );
    }

    Object.defineProperty(clonedState, 'nodeStates', {
      value: clonedNodeStates,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    Object.defineProperty(clonedState, 'wireStates', {
      value: clonedWireStates,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    Object.defineProperty(clonedState, 'componentStates', {
      value: clonedComponentStates,
      writable: false,
      configurable: false,
      enumerable: true,
    });

    return clonedState;
  }
}
