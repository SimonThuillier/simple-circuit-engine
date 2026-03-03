/**
 * Base state for all component types
 * @module core/simulation/states
 */


import type {UUID} from "../../utils/types";

/**
 * Base class for component simulation state.
 * Extended by specific component types (BatteryState, LEDState, etc.)
 * One instance per component throughout simulation that will be mutated in place.
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
   * Tick when this state started.
   */
  startTick: number;

  /**
   * Create a new component state.
   *
   * @param componentId - UUID of the component
   * @param initialState - Initial operational state
   */
  constructor(componentId: UUID, initialState: string) {
    this.componentId = componentId;
    this.state = initialState;
    this.startTick = 0;
  }

  hasSameComponent(other: ComponentState): boolean {
    return this.componentId === other.componentId;
  }
}
