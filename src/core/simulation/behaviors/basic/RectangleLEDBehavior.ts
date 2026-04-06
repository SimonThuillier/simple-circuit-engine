/**
 * RectangleLED component behavior implementation (just an extension of SmallLEDBehavior)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { RectangleLEDState } from '../../states/basic/RectangleLEDState';
import {unionElectricalStates, type INodeElectricalState} from "../../states";
import {BipolarLightEmitterBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

export class RectangleLEDBehavior extends BipolarLightEmitterBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.RectangleLED);
  }

  /**
   * Create initial state for a RectangleLED.
   *
   * @param component - The smallLED component
   * @returns LED Initial state (always active and delivering voltage)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for RectangleLEDBehavior: ${component.type}`);
    }
    return new RectangleLEDState(component.id);
  }

  /**
   * only symmetrical behavior of LEDS is handled for now
   * @param component
   * @param state
   * @param nodeStates
   * @param targetTick
   */
  override onPinsChange(
      component: Component,
      state: ComponentState,
      nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
      targetTick: number
  ): IBehaviorResult {
    const newPinStates = this.getPinStates(component, nodeStates);
    state.pinStates = newPinStates;

    const union = unionElectricalStates(newPinStates.get('pin1')!, newPinStates.get('pin2')!);
    const activationCondition = union.hasVoltage && union.hasCurrent;

    return this.getBehavior(component, state, activationCondition, targetTick);
  }
}
