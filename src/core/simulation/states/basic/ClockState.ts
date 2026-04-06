/**
 * Clock component simulation state
 * @module core/simulation/states
 */
import type { UUID } from '../../../utils';
import { ComponentState } from '../ComponentState';

/**
 * Simulation state for Clock components.
 * Clock output either voltage (LOGIC HIGH) or LOGIC LOW switching periodically
 *
 * @public
 */
export class ClockState extends ComponentState {
  /**
   * Create a new Clock state, either gnd or vcc
   *
   * @param componentId - UUID of the Clock component
   */
  constructor(componentId: UUID) {
    super(componentId, 'high');
  }
}
