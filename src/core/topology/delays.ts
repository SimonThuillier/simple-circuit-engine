/**
 * Logic Family Types and Delay Computation
 *
 * Provides the logic family model for gate components, mapping technology
 * choices (CMOS, TTL) to propagation delays derived from physical principles.
 *
 * @module core/topology
 */

import {ComponentType, type LogicFamily} from "./types";
import {Component} from "./Component";

// TTL1 delay lookup tables indexed by input count
// Physical basis: multi-emitter BJTs mean NAND4 is still single-stage; NOR is disadvantaged
const TTL1_NAND: Record<number, number> = { 2: 1, 4: 1, 8: 2, 16: 2 };
const TTL1_AND: Record<number, number> = { 2: 2, 4: 2, 8: 3, 16: 3 };
const TTL1_NOR: Record<number, number> = { 2: 1, 4: 2, 8: 2, 16: 3 };
const TTL1_OR: Record<number, number> = { 2: 2, 4: 3, 8: 3, 16: 4 };

/**
 * Gate family classification used for delay table lookup.
 * Maps to the logical function regardless of physical implementation.
 */
type GateFamily = 'NOT' | 'Buffer' | 'NAND' | 'AND' | 'NOR' | 'OR' | 'XOR' | 'XNOR';

/**
 * Given a component compute the basis transitionSpan from its logicFamily if applicable
 * if not applicable / already implemented returns undefined
 * @param component
 */
export function computeTransitionSpan(
    component: Component,
): number | undefined {
  const logicFamily = component.config.get('defaultLogicFamily') as LogicFamily | undefined;
  if (!logicFamily || logicFamily === 'Sandbox') {
    return undefined;
  }

  if(isLogicGate(component.type)) {
    const activationLogic = component.config.get('activationLogic') ?? 'negative';
    const classif = classifyGate(component.type, activationLogic);
    if(!classif) return undefined;
    const delay = computeGateDelay(logicFamily, classif.gateFamily, classif.inputCount);
    return delay || undefined;
  }

  // other component families will be to implement as they come
  return undefined;
}

function isLogicGate(type: ComponentType): boolean {
  return [
      ComponentType.Inverter,
      ComponentType.NandGate,
      ComponentType.Nand4Gate,
      ComponentType.Nand8Gate,
      ComponentType.NorGate,
      ComponentType.Nor4Gate,
      ComponentType.Nor8Gate,
      ComponentType.XorGate,
      ComponentType.Xor4Gate,
      ComponentType.Xor8Gate
  ].includes(type);
}

/**
 * Classify a ComponentType + activationLogic combination into a GateFamily and input count.
 *
 * Returns null for non-gate component types (Battery, Switch, LED, etc.).
 *
 * @param componentType - The component type to classify
 * @param activationLogic - 'positive' or 'negative' from the component config
 * @returns Object with gateFamily and inputCount, or null if not a gate
 */
export function classifyGate(componentType: ComponentType, activationLogic: string):
    {gateFamily: GateFamily, inputCount: number} | null {
  switch (componentType) {
    case ComponentType.Inverter:
      return { gateFamily: activationLogic === 'negative' ? 'NOT' : 'Buffer', inputCount: 1 };
    case ComponentType.NandGate:
      return { gateFamily: activationLogic === 'negative' ? 'NAND' : 'AND', inputCount: 2 };
    case ComponentType.Nand4Gate:
      return { gateFamily: activationLogic === 'negative'  ? 'NAND' : 'AND', inputCount: 4 };
    case ComponentType.Nand8Gate:
      return { gateFamily: activationLogic === 'negative'  ? 'NAND' : 'AND', inputCount: 8 };
    case ComponentType.NorGate:
      return { gateFamily: activationLogic === 'negative'  ? 'NOR' : 'OR', inputCount: 2 };
    case ComponentType.Nor4Gate:
      return { gateFamily: activationLogic === 'negative'  ? 'NOR' : 'OR', inputCount: 4 };
    case ComponentType.Nor8Gate:
      return { gateFamily: activationLogic === 'negative'  ? 'NOR' : 'OR', inputCount: 8 };
    case ComponentType.XorGate:
      return { gateFamily: activationLogic === 'negative'  ? 'XNOR' : 'XOR', inputCount: 2 };
    case ComponentType.Xor4Gate:
      return { gateFamily: activationLogic === 'negative'  ? 'XNOR' : 'XOR', inputCount: 4 };
    case ComponentType.Xor8Gate:
      return { gateFamily: activationLogic === 'negative'  ? 'XNOR' : 'XOR', inputCount: 8 };
    default:
      return null;
  }
}

/**
 * Compute the propagation delay in ticks for a gate given its logic family, gate family, and input count.
 *
 * CMOS1 formulas (base unit: 1 inverter = 1 tick):
 * - NOT: 1 (constant)
 * - Buffer: 2 (constant)
 * - NAND/NOR: log2(n)
 * - AND/OR: log2(n) + 1
 * - XOR: log2(n) * 2
 * - XNOR: log2(n) * 2 + 1
 *
 * This table assumes inverter, NAND, NAND4, NAND8, NOR, NOR4, NOR8 and XOR(2) are transistor level primitives
 *
 * TTL1 uses lookup tables (base unit: NAND2 = 1 tick).
 * NOT and Buffer: same as CMOS1 (1 and 2 ticks).
 * XOR/XNOR: same as CMOS1.
 *
 * @param logicFamily - The technology family
 * @param gateFamily - The logical gate function
 * @param inputCount - Number of data inputs (not counting Vcc)
 * @returns Propagation delay in ticks (integer >= 1)
 * @throws {Error} If called with Sandbox family (caller must not invoke for Sandbox)
 * @throws {Error} If input count is unsupported for the given family
 */
export function computeGateDelay(
  logicFamily: LogicFamily,
  gateFamily: GateFamily,
  inputCount: number
): number {
  if (logicFamily === 'Sandbox') {
    throw new Error('computeGateDelay must not be called for Sandbox family');
  }

  // NOT and Buffer are constant across both CMOS1 and TTL1
  if (gateFamily === 'NOT') return 1;
  if (gateFamily === 'Buffer') return 2;

  // XOR and XNOR are the same across CMOS1 and TTL1
  if (gateFamily === 'XOR') return Math.log2(inputCount) * 2;
  if (gateFamily === 'XNOR') return Math.log2(inputCount) * 2 + 1;

  if (logicFamily === 'CMOS1') {
    const log2n = Math.log2(inputCount);
    switch (gateFamily) {
      case 'NAND':
        return log2n;
      case 'NOR':
        return log2n;
      case 'AND':
        return log2n + 1;
      case 'OR':
        return log2n + 1;
    }
  }

  if (logicFamily === 'TTL1') {
    let table: Record<number, number>;
    switch (gateFamily) {
      case 'NAND':
        table = TTL1_NAND;
        break;
      case 'AND':
        table = TTL1_AND;
        break;
      case 'NOR':
        table = TTL1_NOR;
        break;
      case 'OR':
        table = TTL1_OR;
        break;
    }
    const delay = table![inputCount];
    if (delay === undefined) {
      throw new Error(`Unsupported input count ${inputCount} for TTL1 ${gateFamily}`);
    }
    return delay;
  }

  // Should be unreachable
  throw new Error(`Unsupported logic family: ${logicFamily}`);
}
