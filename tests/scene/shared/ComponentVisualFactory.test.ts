/**
 * Unit tests for ComponentVisualFactory classes
 * Updated: 2025-12-11 to match refactored implementation
 * @module tests/unit/rendering/ComponentVisualFactory.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  ComponentVisualFactoryBase,
  type IComponentVisualFactory,
} from '../../../src/scene/shared/components/ComponentVisualFactory';
import { DefaultVisualFactory } from '../../../src/scene/shared/components/DefaultVisualFactory';
import { SmallLEDVisualFactory } from '../../../src/scene/shared/components/basic/SmallLEDVisualFactory';
import { SwitchVisualFactory } from '../../../src/scene/shared/components/basic/SwitchVisualFactory';
import type { Component } from '../../../src/core/topology/Component';
import { ComponentType, ENode, ENodeType } from '../../../src/core';
import { createMockCircuit } from '../helpers';
import type { SmallLEDState } from '../../../src/core/simulation/states/basic/SmallLEDState';
import type { SwitchState } from '../../../src/core/simulation/states/basic/SwitchState';
import type { AnimationContext } from '../../../src/scene/shared/types';
import {
  CmpMatCategory,
  CmpMatType,
  CmpMatVariant,
  CMP_MATERIALS,
} from '../../../src/scene/shared/components/types';

/**
 * Test factory that extends ComponentVisualFactoryBase
 * Creates a simple cube for testing hover effects
 */
class TestVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    group.userData.componentId = component.id;
    group.userData.componentType = component.type;

    // Add a mesh with shared material from CMP_MATERIALS
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, this.getMat(CmpMatCategory.WHITE));
    group.add(mesh);

    return group;
  }
}

