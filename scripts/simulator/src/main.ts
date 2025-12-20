/**
 * Main entry point for the circuit topology visualizer
 * Exports CircuitVisualizer class to window object
 */
import { IntegrityError, RenderError, ValidationError, VisualizerError } from './errors.js';
import { CircuitRunnerController } from '@/scene/simulation/CircuitRunnerController.js';
import { FactoryRegistry } from '@/scene/shared/FactoryRegistry.js';
import { DefaultVisualFactory } from '@/scene/shared/components/DefaultVisualFactory.js';
import { Circuit } from '@/core/Circuit.js';
import { CircuitRunner } from '@/core/simulation/CircuitRunner.js';
import { AxesHelper, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ComponentType } from '@/core/types/ComponentType.js';
import {
  BatteryVisualFactory,
  type IFactoryRegistry,
  SwitchVisualFactory,
  SmallLEDVisualFactory,
} from '../../../src/scene';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { BatteryBehavior, BehaviorRegistry, SmallLEDBehavior } from '../../../src/core/simulation';
import { SwitchBehavior } from '../../../src/core/simulation/behaviors/SwitchBehavior';

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    axesHelper: AxesHelper;
    Circuit: typeof Circuit;
    CircuitRunner: typeof CircuitRunner;
    CircuitRunnerController: typeof CircuitRunnerController;
    behaviorRegistry: BehaviorRegistry;
    componentsFactoryRegistry: FactoryRegistry;
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
  componentsFactoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
  componentsFactoryRegistry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());

  const behaviorRegistry = new BehaviorRegistry();
  behaviorRegistry.register(new BatteryBehavior());
  behaviorRegistry.register(new SwitchBehavior());
  behaviorRegistry.register(new SmallLEDBehavior());

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
