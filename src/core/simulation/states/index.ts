/**
 * Simulation state definitions
 * @module core/simulation/states
 */

export type { NodeElectricalState } from './basic/NodeElectricalState';
export { ComponentState } from './ComponentState.js';

// Components

// basic
export { BatteryState } from './basic/BatteryState';
export { LightbulbState } from './basic/LightbulbState';
export { RectangleLEDState } from './basic/RectangleLEDState';
export { RelayState } from './basic/RelayState';
export { SmallLEDState } from './basic/SmallLEDState';
export { SwitchState } from './basic/SwitchState';
export { TransistorState } from './basic/TransistorState';
export { BufferState } from './basic/BufferState';

// gates
export { AndGateState } from './gates/AndGateState';
export { And4GateState } from './gates/And4GateState';
export { And8GateState } from './gates/And8GateState';
export { OrGateState } from './gates/OrGateState';
export { Or4GateState } from './gates/Or4GateState';
export { Or8GateState } from './gates/Or8GateState';
export { XorGateState } from './gates/XorGateState';
