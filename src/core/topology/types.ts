/**
 * types for core electrical/logical topology
 * @module core/topology
 */

import type {ICameraOptions, IPosition, UUID} from "../utils";

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
 * Metadata describing a component pin's source type and subtype.
 *
 * @property sourceType - Voltage/Current source or undefined for passive pins
 * @property subtype - Pin role classification: 'free', 'vcc', 'logicInput', 'logicOutput'
 */
export interface IPinMetadata {
    readonly subtype: string;
    readonly sourceType: ENodeSourceType | undefined;
}
/**
 * Metadata for a component type.
 *
 * @property id - Unique string identifier matching the enum value
 * @property name - Human-readable display name
 * @property pins - Array of pin labels (order-significant)
 * @property config - Default configuration parameters (depends on the component, e.g., initialState, activationLogic, color...)
 */
export interface IComponentTypeMetadata {
    readonly id: string;
    readonly name: string;
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
        name: 'Switch',
        pins: new Map([
            ['input', {subtype: 'free', sourceType: undefined}],
            ['output', {subtype: 'free', sourceType: undefined}],
        ]),
        config: new Map([
            ['initialState', 'open'],
            ['size', '1'],
        ]),
    },
    [ComponentType.DoubleThrowSwitch]: {
        id: ComponentType.DoubleThrowSwitch, // SPDT (Single-Pole Double-Throw) Switch
        name: 'DoubleThrowSwitch',
        pins: new Map([
            ['input1', {subtype: 'free', sourceType: undefined}],
            ['input2', {subtype: 'free', sourceType: undefined}],
            ['output', {subtype: 'free', sourceType: undefined}],
        ]),
        config: new Map([
            ['initialState', 'input1'],
            ['size', '1'],
        ]),
    },
    [ComponentType.Battery]: {
        id: ComponentType.Battery,
        name: 'Battery',
        pins: new Map([
            ['cathode', {subtype: 'mainVcc', sourceType: ENodeSourceType.Voltage}],
            ['anode', {subtype: 'mainGnd', sourceType: ENodeSourceType.Current}],
        ]),
        config: new Map([]),
    },
    [ComponentType.Lightbulb]: {
        id: ComponentType.Lightbulb,
        name: 'Lightbulb',
        pins: new Map([
            ['pin1', {subtype: 'free', sourceType: undefined}],
            ['pin2', {subtype: 'free', sourceType: undefined}],
        ]),
        config: new Map([['size', '1']]),
    },
    [ComponentType.Relay]: {
        id: ComponentType.Relay,
        name: 'Relay',
        pins: new Map([
            ['cmd_in', {subtype: 'free', sourceType: undefined}],
            ['cmd_out', {subtype: 'free', sourceType: undefined}],
            ['power_in', {subtype: 'free', sourceType: undefined}],
            ['power_out', {subtype: 'free', sourceType: undefined}],
        ]),
        config: new Map([
            ['activationLogic', 'positive'],
            ['initializationOrder', ''],
        ]),
    },
    [ComponentType.SmallLED]: {
        id: ComponentType.SmallLED,
        name: 'SmallLED',
        pins: new Map([
            ['pin1', {subtype: 'free', sourceType: undefined}],
            ['pin2', {subtype: 'free', sourceType: undefined}],
        ]),
        config: new Map([
            ['idleColor', 'white'],
            ['activeColor', '#ffff00'],
            ['size', '1'],
            ['ywRatio', '1'],
        ]),
    },
    [ComponentType.RectangleLED]: {
        id: ComponentType.RectangleLED,
        name: 'RectangleLED',
        pins: new Map([
            ['pin1', {subtype: 'free', sourceType: undefined}],
            ['pin2', {subtype: 'free', sourceType: undefined}],
        ]),
        config: new Map([
            ['idleColor', 'white'],
            ['activeColor', '#ffff00'],
            ['size', '1'],
            ['hwRatio', '1'],
            ['ywRatio', '1'],
        ]),
    },
    [ComponentType.Cube]: {
        id: ComponentType.Cube,
        name: 'Cube',
        pins: new Map([]),
        config: new Map([['color', 'red']]),
    },
    [ComponentType.Label]: {
        id: ComponentType.Label,
        name: 'Label',
        pins: new Map([]),
        config: new Map([
            ['text', 'Label'],
            ['size', '1'],
        ]),
    },
    [ComponentType.Inverter]: {
        id: ComponentType.Inverter,
        name: 'Inverter',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'NAND Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'NAND4 Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['input3', {subtype: 'logicInput', sourceType: undefined}],
            ['input4', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'NAND8 Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['input3', {subtype: 'logicInput', sourceType: undefined}],
            ['input4', {subtype: 'logicInput', sourceType: undefined}],
            ['input5', {subtype: 'logicInput', sourceType: undefined}],
            ['input6', {subtype: 'logicInput', sourceType: undefined}],
            ['input7', {subtype: 'logicInput', sourceType: undefined}],
            ['input8', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'NOR Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'NOR4 Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['input3', {subtype: 'logicInput', sourceType: undefined}],
            ['input4', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'NOR8 Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['input3', {subtype: 'logicInput', sourceType: undefined}],
            ['input4', {subtype: 'logicInput', sourceType: undefined}],
            ['input5', {subtype: 'logicInput', sourceType: undefined}],
            ['input6', {subtype: 'logicInput', sourceType: undefined}],
            ['input7', {subtype: 'logicInput', sourceType: undefined}],
            ['input8', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'XOR Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'XOR4 Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['input3', {subtype: 'logicInput', sourceType: undefined}],
            ['input4', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
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
        name: 'XOR8 Gate',
        pins: new Map([
            ['vcc', {subtype: 'vcc', sourceType: ENodeSourceType.Voltage}],
            ['input1', {subtype: 'logicInput', sourceType: undefined}],
            ['input2', {subtype: 'logicInput', sourceType: undefined}],
            ['input3', {subtype: 'logicInput', sourceType: undefined}],
            ['input4', {subtype: 'logicInput', sourceType: undefined}],
            ['input5', {subtype: 'logicInput', sourceType: undefined}],
            ['input6', {subtype: 'logicInput', sourceType: undefined}],
            ['input7', {subtype: 'logicInput', sourceType: undefined}],
            ['input8', {subtype: 'logicInput', sourceType: undefined}],
            ['output', {subtype: 'logicOutput', sourceType: undefined}],
            ['gnd', {subtype: 'gnd', sourceType: ENodeSourceType.Current}],
        ]),
        config: new Map([
            ['defaultLogicFamily', 'CMOS1'],
            ['activationLogic', 'positive'],
            ['transitionSpan', '6'],
            ['initializationOrder', ''],
        ]),
    }
};