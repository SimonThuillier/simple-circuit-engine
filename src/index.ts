/**
 * Simple Circuit Engine
 *
 * A simple electronic circuit edition and simulation engine written in typescript.
 * Core module provides circuit data structure and simulation algorithms
 * Scene module provides Three.js circuit scene creation and controls.
 *
 * @packageDocumentation
 */

export { CircuitEngine } from './scene/CircuitEngine.js';

// Re-export core types for consumers who need them
export type * from './core/index.js';
// Re-export scene types for consumers who need them
export type * from './scene/index.js';