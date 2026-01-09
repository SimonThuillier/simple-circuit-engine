# Simple Circuit Engine

[![NPM Package][npm]][npm-url]

#### JavaScript Educational Electronic circuit library

The aim of the project is to provide a simple and easy to use electronic circuit simulation engine for educational purposes.
It allows users to create, edit and simulate electronic circuits in a web environment using [three.js](https://threejs.org/) for 3D rendering.

![cover](docs/project-cover.png)

Visit the [Demo page](https://demo.beyondtheswitch.net/) to see the library in action.

### Usage

In addition to `simple-circuit-engine` you must import the `three` and `lil-gui` libraries in your project to use Simple Circuit Engine.
This code set up the main CircuitEngine instance in edit mode on a new Circuit, handles THREE.js objects creation and rendering/animation in the canva-container HTML element.

```javascript
import { WebGLRenderer } from 'three';

import {
    Circuit,
    BehaviorRegistry,
    registerBasicComponentsBehaviors,
} from 'simple-circuit-engine/core';
import {
    CircuitEngine,
    FactoryRegistry,
    DefaultVisualFactory,
    registerBasicComponentsFactories,
} from 'simple-circuit-engine/scene';

// Initialize CircuitEngine
// It creates THREE.js scene, camera, controls, lights, etc
// and the interactive controllers (edit and simulation) of simple-circuit-engine
const width = window.innerWidth, height = window.innerHeight;

// Create component factory registry with all basic visual factories (for scene objects creation - rendering
const componentsFactoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
registerBasicComponentsFactories(componentsFactoryRegistry);
// Create behavior registry with all basic component behaviors (for simulation)
const behaviorRegistry = new BehaviorRegistry();
registerBasicComponentsBehaviors(behaviorRegistry);
// Initialize CircuitEngine
const container = document.getElementById('canva-container')!;
const engine = new CircuitEngine(componentsFactoryRegistry, behaviorRegistry);
engine.initialize(container, {
    initialMode: 'edit',
    controllerOptions: {},
});
// set engine circuit to a new empty circuit
engine.setCircuit(new Circuit());

// THREE.js/WebGL standard rendering setup
// Create WebGL renderer
const renderer = new WebGLRenderer({ antialias: true, alpha: false });
renderer.setClearColor(0x1a1a2e);
// Setup WebGL renderer
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Append renderer to DOM
container.appendChild(renderer.domElement);
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    engine.getControls().update();
    renderer.render(engine.getScene(), engine.getCamera());
}
animate();
```

If this goes well, you should see a 10\*10 3D grid with some lights and camera mapControls in the canvas container.

### Contributing

Feel free to open issues or submit pull requests for bug fixes, improvements, or new features.
Particularly, since this project is at early stage issues reports and discussions about desired features are very welcome!
If you're interested in contributing, please read the [CONTRIBUTING](CONTRIBUTING.md) guide for more information.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

[npm]: https://img.shields.io/npm/v/simple-circuit-engine
[npm-url]: https://www.npmjs.com/package/simple-circuit-engine
