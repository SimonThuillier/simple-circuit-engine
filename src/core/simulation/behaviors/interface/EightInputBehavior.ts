/**
 * EightInput component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { EightInputState } from '../../states/interface/EightInputState';
import { InputBehaviorMixin } from './InputBehaviorMixin';

/** Eight-switch user input. See {@link InputBehaviorMixin}. */
export class EightInputBehavior extends InputBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.EightInput);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for EightInputBehavior: ${component.type}`);
    }
    const initial = component.config.get('initialState') || '00';
    return new EightInputState(component.id, initial);
  }
}
