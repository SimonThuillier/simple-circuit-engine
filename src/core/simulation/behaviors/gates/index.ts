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

        // go low immediately if no voltage
        state.startTick = state.state === 'low' ? state.startTick : targetTick; // if component was already low we keep this startTick
        const hasChanged = state.state !== 'low';
        const shouldCancelPending = state.state !== 'low';
        state.state = 'low'; // no vcc voltage -> nothing immediately
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

        // go indeterminate immediately
        state.startTick = state.state === 'indeterminate' ? state.startTick : targetTick; // if component was already indeterminate we keep this startTick
        const hasChanged = state.state !== 'indeterminate';
        const shouldCancelPending = state.state !== 'indeterminate';
        state.state = 'indeterminate';
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

        const transitionSpan = getTransitionSpan(component.config);
        // technical guard clause: if state isn't a known value it's considered low (shouldn't happen but allow to simplify logic beneath)
        if(!['low', 'rising', 'high', 'falling', 'indeterminate'].includes(state.state)){
            state.state = 'low';
        }

        if (activationCondition) {
            if(state.state === 'low' || state.state === 'indeterminate'){
                state.state = 'rising';
                state.startTick = targetTick;
                return {
                    componentState: state,
                    hasChanged: true,
                    shouldCancelPending: false,
                    scheduledEvents: [{
                        targetId: component.id,
                        scheduledAtTick: targetTick,
                        readyAtTick: targetTick + transitionSpan,
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
            // last case: falling
            state.state = 'high';
            return {
                componentState: state,
                hasChanged: true,
                shouldCancelPending: true, // goes back to high immediately and cancel pending FallingComplete event
                scheduledEvents: [],
            };
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
        if(state.state === 'high'){
            state.state = 'falling';
            state.startTick = targetTick;
            return {
                componentState: state,
                hasChanged: true,
                shouldCancelPending: false,
                scheduledEvents: [{
                    targetId: component.id,
                    scheduledAtTick: targetTick,
                    readyAtTick: targetTick + transitionSpan,
                    type: 'FallingComplete',
                    parameters: undefined,
                }],
            };
        }
        // last case: rising or indeterminate
        state.state = 'low';
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
                state.startTick = event.readyAtTick;
                state.state = 'high';
            }
        } else if (event.type === 'FallingComplete') {
            if (state.state !== 'low') {
                hasChanged = true;
                state.startTick = event.readyAtTick;
                state.state = 'low';
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

