/**
 * Component visual factories
 * @module scene/shared/components
 */

export type { IFactoryRegistry, IComponentVisualFactory } from './ComponentVisualFactory.js';

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
export { TransistorVisualFactory } from './basic/TransistorVisualFactory';
export { BufferVisualFactory } from './basic/BufferVisualFactory';

// gates
export { AndGateVisualFactory } from './gates/AndGateVisualFactory';
export { And4GateVisualFactory } from './gates/And4GateVisualFactory';
export { And8GateVisualFactory } from './gates/And8GateVisualFactory';
export { OrGateVisualFactory } from './gates/OrGateVisualFactory';
export { Or4GateVisualFactory } from './gates/Or4GateVisualFactory';
export { Or8GateVisualFactory } from './gates/Or8GateVisualFactory';
export { XorGateVisualFactory } from './gates/XorGateVisualFactory';
