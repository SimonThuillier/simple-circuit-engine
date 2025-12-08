# Three.js Rendering Library Research Document

## 1. Three.js SceneManager Pattern for Library Context

**Decision**: Expose Scene and Camera as public readonly properties while allowing consumer to own and manage WebGLSceneManager lifecycle. Provide `initialize(container: HTMLElement)` and `dispose()` methods in the renderer classes.

**Rationale**:
- Three.js WebGLSceneManager requires a container element and manages GPU resources that must be explicitly cleaned up via `dispose()` method
- Since the consumer owns the animation loop and calls `render()` each frame, they should also own the WebGLSceneManager instance to control its creation timing and lifecycle
- Exposing Scene and Camera as readonly properties maintains encapsulation while allowing the consumer to add custom objects, lights, or helpers if needed
- This follows the "consumer-controlled lifecycle" pattern seen in Web Components integration with Three.js, where lifecycle callbacks control initialization and cleanup
- The "Updatables" pattern from the Three.js community allows each object to manage its own updates while the consumer manages the overall render loop

**Alternatives Considered**:
- **Create and hide WebGLSceneManager internally**: Rejected because it requires the library to manage DOM manipulation and timing, which conflicts with consumer control over the canvas element and initialization timing. Also makes it harder for consumers to configure renderer settings.
- **Pass WebGLSceneManager as constructor parameter**: Rejected because it forces consumers to understand Three.js renderer construction before using the library, increasing the learning curve.
- **Provide complete animation loop**: Rejected because the spec explicitly states that consumers own the animation loop, and this would conflict with consumer's existing animation systems.

## 2. Component Visual Factory Pattern

**Decision**: Implement a type-safe registry pattern using `Map<string, ComponentVisualFactory>` with a required fallback factory for missing component types. Use TypeScript generics to ensure type safety for factory functions.

**Rationale**:
- Map-based registry provides O(1) lookup performance and clear API for registration/retrieval
- TypeScript Map with string keys and typed factory functions provides compile-time type safety while allowing runtime dynamic registration
- A required fallback factory (e.g., creating a simple cube or sphere) ensures rendering never fails due to missing component types, improving robustness for educational use cases
- Factory function signature: `type ComponentVisualFactory = (component: Component) => THREE.Object3D` provides clean abstraction
- This follows the Open-Closed Principle, allowing extension without modification

**Alternatives Considered**:
- **Switch statement with component type checking**: Rejected because it violates the Open-Closed Principle and requires modifying library code to add new component types.
- **Abstract factory classes**: Rejected because it's more complex than needed and creates unnecessary inheritance hierarchies.
- **Throwing errors for missing types**: Rejected because it would break rendering for unknown components; a fallback visual is more user-friendly for an educational library.
- **Dependency injection framework (typed-inject, hokemi)**: Rejected because these add external dependencies and are overpowered for this simple factory use case.

## 3. State Interpolation for Discrete Simulation

**Decision**: Implement frame-independent interpolation using elapsed time tracking with built-in easing functions. Use the formula: `progress = easingFunction(Math.min(elapsedTime / duration, 1.0))` followed by `lerp(start, end, progress)` for numeric values.

**Rationale**:
- Discrete simulation states arrive at irregular intervals, requiring interpolation to create smooth visual transitions
- Frame-independent interpolation using elapsed time ensures consistent animation speed across devices with different refresh rates (30fps to 120fps)
- Built-in easing functions (easeInOutCubic, easeOutQuad, etc.) eliminate dependencies while providing common animation curves
- Three.js provides `THREE.MathUtils.lerp()` for linear interpolation and can be combined with custom easing functions
- Pattern: Track previous state + timestamp, current state + timestamp, and interpolate based on elapsed real-time

**Alternatives Considered**:
- **Using THREE.AnimationMixer and KeyframeTracks**: Rejected because it adds complexity for simple state interpolation and requires creating animation clips dynamically. Better suited for complex skeletal animations.
- **External animation library (GSAP)**: Rejected because it adds an external dependency, conflicting with the project's constitution requirement for minimal dependencies.
- **Tween.js library**: Rejected for the same reason - external dependency adds weight to the library package.
- **Simple linear interpolation only**: Rejected because it produces robotic, unnatural-looking animations; easing functions dramatically improve visual quality with minimal code.

