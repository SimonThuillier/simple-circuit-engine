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

// arithmetic
export { ArithmeticState } from './arithmetic/ArithmeticState';
export { HalfAdderState } from './arithmetic/HalfAdderState';
export { AdderState } from './arithmetic/AdderState';
export { EightBitAdderState } from './arithmetic/EightBitAdderState';
export { EightBitOnesComplementState } from './arithmetic/EightBitOnesComplementState';

// interface
export { InputState } from './interface/InputState';
export { OneInputState } from './interface/OneInputState';
export { TwoInputState } from './interface/TwoInputState';
export { FourInputState } from './interface/FourInputState';
export { EightInputState } from './interface/EightInputState';
export { LightState } from './interface/LightState';
export { OneLightState } from './interface/OneLightState';
export { TwoLightState } from './interface/TwoLightState';
export { FourLightState } from './interface/FourLightState';
export { EightLightState } from './interface/EightLightState';
