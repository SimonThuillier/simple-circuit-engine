/**
 * JSON Validation Tests
 *
 * Tests for validating that generated circuits can be loaded via Circuit.fromJSON()
 * and that they match expected structure and content.
 *
 * @module tests/samples/json-validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { Circuit } from '../../src/core/Circuit.js';
import { generateSampleCircuits } from '../../scripts/samples/generate-sample-circuits.js';

const OUTPUT_DIR = 'output/sample-circuits';

describe('JSON Validation Tests', () => {
  // Ensure circuits are generated before running tests
  beforeAll(async () => {
    if (!existsSync(OUTPUT_DIR)) {
      await generateSampleCircuits(OUTPUT_DIR);
    }
  });

  it('should load simple-led-circuit.json via Circuit.fromJSON()', () => {
    const json = JSON.parse(readFileSync(`${OUTPUT_DIR}/simple-led-circuit.json`, 'utf-8'));
    const circuit = Circuit.fromJSON(json);

    expect(circuit).toBeDefined();
    expect(circuit.name).toBe('Simple LED Circuit');
    expect(circuit.getAllComponents().length).toBeGreaterThanOrEqual(2);
    expect(circuit.getAllComponents().length).toBeLessThanOrEqual(3);
  });

  it('should load switch-controlled-led.json via Circuit.fromJSON()', () => {
    const json = JSON.parse(
      readFileSync(`${OUTPUT_DIR}/switch-controlled-led.json`, 'utf-8')
    );
    const circuit = Circuit.fromJSON(json);

    expect(circuit).toBeDefined();
    expect(circuit.name).toBe('Switch-Controlled LED Circuit');
    expect(circuit.getAllComponents().length).toBeGreaterThanOrEqual(3);
    expect(circuit.getAllComponents().length).toBeLessThanOrEqual(4);
  });

  it('should load relay-circuit.json via Circuit.fromJSON()', () => {
    const json = JSON.parse(readFileSync(`${OUTPUT_DIR}/relay-circuit.json`, 'utf-8'));
    const circuit = Circuit.fromJSON(json);

    expect(circuit).toBeDefined();
    expect(circuit.name).toBe('Relay Circuit');
    expect(circuit.getAllComponents().length).toBeGreaterThanOrEqual(5);
    expect(circuit.getAllComponents().length).toBeLessThanOrEqual(7);
  });

  it('should load transistor-circuit.json via Circuit.fromJSON()', () => {
    const json = JSON.parse(readFileSync(`${OUTPUT_DIR}/transistor-circuit.json`, 'utf-8'));
    const circuit = Circuit.fromJSON(json);

    expect(circuit).toBeDefined();
    expect(circuit.name).toBe('Transistor Circuit');
    expect(circuit.getAllComponents().length).toBeGreaterThanOrEqual(6);
    expect(circuit.getAllComponents().length).toBeLessThanOrEqual(10);
  });

  it('should verify all circuits have correct component counts', () => {
    const circuits = [
      'simple-led-circuit.json',
      'switch-controlled-led.json',
      'relay-circuit.json',
      'transistor-circuit.json',
    ];

    const componentCounts: number[] = [];

    for (const filename of circuits) {
      const json = JSON.parse(readFileSync(`${OUTPUT_DIR}/${filename}`, 'utf-8'));
      const circuit = Circuit.fromJSON(json);
      const count = circuit.getAllComponents().length;

      // Verify within range
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(10);

      componentCounts.push(count);
    }

    // Verify all counts are different (diversity requirement)
    const uniqueCounts = new Set(componentCounts);
    expect(uniqueCounts.size).toBe(componentCounts.length);
  });

  it('should verify all components have proper pins and wires', () => {
    const circuits = [
      'simple-led-circuit.json',
      'switch-controlled-led.json',
      'relay-circuit.json',
      'transistor-circuit.json',
    ];

    for (const filename of circuits) {
      const json = JSON.parse(readFileSync(`${OUTPUT_DIR}/${filename}`, 'utf-8'));
      const circuit = Circuit.fromJSON(json);

      // Get all components
      const components = circuit.getAllComponents();
      expect(components.length).toBeGreaterThan(0);

      // Verify each component has pins
      for (const component of components) {
        expect(component.pins).toBeDefined();
        expect(Array.isArray(component.pins)).toBe(true);

        // Each pin should be a valid UUID string
        for (const pin of component.pins) {
          expect(typeof pin).toBe('string');
          expect(pin.length).toBeGreaterThan(0);
        }
      }

      // Verify circuit has wires
      const wires = circuit.getAllWires();
      expect(wires.length).toBeGreaterThan(0);

      // Verify each wire connects two nodes
      for (const wire of wires) {
        expect(wire.node1).toBeDefined();
        expect(wire.node2).toBeDefined();
        expect(typeof wire.node1).toBe('string');
        expect(typeof wire.node2).toBe('string');
        expect(wire.node1).not.toBe(wire.node2);
      }
    }
  });
});
