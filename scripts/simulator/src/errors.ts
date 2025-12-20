/**
 * Error classes for the circuit topology visualizer
 */

/**
 * Base error class for all visualizer errors
 */
export class VisualizerError extends Error {
  readonly type: 'validation' | 'integrity' | 'render';
  readonly details?: unknown;

  constructor(type: 'validation' | 'integrity' | 'render', message: string, details?: unknown) {
    super(message);
    this.name = 'VisualizerError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Thrown when circuit JSON is malformed or invalid
 */
export class ValidationError extends VisualizerError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super('validation', message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Thrown when circuit data has referential integrity issues
 */
export class IntegrityError extends VisualizerError {
  readonly entityId: string;
  readonly referenceId: string;

  constructor(message: string, entityId: string, referenceId: string) {
    super('integrity', message);
    this.name = 'IntegrityError';
    this.entityId = entityId;
    this.referenceId = referenceId;
  }
}

/**
 * Thrown when DOT graph generation or rendering fails
 */
export class RenderError extends VisualizerError {
  readonly dotSnippet?: string;

  constructor(message: string, dotSnippet?: string) {
    super('render', message);
    this.name = 'RenderError';
    this.dotSnippet = dotSnippet;
  }
}
