import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { LightVisualFactoryBase } from './LightVisualFactoryBase';

/** Visual factory for the OneLight component (single-light input mirror). */
export class OneLightVisualFactory extends LightVisualFactoryBase {
  protected readonly bitCount = 1;
  protected readonly holePositions: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  protected readonly envelopeHeight = 1.4;

  constructor() {
    super();
    this._componentType = ComponentType.OneLight;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    return this.createVisualBase(component, context);
  }
}
