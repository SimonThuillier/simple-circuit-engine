import type { CircuitSceneManager } from './CircuitSceneManager';
import {Object3D, Vector3} from 'three';
import { Rotation } from '@/core/types/Rotation';
import { Position } from '@/core/types/Position';
import type { ModelEditAction, SceneManagerEventMap } from '../shared/types';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import type { UUID } from '@/core/types/Identifier';
import type { ENode } from '@/core/ENode';
import type { Wire } from '@/core/Wire';

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
   * add branching point to the core circuit model and emits the appropriate event.
   * @param gridPosition - the grid position to add the branching point at
   * @throws Error
   * @return The circuit enode
   */
  saveAddBranchingPoint(gridPosition: Vector3){
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      // T050: Grid snapping - convert world position to grid position
      const modelPosition = new Position(
          Math.round(gridPosition.x),
          Math.round(-gridPosition.z)
      );
      const circuitEnode = circuit.addBranchingPoint(modelPosition);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'add',
        id: circuitEnode.id,
        error: null,
        data: {
          position: modelPosition
        }
      };
      this._sceneManager.emit('circuitElementAction', event);
      return circuitEnode;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * edit branching point to the core circuit model and emits the appropriate event.
   * @param branchingPoint - the branching point Object3D
   * @throws Error
   * @return The circuit enode
   */
  saveEditBranchingPoint(branchingPoint: Object3D){
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      const circuitEnode = circuit.getENode(branchingPoint.userData.id);
      if (!circuitEnode) {
        throw new Error(`No enode with id ${branchingPoint.userData.id} found in the circuit.`);
      }

      const modelPosition = new Position(
          Math.round(branchingPoint.position.x),
          Math.round(-branchingPoint.position.z)
      );
      const sourceType = branchingPoint.userData.sourceType as ENodeSourceType | undefined;
      circuitEnode.setPosition(modelPosition);
      circuitEnode.setSourceType(sourceType);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'edit',
        id: circuitEnode.id,
        error: null,
        data: {
          position: modelPosition,
          sourceType: sourceType,
        }
      };
      this._sceneManager.emit('circuitElementAction', event);
      return circuitEnode;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'edit',
        id: branchingPoint.userData.id,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * delete branching point in the core circuit model and emits the appropriate event.
   * @param enodeId - the branching point id
   * @throws Error
   * @return The circuit enode
   */
  saveDeleteBranchingPoint(enodeId: UUID) :
      {deletedWires?: UUID[] | undefined, mergedWires?: UUID[] | undefined, newWire?: Wire | undefined}{
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      const result = circuit.removeBranchingPoint(enodeId);

      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'delete',
        id: enodeId,
        error: null,
        data: {
          ...result
        }
      };
      this._sceneManager.emit('circuitElementAction', event);
      return result;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'enode',
        action: 'delete',
        id: enodeId,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * add wire to the core circuit model and emits the appropriate event.
   * @param sourceEnodeId - the source enode ID
   * @param targetEnodeId - the target enode ID
   * @throws Error
   * @return The circuit wire
   */
  saveAddWire(sourceEnodeId : UUID, targetEnodeId : UUID){
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      const addResult = circuit.addWire(sourceEnodeId, targetEnodeId);
      if (addResult instanceof Error) {
        throw new Error(addResult.message);
      }
      const wire = addResult as Wire;
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'add',
        id: wire.id,
        error: null,
        data: {
          node1: wire.node1,
          node2: wire.node2,
        }
      };
      this._sceneManager.emit('circuitElementAction', event);
      return wire;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'add',
        id: undefined,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
      throw new Error((error as Error).message);
    }
  }

  /**
   * Save wire split operation to circuit model.
   * @param wireId - Wire to split
   * @param worldPosition - world Position for the new branching point
   * @returns Object containing the new branching point and two wires
   */
  saveSplitWire(
      wireId: UUID,
      worldPosition: Vector3
  ): { branchingPoint: ENode; wire1: Wire; wire2: Wire } {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }
    // Convert world position to grid position
    const gridPosition = new Position(
        Math.round(worldPosition.x),
        Math.round(-worldPosition.z)
    );
    const result = circuit.splitWire(wireId, gridPosition);

    this._sceneManager.emit('wireSplit', {
      originalWireId: wireId,
      branchingPointId: result.branchingPoint.id,
      wire1Id: result.wire1.id,
      wire2Id: result.wire2.id,
    });

    return result;
  }

  /**
   * delete wire to the core circuit model and emits the appropriate event.
   * @param wireId - the wire ID
   * @throws Error
   * @return The circuit wire
   */
  saveDeleteWire(wireId : UUID): void {
    const circuit = this._sceneManager.getCircuit();
    try {
      if (!circuit) {
        throw new Error('No circuit available in the scene manager.');
      }
      circuit.removeWire(wireId);
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'delete',
        id: wireId,
        error: null,
        data: null
      };
      this._sceneManager.emit('circuitElementAction', event);
      return;
    } catch (error) {
      const event: SceneManagerEventMap['circuitElementAction'] = {
        type: 'wire',
        action: 'delete',
        id: wireId,
        error: error as Error,
        data: null,
      };
      this._sceneManager.emit('circuitElementAction', event);
    }
  }

  /**
   * Save ENode sourceType update (T011)
   * @param enodeId - ENode to update
   * @param sourceType - New sourceType value
   */
  saveENodeSourceTypeAction(enodeId: UUID, sourceType: ENodeSourceType | null): void {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }

    circuit.updateENodeSourceType(enodeId, sourceType);

    this._sceneManager.emit('enodeSourceTypeChanged', {
      enodeId,
      sourceType,
    });
  }

}