describe('ComponentVisualFactoryBase', () => {
  let factory: IComponentVisualFactory;
  let circuit: any;
  let component: Component;
  let visual: THREE.Object3D;

  beforeEach(() => {
    factory = new TestVisualFactory();
    circuit = createMockCircuit({ componentCount: 1 });
    component = circuit.getAllComponents()[0];
    visual = factory.createVisual(component);
  });

  describe('applyHover()', () => {
    it('should swap shared material to HOVERED variant', () => {
      const normalMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.NORMAL];
      const hoveredMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.HOVERED];

      factory.applyHover(visual);

      let foundHoveredMat = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material === hoveredMat) {
          foundHoveredMat = true;
        }
      });
      expect(foundHoveredMat).toBe(true);
    });

    it('should apply hover emissive properties on HOVERED variant', () => {
      factory.applyHover(visual);

      const hoveredMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.HOVERED];
      expect(hoveredMat.emissive.getHex()).toBe(0x4488ff);
      expect(hoveredMat.emissiveIntensity).toBe(0.6);
    });

    it('should skip hover visual when component is selected', () => {
      visual.userData.isSelected = true;
      const normalMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.NORMAL];

      factory.applyHover(visual);

      // Material should remain NORMAL (not swapped)
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.userData?.matType === CmpMatType.SHARED) {
          expect(child.material).toBe(normalMat);
        }
      });
    });

    it('should skip invisible materials (hitboxes)', () => {
      const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), hitboxMaterial);
      visual.add(hitbox);

      factory.applyHover(visual);

      // Hitbox material should be unchanged
      expect(hitbox.material).toBe(hitboxMaterial);
    });
  });

  describe('removeHover()', () => {
    it('should restore shared material to NORMAL variant', () => {
      const normalMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.NORMAL];

      factory.applyHover(visual);
      factory.removeHover(visual);

      let foundNormalMat = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material === normalMat) {
          foundNormalMat = true;
        }
      });
      expect(foundNormalMat).toBe(true);
    });

    it('should be safe to call without prior applyHover', () => {
      expect(() => {
        factory.removeHover(visual);
      }).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      factory.applyHover(visual);
      factory.removeHover(visual);

      expect(() => {
        factory.removeHover(visual);
      }).not.toThrow();
    });

    it('should skip when component is selected', () => {
      factory.applySelection(visual);
      const selectedMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.SELECTED];

      factory.removeHover(visual);

      // Material should remain SELECTED
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.userData?.matType === CmpMatType.SHARED) {
          expect(child.material).toBe(selectedMat);
        }
      });
    });
  });

  describe('applySelection()', () => {
    it('should swap shared material to SELECTED variant', () => {
      const selectedMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.SELECTED];

      factory.applySelection(visual);

      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.userData?.matType === CmpMatType.SHARED) {
          expect(child.material).toBe(selectedMat);
          expect(child.material.emissive.getHex()).toBe(0xff8800);
          expect(child.material.emissiveIntensity).toBe(0.8);
        }
      });
    });

    it('should set isSelected flag on root object', () => {
      expect(visual.userData.isSelected).toBeUndefined();

      factory.applySelection(visual);

      expect(visual.userData.isSelected).toBe(true);
    });

    it('should skip invisible materials (hitboxes)', () => {
      const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), hitboxMaterial);
      visual.add(hitbox);

      factory.applySelection(visual);

      expect(hitbox.material).toBe(hitboxMaterial);
    });

    it('should take precedence over hover effect', () => {
      const hoveredMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.HOVERED];
      const selectedMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.SELECTED];

      factory.applyHover(visual);

      // Verify hover material is applied
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.userData?.matType === CmpMatType.SHARED) {
          expect(child.material).toBe(hoveredMat);
        }
      });

      // Apply selection — should override hover
      factory.applySelection(visual);

      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.userData?.matType === CmpMatType.SHARED) {
          expect(child.material).toBe(selectedMat);
        }
      });
    });
  });

  describe('removeSelection()', () => {
    it('should restore shared material to NORMAL variant', () => {
      const normalMat = CMP_MATERIALS[CmpMatCategory.WHITE][CmpMatVariant.NORMAL];

      factory.applySelection(visual);
      factory.removeSelection(visual);

      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material.userData?.matType === CmpMatType.SHARED) {
          expect(child.material).toBe(normalMat);
        }
      });
    });

    it('should clear isSelected flag on root object', () => {
      factory.applySelection(visual);
      expect(visual.userData.isSelected).toBe(true);

      factory.removeSelection(visual);

      expect(visual.userData.isSelected).toBe(false);
    });

    it('should be safe to call when not selected', () => {
      expect(() => {
        factory.removeSelection(visual);
      }).not.toThrow();
    });
  });

  describe('updateAnimation()', () => {
    it('should be a no-op by default', () => {
      const mockState = {} as any;

      // Store material state before
      let beforeEmissive: number | undefined;
      let beforeIntensity: number | undefined;

      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          beforeEmissive = child.material.emissive.getHex();
          beforeIntensity = child.material.emissiveIntensity;
        }
      });

      factory.updateAnimation(visual, mockState);

      // Material state should be unchanged
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          expect(child.material.emissive.getHex()).toBe(beforeEmissive);
          expect(child.material.emissiveIntensity).toBe(beforeIntensity);
        }
      });
    });
  });

  describe('createPinGroup()', () => {
    it('should create a pin group with correct userData', () => {
      const testFactory = new TestVisualFactory();
      const node = new ENode(ENodeType.Pin, 'comp-123', 'testPin');
      const pinGroup = (testFactory as any).createPinGroup(node);

      expect(pinGroup).toBeInstanceOf(THREE.Group);
      expect(pinGroup.userData.type).toBe('enodeGroup');
      expect(pinGroup.userData.componentId).toBe('comp-123');
      expect(pinGroup.userData.enodeId).toBe(node.id);
      expect(pinGroup.userData.label).toBe('testPin');
    });

    it('should create hitbox and visual meshes', () => {
      const testFactory = new TestVisualFactory();
      const node = new ENode(ENodeType.Pin, 'comp-123', 'testPin');
      const pinGroup = (testFactory as any).createPinGroup(node);

      let hitboxFound = false;
      let visualFound = false;

      pinGroup.children.forEach((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          if (child.userData.type === 'enodeHitbox') {
            hitboxFound = true;
          } else if (child.userData.type === 'enode') {
            visualFound = true;
          }
        }
      });

      expect(hitboxFound).toBe(true);
      expect(visualFound).toBe(true);
    });
  });

  describe('setAnimationContext()', () => {
    it('should store the context', () => {
      const testFactory = new TestVisualFactory();
      const ctx: AnimationContext = { ticksPerSecond: 5, simulationStatus: 'playing' };

      testFactory.setAnimationContext(ctx);

      // Access protected field via cast
      expect((testFactory as any)._animationContext).toBe(ctx);
    });

    it('should clear the context when null is passed', () => {
      const testFactory = new TestVisualFactory();
      const ctx: AnimationContext = { ticksPerSecond: 5, simulationStatus: 'playing' };

      testFactory.setAnimationContext(ctx);
      testFactory.setAnimationContext(null);

      expect((testFactory as any)._animationContext).toBeNull();
    });
  });

  describe('createComponentHitbox()', () => {
    it('should create a hitbox with correct userData', () => {
      const testFactory = new TestVisualFactory();
      const hitbox = (testFactory as any).createComponentHitbox('comp-123', 999, 2, 3, 4);

      expect(hitbox).toBeInstanceOf(THREE.Mesh);
      expect(hitbox.userData.type).toBe('componentHitbox');
      expect(hitbox.userData.componentId).toBe('comp-123');
      expect(hitbox.userData.groupId).toBe(999);
    });

    it('should create box geometry with correct dimensions', () => {
      const testFactory = new TestVisualFactory();
      const hitbox = (testFactory as any).createComponentHitbox('comp-123', 999, 2, 3, 4);

      expect(hitbox.geometry).toBeInstanceOf(THREE.BoxGeometry);
      // BoxGeometry parameters are stored as width, height, depth
      const params = (hitbox.geometry as THREE.BoxGeometry).parameters;
      expect(params.width).toBe(2);
      expect(params.height).toBe(3);
      expect(params.depth).toBe(4);
    });
  });
});

