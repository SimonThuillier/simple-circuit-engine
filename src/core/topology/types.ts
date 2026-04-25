/**
 * types for core electrical/logical topology
 * @module core/topology
 */

import type { ICameraOptions, IPosition, UUID } from '../utils';

/**
 * canonic version for circuit files produced
 */
export const CIRCUIT_FILE_VERSION = '0.0.11';

/**
 * Type of electrical pinSources in the circuit.
 *
 * ENodes have a sourceType which can be undefined or one of the following:
 * - **Voltage**: ENode that provides a voltage source to the circuit. All Enodes of this type are considered at the same positive potential.
 * - **Current**: Ground/neutral ENodes that provides a current source to the circuit. All Enodes of this type are considered as points at
 * the same 0V-GROUND potential and are points from where electrons enters the circuit.
 */
export enum ENodeSourceType {
  Voltage = 'Voltage',
  Current = 'Current',
}

/**
 * Type of electrical node (ENode) in the circuit.
 *
 * ENodes represent atomic electrical connection points and come in two variants (immutable after node creation)
 *
 * - **Pin**: Connection point belonging to a Component. Position is derived
 *   from the parent component's position, rotation, and pin index. Automatically
 *   created when a component is added, deleted when component is removed.
 *
 * - **BranchingPoint**: Junction point where wires split. Has an independent
 *   position on the grid. Automatically created when wires are split, deleted
 *   when no wires remain connected (orphaned).
 */
export enum ENodeType {
  /**
   * Component pin connection point.
   *
   * Properties:
   * - Has parent component reference
   * - Has pin label within component
   * - Position derived from component
   * - Lifecycle tied to component (cascade deletion)
   */
  Pin = 'Pin',
  /**
   * Wire branching point (junction).
   *
   * Properties:
   * - Independent position on grid
   * - Created when wire is split
   * - Deleted when last wire is removed (orphaned cleanup)
   * - No parent component
   */
  BranchingPoint = 'BranchingPoint',
}

/**
 * Metadata describing a logic pin's interface data.
 *
 * @property interface - name of the pin's interface (one interface combine several pins in the case of numeric inputs/outpus)
 * @property index - index of the pin within the interface (starts at 0 by convention)
 */
export interface ILogicPinMetadata {
  readonly interface: string;
  readonly index: number;
}

/**
 * Metadata describing a component pin's source type and subtype.
 *
 * @property subtype - Pin role classification: 'free', 'vcc', 'logicInput', 'logicOutput'
 * @property logicPinData - only for pins of subtype 'logicInput' and 'logicOutput' (MANDATORY in these cases): their logic pin metadata (interface/index)
 * @property sourceType - Voltage/Current source or undefined for passive pins
 */
export interface IPinMetadata {
  readonly subtype: string;
  readonly logicPinData?: ILogicPinMetadata;
  readonly sourceType?: ENodeSourceType;
}
/**
 * Metadata for a component type.
 *
 * @property id - Unique string identifier matching the enum value
 * @property pins - Array of pin labels (order-significant)
 * @property config - Default configuration parameters (depends on the component, e.g., initialState, activationLogic, color...)
 */
export interface IComponentTypeMetadata {
  readonly id: string;
  readonly pins: Map<string, IPinMetadata>;
  readonly config: Map<string, string>;
}

/**
 * Available logic families
 *
 * - `CMOS1`: CMOS technology, base unit 1 inverter = 1 tick
 * - `TTL1`: TTL technology, base unit 1 NAND2 = 1 tick
 * - `Sandbox`: User-defined delays, no technology constraints
 */
export type LogicFamily = 'CMOS1' | 'TTL1' | 'Sandbox';

/** All supported logic families */
export const ALL_LOGIC_FAMILIES: LogicFamily[] = ['CMOS1', 'TTL1', 'Sandbox'];

/** Default logic family applied when none is specified */
export const DEFAULT_LOGIC_FAMILY: LogicFamily = 'CMOS1';

