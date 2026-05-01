/**
 * OneInput component behavior implementation
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../topology/Component';
import type { ComponentState } from '../../states/ComponentState';
import type { IComponentBehavior } from '../types';
import { ComponentType } from '../../../topology/types';
import { OneInputState } from '../../states/interface/OneInputState';
import { InputBehaviorMixin } from './InputBehaviorMixin';

/** Single-switch user input. See {@link InputBehaviorMixin}. */
export class OneInputBehavior extends InputBehaviorMixin implements IComponentBehavior {
  constructor() {
    super(ComponentType.OneInput);
  }

  createInitialState(component: Component): ComponentState {
    if (component.type !== this._componentType) {
      throw new Error(`Invalid component type for OneInputBehavior: ${component.type}`);
    }
    const initial = component.config.get('initialState') || '0';
    return new OneInputState(component.id, initial);
  }
}
