/**
 * Main entry point for the CircuitEngine demo page
 * Uses the unified CircuitEngine API for both editing and simulation
 */
import { AxesHelper, WebGLRenderer } from 'three';
import { EngineError, IntegrityError, RenderError, ValidationError } from './errors.js';
import {
  Circuit,
  BehaviorRegistry,
  registerBasicComponentsBehaviors,
} from 'simple-circuit-engine/core';
import {
  CircuitRunnerController,
  type IFactoryRegistry,
  FactoryRegistry,
  DefaultVisualFactory,
  registerBasicComponentsFactories,
} from 'simple-circuit-engine/scene';

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    axesHelper: AxesHelper;
    CircuitRunnerController: typeof CircuitRunnerController;
    Circuit: typeof Circuit;
    behaviorRegistry: BehaviorRegistry;
    componentsFactoryRegistry: IFactoryRegistry;
    EngineError: typeof EngineError;
    ValidationError: typeof ValidationError;
    IntegrityError: typeof IntegrityError;
    RenderError: typeof RenderError;
  }
}

// Immediately assign to window (for IIFE bundles)
if (typeof window !== 'undefined') {
  // Create component factory registry with all visual factories
  const componentsFactoryRegistry: IFactoryRegistry = new FactoryRegistry(
    new DefaultVisualFactory()
  );
  registerBasicComponentsFactories(componentsFactoryRegistry);

  // Create behavior registry with all component behaviors
  const behaviorRegistry = new BehaviorRegistry();
  registerBasicComponentsBehaviors(behaviorRegistry);

  // Create WebGL renderer
  window.renderer = new WebGLRenderer({ antialias: true, alpha: false });
  window.renderer.setClearColor(0x1a1a2e);

  // Create axes helper for reference
  window.axesHelper = new AxesHelper(5);

  // Export to window
  window.CircuitRunnerController = CircuitRunnerController;
  window.Circuit = Circuit;
  window.behaviorRegistry = behaviorRegistry;
  window.componentsFactoryRegistry = componentsFactoryRegistry;
  window.EngineError = EngineError;
  window.ValidationError = ValidationError;
  window.IntegrityError = IntegrityError;
  window.RenderError = RenderError;

  console.log('CircuitEngine Demo loaded');
}

export {
  CircuitRunnerController,
  Circuit,
  EngineError,
  ValidationError,
  IntegrityError,
  RenderError,
};
