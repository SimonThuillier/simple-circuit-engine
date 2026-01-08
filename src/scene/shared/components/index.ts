/**
 * Component visual factories
 * @module scene/shared/components
 */

export type { IFactoryRegistry, IComponentVisualFactory } from './ComponentVisualFactory.js';

export { FactoryRegistry } from './FactoryRegistry.js';
export { DefaultVisualFactory } from './DefaultVisualFactory.js';

// Components
export { BatteryVisualFactory } from './BatteryVisualFactory.js';
export { LabelVisualFactory } from './LabelVisualFactory.js';
export { LightbulbVisualFactory } from './LightbulbVisualFactory.js';
export { RectangleLEDVisualFactory } from './RectangleLEDVisualFactory.js';
export { RelayVisualFactory } from './RelayVisualFactory.js';
export { SmallLEDVisualFactory } from './SmallLEDVisualFactory.js';
export { SwitchVisualFactory } from './SwitchVisualFactory.js';
export { TransistorVisualFactory } from './TransistorVisualFactory.js';

