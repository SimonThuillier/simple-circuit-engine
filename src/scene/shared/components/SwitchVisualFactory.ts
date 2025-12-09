import {type ComponentVisualFactory, ComponentVisualFactoryBase} from "./ComponentVisualFactory";
import type {Component} from "@/core/Component";
import * as THREE from "three";

/**
 * Visual factory for Switch components
 *
 * Creates:
 * - Input pole (sphere)
 * - Output pole (box)
 * - Contactor (cylinder, rotatable for animation)
 * - Input pin group
 * - Output pin group
 * - Component hitbox for raycasting
 */
export class SwitchVisualFactory extends ComponentVisualFactoryBase {
    createVisual(component: Component): THREE.Object3D {
        console.log('Creating switch visual for component', component.id);
        // Root group (not rendered, just organizational)
        const group = new THREE.Group();
        group.userData = {
            type: 'componentGroup',
            componentId: component.id,
            componentType: component.type,
        };

        // Component hitbox (invisible, raycastable)
        const hitbox = this.createComponentHitbox(component.id, group.id, 2, 1, 1);
        group.add(hitbox);

        // Visual: poles
        const inputPoleGeometry = new THREE.SphereGeometry(0.3, 16, 8, Math.PI / 2, Math.PI, 0, Math.PI);
        const poleMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});

        const inputPole = new THREE.Mesh(inputPoleGeometry, poleMaterial);
        inputPole.userData = {
            type: 'component',
            componentId: component.id,
        };
        inputPole.position.set(-1, 0, 0);
        group.add(inputPole);

        const outputPoleGeometry = new THREE.BoxGeometry(0.2, 0.3, 1);
        const outputPole = new THREE.Mesh(outputPoleGeometry, poleMaterial);
        outputPole.userData = {
            type: 'component',
            componentId: component.id,
        };
        outputPole.position.set(0.5, 0, 0);
        group.add(outputPole);

        // Contactor
        const contactorGroup = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 1),
            new THREE.MeshBasicMaterial({
                transparent: false,
                visible: false,
            })
        );

        const contactorMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
        const contactorGeometry = new THREE.CylinderGeometry(
            0.2,
            0.12,
            1.5,
            8,
            4,
            false,
            0,
            Math.PI * 2
        );
        const contactor = new THREE.Mesh(contactorGeometry, contactorMaterial);
        contactor.userData = {
            type: 'component',
            componentId: component.id,
            part: 'contactor',
        };
        contactor.rotateZ(Math.PI / 2);
        contactor.position.set(0.5, 0, 0);
        contactorGroup.add(contactor);

        group.add(contactorGroup);
        contactorGroup.position.set(-1, 0, 0);
        contactorGroup.rotation.set(0.5, 0.8, 0);

        // Input pin group
        const inputPinGroup = this.createPinGroup(component.id, component.pins[0]!, 'input');
        inputPinGroup.position.set(-1, 0, 0);
        inputPinGroup.rotateZ(Math.PI / 2);
        inputPinGroup.rotateY(Math.PI);
        group.add(inputPinGroup);

        // Output pin group
        const outputPinGroup = this.createPinGroup(component.id, component.pins[1]!, 'output');
        outputPinGroup.position.set(0.6, 0, 0);
        outputPinGroup.rotateZ(-Math.PI / 2);
        outputPinGroup.rotateY(Math.PI);
        group.add(outputPinGroup);

        return group;
    }

    // Uses default hover implementation
    // Animation will be added in US3
}

/**
 * @deprecated Use SwitchVisualFactory class instance instead
 */
export const switchFactory: ComponentVisualFactory = (component: Component) => {
    return new SwitchVisualFactory().createVisual(component);
};