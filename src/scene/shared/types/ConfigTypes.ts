/**
 * Configuration form type definitions
 * @module scene/shared/types/ConfigTypes
 */

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
