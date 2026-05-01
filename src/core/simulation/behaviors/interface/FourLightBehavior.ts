/**
 * FourLight component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { FourLightState } from '../../states/interface/FourLightState';
import { LightBehaviorMixin } from './LightBehaviorMixin';

/** Four-light input mirror. See {@link LightBehaviorMixin}. */
export class FourLightBehavior extends LightBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.FourLight);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for FourLightBehavior: ${component.type}`);
    }
    return new FourLightState(component.id, '0');
  }
}
