/**
 * FourInput component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { FourInputState } from '../../states/interface/FourInputState';
import { InputBehaviorMixin } from './InputBehaviorMixin';

/** Four-switch user input. See {@link InputBehaviorMixin}. */
export class FourInputBehavior extends InputBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.FourInput);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for FourInputBehavior: ${component.type}`);
    }
    const initial = component.config.get('initialState') || '0';
    return new FourInputState(component.id, initial);
  }
}