describe('DefaultVisualFactory', () => {
  let factory: DefaultVisualFactory;
  let circuit: any;
  let component: Component;

  beforeEach(() => {
    factory = new DefaultVisualFactory();
    circuit = createMockCircuit({ componentCount: 1 });
    component = circuit.getAllComponents()[0];
  });

  describe('createVisual()', () => {
    it('should create a group', () => {
      const visual = factory.createVisual(component);

      expect(visual).toBeInstanceOf(THREE.Group);
    });

    it('should set isPlaceholder flag', () => {
      const visual = factory.createVisual(component);
      expect(visual.userData.isPlaceholder).toBe(true);
    });

    it('should set componentId and componentType', () => {
      const visual = factory.createVisual(component);
      expect(visual.userData.componentId).toBe(component.id);
      expect(visual.userData.componentType).toBe(component.type);
    });
  });

  describe('hover effects', () => {
    it('should skip private materials (no matType) during hover', () => {
      const group = factory.createVisual(component);
      const meshBefore = group.children[1] as THREE.Mesh;
      const materialBefore = meshBefore.material;

      // Apply hover
      factory.applyHover(group);

      // DefaultVisualFactory uses inline MeshStandardMaterial (no matType/sceMat)
      // so hover should not swap the material — same instance reference
      const meshAfter = group.children[1] as THREE.Mesh;
      expect(meshAfter.material).toBe(materialBefore);
    });
  });
});

describe('SmallLEDVisualFactory - Animation', () => {
  let factory: SmallLEDVisualFactory;
  let circuit: any;
  let component: Component;
  let visual: THREE.Object3D;

  beforeEach(() => {
    factory = new SmallLEDVisualFactory();
    // Inject animation context so updateAnimation processes states (paused → snap path)
    factory.setAnimationContext({ ticksPerSecond: 2, simulationStatus: 'paused' });
    circuit = createMockCircuit({
      componentCount: 1,
      componentTypes: [ComponentType.SmallLED],
    });
    component = circuit.getAllComponents()[0];
    visual = factory.createVisual(component, circuit);
  });

  describe('updateAnimation()', () => {
    it('should apply glow when state.isLit is true', () => {
      const litState: SmallLEDState = {
        componentId: component.id,
        isLit: true,
        voltage: 5,
        current: 0.02,
      } as SmallLEDState;

      factory.updateAnimation(visual, litState);

      // Find LED mesh and check emissive properties
      let ledMeshFound = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.part === 'led') {
          ledMeshFound = true;
          const material = child.material as THREE.MeshLambertMaterial;
          expect(material.emissive.getHex()).toBeGreaterThan(0);
          expect(material.emissiveIntensity).toBeGreaterThan(0);
        }
      });

      expect(ledMeshFound).toBe(true);
    });

    it('should remove glow when state.isLit is false', () => {
      const unlitState: SmallLEDState = {
        componentId: component.id,
        isLit: false,
        voltage: 0,
        current: 0,
      } as SmallLEDState;

      // First set it to lit
      const litState: SmallLEDState = {
        componentId: component.id,
        isLit: true,
        voltage: 5,
        current: 0.02,
      } as SmallLEDState;
      factory.updateAnimation(visual, litState);

      // Then set to unlit
      factory.updateAnimation(visual, unlitState);

      // Find LED mesh and check it's dark
      let ledMeshFound = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.part === 'led') {
          ledMeshFound = true;
          const material = child.material as THREE.MeshLambertMaterial;
          expect(material.emissive.getHex()).toBe(0x000000);
          expect(material.emissiveIntensity).toBe(0);
        }
      });

      expect(ledMeshFound).toBe(true);
    });
  });
});

