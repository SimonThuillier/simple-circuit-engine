/**
 * Error classes for the circuit controller demo
 */

/**
 * Base error class for all controller demo errors
 */
export class EngineError extends Error {
  readonly type: 'validation' | 'integrity' | 'render';
  readonly details?: unknown;

  constructor(type: 'validation' | 'integrity' | 'render', message: string, details?: unknown) {
    super(message);
    this.name = 'EngineError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Thrown when circuit JSON is malformed or invalid
 */
export class ValidationError extends EngineError {
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
export class IntegrityError extends EngineError {
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
 * Thrown when rendering fails
 */
export class RenderError extends EngineError {
  readonly snippet?: string;

  constructor(message: string, snippet?: string) {
    super('render', message);
    this.name = 'RenderError';
    this.snippet = snippet;
  }
}
