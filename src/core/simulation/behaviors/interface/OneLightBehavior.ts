/**
 * OneLight component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { OneLightState } from '../../states/interface/OneLightState';
import { LightBehaviorMixin } from './LightBehaviorMixin';

/** Single-light input mirror. See {@link LightBehaviorMixin}. */
export class OneLightBehavior extends LightBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.OneLight);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for OneLightBehavior: ${component.type}`);
    }
    return new OneLightState(component.id, '0');
  }
}