describe('SwitchVisualFactory - Animation', () => {
  let factory: SwitchVisualFactory;
  let circuit: any;
  let component: Component;
  let visual: THREE.Object3D;

  beforeEach(() => {
    factory = new SwitchVisualFactory();
    // Inject animation context so updateAnimation processes states
    factory.setAnimationContext({ ticksPerSecond: 2, simulationStatus: 'playing' });
    circuit = createMockCircuit({
      componentCount: 1,
      componentTypes: [ComponentType.Switch],
    });
    component = circuit.getAllComponents()[0];
    visual = factory.createVisual(component, circuit);
  });

  describe('updateAnimation()', () => {
    it('should rotate contactor based on state.isClosed', () => {
      const closedState = {
        componentId: component.id,
        state: 'closed',
        isClosed: true,
        hasExpiration: false,
        pinStates: new Map(),
      } as unknown as SwitchState;

      const openState = {
        componentId: component.id,
        state: 'open',
        isClosed: false,
        hasExpiration: false,
        pinStates: new Map(),
      } as unknown as SwitchState;

      // Get initial rotation
      let contactorGroup: THREE.Object3D | null = null;
      visual.traverse((child) => {
        if (child.userData.part === 'contactorGroup') {
          contactorGroup = child;
        }
      });

      expect(contactorGroup).not.toBeNull();

      if (contactorGroup) {
        const initialRotation = contactorGroup.rotation.clone();

        // Apply closed state
        factory.updateAnimation(visual, closedState);
        const closedRotation = contactorGroup.rotation.clone();

        // Apply open state
        factory.updateAnimation(visual, openState);
        const openRotation = contactorGroup.rotation.clone();

        // Rotations should be different between open and closed
        const closedOpenDifferent =
          closedRotation.x !== openRotation.x ||
          closedRotation.y !== openRotation.y ||
          closedRotation.z !== openRotation.z;

        expect(closedOpenDifferent).toBe(true);
      }
    });

    it('should update contactor color based on output pin state', () => {
      // Find contactor mesh
      let contactorMesh: THREE.Mesh | null = null;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.part === 'contactor') {
          contactorMesh = child;
        }
      });
      expect(contactorMesh).not.toBeNull();

      // State with voltage + current on output pin
      const stateWithBoth = {
        componentId: component.id,
        state: 'closed',
        hasExpiration: false,
        pinStates: new Map([['output', { hasVoltage: true, hasCurrent: true, locked: false }]]),
      } as unknown as SwitchState;

      factory.updateAnimation(visual, stateWithBoth);
      const mat = (contactorMesh as unknown as THREE.Mesh).material as THREE.MeshLambertMaterial;
      // Should be magenta (0xff00ff)
      expect(mat.color.r).toBe(1);
      expect(mat.color.g).toBe(0);
      expect(mat.color.b).toBe(1);

      // State with no voltage/current → white
      const stateWithNone = {
        componentId: component.id,
        state: 'open',
        hasExpiration: false,
        pinStates: new Map([['output', { hasVoltage: false, hasCurrent: false, locked: false }]]),
      } as unknown as SwitchState;

      factory.updateAnimation(visual, stateWithNone);
      expect(mat.color.r).toBe(1);
      expect(mat.color.g).toBe(1);
      expect(mat.color.b).toBe(1);
    });

    it('should restore shared material when leaving simulation', () => {
      let contactorMesh: THREE.Mesh | null = null;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.part === 'contactor') {
          contactorMesh = child;
        }
      });
      expect(contactorMesh).not.toBeNull();

      // Enter simulation with colored contactor
      const state = {
        componentId: component.id,
        state: 'closed',
        hasExpiration: false,
        pinStates: new Map([['output', { hasVoltage: true, hasCurrent: false, locked: false }]]),
      } as unknown as SwitchState;

      factory.updateAnimation(visual, state);
      const matAfterAnim = (contactorMesh as unknown as THREE.Mesh)
        .material as THREE.MeshLambertMaterial;
      expect(matAfterAnim.userData.matType).toBe(CmpMatType.ANIMATION_CLONE);

      // Leave simulation
      factory.updateAnimation(visual, null);
      const matAfterRestore = (contactorMesh as unknown as THREE.Mesh)
        .material as THREE.MeshLambertMaterial;
      expect(matAfterRestore.userData.matType).toBe(CmpMatType.SHARED);
    });
  });
});
