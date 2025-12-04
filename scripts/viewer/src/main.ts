/**
 * Main entry point for the circuit topology visualizer
 * Exports CircuitVisualizer class to window object
 */
import { VisualizerError, ValidationError, IntegrityError, RenderError } from './errors.js';
import {CircuitSceneManager} from "@/scene/static/CircuitSceneManager.js";
import {FactoryRegistry} from "@/scene/shared/FactoryRegistry.js";
import {createDefaultFactory} from "@/scene/shared/ComponentVisualFactory.js";
import {Circuit} from "@/core/Circuit.js";
import {WebGLRenderer} from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    CircuitSceneManager: typeof CircuitSceneManager;
    componentsFactoryRegistry: FactoryRegistry;
    OrbitControls: typeof OrbitControls;
    Circuit: typeof Circuit;
    VisualizerError: typeof VisualizerError;
    ValidationError: typeof ValidationError;
    IntegrityError: typeof IntegrityError;
    RenderError: typeof RenderError;
  }
}

// Immediately assign to window (for IIFE bundles)
if (typeof window !== 'undefined') {

  const componentsFactoryRegistry = new FactoryRegistry(createDefaultFactory());

  window.renderer = new WebGLRenderer({antialias: false, alpha: false});
  window.renderer.setClearColor(0x222290);

  window.CircuitSceneManager = CircuitSceneManager;
  window.componentsFactoryRegistry = componentsFactoryRegistry;
  window.OrbitControls = OrbitControls;
  window.Circuit = Circuit;
  window.VisualizerError = VisualizerError;
  window.ValidationError = ValidationError;
  window.IntegrityError = IntegrityError;
  window.RenderError = RenderError;

  console.log('Circuit Static Viewer loaded');
}

export { CircuitSceneManager, Circuit, VisualizerError, ValidationError, IntegrityError, RenderError };
