/**
 * DOT graph builder
 * Generates Graphviz DOT syntax from ParsedCircuit
 */

import type { ParsedCircuit, ParsedComponent, ParsedEnode } from './types.js';

/**
 * Sanitizes an ID for DOT compatibility
 * notably replaces hyphens with underscores since hyphens are reserved characters in DOT.
 * @param id
 */
function sanitizeId(id: string): string {
  return id.replaceAll('-', '_');
}

/**
 * Generates DOT graph header with standard attributes
 *
 * Creates the opening `digraph circuit` declaration with:
 * - Left-to-right layout (rankdir=LR)
 * - Arial font for nodes and edges
 *
 * @returns DOT graph header string
 */
export function generateDOTHeader(): string {
  return `digraph circuit {
  rankdir=LR;
  node [fontname="Arial"];
  edge [fontname="Arial"];
`;
}

/**
 * Generates a component subgraph with pins
 *
 * Creates a DOT subgraph (cluster) containing:
 * - Component label: "Type [shortId]"
 * - Pin nodes with labels: "pinLabel [shortId]"
 * - Light grey background fill
 *
 * @param component - Parsed component with pins
 * @returns DOT subgraph string
 */
export function generateComponentSubgraph(component: ParsedComponent): string {
  let dot = `  subgraph cluster_${sanitizeId(component.id)} {
    label="${component.type} [${component.shortId}]";
    style=filled;
    color=lightgrey;
`;

  // Add pin nodes
  for (const pin of component.pins) {
    dot += `    pin_${sanitizeId(pin.id)} [label="${pin.label} [${pin.shortId}]"];\n`;
  }

  dot += '  }\n';
  return dot;
}

/**
 * Generates a branching point node
 *
 * Creates a small point-shaped node for standalone junction points
 * (enodes without a parent component).
 *
 * @param enode - Parsed enode with type 'branch'
 * @returns DOT node declaration string
 */
export function generateBranchingPointNode(enode: ParsedEnode): string {
  return `  enode_${sanitizeId(enode.id)} [label="BP [${enode.shortId}]"];\n`;
}

/**
 * Generates a wire edge connecting two enodes
 *
 * Creates a directed edge with wire UUID label.
 * Automatically determines node ID prefix (pin_ or enode_) based on enode type.
 *
 * @param wireId - Wire UUID
 * @param wireShortId - Wire short ID (8 chars)
 * @param node1Id - Source enode UUID
 * @param node2Id - Target enode UUID
 * @param enodeMap - Map of enode UUIDs to parsed enodes
 * @returns DOT edge declaration string
 * @throws {Error} If enode not found in map
 */
export function generateWireEdge(
  wireId: string,
  wireShortId: string,
  node1Id: string,
  node2Id: string,
  enodeMap: Map<string, ParsedEnode>
): string {
  // Determine node ID prefix based on enode type
  const getNodeId = (enodeId: string): string => {
    const enode = enodeMap.get(enodeId);
    if (!enode) {
      throw new Error(`Enode not found: ${enodeId}`);
    }
    return enode.type === 'pin' ? `pin_${sanitizeId(enodeId)}` : `enode_${sanitizeId(enodeId)}`;
  };

  const fromNode = getNodeId(node1Id);
  const toNode = getNodeId(node2Id);

  return `  ${fromNode} -> ${toNode} [label="[${wireShortId}]", dir="both"];\n`;
}

/**
 * Builds complete DOT graph from ParsedCircuit
 *
 * Generates a complete Graphviz DOT graph string including:
 * - Graph header with attributes
 * - Component subgraphs (one per component)
 * - Branching point nodes
 * - Wire edges
 *
 * @param circuit - Parsed circuit structure
 * @returns Complete DOT graph string ready for rendering
 */
export function buildDOTGraph(circuit: ParsedCircuit): string {
  let dot = generateDOTHeader();

  // Generate component subgraphs
  for (const component of circuit.components.values()) {
    dot += '\n' + generateComponentSubgraph(component);
  }

  // Generate branching point nodes
  const branchingNodes: ParsedEnode[] = [];
  for (const enode of circuit.enodes.values()) {
    if (enode.type === 'branch') {
      branchingNodes.push(enode);
    }
  }

  if (branchingNodes.length > 0) {
    dot += '\n  // Branching point nodes\n';
    for (const enode of branchingNodes) {
      dot += generateBranchingPointNode(enode);
    }
  }

  // Generate wire edges
  if (circuit.wires.length > 0) {
    dot += '\n  // Wire connections\n';
    for (const wire of circuit.wires) {
      dot += generateWireEdge(wire.id, wire.shortId, wire.node1, wire.node2, circuit.enodes);
    }
  }

  dot += '}\n';
  return dot;
}
