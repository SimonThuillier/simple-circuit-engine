/**
 * TwoInput component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { TwoInputState } from '../../states/interface/TwoInputState';
import { InputBehaviorMixin } from './InputBehaviorMixin';

/** Two-switch user input. See {@link InputBehaviorMixin}. */
export class TwoInputBehavior extends InputBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.TwoInput);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for TwoInputBehavior: ${component.type}`);
    }
    const initial = component.config.get('initialState') || '0';
    return new TwoInputState(component.id, initial);
  }
}
