/**
 * Label Visual Factory Contract
 * @module specs/016-label-component/contracts/LabelVisualFactory
 *
 * Contract specification for the LabelVisualFactory class.
 * This file defines the expected interface and behavior.
 *
 * Implementation target: src/scene/shared/components/LabelVisualFactory.ts
 */

import type { Component } from '@/core/Component';
import type { ComponentState } from '@/core/simulation/states/ComponentState';
import type { ConfigFormDefinition, ConfigFieldDefinition } from '@/scene/shared/types/ConfigTypes';
import * as THREE from 'three';

/**
 * Visual factory for Label components
 *
 * Creates:
 * - Text mesh using CanvasTexture for stencil/technical font styling
 * - Component hitbox for raycasting
 * - No pin groups (Label has zero pins)
 *
 * Configuration:
 * - text: Display text content (max 64 characters, default "Label")
 * - size: Scale multiplier (1-4, default 1)
 *
 * @extends ComponentVisualFactoryBase
 *
 * @example
 * ```typescript
 * const factory = new LabelVisualFactory();
 * const visual = factory.createVisual(labelComponent);
 * scene.add(visual);
 *
 * // Update text
 * const newConfig = new Map([['text', 'Power Supply'], ['size', '2']]);
 * factory.updateFromConfiguration(visual, newConfig);
 * ```
 */
export interface ILabelVisualFactory {
  /**
   * Create the Three.js visual representation for a Label component
   *
   * @param component - The Label component to visualize
   * @returns THREE.Group containing:
   *   - Component hitbox (on COMPONENT layer)
   *   - Text mesh with CanvasTexture
   *
   * @remarks
   * - Sets `group.userData.componentId = component.id`
   * - Sets `group.userData.componentType = component.type`
   * - No pin groups created (Label has zero pins)
   * - Text rendered with monospace font for technical aesthetic
   * - Returns object positioned at origin (scene controller handles placement)
   */
  createVisual(component: Component): THREE.Object3D;

  /**
   * Update visual based on Label configuration
   *
   * @param object3D - The Object3D created by createVisual()
   * @param config - The component configuration Map
   *
   * @remarks
   * Handles:
   * - text: Redraws canvas texture with new text (truncated to 64 chars)
   * - size: Applies scale transform (1x, 2x, 3x, 4x)
   *
   * Empty text falls back to default "Label"
   */
  updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void;

  /**
   * Get config form definition for Label component
   *
   * @returns Form definition with:
   *   - text: text input field
   *   - size: number selector (1-4)
   */
  getConfigFormDefinition(): ConfigFormDefinition;

  /**
   * Map core config to form data
   *
   * @param config - Core config from Component.config
   * @returns Form data with appropriate types
   *
   * @remarks
   * Converts:
   * - text: string → string (no conversion)
   * - size: string → number (parseFloat)
   */
  mapCoreConfigToForm(config: Map<string, string>): Map<string, any>;

  /**
   * Map form data back to core config
   *
   * @param formData - Form data from UI
   * @returns Core config ready for Component.setAllParameters()
   *
   * @remarks
   * Converts:
   * - text: string → string (truncated to 64 chars)
   * - size: number → string
   */
  mapFormToCoreConfig(formData: Map<string, any>): Map<string, string>;

  /**
   * Update animation state (no-op for Label)
   *
   * @param object3D - The Object3D created by createVisual()
   * @param state - Simulation state (always null for Label, ignored)
   *
   * @remarks
   * Labels do not participate in simulation.
   * This method is a no-op, inherited from base class.
   */
  updateAnimation(object3D: THREE.Object3D, state: ComponentState | null): void;

  /**
   * Apply hover visual effect
   *
   * @param object3D - The Object3D created by createVisual()
   *
   * @remarks
   * Applies emissive glow to text mesh (inherited behavior).
   */
  applyHover(object3D: THREE.Object3D): void;

  /**
   * Remove hover visual effect
   *
   * @param object3D - The Object3D created by createVisual()
   */
  removeHover(object3D: THREE.Object3D): void;

  /**
   * Apply selection visual effect
   *
   * @param object3D - The Object3D created by createVisual()
   */
  applySelection(object3D: THREE.Object3D): void;

  /**
   * Remove selection visual effect
   *
   * @param object3D - The Object3D created by createVisual()
   */
  removeSelection(object3D: THREE.Object3D): void;
}

/**
 * Expected ConfigFormDefinition for Label component
 */
export const LABEL_CONFIG_FORM_DEFINITION: ConfigFormDefinition = {
  fields: [
    {
      key: 'text',
      label: 'Label Text',
      type: 'text',
    } as ConfigFieldDefinition,
    {
      key: 'size',
      label: 'Size',
      type: 'number',
      min: 1,
      max: 4,
      step: 1,
    } as ConfigFieldDefinition,
  ],
};

/**
 * Default configuration values for Label component
 */
export const LABEL_DEFAULT_CONFIG = {
  text: 'Label',
  size: '1',
} as const;

/**
 * Text rendering constants
 */
export const LABEL_TEXT_CONSTANTS = {
  /** Maximum text length */
  MAX_TEXT_LENGTH: 64,
  /** Base font size in pixels */
  BASE_FONT_SIZE: 32,
  /** Font family for technical/stencil aesthetic */
  FONT_FAMILY: '"Courier New", Courier, "Liberation Mono", monospace',
  /** Text color */
  TEXT_COLOR: '#333333',
  /** Maximum canvas width in pixels */
  MAX_CANVAS_WIDTH: 512,
  /** Padding around text in pixels */
  PADDING: 8,
} as const;
