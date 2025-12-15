import type { CircuitSceneManager } from './CircuitSceneManager';
import { Object3D } from 'three';
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

  /**
   * Save branching point creation to circuit model.
   * @param position - Grid position for the branching point
   * @param sourceType - Optional source type (voltage/current)
   * @returns The created ENode
   */
  saveBranchingPointAction(position: Position, sourceType?: ENodeSourceType): ENode {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }

    const branchingPoint = circuit.addBranchingPoint(position, sourceType);

    this._sceneManager.emit('branchingPointCreated', {
      enodeId: branchingPoint.id,
      position,
    });

    return branchingPoint;
  }

  /**
   * Save wire split operation to circuit model.
   * @param wireId - Wire to split
   * @param position - Position for the new branching point
   * @returns Object containing the new branching point and two wires
   */
  saveWireSplitAction(
    wireId: UUID,
    position: Position
  ): { branchingPoint: ENode; wire1: Wire; wire2: Wire } {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }

    const result = circuit.splitWire(wireId, position);

    this._sceneManager.emit('wireSplit', {
      originalWireId: wireId,
      branchingPointId: result.branchingPoint.id,
      wire1Id: result.wire1.id,
      wire2Id: result.wire2.id,
    });

    return result;
  }

  /**
   * Save wire intermediate positions update.
   * @param wireId - Wire to update
   * @param positions - New intermediate positions
   * @returns The updated Wire
   */
  saveWireIntermediatePositionsAction(wireId: UUID, positions: Position[]): Wire {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) {
      throw new Error('No circuit available in the scene manager.');
    }

    const updatedWire = circuit.updateWireIntermediatePositions(wireId, positions);

    this._sceneManager.emit('wireIntermediatePositionsChanged', {
      wireId,
      positions,
    });

    return updatedWire;
  }

  /**
   * Save ENode source type update.
   * @param enodeId - ENode to update
   * @param sourceType - New source type (null to clear)
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
