import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { LightVisualFactoryBase } from './LightVisualFactoryBase';

/** Visual factory for the EightLight component (eight-light input mirror). */
export class EightLightVisualFactory extends LightVisualFactoryBase {
  protected readonly bitCount = 8;
  protected readonly holePositions: Array<{ x: number; y: number }> = [
    { x: 0, y: -3.6 },
    { x: 0, y: -2.6 },
    { x: 0, y: -1.6 },
    { x: 0, y: -0.6 },
    { x: 0, y: 0.6 },
    { x: 0, y: 1.6 },
    { x: 0, y: 2.6 },
    { x: 0, y: 3.6 },
  ];
  protected readonly envelopeHeight = 8.4;

  constructor() {
    super();
    this._componentType = ComponentType.EightLight;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    return this.createVisualBase(component, context);
  }
}
