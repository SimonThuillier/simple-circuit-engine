import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { InputVisualFactoryBase } from './InputVisualFactoryBase';

/** Visual factory for the TwoInput component (two-switch user input). */
export class TwoInputVisualFactory extends InputVisualFactoryBase {
  protected readonly bitCount = 2;
  protected readonly holePositions: Array<{ x: number; y: number }> = [
    {x: 0, y: -0.6},
    {x: 0, y: 0.6}
  ];
  protected readonly envelopeHeight = 2.4;

  constructor() {
    super();
    this._componentType = ComponentType.TwoInput;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    return this.createVisualBase(component, context);
  }
}
