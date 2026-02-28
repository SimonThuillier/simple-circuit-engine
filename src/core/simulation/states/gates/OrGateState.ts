/**
 * OR Gate component simulation state
 * @module core/simulation/states
 */

import type { UUID } from '../../../types/Identifier';
import { ComponentState } from '../ComponentState';

/**
 * Simulation state for OR Gate components.
 * Gates can be "low", "rising", "high", or "falling".
 *
 * @public
 */
export class OrGateState extends ComponentState {
  constructor(componentId: UUID, initialState: string = 'low') {
    super(componentId, initialState);
  }

  get isInTransition(): boolean {
    return this.state === 'rising' || this.state === 'falling';
  }

  get isHigh(): boolean {
    return this.state === 'high';
  }
}
