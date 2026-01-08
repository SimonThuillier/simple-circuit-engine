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

// Type definitions
export { CameraOptions } from './types/CameraOptions.js';
export type { ComponentTypeMetadata } from './types/ComponentType.js';
export {
  ComponentType,
  COMPONENT_TYPE_METADATA,
  getAllComponentTypes,
  getComponentTypeMetadata,
} from './types/ComponentType.js';
export { ENodeSourceType } from './types/ENodeSourceType.js';
export { ENodeType } from './types/ENodeType.js';
export type { UUID } from './types/Identifier.js';
export { generateUUID } from './types/Identifier.js';
export { Position, findPositionBestIndex, simplifyPositions } from './types/Position.js';
export { Position3D } from './types/Position3D.js';
export { Rotation } from './types/Rotation.js';

// Core entities
export { Circuit, CircuitMetadata } from './Circuit.js';
export type { ICircuitMetadata } from './Circuit.js';
export { Component } from './Component.js';
export { ENode } from './ENode.js';
export { Wire } from './Wire.js';

// Simulation
export type * from './simulation/index.js';
export * from './simulation/index.js';
export type * from './simulation/states/index.js';
export * from './simulation/states/index.js';
export type * from './simulation/behaviors/index.js';
export * from './simulation/behaviors/index.js';

// setup helpers
export * from './setup.js';
