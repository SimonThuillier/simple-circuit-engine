/**
 * Battery component simulation state
 * @module core/simulation/states
 */

import { ComponentState } from './ComponentState.js';
import type { UUID } from '../../types/Identifier.js';

/**
 * Simulation state for Battery components.
 * Batteries are stateless always-on pinSources.
 *
 * @public
 */
export class BatteryState extends ComponentState {
  /**
   * Create a new battery state.
   *
   * @param componentId - UUID of the battery component
   */
  constructor(componentId: UUID) {
    super(componentId, 'on');
  }
}
