/**
 * TwoLight component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { TwoLightState } from '../../states/interface/TwoLightState';
import { LightBehaviorMixin } from './LightBehaviorMixin';

/** Two-light input mirror. See {@link LightBehaviorMixin}. */
export class TwoLightBehavior extends LightBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.TwoLight);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for TwoLightBehavior: ${component.type}`);
    }
    return new TwoLightState(component.id, '0');
  }
}