## 4. Event Emitter Pattern for TypeScript

**Decision**: Implement a custom type-safe EventEmitter class using TypeScript generics with the pattern: `EventEmitter<EventMap extends Record<string, any>>`. Store listeners in `Map<keyof EventMap, Set<Function>>` and wrap callbacks in try-catch blocks for error isolation.

**Rationale**:
- Generic type parameter `EventMap` provides compile-time type safety for event names and payload types
- Using `Map<string, Set<Function>>` provides efficient O(1) listener lookup and Set ensures no duplicate listeners
- Try-catch wrapper around callbacks prevents one failing listener from breaking others, critical for library robustness
- No external dependencies aligns with project constitution
- Simple API: `on(event, callback)`, `off(event, callback)`, `emit(event, data)` matches Node.js EventEmitter convention

**Alternatives Considered**:
- **Node.js EventEmitter with type wrappers**: Rejected because it requires Node.js built-ins and doesn't work in all environments (browser-only scenarios).
- **typed-emitter library**: Rejected because it's an external dependency, though it would provide zero runtime overhead.
- **Individual TypedEvent instances per event**: Rejected because it requires creating separate event objects for each event type, making the API more verbose.
- **Array-based listener storage**: Rejected because Set provides better performance for add/remove operations and prevents duplicate listeners automatically.

## 5. Testing Strategy for Three.js Code

**Decision**: Use Vitest with manual vi.mock() to replace WebGLSceneManager, Scene, Camera, and other WebGL-dependent classes with simple mock objects. Focus unit tests on scene graph structure, object properties, and method calls rather than visual output. Use a test helper factory pattern to create mock Three.js objects.

**Rationale**:
- Manual mocking with `vi.mock('three', ...)` allows precise control over what methods are tested without needing a WebGL context
- Vitest is already configured in the project (confirmed in package.json), providing Jest-compatible API with better performance
- Mock objects return spies/stubs for render(), setSize(), and other methods, allowing verification of correct calls
- Since WebGL1 was deprecated in Three.js v0.163.0, headless-gl no longer works for testing, making mocking the only practical approach
- Test helper pattern encapsulates mock creation: `createMockSceneManager()`, `createMockScene()` provides reusable test utilities

**Alternatives Considered**:
- **headless-gl package**: Rejected because it doesn't support WebGL2, which Three.js now requires.
- **webgl-mock-threejs package**: Considered but provides minimal value over manual mocking; adds an external dependency for simple mock objects.
- **jest-three package**: Rejected because it's designed for Jest and adds a dependency; Vitest's built-in mocking is sufficient.
- **Visual regression testing**: Rejected for unit tests (though could be useful for integration tests) because it requires rendering to canvas, is slow, and makes tests fragile due to anti-aliasing/platform differences.
- **Testing actual rendering**: Rejected because it requires a browser environment, makes tests slow, and doesn't isolate unit behavior effectively.

---

## Implementation Guidelines

Based on this research, the following patterns will be used in implementation:

1. **SceneManager Initialization**: Both renderers expose `initialize(container)` method that creates Three.js Scene, Camera, and necessary objects, attaching the scene to the container's data attributes for consumer access.

2. **Factory Registry**: Create a `FactoryRegistry` class with `register(type, factory)`, `get(type)`, and `has(type)` methods. Require fallback factory in constructor.

3. **Interpolation Module**: Create `InterpolationController` class in shared utilities with methods for tracking state transitions and computing interpolated values with easing.

4. **Event System**: Create `EventEmitter<RenderEventMap>` base class in shared utilities, extended by both renderer classes.

5. **Test Utilities**: Create `tests/scene/__mocks__/three.ts` with mock factory functions and `tests/unit/scene/helpers.ts` with test setup utilities.
