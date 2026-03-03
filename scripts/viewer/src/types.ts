/**
 * Circuit JSON type definitions
 * Based on Circuit.toJSON() output from feature 001
 */

export interface CircuitJSON {
  metadata: CircuitMetadata;
  components: ComponentJSON[];
  enodes: EnodeJSON[];
  wires: WireJSON[];
}

export interface CircuitMetadata {
  name: string;
  size: number;
  divisions: number;
  cameraStartup: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ComponentJSON {
  id: string; // UUID
  type: string; // "battery", "switch", "smallLED", "relay", "inverter", etc.
  position: {
    x: number;
    y: number;
  };
  rotation: number;
  pins: string[]; // Array of ENode UUIDs
}

export interface EnodeJSON {
  id: string; // UUID
  type: 'Pin'; // ENode type (always "Pin" in current model)
  source: 'Voltage' | 'Current' | null;
  component?: string; // UUID of parent component (if pin-type)
  pinLabel?: string; // Semantic label: "anode", "cathode", "base", etc.
}

export interface WireJSON {
  id: string; // UUID
  node1: string; // ENode UUID
  node2: string; // ENode UUID
  intermediatePositions: Position[];
}

export interface Position {
  x: number;
  y: number;
}

/**
 * Internal parsed circuit structure
 */

export interface ParsedCircuit {
  metadata: CircuitMetadata;
  components: Map<string, ParsedComponent>;
  enodes: Map<string, ParsedEnode>;
  wires: ParsedWire[];
}

export interface ParsedComponent {
  id: string;
  type: string;
  shortId: string; // First 8 chars of UUID
  pins: ParsedPin[];
}

export interface ParsedPin {
  id: string;
  shortId: string; // First 8 chars of UUID
  label: string; // Semantic pin label
  source: 'Voltage' | 'Current' | null;
}

export interface ParsedEnode {
  id: string;
  shortId: string; // First 8 chars of UUID
  type: 'pin' | 'branch'; // Classified type
  componentId?: string; // For pin-type enodes
  label?: string; // Pin label if available
}

export interface ParsedWire {
  id: string;
  shortId: string; // First 8 chars of UUID
  node1: string; // ENode UUID
  node2: string; // ENode UUID
}
