/**
 * Component behavior interface for registry-based extensibility
 * @module core/simulation/behaviors
 */

import type {Component} from '../../topology/Component';
import {ComponentState} from '../states/ComponentState.js';
import type {IScheduledEvent, IUserCommand} from '../types';
import type {IBehaviorResult} from "./types";
import type {INodeElectricalState} from "../states/types";
import type {UUID} from "../../utils/types";
import {
  ComponentType,
  type IComponentTypeMetadata,
  ENodeSourceType,
  COMPONENT_TYPE_METADATA
} from "../../topology/types";

/**
 * to factorize default implementations in component behaviors
 */
export abstract class ComponentBehaviorMixin {
  /**
   * Component type this behavior handles (e.g., "battery", "led", "switch").
   * Used as the key in BehaviorRegistry.
   */
  protected readonly _componentType: ComponentType;

  constructor(componentType: ComponentType) {
    this._componentType = componentType;
  }

  get componentType(): ComponentType {
    return this._componentType;
  }

  protected get typeMetadata(): IComponentTypeMetadata {
    const metadata = COMPONENT_TYPE_METADATA[this._componentType];
    if (!metadata) {
      throw new Error(`Unknown metadata for Component type ${this._componentType}`);
    }
    return metadata;
  }

  protected getPinStates(
      component: Component,
      nodeStates: ReadonlyMap<UUID, INodeElectricalState>
  ): Map<string, INodeElectricalState> {
    const pinStates: Map<string, INodeElectricalState> = new Map();
    for (const pinId of component.pins) {
      pinStates.set(component.getPinLabel(pinId)!, nodeStates.get(pinId as UUID)!);
    }
    return pinStates;
  }

  /**
   * Default: nothing happens
   * @param _component
   * @param componentState
   * @param _nodeStates
   * @param _targetTick
   */
  onPinsChange(
      _component: Component,
      componentState: ComponentState,
      _nodeStates: ReadonlyMap<UUID, INodeElectricalState>,
      _targetTick: number
  ): IBehaviorResult {

    return {
      componentState: componentState,
      hasChanged: false,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }

  /**
   * Default: no conductivity between pins
   * @param _component
   * @param _state
   * @param _conductivityType
   * @param _pinId
   * @param _otherPinId
   */
  allowConductivity(
      _component: Component,
      _state: ComponentState,
      _conductivityType: ENodeSourceType,
      _pinId: string,
      _otherPinId: string
  ): boolean {
    return false;
  }

  onUserCommand(
      _component: Component,
      state: ComponentState,
      _command: IUserCommand
  ): IBehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }

  onEventFiring(
      _component: Component,
      state: ComponentState,
      _event: IScheduledEvent
  ): IBehaviorResult {
    return {
      componentState: state,
      hasChanged: false,
      shouldCancelPending: false,
      scheduledEvents: [],
    };
  }
}

