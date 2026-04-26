/**
 * EightLight component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { EightLightState } from '../../states/interface/EightLightState';
import { LightBehaviorMixin } from './LightBehaviorMixin';

/** Eight-light input mirror. See {@link LightBehaviorMixin}. */
export class EightLightBehavior extends LightBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.EightLight);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for EightLightBehavior: ${component.type}`);
    }
    return new EightLightState(component.id, '00');
  }
}
