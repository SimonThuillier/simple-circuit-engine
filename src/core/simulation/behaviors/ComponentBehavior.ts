/**
 * Component behavior interface for registry-based extensibility
 * @module core/simulation/behaviors
 */

import type {Component} from '../../topology/Component';
import {ComponentState} from '../states/ComponentState.js';
import {type IScheduledEvent, type IUserCommand, TRANSITION_DEFAULTS} from '../types';
import type {IBehaviorResult} from "./types";
import type {INodeElectricalState} from "../states/types";
import type {UUID} from "../../utils/types";
import {
  COMPONENT_TYPE_METADATA,
  ComponentType,
  ENodeSourceType,
  type IComponentTypeMetadata
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

  protected getChangedPins(
      newPinStates: Map<string, INodeElectricalState>,
      prevPinStates: Map<string, INodeElectricalState>
  ): Set<string> {
    const changedPins = new Set<string>();

    for(const [key, newState] of newPinStates) {
      if(!prevPinStates.has(key)) {
        continue;
      }
      const prevState = prevPinStates.get(key);
      if(newState.hasVoltage !== prevState?.hasVoltage || newState.hasCurrent !== prevState?.hasCurrent){
        changedPins.add(key);
      }
    }
    return changedPins;
  }

  /**
   * Default: no custom onStart behavior
   * @param _component
   * @param _componentState
   */
  onStart(
      _component: Component,
      _componentState: ComponentState,
  ): IBehaviorResult | null {
    return null
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

/**
 * Get the transition span from component config.
 * @param config - Component config map
 * @returns Number of ticks for transition (minimum 1)
 */
export function getTransitionSpan(config: Map<string, string>): number {
  const value = parseInt(config.get('transitionSpan') || '', 10);
  if (isNaN(value) || value < 1) {
    return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
  }
  return value;
}