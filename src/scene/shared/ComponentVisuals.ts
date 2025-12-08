import type {Component} from "@/core/Component";
import * as THREE from "three";
import type {ComponentVisualFactory} from "./ComponentVisualFactory";
import { HitboxLayers } from "./LayerConstants";

// Backward compatibility alias
// const LAYERS = {
//     ENODE_HITBOX: HitboxLayers.ENODE,
//     COMPONENT_HITBOX: HitboxLayers.COMPONENT,
//     WIRE_HITBOX: HitboxLayers.WIRE,
// };

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
    hitbox.layers.set(HitboxLayers.ENODE);
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
    hitbox.layers.set(HitboxLayers.COMPONENT);
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
    hitbox.layers.set(HitboxLayers.COMPONENT);
    group.add(hitbox);

    // Visual: poles
    const inputPoleGeometry = new THREE.SphereGeometry(
        0.3, 16, 8,
        Math.PI/2, Math.PI,
        0, Math.PI);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const inputPole = new THREE.Mesh(inputPoleGeometry, poleMaterial);
    inputPole.userData = {
        type: 'component',
        componentId: component.id,
    };
    inputPole.position.set(-1, 0,0);
    //inputPole.rotateY( Math.PI / 2);
    group.add(inputPole);

    const outputPoleGeometry = new THREE.BoxGeometry(0.2, 0.3, 1);
    const outputPole = new THREE.Mesh(outputPoleGeometry, poleMaterial);
    outputPole.userData = {
        type: 'component',
        componentId: component.id,
    };
    outputPole.position.set(0.5, 0,0)
    group.add(outputPole);

    // contactor
    const contactorGroup = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 1),
        new THREE.MeshBasicMaterial({
            transparent: false,
            visible: false,
        })
    )


    const contactorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const contactorGeometry = new THREE.CylinderGeometry(
        0.2, 0.12, 1.5, 8, 4,
        false, 0, Math.PI * 2)
    const contactor = new THREE.Mesh(contactorGeometry, contactorMaterial);
    contactor.userData = {
        type: 'component',
        componentId: component.id,
        part: 'contactor'
    };
    contactor.rotateZ(Math.PI / 2);
    contactor.position.set(0.5, 0, 0);
    contactorGroup.add(contactor);

    group.add(contactorGroup);
    contactorGroup.position.set(-1, 0,0);
    contactorGroup.rotation.set(0.5, 0.8, 0);

    // input pin group
    const inputPinGroup = createPinGroup(
        component.id, component.pins[0]!,'input');
    inputPinGroup.position.set(-1, 0, 0);
    inputPinGroup.rotateZ( Math.PI /2);
    inputPinGroup.rotateY( Math.PI);
    group.add(inputPinGroup);

    // output pin group
    const outputPinGroup = createPinGroup(
        component.id, component.pins[1]!,'output');
    outputPinGroup.position.set(0.6, 0, 0);
    outputPinGroup.rotateZ( -Math.PI /2);
    outputPinGroup.rotateY( Math.PI);
    group.add(outputPinGroup);


    return group;
}

export const smallLedFactory: ComponentVisualFactory = (component: Component) => {
    console.log('Creating small LED visual for component', component.id);
    // Root group (not rendered, just organizational)
    const group = new THREE.Group();
    group.userData = {
        type: 'componentGroup',
        componentId: component.id,
        componentType: component.type,
    };

    // Component hitbox (invisible, raycastable)
    const hitboxGeometry = new THREE.BoxGeometry(1, 1, 1);
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
    hitbox.layers.set(HitboxLayers.COMPONENT);
    group.add(hitbox);


    // visual leD
    const ledMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ledGeometry = new THREE.CylinderGeometry(
        0.25, 0.25, 1, 16, 4,
        false, 0, Math.PI * 2)
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.userData = {
        type: 'component',
        componentId: component.id,
        part: 'led'
    };
    led.position.set(0,0.2,0);
    group.add(led);

    // input pin group
    const inputPinGroup = createPinGroup(
        component.id, component.pins[0]!,'input');
    inputPinGroup.position.set(-0.25, 0, 0);
    inputPinGroup.rotateZ( Math.PI /2);
    inputPinGroup.rotateY( Math.PI);
    group.add(inputPinGroup);


    // output pin group
    const outputPinGroup = createPinGroup(
        component.id, component.pins[1]!,'output');
    outputPinGroup.position.set(0.25, 0, 0);
    outputPinGroup.rotateZ( -Math.PI /2);
    outputPinGroup.rotateY( Math.PI);
    group.add(outputPinGroup);


    return group;
}