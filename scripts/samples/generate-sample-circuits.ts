/**
 * Sample Circuit Generation Script
 *
 * Main orchestrator for generating sample circuit JSON files.
 * Calls circuit factory functions and writes their output to files.
 *
 * @module scripts/samples/generate-sample-circuits
 */

import type { Circuit } from '../../src/core/topology/Circuit.js';
import { createSimpleLedCircuit } from './circuits/simple-led-circuit.js';
import { createSwitchControlledLedCircuit } from './circuits/switch-controlled-led.js';
import { createRelayCircuit } from './circuits/relay-circuit.js';
import { createInverterCircuit } from './circuits/inverter-circuit.js';
import { writeCircuitToFile } from './utils/file-writer.js';
import {createTwoBatteriesCircuit} from "./circuits/two-batteries-circuit";

/**
 * Circuit definition pairing a factory function with its output filename.
 *
 * @property factory - Function that creates and returns a Circuit instance
 * @property filename - Output JSON filename (e.g., 'simple-led-circuit.json')
 */
interface CircuitDefinition {
  factory: () => Circuit;
  filename: string;
}

/**
 * Generate all sample circuits and write them to JSON files.
 *
 * This function orchestrates the generation of all sample circuits by:
 * 1. Calling each circuit factory function
 * 2. Serializing the circuit to JSON
 * 3. Writing the JSON to the output directory
 *
 * The output directory is created automatically if it doesn't exist.
 * Existing files with the same names will be overwritten.
 *
 * @param outputDir - Output directory path (default: 'output/sample-circuits')
 * @returns Promise that resolves when all circuits are written
 * @throws {Error} If any circuit generation or file writing fails
 *
 * @example
 * ```typescript
 * // Generate to default location
 * await generateSampleCircuits();
 * // Output: output/sample-circuits/*.json
 * ```
 *
 * @example
 * ```typescript
 * // Generate to custom location
 * await generateSampleCircuits('custom/output/dir');
 * ```
 *
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   await generateSampleCircuits();
 *   console.log('All circuits generated successfully');
 * } catch (error) {
 *   console.error('Generation failed:', error.message);
 *   process.exit(1);
 * }
 * ```
 */
export async function generateSampleCircuits(
  outputDir: string = 'output/sample-circuits'
): Promise<void> {
  // Define all circuits to generate
  const circuits: CircuitDefinition[] = [
    {
      factory: createSimpleLedCircuit,
      filename: 'simple-led-circuit.json',
    },
    {
      factory: createSwitchControlledLedCircuit,
      filename: 'switch-controlled-led.json',
    },
    {
      factory: createRelayCircuit,
      filename: 'relay-circuit.json',
    },
    {
      factory: createInverterCircuit,
      filename: 'inverter-circuit.json',
    },
      {
          factory: createTwoBatteriesCircuit,
          filename: 'two-batteries-circuit.json',
      },
  ];

  console.log('Generating sample circuits...');

  // Generate and write each circuit
  for (const { factory, filename } of circuits) {
    const circuit = factory();
    await writeCircuitToFile(circuit, filename, outputDir);
  }

  console.log(`Generated ${circuits.length} sample circuits to ${outputDir}/`);
}

/**
 * Main entry point when script is run directly.
 *
 * Executes the generation process and handles errors with proper exit codes.
 */
async function main(): Promise<void> {
  try {
    await generateSampleCircuits();
  } catch (error) {
    const err = error as Error;
    console.error('Error generating sample circuits:', err.message);
    process.exit(1);
  }
}

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
