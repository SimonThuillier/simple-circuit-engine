/**
 * Double Switch component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from '../ComponentState';

import type {UUID} from "../../../utils/types";

/**
 * Simulation state for DoubleSwitch (SPDT - Single-Pole Double-Throw - switch) components.
 * These switches can be "input1", "1to2", "input2" or "2to1"
 *
 * @public
 */
export class DoubleThrowSwitchState extends ComponentState {
  /**
   * Create a new double Switch state.
   *
   * @param componentId - UUID of the double Switch component
   * @param initialState - Initial operational state (default: "input1")
   */
  constructor(componentId: UUID, initialState: string = 'input1') {
    super(componentId, initialState);
  }

  /**
   * Check if switch is in 1to2 or 2to1 state
   */
  get isInTransition(): boolean {
    return this.state === '1to2' || this.state === '2to1';
  }
}
