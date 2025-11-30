/**
 * Main entry point for the circuit topology visualizer
 * Exports CircuitVisualizer class to window object
 */

import { CircuitVisualizer } from './renderer.js';
import { VisualizerError, ValidationError, IntegrityError, RenderError } from './errors.js';

// Export to window object for use in HTML
declare global {
  interface Window {
    CircuitVisualizer: typeof CircuitVisualizer;
    VisualizerError: typeof VisualizerError;
    ValidationError: typeof ValidationError;
    IntegrityError: typeof IntegrityError;
    RenderError: typeof RenderError;
  }
}

// Immediately assign to window (for IIFE bundles)
if (typeof window !== 'undefined') {
  window.CircuitVisualizer = CircuitVisualizer;
  window.VisualizerError = VisualizerError;
  window.ValidationError = ValidationError;
  window.IntegrityError = IntegrityError;
  window.RenderError = RenderError;

  console.log('Circuit Visualizer loaded');
}

export { CircuitVisualizer, VisualizerError, ValidationError, IntegrityError, RenderError };
