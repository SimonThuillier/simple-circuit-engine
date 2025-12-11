import type { CircuitSceneManager } from './CircuitSceneManager';
import { Object3D } from 'three';
import { Rotation } from '@/core/types/Rotation';
import { Position } from '@/core/types/Position';
import type { ModelEditAction, SceneManagerEventMap } from '../shared/types';

/**
 * Manages editing operations of 3D models from the circuit scene into the core circuit model.
 */
export class CircuitEditionManager {
  private _sceneManager: CircuitSceneManager;

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
  }

  /**
   * Given an action on a component (add, edit, delete), updates the core circuit model
   * and emits the appropriate event.
   * @param componentId
   * @param action
   * @param component
   */
  saveComponentAction(componentId: string, action: ModelEditAction, component: Object3D): void {
    try {
      if (action === 'delete') {
        // TODO handle delete action
        return;
      }
      const event = this._saveComponentAddOrEdit(componentId, action, component);
      this._sceneManager.emit('circuitElementAction', event);
      return;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'component',
        action: action,
        id: componentId,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      return;
    }
  }

  /**
   * Internal method to handle saving component state. May throw errors.
   * @param componentId
   * @param action
   * @param component
   * @private
   */
  private _saveComponentAddOrEdit(
    componentId: string,
    action: ModelEditAction,
    component: Object3D
  ): SceneManagerEventMap['circuitElementAction'] {
    // Logic to save the current state of the scene component into the core model
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }
    const circuitComponent = circuit.getComponent(componentId);
    if (!circuitComponent) {
      throw new Error(`Component with ID ${componentId} not found in the circuit.`);
    }
    const modelRotation = new Rotation(-Math.round((component.rotation.y * 180) / Math.PI));
    const modelPosition = new Position(
      Math.round(component.position.x),
      Math.round(-component.position.z)
    );
    circuitComponent.setRotation(modelRotation);
    circuitComponent.setPosition(modelPosition);

    return {
      type: 'component',
      action: action,
      id: componentId,
      error: null,
      data: {
        position: modelPosition,
        rotation: modelRotation,
      },
    };
  }

  /**
   * Given an action on an enode (add, edit, delete), updates the core circuit model
   * and emits the appropriate event.
   * @param enodeId
   * @param action
   * @param enode
   */
  saveEnodeAction(enodeId: string, action: ModelEditAction, enode: Object3D): void {
    // TODO implement enode action saving logic
  }

  /**
   * Given an action on a wire (add, edit, delete), updates the core circuit model
   * and emits the appropriate event.
   * @param wireId
   * @param action
   * @param wire
   */
  saveWireAction(wireId: string, action: ModelEditAction, wire: Object3D): void {
    // TODO implement wire action saving logic
  }
}