/** Interface defining an ElectricalNode **/
export interface IENode {
  id: UUID;
  type: ENodeType;
  component?: UUID | null;
  pinLabel?: string | null;
  position?: IPosition | null;
  source?: ENodeSourceType | null;
  subtype: string;
  logicMetadata: ILogicPinMetadata | null;
}
/** Interface defining a Wire (link between 2 ENodes supporting intermediate position to tune its path) **/
export interface IWire {
  id: UUID;
  node1: UUID;
  node2: UUID;
  intermediatePositions: IPosition[];
}
/** Interface defining a Component **/
export interface IComponent {
  id: UUID;
  type: ComponentType;
  position: IPosition;
  rotation: number;
  pins: UUID[];
  config: { [key: string]: string };
  editable: boolean;
}

/**
 * User editable options for a Circuit
 */
export type ICircuitOptions = {
  name: string;
  defaultLogicFamily: LogicFamily;
};
/** circuit metadata type — combines user writable options and managed metadata */
export type ICircuitMetadata = {
  version: string;
  options: ICircuitOptions;
  cameraOptions: ICameraOptions;
  size: number;
  divisions: number;
};
/** circuit type */
export type ICircuit = {
  metadata: ICircuitMetadata;
  components: Iterable<IComponent>;
  enodes: Iterable<IENode>;
  wires: Iterable<IWire>;
};

/**
 * Enumeration of ALL available component types.
 *
 * Each component type represents a specific electrical element that can be
 * placed in a circuit (battery, LED, transistor, etc.).
 */
export enum ComponentType {
  // basic components
  Cube = 'cube', // no pins component for testing purposes mainly
  Label = 'label', // decorative text label with no pins
  Battery = 'battery',
  Switch = 'switch',
  DoubleThrowSwitch = 'doubleThrowSwitch',
  Lightbulb = 'lightbulb',
  Relay = 'relay',
  SmallLED = 'smallLED',
  RectangleLED = 'rectangleLED',
  Clock = 'clock',
  // Gates
  Inverter = 'inverter',
  NandGate = 'nandGate',
  Nand4Gate = 'nand4Gate',
  Nand8Gate = 'nand8Gate',
  NorGate = 'norGate',
  Nor4Gate = 'nor4Gate',
  Nor8Gate = 'nor8Gate',
  XorGate = 'xorGate',
  Xor4Gate = 'xor4Gate',
  Xor8Gate = 'xor8Gate',
  // Arithmetic
  HalfAdder = 'halfAdder',
  Adder = 'adder',
  EightBitAdder = 'eightBitAdder',
  EightBitOnesComplement = 'eightBitOnesComplement',
  // Interface
  OneInput = 'oneInput',
  TwoInput = 'twoInput',
  FourInput = 'fourInput',
  EightInput = 'eightInput',
  OneLight = 'oneLight',
  TwoLight = 'twoLight',
  FourLight = 'fourLight',
  EightLight = 'eightLight',
}

/**
 * Component type metadata lookup table.
 *
 * Maps each ComponentType enum value to its associated metadata
 * (id, display name, pins, and default configuration arguments).
 *
 */
