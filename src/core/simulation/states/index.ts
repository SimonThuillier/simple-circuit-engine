/**
 * Simulation state definitions
 * @module core/simulation/states
 */

export type { INodeElectricalState } from './types';
export { unionElectricalStates } from './types';

// Global circuit simulation state
export { SimulationState } from './SimulationState.js';

// Component states
export { ComponentState } from './ComponentState.js';
// basic
export { BatteryState } from './basic/BatteryState';
export { LightbulbState } from './basic/LightbulbState';
export { RectangleLEDState } from './basic/RectangleLEDState';
export { RelayState } from './basic/RelayState';
export { SmallLEDState } from './basic/SmallLEDState';
export { SwitchState } from './basic/SwitchState';
export { DoubleThrowSwitchState } from './basic/DoubleThrowSwitchState';
export { ClockState } from './basic/ClockState';

// gates
export { InverterState } from './gates/InverterState';
export { NandGateState } from './gates/NandGateState';
export { Nand4GateState } from './gates/Nand4GateState';
export { Nand8GateState } from './gates/Nand8GateState';
export { NorGateState } from './gates/NorGateState';
export { Nor4GateState } from './gates/Nor4GateState';
export { Nor8GateState } from './gates/Nor8GateState';
export { XorGateState } from './gates/XorGateState';
export { Xor4GateState } from './gates/Xor4GateState';
export { Xor8GateState } from './gates/Xor8GateState';
