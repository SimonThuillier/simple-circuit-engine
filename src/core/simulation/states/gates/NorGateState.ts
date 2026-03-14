/**
 * NOR Gate component simulation state
 * @module core/simulation/states
 */

import {LogicGateState} from "./index";
import type {UUID} from "../../../utils/types";

/**
 * Simulation state for NOR Gate components.
 *
 * @public
 */
export class NorGateState extends LogicGateState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }
}
