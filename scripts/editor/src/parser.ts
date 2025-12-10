/**
 * Circuit JSON parser
 * Transforms Circuit JSON into ParsedCircuit structure
 */

import type {
  CircuitJSON,
  ParsedCircuit,
  ParsedComponent,
  ParsedPin,
  ParsedEnode,
  ParsedWire,
  EnodeJSON,
} from './types.js';
import { ValidationError, IntegrityError } from './errors.js';

/**
 * Generates a short ID from a UUID (first 8 characters)
 *
 * @param uuid - Full UUID string (36 characters)
 * @returns First 8 characters of the UUID
 *
 * @example
 * ```ts
 * generateShortId('9f9fa2b5-6ce0-43ad-9a6b-f3f4cf8c901b') // Returns: '9f9fa2b5'
 * ```
 */
export function generateShortId(uuid: string): string {
  return uuid.substring(0, 8);
}

/**
 * Classifies enodes into pin-type and branching-point enodes
 *
 * Pin-type enodes have a `component` field and belong to a specific component.
 * Branching-point enodes do not have a `component` field and represent standalone junction points.
 *
 * @param enodes - Array of enode objects from circuit JSON
 * @returns Object with arrays of pin enodes and branch enodes
 */
export function classifyEnodes(enodes: EnodeJSON[]): {
  pinEnodes: EnodeJSON[];
  branchEnodes: EnodeJSON[];
} {
  const pinEnodes: EnodeJSON[] = [];
  const branchEnodes: EnodeJSON[] = [];

  for (const enode of enodes) {
    if (enode.component !== undefined) {
      pinEnodes.push(enode);
    } else {
      branchEnodes.push(enode);
    }
  }

  return { pinEnodes, branchEnodes };
}

/**
 * Parses and validates circuit JSON structure
 *
 * Validates that the JSON is well-formed and contains all required fields:
 * - metadata
 * - components (array)
 * - enodes (array)
 * - wires (array)
 *
 * @param jsonString - Circuit JSON string (from Circuit.toJSON())
 * @returns Parsed circuit object
 * @throws {ValidationError} If JSON is malformed or missing required fields
 */
export function parseCircuitJSON(jsonString: string): CircuitJSON {
  let circuitData: unknown;

  try {
    circuitData = JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError(
      `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Validate structure
  if (!circuitData || typeof circuitData !== 'object') {
    throw new ValidationError('Circuit JSON must be an object');
  }

  const circuit = circuitData as Record<string, unknown>;

  // Validate required fields
  if (!circuit.metadata) {
    throw new ValidationError('Missing required field: metadata', 'metadata');
  }
  if (!Array.isArray(circuit.components)) {
    throw new ValidationError('Missing or invalid field: components', 'components');
  }
  if (!Array.isArray(circuit.enodes)) {
    throw new ValidationError('Missing or invalid field: enodes', 'enodes');
  }
  if (!Array.isArray(circuit.wires)) {
    throw new ValidationError('Missing or invalid field: wires', 'wires');
  }

  return circuit as CircuitJSON;
}

/**
 * Builds a ParsedCircuit structure from Circuit JSON
 *
 * Transforms the circuit JSON into an internal structure optimized for DOT graph generation:
 * - Groups pins with their parent components
 * - Generates short IDs for all entities
 * - Creates lookup maps for components and enodes
 * - Validates referential integrity between components, enodes, and wires
 *
 * @param circuit - Validated circuit JSON object
 * @returns Parsed circuit structure with maps and short IDs
 * @throws {IntegrityError} If circuit data has referential integrity issues
 */
export function buildParsedCircuit(circuit: CircuitJSON): ParsedCircuit {
  const enodeMap = new Map<string, ParsedEnode>();
  const componentMap = new Map<string, ParsedComponent>();

  // Classify enodes
  const { pinEnodes, branchEnodes } = classifyEnodes(circuit.enodes);

  // Build enode map (all enodes)
  for (const enode of circuit.enodes) {
    const parsedEnode: ParsedEnode = {
      id: enode.id,
      shortId: generateShortId(enode.id),
      type: enode.component !== undefined ? 'pin' : 'branch',
      componentId: enode.component,
      label: enode.pinLabel,
    };
    enodeMap.set(enode.id, parsedEnode);
  }

  // Build component map with pins
  for (const component of circuit.components) {
    const pins: ParsedPin[] = [];

    // Find pin-type enodes for this component
    for (const pinId of component.pins) {
      const enode = circuit.enodes.find((e) => e.id === pinId);
      if (!enode) {
        throw new IntegrityError('Component references non-existent pin', component.id, pinId);
      }

      if (enode.component !== component.id) {
        throw new IntegrityError(
          'Pin enode does not reference correct component',
          enode.id,
          component.id
        );
      }

      if (!enode.pinLabel) {
        throw new IntegrityError('Pin-type enode missing pinLabel', enode.id, component.id);
      }

      pins.push({
        id: enode.id,
        shortId: generateShortId(enode.id),
        label: enode.pinLabel,
        source: enode.source,
      });
    }

    componentMap.set(component.id, {
      id: component.id,
      type: component.type,
      shortId: generateShortId(component.id),
      pins,
    });
  }

  // Build wire array
  const wires: ParsedWire[] = circuit.wires.map((wire) => {
    // Validate wire references
    if (!enodeMap.has(wire.node1)) {
      throw new IntegrityError('Wire references non-existent enode', wire.id, wire.node1);
    }
    if (!enodeMap.has(wire.node2)) {
      throw new IntegrityError('Wire references non-existent enode', wire.id, wire.node2);
    }

    return {
      id: wire.id,
      shortId: generateShortId(wire.id),
      node1: wire.node1,
      node2: wire.node2,
    };
  });

  return {
    metadata: circuit.metadata,
    components: componentMap,
    enodes: enodeMap,
    wires,
  };
}
