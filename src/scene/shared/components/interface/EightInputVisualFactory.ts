import { ComponentType, type Component } from 'simple-circuit-engine/core';
import * as THREE from 'three';
import type { VisualContext } from '../../types';
import { InputVisualFactoryBase } from './InputVisualFactoryBase';

/** Visual factory for the EightInput component (eight-switch user input). */
export class EightInputVisualFactory extends InputVisualFactoryBase {
  protected readonly bitCount = 8;
  protected readonly holePositions: Array<{ x: number; y: number }> = [
    {x: 0, y: -3.6},
    {x: 0, y: -2.6},
    {x: 0, y: -1.6},
    {x: 0, y: -0.6},
    {x: 0, y: 0.6},
    {x: 0, y: 1.6},
    {x: 0, y: 2.6},
    {x: 0, y: 3.6}
  ];
  protected readonly envelopeHeight = 8.4;

  constructor() {
    super();
    this._componentType = ComponentType.EightInput;
  }

  createVisual(component: Component, context: VisualContext): THREE.Object3D {
    return this.createVisualBase(component, context);
  }
}
