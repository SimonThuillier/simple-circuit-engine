/**
 * Types for Map Controls and Hovering Detection
 * @module scene/shared/types (additions)
 *
 * These types will be added to the existing types.ts file.
 */

import type { UUID } from '../../../src/core/types/Identifier';
import type * as THREE from 'three';
import type { RenderObjectType } from '../../../src/scene/shared/types';

// ============================================================================
// Layer Constants
// ============================================================================

/**
 * Three.js layer assignments for hitbox meshes
 *
 * Layers enable priority-based raycasting by querying layers sequentially.
 * Lower numbers = higher priority for hover detection.
 *
 * @remarks
 * - Layer 0 is reserved for default visual rendering
 * - Hitbox layers (1-3) are invisible but raycastable
 * - Camera.layers should include only layer 0 for rendering
 * - Raycaster.layers is set per-query based on priority
 */
export const HitboxLayers = {
  /** Default layer for visual rendering (do not use for hitboxes) */
  DEFAULT: 0,
  /** Enode hitboxes - highest hover priority */
  ENODE: 1,
  /** Component hitboxes - medium hover priority */
  COMPONENT: 2,
  /** Wire hitboxes - lowest hover priority */
  WIRE: 3,
} as const;

export type HitboxLayerValue = (typeof HitboxLayers)[keyof typeof HitboxLayers];

// ============================================================================
// Hoverable Types
// ============================================================================

/**
 * Types of circuit elements that can be hovered
 *
 * Used for discriminating HoveredElement and determining priority
 */
export type HoverableType = 'enode' | 'component' | 'wire';

/**
 * Represents the currently hovered circuit element
 *
 * Returned by HoverManager.getHoveredElement() and included in hover events.
 *
 * @example
 * ```typescript
 * const hovered = hoverManager.getHoveredElement();
 * if (hovered?.type === 'component') {
 *   highlightComponent(hovered.id);
 * }
 * ```
 */
export interface HoveredElement {
  /** UUID of the hovered circuit element */
  id: UUID;
  /** Discriminated type for priority and handling */
  type: HoverableType;
  /** Three.js object type (matches existing RenderObjectType) */
  objectType: RenderObjectType;
  /** Reference to the Three.js hitbox mesh */
  object3D: THREE.Object3D;
}

// ============================================================================
// MapControls Configuration
// ============================================================================

/**
 * Configuration options for MapControls integration
 *
 * All properties are optional with sensible defaults.
 * Pass to CircuitSceneManager.initialize() or CircuitRunnerSceneManager.initialize().
 *
 * @example
 * ```typescript
 * manager.initialize(container, {
 *   mapControls: {
 *     enableRotate: false,  // Disable rotation for 2D-only view
 *     maxDistance: 50,      // Limit zoom out
 *   }
 * });
 * ```
 */
export interface MapControlsOptions {
  /**
   * Enable click-drag panning
   * @default true
   */
  enablePan?: boolean;

  /**
   * Enable scroll wheel zooming
   * @default true
   */
  enableZoom?: boolean;

  /**
   * Enable right-click rotation
   * @default true
   */
  enableRotate?: boolean;

  /**
   * Enable smooth deceleration when releasing controls
   * @default true
   */
  enableDamping?: boolean;

  /**
   * Damping strength (0 = instant stop, 1 = very slow stop)
   * @default 0.05
   */
  dampingFactor?: number;

  /**
   * Minimum zoom distance from target
   * @default 1
   */
  minDistance?: number;

  /**
   * Maximum zoom distance from target
   * @default 100
   */
  maxDistance?: number;

  /**
   * Pan speed multiplier
   * @default 1.0
   */
  panSpeed?: number;

  /**
   * Zoom speed multiplier
   * @default 1.0
   */
  zoomSpeed?: number;

  /**
   * Rotation speed multiplier
   * @default 1.0
   */
  rotateSpeed?: number;
}

// ============================================================================
// Extended Renderer Options
// ============================================================================

/**
 * Extended renderer options including MapControls configuration
 *
 * Extends existing RendererOptions with mapControls property.
 */
export interface ExtendedRendererOptions {
  /** Background color for the scene (default: 0x000000) */
  backgroundColor?: number;
  /** Enable anti-aliasing (default: true) */
  antialias?: boolean;
  /** Camera field of view in degrees (default: 75) */
  cameraFov?: number;
  /** Camera near clipping plane (default: 0.1) */
  cameraNear?: number;
  /** Camera far clipping plane (default: 1000) */
  cameraFar?: number;
  /** Enable grid helper visualization (default: true) */
  showGrid?: boolean;
  /** Enable axes helper visualization (default: false) */
  showAxes?: boolean;
  /** MapControls configuration */
  mapControls?: MapControlsOptions;
}

// ============================================================================
// Hitbox UserData Types
// ============================================================================

/**
 * UserData structure for enode hitbox meshes
 */
export interface EnodeHitboxUserData {
  type: 'enodeHitbox';
  componentId: string;
  pinId: string;
  label: string;
}

/**
 * UserData structure for component hitbox meshes
 */
export interface ComponentHitboxUserData {
  type: 'componentHitbox';
  componentId: string;
}

/**
 * UserData structure for wire hitbox meshes
 */
export interface WireHitboxUserData {
  type: 'wireHitbox';
  wireId: string;
}

/**
 * Union of all hitbox userData types
 */
export type HitboxUserData =
  | EnodeHitboxUserData
  | ComponentHitboxUserData
  | WireHitboxUserData;
