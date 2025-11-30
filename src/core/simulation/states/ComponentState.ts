/**
 * Base state for all component types
 * @module core/simulation/states
 */

import type { UUID } from '@/core/types/Identifier.js';

/**
 * Base class for component simulation state.
 * Extended by specific component types (BatteryState, LEDState, etc.)
 *
 * @abstract
 * @public
 */
export abstract class ComponentState {
  /**
   * Component UUID this state belongs to.
   * @readonly
   */
  readonly componentId: UUID;

  /**
   * Current operational state (varies by component type).
   * Examples: "on", "off", "open", "closed", "activating", "active"
   */
  state: string;

  /**
   * For transitional states: Tick when this transitional state started.
   * Null if no transition is in progress.
   * @readonly
   */
  readonly transitionStartTick: number | null;

  /**
   * Remaining delay steps before next state transition (0 = no delay).
   * Decremented each tick when > 0.
   * @default 0
   */
  delayCounter: number;

  /**
   * Create a new component state.
   *
   * @param componentId - UUID of the component
   * @param initialState - Initial operational state
   */
  constructor(componentId: UUID, initialState: string) {
    this.componentId = componentId;
    this.state = initialState;
    this.transitionStartTick = null;
    this.delayCounter = 0;
  }
}
