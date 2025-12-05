import type {Component} from "@/core/Component";
import * as THREE from "three";
import type {ComponentVisualFactory} from "./ComponentVisualFactory";

enum LAYERS {
    COMPONENT_HITBOX = 2,
    WIRE_HITBOX = 3,
    ENODE_HITBOX = 4,
}

//const textureLoader = new THREE.TextureLoader();
// const lightningTexture = textureLoader.load('public/lightning.svg'); // TODO: add later


function createPinGroup(componentId: string, pinId: string, label: string): THREE.Group {

    const pinGroup = new THREE.Group();
    pinGroup.userData = {
        type: 'enodeGroup',
        componentId: componentId,
        pinId: pinId,  // Store actual pin UUID
        label: label,
    };

    const hitboxGeom = new THREE.SphereGeometry(
        0.5, 16, 8,
        0, Math.PI * 2,
        0, Math.PI / 2);
    const hitbox = new THREE.Mesh(hitboxGeom, new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5,
        visible: true
    }));
    hitbox.userData = {
        type: 'enodeHitbox',
        componentId: componentId,
        pinId: pinId,  // Store actual pin UUID
        label: label,
    };
    hitbox.layers.set(LAYERS.ENODE_HITBOX);
    pinGroup.add(hitbox);

    const visual = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x0000ff })
    );
    visual.userData = {
        type: 'enode',
        componentId: componentId,
        pinId: pinId,
        label: label
    };
    pinGroup.add(visual);

    return pinGroup;
}




export const batteryFactory: ComponentVisualFactory = (component: Component) => {
    console.log('Creating battery visual for component', component.id);
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
        type: 'componentGroup',
        componentId: component.id,
        componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitboxGeometry = new THREE.BoxGeometry(2, 2, 3);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.2,
        visible: true,
    });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.userData = {
        type: 'componentHitbox',
        componentId: component.id
    };
    hitbox.layers.set(LAYERS.COMPONENT_HITBOX);
    group.add(hitbox);


    // Visual: battery cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 24);
    const cylinderMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.userData = {
        type: 'component',
        componentId: component.id,
    };
    cylinder.rotateX(Math.PI / 2);
    group.add(cylinder);


    // Cathode (positive pin) group
    const cathodeGroup = createPinGroup(
        component.id, component.pins[0]!,'cathode');
    cathodeGroup.position.set(0, 0, -1);
    cathodeGroup.rotateX( -Math.PI / 2);
    group.add(cathodeGroup);

    // anode (negative pin) group
    const anodeGroup = createPinGroup(
        component.id, component.pins[1]!,'anode');
    anodeGroup.position.set(0, 0, 1);
    anodeGroup.rotateX( Math.PI / 2);
    group.add(anodeGroup);

    return group;
};

export const switchFactory: ComponentVisualFactory = (component: Component) => {
    console.log('Creating switch visual for component', component.id);
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
        type: 'componentGroup',
        componentId: component.id,
        componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitboxGeometry = new THREE.BoxGeometry(2, 1, 1);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.2,
        visible: true,
    });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.userData = {
        type: 'componentHitbox',
        componentId: component.id
    };
    hitbox.layers.set(LAYERS.COMPONENT_HITBOX);
    group.add(hitbox);

    // Visual: poles
    const poleGeometry = new THREE.BoxGeometry(0.1, 0.2, 1);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const inputPole = new THREE.Mesh(poleGeometry, poleMaterial);
    inputPole.userData = {
        type: 'component',
        componentId: component.id,
    };
    inputPole.position.set(-0.5, 0,0)
    group.add(inputPole);

    const outputPole = new THREE.Mesh(poleGeometry, poleMaterial);
    outputPole.userData = {
        type: 'component',
        componentId: component.id,
    };
    outputPole.position.set(0.5, 0,0)
    group.add(outputPole);

    // input pin group
    const inputPinGroup = createPinGroup(
        component.id, component.pins[0]!,'input');
    inputPinGroup.position.set(0, 0, 0);
    inputPinGroup.rotateX( Math.PI / 2);
    group.add(inputPinGroup);

    return group;
}