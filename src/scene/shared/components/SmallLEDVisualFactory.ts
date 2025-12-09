import {type ComponentVisualFactory, ComponentVisualFactoryBase} from "./ComponentVisualFactory";
import type {Component} from "@/core/Component";
import * as THREE from "three";

/**
 * Visual factory for SmallLED components
 *
 * Creates:
 * - LED cylinder mesh
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 *
 * Animation:
 * - Emissive glow when LED is lit (added in US3)
 */
export class SmallLEDVisualFactory extends ComponentVisualFactoryBase {
    createVisual(component: Component): THREE.Object3D {
        console.log('Creating small LED visual for component', component.id);
        // Root group (not rendered, just organizational)
        const group = new THREE.Group();
        group.userData = {
            type: 'componentGroup',
            componentId: component.id,
            componentType: component.type,
        };

        // Component hitbox (invisible, raycastable)
        const hitbox = this.createComponentHitbox(component.id, group.id, 1, 1, 1);
        group.add(hitbox);

        // Visual LED
        const ledMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
        const ledGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 16, 4, false, 0, Math.PI * 2);
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.userData = {
            type: 'component',
            componentId: component.id,
            part: 'led',
        };
        led.position.set(0, 0.2, 0);
        group.add(led);

        // Input pin group
        const inputPinGroup = this.createPinGroup(component.id, component.pins[0]!, 'input');
        inputPinGroup.position.set(-0.25, 0, 0);
        inputPinGroup.rotateZ(Math.PI / 2);
        inputPinGroup.rotateY(Math.PI);
        group.add(inputPinGroup);

        // Output pin group
        const outputPinGroup = this.createPinGroup(component.id, component.pins[1]!, 'output');
        outputPinGroup.position.set(0.25, 0, 0);
        outputPinGroup.rotateZ(-Math.PI / 2);
        outputPinGroup.rotateY(Math.PI);
        group.add(outputPinGroup);

        return group;
    }

    // Uses default hover implementation
    // Animation will be added in US3
}

/**
 * @deprecated Use SmallLEDVisualFactory class instance instead
 */
export const smallLedFactory: ComponentVisualFactory = (component: Component) => {
    return new SmallLEDVisualFactory().createVisual(component);
};