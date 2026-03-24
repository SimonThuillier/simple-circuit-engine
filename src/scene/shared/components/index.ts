/**
 * Component visual factories
 * @module scene/shared/components
 */

export type { IFactoryRegistry, IComponentVisualFactory } from './ComponentVisualFactory.js';
export { CmpMatCategory, CmpMatVariant, CmpMatType, CMP_MATERIALS } from './types.js';

export { FactoryRegistry } from './FactoryRegistry.js';
export { DefaultVisualFactory } from './DefaultVisualFactory.js';
// Grouped registry
export type {
  ComponentGroup,
  IComponentGroupBuilder,
  IGroupedFactoryRegistry,
} from './GroupedFactoryRegistry.js';
export { GroupedFactoryRegistry } from './GroupedFactoryRegistry.js';

// Components

// basics
export { BatteryVisualFactory } from './basic/BatteryVisualFactory';
export { LabelVisualFactory } from './basic/LabelVisualFactory';
export { LightbulbVisualFactory } from './basic/LightbulbVisualFactory';
export { RectangleLEDVisualFactory } from './basic/RectangleLEDVisualFactory';
export { RelayVisualFactory } from './basic/RelayVisualFactory';
export { SmallLEDVisualFactory } from './basic/SmallLEDVisualFactory';
export { SwitchVisualFactory } from './basic/SwitchVisualFactory';
export { DoubleThrowSwitchVisualFactory } from './basic/DoubleThrowSwitchVisualFactory';
export { ClockVisualFactory } from './basic/ClockVisualFactory';

// gates
export { InverterVisualFactory } from './gates/InverterVisualFactory';
export { NandGateVisualFactory } from './gates/NandGateVisualFactory';
export { Nand4GateVisualFactory } from './gates/Nand4GateVisualFactory';
export { Nand8GateVisualFactory } from './gates/Nand8GateVisualFactory';
export { NorGateVisualFactory } from './gates/NorGateVisualFactory';
export { Nor4GateVisualFactory } from './gates/Nor4GateVisualFactory';
export { Nor8GateVisualFactory } from './gates/Nor8GateVisualFactory';
export { XorGateVisualFactory } from './gates/XorGateVisualFactory';
export { Xor4GateVisualFactory } from './gates/Xor4GateVisualFactory';
export { Xor8GateVisualFactory } from './gates/Xor8GateVisualFactory';
