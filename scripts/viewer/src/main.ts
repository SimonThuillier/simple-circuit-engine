/**
 * Main entry point for the circuit topology visualizer
 * Exports CircuitVisualizer class to window object
 */
import { IntegrityError, RenderError, ValidationError, VisualizerError } from './errors.js';
import { CircuitSceneManager } from '@/scene/static/CircuitSceneManager.js';
import { FactoryRegistry } from '@/scene/shared/FactoryRegistry.js';
import { DefaultVisualFactory } from '@/scene/shared/ComponentVisualFactory.js';
import { Circuit } from '@/core/Circuit.js';
import { AxesHelper, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ComponentType } from '@/core/types/ComponentType.js';
import {
  BatteryVisualFactory,
  type IFactoryRegistry,
  SwitchVisualFactory,
} from '../../../src/scene';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { SmallLEDVisualFactory } from '../../../src/scene/shared/components/SmallLEDVisualFactory';

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    axesHelper: AxesHelper;
    CircuitSceneManager: typeof CircuitSceneManager;
    componentsFactoryRegistry: FactoryRegistry;
    OrbitControls: typeof OrbitControls;
    MapControls: typeof MapControls;
    Circuit: typeof Circuit;
    VisualizerError: typeof VisualizerError;
    ValidationError: typeof ValidationError;
    IntegrityError: typeof IntegrityError;
    RenderError: typeof RenderError;
  }
}

// Immediately assign to window (for IIFE bundles)
if (typeof window !== 'undefined') {
  const componentsFactoryRegistry: IFactoryRegistry = new FactoryRegistry(
    new DefaultVisualFactory()
  );
  componentsFactoryRegistry.register(ComponentType.Battery, new BatteryVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
  componentsFactoryRegistry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());

  window.renderer = new WebGLRenderer({ antialias: false, alpha: false });
  window.renderer.setClearColor(0x222290);

  window.axesHelper = new AxesHelper(10);

  window.CircuitSceneManager = CircuitSceneManager;
  window.componentsFactoryRegistry = componentsFactoryRegistry;
  window.OrbitControls = OrbitControls;
  window.MapControls = MapControls;
  window.Circuit = Circuit;
  window.VisualizerError = VisualizerError;
  window.ValidationError = ValidationError;
  window.IntegrityError = IntegrityError;
  window.RenderError = RenderError;

  console.log('Circuit Static Viewer loaded');
}

export {
  CircuitSceneManager,
  Circuit,
  VisualizerError,
  ValidationError,
  IntegrityError,
  RenderError,
};
