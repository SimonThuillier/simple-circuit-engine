/**
 * Circuit Generation Tests
 *
 * Tests for the sample circuit generation script execution and output.
 *
 * @module tests/samples/circuit-generation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync } from 'fs';
import { generateSampleCircuits } from '../../scripts/samples/generate-sample-circuits.js';

const TEST_OUTPUT_DIR = 'output/test-circuits';

describe('Sample Circuit Generation', () => {
  // Clean up before and after tests
  beforeAll(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  it('should generate 5 circuit JSON files', async () => {
    await generateSampleCircuits(TEST_OUTPUT_DIR);

    expect(existsSync(`${TEST_OUTPUT_DIR}/simple-led-circuit.json`)).toBe(true);
    expect(existsSync(`${TEST_OUTPUT_DIR}/switch-controlled-led.json`)).toBe(true);
    expect(existsSync(`${TEST_OUTPUT_DIR}/relay-circuit.json`)).toBe(true);
    expect(existsSync(`${TEST_OUTPUT_DIR}/inverter-circuit.json`)).toBe(true);
    expect(existsSync(`${TEST_OUTPUT_DIR}/two-batteries-circuit.json`)).toBe(true);
  });

  it('should create output directory if missing', async () => {
    const newDir = 'output/test-missing-dir';

    // Ensure directory doesn't exist
    if (existsSync(newDir)) {
      rmSync(newDir, { recursive: true });
    }

    expect(existsSync(newDir)).toBe(false);

    // Generate circuits should create directory
    await generateSampleCircuits(newDir);

    expect(existsSync(newDir)).toBe(true);
    expect(existsSync(`${newDir}/simple-led-circuit.json`)).toBe(true);

    // Cleanup
    rmSync(newDir, { recursive: true });
  });

  it('should overwrite existing files on re-run', async () => {
    const testDir = 'output/test-overwrite';

    // Generate circuits first time
    await generateSampleCircuits(testDir);
    const firstGenTime = existsSync(`${testDir}/simple-led-circuit.json`)
      ? new Date().getTime()
      : 0;

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate circuits second time
    await generateSampleCircuits(testDir);

    // Files should still exist (overwritten, not errored)
    expect(existsSync(`${testDir}/simple-led-circuit.json`)).toBe(true);
    expect(existsSync(`${testDir}/switch-controlled-led.json`)).toBe(true);
    expect(existsSync(`${testDir}/relay-circuit.json`)).toBe(true);
    expect(existsSync(`${testDir}/inverter-circuit.json`)).toBe(true);
    expect(existsSync(`${testDir}/two-batteries-circuit.json`)).toBe(true);

    // Cleanup
    rmSync(testDir, { recursive: true });
  });
});
