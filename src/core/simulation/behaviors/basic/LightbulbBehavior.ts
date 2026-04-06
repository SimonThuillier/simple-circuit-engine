/**
 * lightbulb behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import { LightbulbState } from '../../states/basic/LightbulbState';
import {BipolarLightEmitterBehaviorMixin} from "./index";
import type {IBehaviorResult, IComponentBehavior} from "../types";
import {unionElectricalStates, type INodeElectricalState} from "../../states";
import type {UUID} from "../../../utils/types";
import {ComponentType} from "../../../topology/types";

export class LightbulbBehavior extends BipolarLightEmitterBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Lightbulb);
  }

  /**
   * Create initial state for a lightbulb.
   *
   * @param component - The lightbulb component
   * @returns lightbulbInitial state (always active and delivering voltage)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for lightbulbBehavior: ${component.type}`);
    }
    return new LightbulbState(component.id);
  }

  /**
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
