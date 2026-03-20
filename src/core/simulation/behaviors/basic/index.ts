import type {Component} from '../../../topology/Component';
import {ComponentState} from '../../states/ComponentState.js';
import {type IScheduledEvent, TRANSITION_DEFAULTS} from '../../types';
import {ComponentBehaviorMixin} from '../ComponentBehavior';
import {ENodeSourceType} from "../../../topology/types";
import type {IBehaviorResult} from "../types";

/**
 * to factorize behaviors of bipolar components emitting light (lightbulb/ LEDs even if it's a big simplification...)
 */
export abstract class BipolarLightEmitterBehaviorMixin extends ComponentBehaviorMixin {

    protected getBehavior(
        component: Component,
        state: ComponentState,
        activationCondition: boolean,
        targetTick: number
    ): IBehaviorResult {

        let hasChanged = false;
        const scheduledEvents: IScheduledEvent[] = [];

        if (activationCondition) {
            if (state.state === 'off' || state.state === 'goingOff') {
                hasChanged = true;
                state.setState('goingOn', targetTick);
                state.setNextState('on', targetTick + 1); // TODO handle component config later ?
                scheduledEvents.push({
                    targetId: component.id,
                    scheduledAtTick: state.startTick,
                    readyAtTick: state.expirationTick,
                    type: 'GoingOnEnd',
                    parameters: undefined,
                });
            }
        } else {
            if (state.state === 'on' || state.state === 'goingOn') {
                hasChanged = true;
                state.setState('goingOff', targetTick);
                state.setNextState('off', targetTick + 1); // TODO handle component config later ?
                scheduledEvents.push({
                    targetId: component.id,
                    scheduledAtTick: state.startTick,
                    readyAtTick: state.expirationTick,
                    type: 'GoingOffEnd',
                    parameters: undefined,
                });
            }
        }

        return {
            componentState: state,
            hasChanged: hasChanged,
            shouldCancelPending: false,
            scheduledEvents: scheduledEvents,
        };
    }

    override allowConductivity(
        _component: Component,
        _state: ComponentState,
        _conductivityType: ENodeSourceType,
        _pinId: string,
        _otherPinId: string
    ): boolean {
        return true; // TODO : see later if behavior changes for LEDs ?
    }

    override onEventFiring(
        _component: Component,
        state: ComponentState,
        event: IScheduledEvent
    ): IBehaviorResult {
        let hasChanged = false;

        if (event.type === 'GoingOffEnd') {
            if (state.state !== 'off') {
                hasChanged = true;
                state.setState('off', event.readyAtTick);
            }
        } else if (event.type === 'GoingOnEnd') {
            if (state.state !== 'on') {
                hasChanged = true;
                state.setState('on', event.readyAtTick);
            }
        }

        return {
            componentState: state,
            hasChanged: hasChanged,
            shouldCancelPending: false,
            scheduledEvents: [],
        };
    }
}

/**
 * Get the tick count from command parameters.
 * @param parameters - Command parameters map
 * @returns Number of ticks for transition (minimum 1)
 */
export function getTickCount(parameters: Map<string, string> | null | undefined): number {
    if (!parameters) {
        return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
    }
    const value = parseInt(parameters.get('tickCount') || '', 10);
    if (isNaN(value) || value < 1) {
        return TRANSITION_DEFAULTS.TRANSITION_SPAN_TICKS;
    }
    return value;
}