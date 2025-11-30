/**
 * Integration tests
 * Tests end-to-end circuit visualization workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseCircuitJSON, buildParsedCircuit } from '../../scripts/visualizer/src/parser.js';
import { buildDOTGraph } from '../../scripts/visualizer/src/graph-builder.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Sample circuit JSON for testing
const sampleCircuitPath = resolve(
  __dirname,
  '../../output/sample-circuits/simple-led-circuit.json'
);
const relayCircuitPath = resolve(__dirname, '../../output/sample-circuits/relay-circuit.json');
const transistorCircuitPath = resolve(
  __dirname,
  '../../output/sample-circuits/transistor-circuit.json'
);

describe('Integration Tests', () => {
  describe('simple-led-circuit.json', () => {
    it('should render simple-led-circuit.json without errors', () => {
      const circuitJson = readFileSync(sampleCircuitPath, 'utf-8');

      // Parse circuit
      const circuit = parseCircuitJSON(circuitJson);
      expect(circuit).toBeDefined();
      expect(circuit.components).toHaveLength(2); // Battery + LED

      // Build parsed circuit
      const parsed = buildParsedCircuit(circuit);
      expect(parsed.components.size).toBe(2);
      expect(parsed.wires.length).toBe(2);

      // Generate DOT graph
      const dot = buildDOTGraph(parsed);
      expect(dot).toContain('digraph circuit');
      expect(dot).toContain('battery');
      expect(dot).toContain('smallLED');
    });
  });

  describe('relay-circuit.json', () => {
    it('should render relay-circuit.json with all components', () => {
      const circuitJson = readFileSync(relayCircuitPath, 'utf-8');

      // Parse circuit
      const circuit = parseCircuitJSON(circuitJson);
      expect(circuit).toBeDefined();

      // Build parsed circuit
      const parsed = buildParsedCircuit(circuit);

      // Verify relay component exists
      let hasRelay = false;
      for (const component of parsed.components.values()) {
        if (component.type === 'relay') {
          hasRelay = true;
          // Relay should have 4 pins
          expect(component.pins.length).toBe(4);
        }
      }
      expect(hasRelay).toBe(true);

      // Generate DOT graph
      const dot = buildDOTGraph(parsed);
      expect(dot).toContain('relay');
      expect(dot).toContain('cmd_in');
      expect(dot).toContain('cmd_out');
      expect(dot).toContain('power_in');
      expect(dot).toContain('power_out');
    });
  });

  describe('transistor-circuit.json', () => {
    it('should render transistor-circuit.json within 3 seconds', () => {
      const startTime = Date.now();

      const circuitJson = readFileSync(transistorCircuitPath, 'utf-8');

      // Parse circuit
      const circuit = parseCircuitJSON(circuitJson);

      // Build parsed circuit
      const parsed = buildParsedCircuit(circuit);

      // Generate DOT graph
      const dot = buildDOTGraph(parsed);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify transistor exists
      expect(dot).toContain('transistor');
      expect(dot).toContain('collector');
      expect(dot).toContain('base');
      expect(dot).toContain('emitter');

      // Performance check (excluding actual SVG rendering, just parsing + DOT generation)
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';

      expect(() => parseCircuitJSON(invalidJson)).toThrow();
    });

    it('should handle missing required fields', () => {
      const incompleteJson = JSON.stringify({
        components: [],
        enodes: [],
        wires: [],
      });

      expect(() => parseCircuitJSON(incompleteJson)).toThrow(/metadata/);
    });

    it('should handle integrity errors', () => {
      const circuitWithBrokenRefs = JSON.stringify({
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
      });

      const circuit = parseCircuitJSON(circuitWithBrokenRefs);
      expect(() => buildParsedCircuit(circuit)).toThrow(/non-existent enode/);
    });
  });
});
