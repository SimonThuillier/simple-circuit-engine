/**
 * Component Config Editor - Interface Contracts
 *
 * This file defines the TypeScript interfaces for the config editor feature.
 * These are the contracts that implementation must satisfy.
 *
 * @module specs/015-component-config-editor/contracts
 */

import type { UUID } from '../../../src/core/types/Identifier';

/**
 * Control type for config form fields
 */
export type ConfigControlType = 'dropdown' | 'color' | 'number' | 'text' | 'boolean';

/**
 * Definition of a single configurable field
 */
export interface ConfigFieldDefinition {
  /** Config map key (e.g., "activeColor", "initialState") */
  key: string;

  /** Human-readable label for the form field */
  label: string;

  /** Control type to render */
  type: ConfigControlType;

  /** Options for dropdown type (array or label-value object) */
  options?: string[] | Record<string, string>;

  /** Minimum value for number type */
  min?: number;

  /** Maximum value for number type */
  max?: number;

  /** Step increment for number type */
  step?: number;
}

/**
 * Complete form definition for a component type
 */
export interface ConfigFormDefinition {
  /** Array of field definitions, rendered in order */
  fields: ConfigFieldDefinition[];
}

/**
 * Extension to IComponentVisualFactory interface
 *
 * Factories must implement this method to define their config form.
 * Return null for components with no configurable options.
 */
export interface IConfigFormProvider {
  /**
   * Get the config form definition for this component type
   *
   * @returns Form definition with field specifications, or null if no config
   */
  getConfigFormDefinition(): ConfigFormDefinition | null;
  /**
   * Map the core component config to the form data
   *
   * @returns Form data mapped from core config
   */
  mapCoreConfigToForm(config: Map<string, string>): Map<string, any>;
  /**
   * Map the form data to the core component config
   *
   * @returns Updated core config mapped from form data
   */
  mapFormToCoreConfig(config: Map<string, any>): Map<string, string>;
}

/**
 * Config panel manager interface
 *
 * Manages the lifecycle of the lil-gui config panel.
 */
export interface IConfigPanelManager {
  /**
   * Check if panel is currently open
   */
  readonly isOpen: boolean;

  /**
   * Get the ID of the component currently being edited
   */
  readonly currentComponentId: UUID | null;

  /**
   * Open the config panel for a component
   *
   * @param componentId - UUID of the component to edit
   * @param screenPosition - Screen coordinates for panel positioning
   * @returns true if panel opened, false if component has no config
   */
  open(componentId: UUID, screenPosition: { x: number; y: number }): boolean;

  /**
   * Close the config panel if open
   */
  close(): void;

  /**
   * Dispose of all resources
   */
  dispose(): void;
}

/**
 * Event emitted when config panel state changes
 */
export interface ConfigPanelEvent {
  type: 'opened' | 'closed' | 'changed';
  componentId: UUID;
  key?: string; // For 'changed' events
  value?: string; // For 'changed' events
}

/**
 * Color presets for hybrid color controls
 */
export const COLOR_PRESETS: Readonly<Record<string, string>> = {
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ff8800',
  purple: '#8800ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#ffffff',
  black: '#000000',
};

/**
 * Check if a color value is a hex string
 */
export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Convert a hex color to preset name if it matches, otherwise return hex
 */
export function hexToPresetOrHex(hex: string): string {
  const lowerHex = hex.toLowerCase();
  for (const [name, presetHex] of Object.entries(COLOR_PRESETS)) {
    if (presetHex.toLowerCase() === lowerHex) {
      return name;
    }
  }
  return hex;
}

/**
 * Convert a preset name or hex to hex value
 */
export function presetOrHexToHex(value: string): string {
  if (isHexColor(value)) {
    return value;
  }
  return COLOR_PRESETS[value] ?? '#ffffff';
}
