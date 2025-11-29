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
 * - Orphaned cleanup (branching points with no wires are removed)
 * - Wire splitting with automatic branching point creation
 * - Position tracking for 2D discrete grid rendering
 *
 * @packageDocumentation
 */

// Type definitions (foundational)
export type { UUID } from './types/Identifier.js';
export { generateUUID } from './types/Identifier.js';
export { Position } from './types/Position.js';
export { Rotation } from './types/Rotation.js';
export { ENodeType } from './types/ENodeType.js';
export {
  ComponentType,
  COMPONENT_TYPE_METADATA,
  getAllComponentTypes,
  getComponentTypeMetadata,
} from './types/ComponentType.js';
export type { ComponentTypeMetadata } from './types/ComponentType.js';

// Core entities
export { Circuit } from './Circuit.js';
export { Component } from './Component.js';
export { ENode } from './ENode.js';
export { Wire } from './Wire.js';
