/**
 * Utility functions to provide default options for the 3D circuit scene controllers and engine
 * @module scene/shared/utils/Options
 */

import type { ControllerOptions, EngineOptions, MapControlsOptions } from '../types';

export function mapControlsOptions(
  options: MapControlsOptions | undefined = undefined
): MapControlsOptions {
  const defaultOptions: MapControlsOptions = {
    enablePan: true,
    screenSpacePanning: true,
    enableZoom: true,
    enableRotate: true,
    enableDamping: true,
    dampingFactor: 0.5,
    minDistance: 1,
    maxDistance: 200,
    panSpeed: 1.0,
    zoomSpeed: 2.0,
    rotateSpeed: 1.0,
  };

  if (!options) return defaultOptions;
  return { ...defaultOptions, ...options };
}

export function controllerOptions(
  options: ControllerOptions | undefined = undefined
): ControllerOptions {
  const defaultOptions: ControllerOptions = {
    backgroundColor: 0x222230,
    colorCenterLine: 0xddddaa,
    colorGrid: 0x777777,
    defaultTool: 'build',
    mapControls: mapControlsOptions(),
    simulationSpeed: 3,
    simulationAutoPlay: false
  };

  if (!options) return defaultOptions;
  options.mapControls = mapControlsOptions(options.mapControls);
  return { ...defaultOptions, ...options };
}

export function engineOptions(options: EngineOptions | undefined = undefined): EngineOptions {
  const defaultOptions: EngineOptions = {
    initialMode: 'edit',
    controllerOptions: controllerOptions(),
    runnerOptions: { enableHistory: false, historyLimit: 1 },
  };

  if (!options) return defaultOptions;
  options.controllerOptions = controllerOptions(options.controllerOptions);
  return { ...defaultOptions, ...options };
}
