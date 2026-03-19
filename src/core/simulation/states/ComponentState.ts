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
  protected _state: string;

  /**
   * Tick when this state started.
   */
  protected _startTick: number;

  /**
   * until when this state should last (-1 for no previsional expiration)
   */
  protected _expirationTick: number;

  /**
   * previsional nextState (null if current state has no expiration tick)
   */
  protected _nextState: string | null;

  /**
   * Create a new component state.
   *
   * @param componentId - UUID of the component
   * @param initialState - Initial operational state
   */
  protected constructor(componentId: UUID, initialState: string) {
    this.componentId = componentId;
    this._state = initialState;
    this._startTick = 0;
    this._expirationTick = -1;
    this._nextState = null;
  }

  public get state(): string {
    return this._state;
  }

  public setState(state: string, startTick: number): void {
    this._state = state;
    this._startTick = startTick;
    this._expirationTick = -1;
    this._nextState = null;
  }

  public get startTick(): number {
    return this._startTick;
  }

  public get expirationTick(): number {
    return this._expirationTick;
  }

  public get nextState(): string | null {
    return this._nextState;
  }

  public get hasExpiration(): boolean {
    return this._expirationTick >= 0 && !!this._nextState && this._nextState !== this.state;
  }

  public setNextState(nextState: string, expirationTick: number): void {
    this._nextState = nextState;
    this._expirationTick = expirationTick;
  }
}
