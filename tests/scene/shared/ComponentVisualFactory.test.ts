/**
 * Unit tests for ComponentVisualFactory classes
 * @module tests/unit/rendering/ComponentVisualFactory.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  ComponentVisualFactoryBase,
  DefaultVisualFactory,
  type IComponentVisualFactory,
} from '../../../src/scene/shared/components/ComponentVisualFactory';
import { SmallLEDVisualFactory } from '../../../src/scene/shared/components/SmallLEDVisualFactory';
import { SwitchVisualFactory } from '../../../src/scene/shared/components/SwitchVisualFactory';
import type { Component } from '../../../src/core/Component';
import { ComponentType } from '../../../src/core/types/ComponentType';
import { createMockCircuit } from '../helpers';
import type { SmallLEDState } from '../../../src/core/simulation/states/SmallLEDState';
import type { SwitchState } from '../../../src/core/simulation/states/SwitchState';

/**
 * Test factory that extends ComponentVisualFactoryBase
 * Creates a simple cube for testing hover effects
 */
class TestVisualFactory extends ComponentVisualFactoryBase {
  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    group.userData.componentId = component.id;
    group.userData.componentType = component.type;

    // Add a mesh with standard material
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
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
    it('should set isHovered flag in userData', () => {
      factory.applyHover(visual);

      // Find the mesh child
      let foundHoveredFlag = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (child.userData.isHovered === true) {
            foundHoveredFlag = true;
          }
        }
      });

      expect(foundHoveredFlag).toBe(true);
    });

    it('should modify emissive color to default hover color', () => {
      factory.applyHover(visual);

      // Check that at least one mesh has the hover color
      let foundHoverColor = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const material = child.material;
          if (material.emissive.getHex() === ComponentVisualFactoryBase['DEFAULT_HOVER_COLOR']) {
            foundHoverColor = true;
          }
        }
      });

      expect(foundHoverColor).toBe(true);
    });

    it('should modify emissive intensity to default hover intensity', () => {
      factory.applyHover(visual);

      // Check that at least one mesh has the hover intensity
      let foundHoverIntensity = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const material = child.material;
          if (
            material.emissiveIntensity === ComponentVisualFactoryBase['DEFAULT_HOVER_INTENSITY']
          ) {
            foundHoverIntensity = true;
          }
        }
      });

      expect(foundHoverIntensity).toBe(true);
    });

    it('should store original emissive color in userData', () => {
      factory.applyHover(visual);

      // Check that original values are stored
      let foundOriginalEmissive = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.originalEmissive) {
          foundOriginalEmissive = true;
          expect(child.userData.originalEmissive).toBeInstanceOf(THREE.Color);
        }
      });

      expect(foundOriginalEmissive).toBe(true);
    });

    it('should store original emissive intensity in userData', () => {
      factory.applyHover(visual);

      // Check that original intensity is stored
      let foundOriginalIntensity = false;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.originalEmissiveIntensity !== undefined) {
          foundOriginalIntensity = true;
          expect(typeof child.userData.originalEmissiveIntensity).toBe('number');
        }
      });

      expect(foundOriginalIntensity).toBe(true);
    });

    it('should be idempotent (safe to call multiple times)', () => {
      factory.applyHover(visual);

      // Store state after first call
      let firstHoverColor: number | undefined;
      let firstHoverIntensity: number | undefined;
      let firstOriginalEmissive: THREE.Color | undefined;
      let firstOriginalIntensity: number | undefined;

      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          firstHoverColor = child.material.emissive.getHex();
          firstHoverIntensity = child.material.emissiveIntensity;
          firstOriginalEmissive = child.userData.originalEmissive?.clone();
          firstOriginalIntensity = child.userData.originalEmissiveIntensity;
        }
      });

      // Call again
      factory.applyHover(visual);

      // Verify state is unchanged
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          expect(child.material.emissive.getHex()).toBe(firstHoverColor);
          expect(child.material.emissiveIntensity).toBe(firstHoverIntensity);
          expect(child.userData.originalEmissive.equals(firstOriginalEmissive)).toBe(true);
          expect(child.userData.originalEmissiveIntensity).toBe(firstOriginalIntensity);
        }
      });
    });

    it('should skip invisible materials (hitboxes)', () => {
      // Add an invisible hitbox mesh
      const hitboxGeometry = new THREE.BoxGeometry(2, 2, 2);
      const hitboxMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0.2,
      });
      const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
      visual.add(hitbox);

      factory.applyHover(visual);

      // Hitbox should not have isHovered flag
      expect(hitbox.userData.isHovered).toBeUndefined();
    });
  });

  describe('removeHover()', () => {
    it('should restore original material state', () => {
      // Store original state
      let originalColor: number | undefined;
      let originalIntensity: number | undefined;

      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          originalColor = child.material.emissive.getHex();
          originalIntensity = child.material.emissiveIntensity;
        }
      });

      // Apply and then remove hover
      factory.applyHover(visual);
      factory.removeHover(visual);

      // Check restoration
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          expect(child.material.emissive.getHex()).toBe(originalColor);
          expect(child.material.emissiveIntensity).toBe(originalIntensity);
        }
      });
    });

    it('should clear isHovered flag', () => {
      factory.applyHover(visual);
      factory.removeHover(visual);

      // Verify flag is cleared
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          expect(child.userData.isHovered).toBe(false);
        }
      });
    });

    it('should be safe to call without prior applyHover', () => {
      // Should not throw
      expect(() => {
        factory.removeHover(visual);
      }).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      factory.applyHover(visual);
      factory.removeHover(visual);

      // Call again - should not throw
      expect(() => {
        factory.removeHover(visual);
      }).not.toThrow();
    });

    it('should handle missing original emissive gracefully', () => {
      // Manually set isHovered without storing original values
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.isHovered = true;
        }
      });

      // Should not throw
      expect(() => {
        factory.removeHover(visual);
      }).not.toThrow();
    });
  });

  describe('applySelection()', () => {
    it('should be a no-op (placeholder)', () => {
      // Store state before
      const beforeState = JSON.stringify(visual.userData);

      factory.applySelection(visual);

      // State should be unchanged
      const afterState = JSON.stringify(visual.userData);
      expect(afterState).toBe(beforeState);
    });
  });

  describe('removeSelection()', () => {
    it('should be a no-op (placeholder)', () => {
      // Store state before
      const beforeState = JSON.stringify(visual.userData);

      factory.removeSelection(visual);

      // State should be unchanged
      const afterState = JSON.stringify(visual.userData);
      expect(afterState).toBe(beforeState);
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
      const pinGroup = (testFactory as any).createPinGroup('comp-123', 'pin-456', 'testPin');

      expect(pinGroup).toBeInstanceOf(THREE.Group);
      expect(pinGroup.userData.type).toBe('enodeGroup');
      expect(pinGroup.userData.componentId).toBe('comp-123');
      expect(pinGroup.userData.enodeId).toBe('pin-456');
      expect(pinGroup.userData.label).toBe('testPin');
    });

    it('should create hitbox and visual meshes', () => {
      const testFactory = new TestVisualFactory();
      const pinGroup = (testFactory as any).createPinGroup('comp-123', 'pin-456', 'testPin');

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
    it('should create a magenta cube placeholder', () => {
      const visual = factory.createVisual(component);

      expect(visual).toBeInstanceOf(THREE.Mesh);
      const mesh = visual as THREE.Mesh;
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHex()).toBe(0xff00ff); // Magenta
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

    it('should create 1x1x1 cube', () => {
      const visual = factory.createVisual(component);
      const mesh = visual as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BoxGeometry;

      expect(geometry).toBeInstanceOf(THREE.BoxGeometry);
      expect(geometry.parameters.width).toBe(1);
      expect(geometry.parameters.height).toBe(1);
      expect(geometry.parameters.depth).toBe(1);
    });
  });

  describe('hover effects', () => {
    it('should inherit default hover behavior from base class', () => {
      const visual = factory.createVisual(component);

      // Apply hover
      factory.applyHover(visual);

      // Should apply emissive glow
      const mesh = visual as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.emissive.getHex()).toBe(ComponentVisualFactoryBase['DEFAULT_HOVER_COLOR']);
      expect(material.emissiveIntensity).toBe(
        ComponentVisualFactoryBase['DEFAULT_HOVER_INTENSITY']
      );
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
    circuit = createMockCircuit({
      componentCount: 1,
      componentTypes: [ComponentType.SmallLED],
    });
    component = circuit.getAllComponents()[0];
    visual = factory.createVisual(component);
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
          const material = child.material as THREE.MeshStandardMaterial;
          expect(material.emissive.getHex()).toBeGreaterThan(0); // Should have some emissive color
          expect(material.emissiveIntensity).toBeGreaterThan(0); // Should have intensity > 0
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
          const material = child.material as THREE.MeshStandardMaterial;
          expect(material.emissive.getHex()).toBe(0x000000); // Black (no emissive)
          expect(material.emissiveIntensity).toBe(0); // Zero intensity
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
    circuit = createMockCircuit({
      componentCount: 1,
      componentTypes: [ComponentType.Switch],
    });
    component = circuit.getAllComponents()[0];
    visual = factory.createVisual(component);
  });

  describe('updateAnimation()', () => {
    it('should rotate contactor based on state.isClosed', () => {
      const closedState: SwitchState = {
        componentId: component.id,
        isClosed: true,
      } as SwitchState;

      const openState: SwitchState = {
        componentId: component.id,
        isClosed: false,
      } as SwitchState;

      // Get initial rotation
      let contactorGroup: THREE.Object3D | null = null;
      visual.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.part === 'contactor') {
          contactorGroup = child.parent;
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
  });
});
