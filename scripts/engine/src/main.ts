/**
 * Main entry point for the CircuitEngine demo page
 * Uses the unified CircuitEngine API for both editing and simulation
 */
import { EngineError, IntegrityError, RenderError, ValidationError } from './errors.js';
import { CircuitEngine } from '@/scene/CircuitEngine.js';
import { Circuit } from '@/core/Circuit.js';
import { AxesHelper, WebGLRenderer } from 'three';
import { ComponentType } from '@/core/types/ComponentType.js';
import {
  BehaviorRegistry,
  BatteryBehavior,
  LightbulbBehavior,
  RelayBehavior,
  SmallLEDBehavior,
  SwitchBehavior,
  TransistorBehavior,
} from '@/core/simulation/behaviors';

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
  LabelVisualFactory,
} from '@/scene/shared/components';
import { RectangleLEDVisualFactory } from '../../../src/scene/shared/components/RectangleLEDVisualFactory';
import { RectangleLEDBehavior } from '../../../src/core/simulation/behaviors/RectangleLEDBehavior';

// Export to window object for use in HTML
declare global {
  interface Window {
    renderer: WebGLRenderer;
    axesHelper: AxesHelper;
    CircuitEngine: typeof CircuitEngine;
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
  componentsFactoryRegistry.register(ComponentType.Battery, new BatteryVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Lightbulb, new LightbulbVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Relay, new RelayVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Switch, new SwitchVisualFactory());
  componentsFactoryRegistry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());
  componentsFactoryRegistry.register(ComponentType.RectangleLED, new RectangleLEDVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Transistor, new TransistorVisualFactory());
  componentsFactoryRegistry.register(ComponentType.Label, new LabelVisualFactory());

  // Create behavior registry with all component behaviors
  const behaviorRegistry = new BehaviorRegistry();
  behaviorRegistry.register(new BatteryBehavior());
  behaviorRegistry.register(new LightbulbBehavior());
  behaviorRegistry.register(new RelayBehavior());
  behaviorRegistry.register(new SwitchBehavior());
  behaviorRegistry.register(new SmallLEDBehavior());
  behaviorRegistry.register(new RectangleLEDBehavior());
  behaviorRegistry.register(new TransistorBehavior());

  // Create WebGL renderer
  window.renderer = new WebGLRenderer({ antialias: true, alpha: false });
  window.renderer.setClearColor(0x1a1a2e);

  // Create axes helper for reference
  window.axesHelper = new AxesHelper(5);

  // Export to window
  window.CircuitEngine = CircuitEngine;
  window.Circuit = Circuit;
  window.behaviorRegistry = behaviorRegistry;
  window.componentsFactoryRegistry = componentsFactoryRegistry;
  window.EngineError = EngineError;
  window.ValidationError = ValidationError;
  window.IntegrityError = IntegrityError;
  window.RenderError = RenderError;

  console.log('CircuitEngine Demo loaded');
}

export { CircuitEngine, Circuit, EngineError, ValidationError, IntegrityError, RenderError };
