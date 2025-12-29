/**
 * Main entry point for the circuit topology visualizer
 * Exports CircuitVisualizer class to window object
 */
import { IntegrityError, RenderError, ValidationError, VisualizerError } from './errors.js';
import { CircuitController } from '@/scene/static/CircuitController.js';
import { Circuit } from '@/core/Circuit.js';
import { AxesHelper, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ComponentType } from '@/core/types/ComponentType.js';
import { MapControls } from 'three/addons/controls/MapControls.js';

import {
  type IFactoryRegistry,
  FactoryRegistry,
  DefaultVisualFactory,
  BatteryVisualFactory,
  LightbulbVisualFactory,
  RelayVisualFactory,
  SmallLEDVisualFactory,
  SwitchVisualFactory,
  TransistorVisualFactory,
  LabelVisualFactory
} from '../../../src/scene/shared/components';

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    axesHelper: AxesHelper;
    CircuitController: typeof CircuitController;
    componentsFactoryRegistry: IFactoryRegistry;
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
  const componentsFactoryRegistry = new FactoryRegistry(
    new DefaultVisualFactory()
  );
  componentsFactoryRegistry.register(ComponentType.Battery, new BatteryVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Lightbulb, new LightbulbVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Relay, new RelayVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
  componentsFactoryRegistry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Transistor, new TransistorVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Label, new LabelVisualFactory());

  window.renderer = new WebGLRenderer({ antialias: false, alpha: false });
  window.renderer.setClearColor(0x222290);

  window.axesHelper = new AxesHelper(10);

  window.CircuitController = CircuitController;
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
  CircuitController,
  Circuit,
  VisualizerError,
  ValidationError,
  IntegrityError,
  RenderError,
};
