/**
 * File Writer Utilities
 *
 * Provides file system utilities for writing circuit JSON files to disk.
 *
 * @module scripts/samples/utils/file-writer
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import type { Circuit } from '../../../src/core/Circuit.js';

/**
 * Create a directory recursively if it doesn't exist.
 *
 * This function creates the specified directory and all parent directories
 * if they don't already exist. It's idempotent - calling it on an existing
 * directory is safe and will not throw an error.
 *
 * @param dirPath - Absolute or relative path to the directory to create
 * @throws {Error} If directory creation fails due to permissions or invalid path
 *
 * @example
 * ```typescript
 * await createDirectory('output/sample-circuits');
 * // Creates output/ and output/sample-circuits/ if they don't exist
 * ```
 */
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new Error(`Failed to create directory ${dirPath}: ${err.message}`);
  }
}

/**
 * Write a Circuit instance to a JSON file.
 *
 * Serializes the circuit to JSON with 2-space indentation and writes it to
 * the specified file path. The output directory is created automatically if
 * it doesn't exist. If a file already exists at the target path, it will be
 * overwritten.
 *
 * @param circuit - Circuit instance to serialize
 * @param filename - Name of the output file (e.g., 'simple-led-circuit.json')
 * @param outputDir - Output directory path (default: 'output/sample-circuits')
 * @returns Promise that resolves when the file is written
 * @throws {Error} If file writing fails or circuit serialization fails
 *
 * @example
 * ```typescript
 * const circuit = new Circuit('My Circuit');
 * await writeCircuitToFile(circuit, 'my-circuit.json');
 * // Writes to: output/sample-circuits/my-circuit.json
 * ```
 *
 * @example
 * ```typescript
 * // Custom output directory
 * await writeCircuitToFile(circuit, 'test.json', 'custom/path');
 * // Writes to: custom/path/test.json
 * ```
 *
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   await writeCircuitToFile(circuit, 'circuit.json');
 *   console.log('Circuit written successfully');
 * } catch (error) {
 *   console.error('Failed to write circuit:', error.message);
 * }
 * ```
 */
export async function writeCircuitToFile(
  circuit: Circuit,
  filename: string,
  outputDir: string = 'output/sample-circuits'
): Promise<void> {
  try {
    // Ensure output directory exists
    await createDirectory(outputDir);

    // Serialize circuit to JSON with formatting
    const json = JSON.stringify(circuit.toJSON(), null, 2);

    // Construct full file path
    const filePath = `${outputDir}/${filename}`;

    // Write to file
    await writeFile(filePath, json, 'utf-8');

    console.log(`Written: ${filePath}`);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to write circuit to ${filename}: ${err.message}`);
  }
}
