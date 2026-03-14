/**
 * Battery component behavior implementation
 * @module core/simulation/behaviors
 */

import { Component } from '../../../topology/Component';
import {ComponentBehaviorMixin} from '../ComponentBehavior';
import { BatteryState } from '../../states/basic/BatteryState';
import type { ComponentState } from '../../states/ComponentState';
import type {IComponentBehavior} from "../types";
import {ComponentType} from "../../../topology/types";

export class BatteryBehavior extends ComponentBehaviorMixin implements IComponentBehavior {

  constructor() {
    super(ComponentType.Battery);
  }

  /**
   * Create initial state for a battery.
   *
   * @param component - The Battery component
   * @returns Battery Initial state (always active and delivering voltage)
   */
  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for BatteryBehavior: ${component.type}`);
    }
    return new BatteryState(component.id);
  }
}
