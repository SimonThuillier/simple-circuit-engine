/**
 * Parser tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseCircuitJSON,
  buildParsedCircuit,
  classifyEnodes,
  generateShortId,
} from '../../scripts/visualizer/src/parser.js';
import { ValidationError, IntegrityError } from '../../scripts/visualizer/src/errors.js';
import type { CircuitJSON, EnodeJSON } from '../../scripts/visualizer/src/types.js';

describe('Parser', () => {
  describe('generateShortId', () => {
    it('should generate 8-character short IDs from UUIDs', () => {
      const uuid = '9f9fa2b5-6ce0-43ad-9a6b-f3f4cf8c901b';
      const shortId = generateShortId(uuid);
      expect(shortId).toBe('9f9fa2b5');
      expect(shortId.length).toBe(8);
    });
  });

  describe('classifyEnodes', () => {
    it('should classify pin-type and branching-point enodes correctly', () => {
      const enodes: EnodeJSON[] = [
        {
          id: 'pin1',
          type: 'Pin',
          source: 'Voltage',
          component: 'comp1',
          pinLabel: 'anode',
        },
        {
          id: 'branch1',
          type: 'Pin',
          source: null,
        },
        {
          id: 'pin2',
          type: 'Pin',
          source: null,
          component: 'comp1',
          pinLabel: 'cathode',
        },
      ];

      const { pinEnodes, branchEnodes } = classifyEnodes(enodes);

      expect(pinEnodes).toHaveLength(2);
      expect(branchEnodes).toHaveLength(1);
      expect(pinEnodes[0].id).toBe('pin1');
      expect(pinEnodes[1].id).toBe('pin2');
      expect(branchEnodes[0].id).toBe('branch1');
    });
  });

  describe('parseCircuitJSON', () => {
    it('should parse valid circuit JSON', () => {
      const validJson = JSON.stringify({
        metadata: { name: 'Test', size: 30, divisions: 10, cameraStartup: { x: 0, y: 0, z: 50 } },
        components: [],
        enodes: [],
        wires: [],
      });

      const circuit = parseCircuitJSON(validJson);

      expect(circuit.metadata.name).toBe('Test');
      expect(circuit.components).toEqual([]);
      expect(circuit.enodes).toEqual([]);
      expect(circuit.wires).toEqual([]);
    });

    it('should throw ValidationError for invalid JSON syntax', () => {
      const invalidJson = '{ invalid json }';

      expect(() => parseCircuitJSON(invalidJson)).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing metadata field', () => {
      const jsonWithoutMetadata = JSON.stringify({
        components: [],
        enodes: [],
        wires: [],
      });

      expect(() => parseCircuitJSON(jsonWithoutMetadata)).toThrow(ValidationError);
      expect(() => parseCircuitJSON(jsonWithoutMetadata)).toThrow(/metadata/);
    });

    it('should throw ValidationError for invalid components field', () => {
      const jsonWithInvalidComponents = JSON.stringify({
        metadata: { name: 'Test', size: 30, divisions: 10, cameraStartup: { x: 0, y: 0, z: 50 } },
        components: 'not an array',
        enodes: [],
        wires: [],
      });

      expect(() => parseCircuitJSON(jsonWithInvalidComponents)).toThrow(ValidationError);
      expect(() => parseCircuitJSON(jsonWithInvalidComponents)).toThrow(/components/);
    });
  });

  describe('buildParsedCircuit', () => {
    it('should throw IntegrityError for wire with non-existent enode', () => {
      const circuit: CircuitJSON = {
        metadata: { name: 'Test', size: 30, divisions: 10, cameraStartup: { x: 0, y: 0, z: 50 } },
        components: [],
        enodes: [{ id: 'enode1', type: 'Pin', source: null }],
        wires: [
          {
            id: 'wire1',
            node1: 'enode1',
            node2: 'nonexistent',
            intermediatePositions: [],
          },
        ],
      };

      expect(() => buildParsedCircuit(circuit)).toThrow(IntegrityError);
      expect(() => buildParsedCircuit(circuit)).toThrow(/non-existent enode/);
    });

    it('should throw IntegrityError for component with non-existent pin', () => {
      const circuit: CircuitJSON = {
        metadata: { name: 'Test', size: 30, divisions: 10, cameraStartup: { x: 0, y: 0, z: 50 } },
        components: [
          {
            id: 'comp1',
            type: 'battery',
            position: { x: 0, y: 0 },
            rotation: 0,
            pins: ['nonexistent'],
          },
        ],
        enodes: [],
        wires: [],
      };

      expect(() => buildParsedCircuit(circuit)).toThrow(IntegrityError);
      expect(() => buildParsedCircuit(circuit)).toThrow(/non-existent pin/);
    });

    it('should build valid parsed circuit', () => {
      const circuit: CircuitJSON = {
        metadata: { name: 'Test', size: 30, divisions: 10, cameraStartup: { x: 0, y: 0, z: 50 } },
        components: [
          {
            id: '12345678-1234-1234-1234-123456789abc',
            type: 'battery',
            position: { x: 0, y: 0 },
            rotation: 0,
            pins: ['enode1'],
          },
        ],
        enodes: [
          {
            id: 'enode1',
            type: 'Pin',
            source: 'Voltage',
            component: '12345678-1234-1234-1234-123456789abc',
            pinLabel: 'anode',
          },
          {
            id: 'branch1',
            type: 'Pin',
            source: null,
          },
        ],
        wires: [
          {
            id: 'wire1',
            node1: 'enode1',
            node2: 'branch1',
            intermediatePositions: [],
          },
        ],
      };

      const parsed = buildParsedCircuit(circuit);

      expect(parsed.components.size).toBe(1);
      expect(parsed.enodes.size).toBe(2);
      expect(parsed.wires.length).toBe(1);

      const component = parsed.components.get('12345678-1234-1234-1234-123456789abc');
      expect(component).toBeDefined();
      expect(component!.shortId).toBe('12345678');
      expect(component!.pins.length).toBe(1);
      expect(component!.pins[0].label).toBe('anode');
    });
  });
});
