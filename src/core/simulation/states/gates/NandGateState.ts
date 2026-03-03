/**
 * NAND Gate component simulation state
 * @module core/simulation/states
 */

import {LogicGateState} from "./index";
import type {UUID} from "../../../utils/types";

/**
 * Simulation state for NAND Gate components.
 *
 * @public
 */
export class NandGateState extends LogicGateState {
  /**
   * Create a new NAND Gate state.
   *
   * @param componentId - UUID of the NAND Gate component
   * @param initialState - Initial operational state (default: "low")
   */
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
