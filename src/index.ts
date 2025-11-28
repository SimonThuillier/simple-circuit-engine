/**
 * Simple Circuit Engine
 *
 * A standalone, framework-agnostic boolean circuit simulation engine
 * with 3D visualization, designed for educational purposes.
 *
 * @packageDocumentation
 */

export { CircuitEngine } from './CircuitEngine.js';

// Re-export core types for consumers who need them
export type * from './core/index.js';

// Note: rendering/ and playback/ are internal implementation details
// and are not exported from the main entry point
