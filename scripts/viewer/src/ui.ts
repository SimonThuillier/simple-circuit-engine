/**
 * UI helper functions for error display and user interactions
 */

import { ValidationError, IntegrityError, RenderError } from './errors.js';

/**
 * Displays an error message in the error display element
 */
export function displayError(
  error: ValidationError | IntegrityError | RenderError | Error,
  errorDisplayElement: HTMLElement,
  errorMessageElement: HTMLElement
): void {
  let message: string;

  if (error instanceof ValidationError) {
    message = `❌ Validation Error: ${error.message}`;
    if (error.field) {
      message += ` (field: ${error.field})`;
    }
  } else if (error instanceof IntegrityError) {
    message = `❌ Integrity Error: ${error.message}`;
    message += `\nEntity: ${error.entityId.substring(0, 8)}`;
    message += `\nReference: ${error.referenceId.substring(0, 8)}`;
  } else if (error instanceof RenderError) {
    message = `❌ Render Error: ${error.message}`;
    if (error.dotSnippet) {
      message += `\n\nDOT snippet:\n${error.dotSnippet}`;
    }
  } else {
    message = `❌ Error: ${error.message}`;
  }

  errorMessageElement.textContent = message;
  errorDisplayElement.classList.remove('hidden');
}

/**
 * Clears the error display
 */
export function clearError(errorDisplayElement: HTMLElement): void {
  errorDisplayElement.classList.add('hidden');
}
