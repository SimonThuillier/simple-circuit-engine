/**
 * Main entry point for the circuit topology visualizer
 * Exports CircuitVisualizer class to window object
 */
import { IntegrityError, RenderError, ValidationError, VisualizerError } from './errors.js';
import { CircuitRunnerController } from '@/scene/simulation/CircuitRunnerController.js';
import { Circuit } from '@/core/Circuit.js';
import { CircuitRunner } from '@/core/simulation/CircuitRunner.js';
import { AxesHelper, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ComponentType } from '@/core/types/ComponentType.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import {
  BehaviorRegistry,
  BatteryBehavior,
  LightbulbBehavior,
  RelayBehavior,
  SmallLEDBehavior,
  SwitchBehavior,
  TransistorBehavior
} from '../../../src/core/simulation/behaviors';

import {
  type IFactoryRegistry,
  FactoryRegistry,
  DefaultVisualFactory,
  BatteryVisualFactory,
  LightbulbVisualFactory,
  RelayVisualFactory,
  SmallLEDVisualFactory,
  SwitchVisualFactory,
  TransistorVisualFactory
} from '../../../src/scene/shared/components';

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    axesHelper: AxesHelper;
    Circuit: typeof Circuit;
    CircuitRunner: typeof CircuitRunner;
    CircuitRunnerController: typeof CircuitRunnerController;
    behaviorRegistry: BehaviorRegistry;
    componentsFactoryRegistry: IFactoryRegistry;
    OrbitControls: typeof OrbitControls;
    MapControls: typeof MapControls;
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
  componentsFactoryRegistry.register(ComponentType.Lightbulb, new LightbulbVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Relay, new RelayVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
  componentsFactoryRegistry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Transistor, new TransistorVisualFactory());

  const behaviorRegistry = new BehaviorRegistry();
  behaviorRegistry.register(new BatteryBehavior());
  behaviorRegistry.register(new LightbulbBehavior());
  behaviorRegistry.register(new RelayBehavior());
  behaviorRegistry.register(new SwitchBehavior());
  behaviorRegistry.register(new SmallLEDBehavior());
  behaviorRegistry.register(new TransistorBehavior());

  window.renderer = new WebGLRenderer({ antialias: false, alpha: false });
  window.renderer.setClearColor(0x222290);

  window.axesHelper = new AxesHelper(10);

  window.CircuitRunner = CircuitRunner;
  window.Circuit = Circuit;
  window.CircuitRunnerController = CircuitRunnerController;
  window.behaviorRegistry = behaviorRegistry;
  window.componentsFactoryRegistry = componentsFactoryRegistry;
  window.OrbitControls = OrbitControls;
  window.MapControls = MapControls;

  window.VisualizerError = VisualizerError;
  window.ValidationError = ValidationError;
  window.IntegrityError = IntegrityError;
  window.RenderError = RenderError;
}

export {
  CircuitRunnerController,
  Circuit,
  CircuitRunner,
  VisualizerError,
  ValidationError,
  IntegrityError,
  RenderError,
};
