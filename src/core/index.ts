/**
 * @module core
 *
 * Core object model for circuit topology representation.
 *
 * This module provides the foundational data structures for representing
 * circuit topology with automatic lifecycle management:
 *
 * - **Circuit**: Container managing all circuit elements
 * - **Component**: Base class for electrical components (lightbulbs, transistors, etc.)
 * - **ENode**: Electrical connection points (component pins or wire branching points)
 * - **Wire**: Connections between two ENodes
 *
 * Key features:
 * - Automatic ENode lifecycle management
 * - Cascade deletion (removing components removes pins and wires)
 * - Orphaned cleanup (wires lacking one or two end enodes are removed)
 * - Wire splitting with automatic branching point creation
 * - Position tracking for 2D discrete grid rendering
 *
 * @packageDocumentation
 */

// Utilities
export * from './utils/index.js';

// Topology
export * from './topology/index.js';

// Simulation
export * from './simulation/index.js';

// setup helpers
export * from './setup.js';