export const COMPONENT_TYPE_METADATA: Readonly<Record<ComponentType, IComponentTypeMetadata>> = {
  [ComponentType.Switch]: {
    id: ComponentType.Switch,
    pins: new Map([
      ['input', { subtype: 'free' }],
      ['output', { subtype: 'free' }],
    ]),
    config: new Map([
      ['initialState', 'open'],
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.DoubleThrowSwitch]: {
    id: ComponentType.DoubleThrowSwitch, // SPDT (Single-Pole Double-Throw) Switch
    pins: new Map([
      ['input1', { subtype: 'free' }],
      ['input2', { subtype: 'free' }],
      ['output', { subtype: 'free' }],
    ]),
    config: new Map([
      ['initialState', 'input1'],
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.Battery]: {
    id: ComponentType.Battery,
    pins: new Map([
      ['cathode', { subtype: 'mainVcc', sourceType: ENodeSourceType.Voltage }],
      ['anode', { subtype: 'mainGnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([]),
  },
  [ComponentType.Lightbulb]: {
    id: ComponentType.Lightbulb,
    pins: new Map([
      ['pin1', { subtype: 'free' }],
      ['pin2', { subtype: 'free' }],
    ]),
    config: new Map([
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.Relay]: {
    id: ComponentType.Relay,
    pins: new Map([
      ['cmd_in', { subtype: 'free' }],
      ['cmd_out', { subtype: 'free' }],
      ['power_in', { subtype: 'free' }],
      ['power_out', { subtype: 'free' }],
    ]),
    config: new Map([
      ['activationLogic', 'positive'],
      ['transitionSpan', '1'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.SmallLED]: {
    id: ComponentType.SmallLED,
    pins: new Map([
      ['pin1', { subtype: 'free' }],
      ['pin2', { subtype: 'free' }],
    ]),
    config: new Map([
      ['transitionSpan', '1'],
      ['idleColor', 'white'],
      ['activeColor', '#ffff00'],
      ['size', '1'],
      ['ywRatio', '1'],
    ]),
  },
  [ComponentType.RectangleLED]: {
    id: ComponentType.RectangleLED,
    pins: new Map([
      ['pin1', { subtype: 'free' }],
      ['pin2', { subtype: 'free' }],
    ]),
    config: new Map([
      ['transitionSpan', '1'],
      ['idleColor', 'white'],
      ['activeColor', '#ffff00'],
      ['size', '1'],
      ['hwRatio', '1'],
      ['ywRatio', '1'],
    ]),
  },
  [ComponentType.Cube]: {
    id: ComponentType.Cube,
    pins: new Map([]),
    config: new Map([['color', 'red']]),
  },
  [ComponentType.Label]: {
    id: ComponentType.Label,
    pins: new Map([]),
    config: new Map([
      ['text', 'Label'],
      ['size', '1'],
    ]),
  },
  [ComponentType.Clock]: {
    id: ComponentType.Clock,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['startHigh', 'true'],
      ['halfPeriod', '2'],
    ]),
  },
  [ComponentType.Inverter]: {
    id: ComponentType.Inverter,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '1'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.NandGate]: {
    id: ComponentType.NandGate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '1'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Nand4Gate]: {
    id: ComponentType.Nand4Gate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '2'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Nand8Gate]: {
    id: ComponentType.Nand8Gate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['input5', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 4 } }],
      ['input6', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 5 } }],
      ['input7', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 6 } }],
      ['input8', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 7 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '3'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.NorGate]: {
    id: ComponentType.NorGate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '1'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Nor4Gate]: {
    id: ComponentType.Nor4Gate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '2'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Nor8Gate]: {
    id: ComponentType.Nor8Gate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['input5', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 4 } }],
      ['input6', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 5 } }],
      ['input7', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 6 } }],
      ['input8', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 7 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'negative'],
      ['transitionSpan', '3'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.XorGate]: {
    id: ComponentType.XorGate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'positive'],
      ['transitionSpan', '2'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Xor4Gate]: {
    id: ComponentType.Xor4Gate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'positive'],
      ['transitionSpan', '4'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Xor8Gate]: {
    id: ComponentType.Xor8Gate,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['input5', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 4 } }],
      ['input6', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 5 } }],
      ['input7', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 6 } }],
      ['input8', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 7 } }],
      ['output', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['activationLogic', 'positive'],
      ['transitionSpan', '6'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.HalfAdder]: {
    id: ComponentType.HalfAdder,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['inputA', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['inputB', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['sum', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 0 } }],
      ['carry', { subtype: 'logicOutput', logicPinData: { interface: 'carry', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['transitionSpan', '2'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.Adder]: {
    id: ComponentType.Adder,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['carryIn', { subtype: 'logicInput', logicPinData: { interface: 'carryIn', index: 0 } }],
      ['inputA', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['inputB', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['sum', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 0 } }],
      ['carryOut', { subtype: 'logicOutput', logicPinData: { interface: 'carryOut', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['transitionSpan', '4'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.EightBitAdder]: {
    id: ComponentType.EightBitAdder,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['carryIn', { subtype: 'logicInput', logicPinData: { interface: 'carryIn', index: 0 } }],
      ['inputA-0', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 0 } }],
      ['inputA-1', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 1 } }],
      ['inputA-2', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 2 } }],
      ['inputA-3', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 3 } }],
      ['inputA-4', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 4 } }],
      ['inputA-5', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 5 } }],
      ['inputA-6', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 6 } }],
      ['inputA-7', { subtype: 'logicInput', logicPinData: { interface: 'inputA', index: 7 } }],
      ['inputB-0', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 0 } }],
      ['inputB-1', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 1 } }],
      ['inputB-2', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 2 } }],
      ['inputB-3', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 3 } }],
      ['inputB-4', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 4 } }],
      ['inputB-5', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 5 } }],
      ['inputB-6', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 6 } }],
      ['inputB-7', { subtype: 'logicInput', logicPinData: { interface: 'inputB', index: 7 } }],
      ['sum-0', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 0 } }],
      ['sum-1', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 1 } }],
      ['sum-2', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 2 } }],
      ['sum-3', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 3 } }],
      ['sum-4', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 4 } }],
      ['sum-5', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 5 } }],
      ['sum-6', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 6 } }],
      ['sum-7', { subtype: 'logicOutput', logicPinData: { interface: 'sum', index: 7 } }],
      ['carryOut', { subtype: 'logicOutput', logicPinData: { interface: 'carryOut', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['transitionSpan', '4'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.EightBitOnesComplement]: {
    id: ComponentType.EightBitOnesComplement,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['invert', { subtype: 'logicInput', logicPinData: { interface: 'invert', index: 0 } }],
      ['input-0', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input-1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input-2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input-3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['input-4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 4 } }],
      ['input-5', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 5 } }],
      ['input-6', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 6 } }],
      ['input-7', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 7 } }],
      ['output-0', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['output-1', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 1 } }],
      ['output-2', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 2 } }],
      ['output-3', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 3 } }],
      ['output-4', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 4 } }],
      ['output-5', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 5 } }],
      ['output-6', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 6 } }],
      ['output-7', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 7 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['defaultLogicFamily', 'CMOS1'],
      ['transitionSpan', '3'],
      ['initializationOrder', ''],
    ]),
  },
  [ComponentType.OneInput]: {
    id: ComponentType.OneInput,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['output-0', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['initialState', '0'],
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.TwoInput]: {
    id: ComponentType.TwoInput,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['output-0', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['output-1', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 1 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['initialState', '0'],
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.FourInput]: {
    id: ComponentType.FourInput,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['output-0', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['output-1', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 1 } }],
      ['output-2', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 2 } }],
      ['output-3', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 3 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['initialState', '0'],
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.EightInput]: {
    id: ComponentType.EightInput,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['output-0', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 0 } }],
      ['output-1', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 1 } }],
      ['output-2', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 2 } }],
      ['output-3', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 3 } }],
      ['output-4', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 4 } }],
      ['output-5', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 5 } }],
      ['output-6', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 6 } }],
      ['output-7', { subtype: 'logicOutput', logicPinData: { interface: 'output', index: 7 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['initialState', '00'],
      ['transitionSpan', '1'],
      ['size', '1'],
    ]),
  },
  [ComponentType.OneLight]: {
    id: ComponentType.OneLight,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input-0', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['transitionSpan', '2'],
      ['size', '1'],
    ]),
  },
  [ComponentType.TwoLight]: {
    id: ComponentType.TwoLight,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input-0', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input-1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['transitionSpan', '2'],
      ['size', '1'],
    ]),
  },
  [ComponentType.FourLight]: {
    id: ComponentType.FourLight,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input-0', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input-1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input-2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input-3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['transitionSpan', '2'],
      ['size', '1'],
    ]),
  },
  [ComponentType.EightLight]: {
    id: ComponentType.EightLight,
    pins: new Map([
      ['vcc', { subtype: 'vcc', sourceType: ENodeSourceType.Voltage }],
      ['input-0', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 0 } }],
      ['input-1', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 1 } }],
      ['input-2', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 2 } }],
      ['input-3', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 3 } }],
      ['input-4', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 4 } }],
      ['input-5', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 5 } }],
      ['input-6', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 6 } }],
      ['input-7', { subtype: 'logicInput', logicPinData: { interface: 'input', index: 7 } }],
      ['gnd', { subtype: 'gnd', sourceType: ENodeSourceType.Current }],
    ]),
    config: new Map([
      ['transitionSpan', '2'],
      ['size', '1'],
    ]),
  },
};
