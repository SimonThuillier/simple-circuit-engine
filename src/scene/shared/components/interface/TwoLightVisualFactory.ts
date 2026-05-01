import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { LightVisualFactoryBase } from './LightVisualFactoryBase';

/** Visual factory for the TwoLight component (two-light input mirror). */
export class TwoLightVisualFactory extends LightVisualFactoryBase {
  protected readonly bitCount = 2;
  protected readonly holePositions: Array<{ x: number; y: number }> = [
    { x: 0, y: -0.6 },
    { x: 0, y: 0.6 },
  ];
  protected readonly envelopeHeight = 2.4;

  constructor() {
    super();
    this._componentType = ComponentType.TwoLight;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    return this.createVisualBase(component, context);
  }
}
