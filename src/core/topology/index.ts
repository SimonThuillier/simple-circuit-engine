/**
 * Module defining the core objects modelling electrical/logical topology: circuit, components, enodes and wires
 *
 * @module core/topology
 */

export {
    CIRCUIT_FILE_VERSION,
    ALL_LOGIC_FAMILIES,
    DEFAULT_LOGIC_FAMILY,
    ComponentType,
    COMPONENT_TYPE_METADATA,
    ENodeSourceType,
    ENodeType
} from "./types.js";

export type {
    LogicFamily,
    IPinMetadata,
    IComponentTypeMetadata,
    IENode,
    IWire,
    IComponent,
    ICircuitOptions,
    ICircuitMetadata,
    ICircuit,
} from "./types.js";


export { ENode } from "./ENode.js";
export { Wire } from "./Wire.js";
export { Component } from "./Component.js";
export { CircuitOptions } from "./CircuitOptions.js";
export { CircuitMetadata } from "./CircuitMetadata.js";
export { Circuit } from "./Circuit.js";
export { computeTransitionSpan, classifyGate, computeGateDelay } from "./delays.js";