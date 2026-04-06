import {ENodeSourceType, } from "../../../topology/types";
import type {Component} from '../../../topology/Component';
import {type INodeElectricalState} from "../../states/types";
import {ComponentState} from '../../states/ComponentState.js';
import {type IScheduledEvent} from '../../types';
import {ComponentBehaviorMixin, getTransitionSpan} from '../ComponentBehavior';
import type {IBehaviorResult} from "../types";


/**
 * to factorize default implementations in logic gates behaviors
 */
export abstract class LogicGateBehaviorMixin extends ComponentBehaviorMixin {

    /**
     * default return for all logic gates when vcc fails -> go low immediately
     * @param state
     * @param pinStates
     * @protected
     */
    protected vccGuardBehavior(
        state: ComponentState,
        pinStates: Map<string, INodeElectricalState>,
        targetTick: number
    ): IBehaviorResult | null {
        const vccVoltage = pinStates.get('vcc')!.hasVoltage;
        if (vccVoltage) {
            return null;
        }

        let hasChanged = false;
        let shouldCancelPending = false;
        const previousState = state.state;
        // go low immediately if no voltage
        if (previousState !== 'low'){
            state.setState('low', targetTick);
            hasChanged = true;
            shouldCancelPending = true;
        }

        return {
            componentState: state,
            hasChanged: hasChanged,
            shouldCancelPending: shouldCancelPending,
            scheduledEvents: [],
        };
    }

    /**
     * guard scanning all inputs of logic gates to detect if Any has:
     * - both voltage and ground hence with established flowing current
     * - neither voltage nor ground
     * it makes a not well-defined input between LOW and HIGH
     * in that case gate goes to state indeterminate and output nothing too
     * @param state
     * @param pinStates
     * @param targetTick
     * @protected
     */
    protected nonLogicInputGuardBehavior(
        state: ComponentState,
        pinStates: Map<string, INodeElectricalState>,
        targetTick: number
    ): IBehaviorResult | null {

        let activateGuard = false;

        const pinsMeta = this.typeMetadata.pins;
        for (const [pinLabel, pinState] of pinStates) {
            if (!pinsMeta.has(pinLabel)) continue;
            const pinMeta = pinsMeta.get(pinLabel);
            if (!pinMeta) continue; // shouldn't occur but here as technical let pass
            if (pinMeta?.subtype !== 'logicInput') continue;
            // case both voltage and ground
            if (pinState.hasVoltage && pinState.hasCurrent) {
                activateGuard = true;
                break;
            }
            // case neither voltage nor ground
            if (!pinState.hasVoltage && !pinState.hasCurrent) {
                activateGuard = true;
                break;
            }
        }

        if (!activateGuard) {
            return null;
        }

        let hasChanged = false;
        let shouldCancelPending = false;
        const previousState = state.state;
        // go indeterminate immediately
        if (previousState !== 'indeterminate'){
            state.setState('indeterminate', targetTick);
            hasChanged = true;
            shouldCancelPending = true;
        }

        return {
            componentState: state,
            hasChanged: hasChanged,
            shouldCancelPending: shouldCancelPending,
            scheduledEvents: [],
        };
    }

    protected getBehavior(
        component: Component,
        state: ComponentState,
        activationCondition: boolean,
        targetTick: number
    ): IBehaviorResult {
        // technical guard clause: if state isn't a known value it's considered low (shouldn't happen but allow to simplify logic beneath)
        if(!['low', 'rising', 'high', 'falling', 'indeterminate'].includes(state.state)){
            state.setState('low', targetTick);
            return {
                componentState: state,
                hasChanged: true,
                shouldCancelPending: true, // goes back to low immediately and cancel pending RisingComplete event
                scheduledEvents: [],
            };
        }

        const transitionSpan = getTransitionSpan(component.config);
        const span = state.expirationTick < 1 ? transitionSpan : Math.max(targetTick - state.startTick, 1);

        if (activationCondition) {
            if(state.state === 'low' || state.state === 'falling' || state.state === 'indeterminate'){
                state.setState('rising', targetTick);
                state.setNextState('high', targetTick + span);
                return {
                    componentState: state,
                    hasChanged: true,
                    shouldCancelPending: true,
                    scheduledEvents: [{
                        targetId: component.id,
                        scheduledAtTick: state.startTick,
                        readyAtTick: state.expirationTick,
                        type: 'RisingComplete',
                        parameters: undefined,
                    }],
                };
            }
            if(state.state === 'rising' || state.state === 'high'){
                // still rising or high
                return {
                    componentState: state,
                    hasChanged: false,
                    shouldCancelPending: false,
                    scheduledEvents: [],
                };
            }
        }
        // case should deactivate
        if(state.state === 'falling' || state.state === 'low'){
            // still falling or low
            return {
                componentState: state,
                hasChanged: false,
                shouldCancelPending: false,
                scheduledEvents: [],
            };
        }
        if(state.state === 'high' || state.state === 'rising' || state.state === 'indeterminate'){
            state.setState('falling', targetTick);
            state.setNextState('low', targetTick + span);
            return {
                componentState: state,
                hasChanged: true,
                shouldCancelPending: true,
                scheduledEvents: [{
                    targetId: component.id,
                    scheduledAtTick: state.startTick,
                    readyAtTick: state.expirationTick,
                    type: 'FallingComplete',
                    parameters: undefined,
                }],
            };
        }
        // last case: shouldn't arrive here
        state.setState('low', targetTick);
        return {
            componentState: state,
            hasChanged: true,
            shouldCancelPending: true, // goes back to low immediately and cancel pending RisingComplete event
            scheduledEvents: [],
        };
    }

    override allowConductivity(
        component: Component,
        state: ComponentState,
        _conductivityType: ENodeSourceType,
        pinId: string,
        otherPinId: string
    ): boolean {
        if (pinId === otherPinId) return true;
        const pinLabel = component.getPinLabel(pinId);
        const otherPinLabel = component.getPinLabel(otherPinId);
        if (!pinLabel || !otherPinLabel) return false;
        const pinLabels = [pinLabel, otherPinLabel];

        if (pinLabels.includes('vcc') && pinLabels.includes('output')) {
            return state.state === 'high' || state.state === 'falling';
        }
        if (pinLabels.includes('gnd') && pinLabels.includes('output')) {
            return state.state === 'low' || state.state === 'rising';
        }
        return false;
    }

    override onEventFiring(
        _component: Component,
        state: ComponentState,
        event: IScheduledEvent
    ): IBehaviorResult {
        let hasChanged = false;

        if (event.type === 'RisingComplete') {
            if (state.state !== 'high') {
                hasChanged = true;
                state.setState('high', event.readyAtTick);
            }
        } else if (event.type === 'FallingComplete') {
            if (state.state !== 'low') {
                hasChanged = true;
                state.setState('low', event.readyAtTick);
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

