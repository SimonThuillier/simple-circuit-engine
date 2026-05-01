import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { LightVisualFactoryBase } from './LightVisualFactoryBase';

/** Visual factory for the FourLight component (four-light input mirror). */
export class FourLightVisualFactory extends LightVisualFactoryBase {
  protected readonly bitCount = 4;
  protected readonly holePositions: Array<{ x: number; y: number }> = [
    { x: 0, y: -1.6 },
    { x: 0, y: -0.6 },
    { x: 0, y: 0.6 },
    { x: 0, y: 1.6 },
  ];
  protected readonly envelopeHeight = 4.4;

  constructor() {
    super();
    this._componentType = ComponentType.FourLight;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    return this.createVisualBase(component, context);
  }
}
