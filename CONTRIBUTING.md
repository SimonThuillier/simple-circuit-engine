# Contributing to Simple Circuit Engine

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

1. **Read the Constitution**: Familiarize yourself with the [project constitution](.specify/memory/constitution.md) which defines core principles and architectural constraints.

2. **Understand the Architecture**: Review the [architecture documentation](docs/ARCHITECTURE.md) to understand the modular structure.

3. **Set Up Development Environment**:
   ```bash
   git clone https://github.com/yourusername/simple-circuit-engine.git
   cd simple-circuit-engine
   npm install
   npm test
   ```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

Follow these guidelines:

- **Code Style**: TypeScript strict mode, no `any` types
- **Testing**: Write tests for new functionality (80% coverage for core module)
- **Documentation**: Add JSDoc comments to all public APIs
- **Commits**: Write clear, descriptive commit messages

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Check coverage
npm run test:coverage

# Type checking
npm run typecheck
```

### 4. Build

```bash
npm run build
```

Ensure the build succeeds without errors.

### 5. Submit Pull Request

- Push your branch to GitHub
- Open a pull request against `main`
- Describe your changes clearly
- Reference any related issues

## Code Guidelines

### TypeScript

- **Strict mode**: All code must pass TypeScript strict checks
- **No `any`**: Use proper types or `unknown` when necessary
- **Explicit types**: Prefer explicit return types on functions

```typescript
// Good
function calculateDelay(component: Component): number {
  return component.delay ?? 0;
}

// Bad
function calculateDelay(component: any) {
  return component.delay ?? 0;
}
```

### Module Dependencies

Respect the dependency rules defined in the constitution:

| Module       | May Import      | May NOT Import             |
| ------------ | --------------- | -------------------------- |
| `core/`      | nothing         | three, rendering, playback |
| `rendering/` | core, three     | playback                   |
| `playback/`  | core, rendering | -                          |

**Example violation (BAD):**

```typescript
// In src/core/Circuit.ts
import { SceneManager } from '../rendering/SceneManager.js'; // ❌ WRONG!
```

### Documentation

All public APIs must have JSDoc comments:

````typescript
/**
 * Loads a circuit definition from JSON data.
 *
 * @param circuitData - Circuit definition object
 * @returns this - For method chaining
 * @throws {Error} If circuit data is invalid
 *
 * @example
 * ```typescript
 * const circuit = await fetch('/circuit.json').then(r => r.json());
 * engine.loadCircuit(circuit);
 * ```
 */
loadCircuit(circuitData: Circuit): this {
  // Implementation
}
````

### Testing

- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test module boundaries
- **Test coverage**: Core module must maintain 80%+ coverage

```typescript
import { describe, it, expect } from 'vitest';

describe('SimulationEngine', () => {
  it('should propagate signal through wire', () => {
    const engine = new SimulationEngine();
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Commit Messages

Write clear, descriptive commit messages:

```
Good:
- "Add AND gate component with 2-tick delay"
- "Fix wire propagation bug in cycle detection"
- "Update README with React integration example"

Bad:
- "fix bug"
- "update"
- "wip"
```

## Architecture Constraints

### Hexagonal Architecture

The project follows hexagonal architecture principles:

- **Core** contains pure domain logic
- **Rendering** and **Playback** are adapters
- Dependencies point inward

### Immutability

Circuits are immutable after loading:

- Don't modify circuit structure during simulation
- Create new instances for modifications
- Use readonly types where appropriate

### Resource Management

Always clean up resources:

- WebGL contexts in `dispose()`
- Event listeners
- Animation loops
- No global state

## Adding New Features

### New Component Type

1. Define type in `src/core/types.ts`
2. Implement logic in `src/core/components/`
3. Add renderer in `src/rendering/components/`
4. Write tests in `tests/core/components/`
5. Update documentation in `docs/ELECTRICAL-MODEL.md`

### New Event

1. Define event type
2. Document in `docs/API.md`
3. Emit from appropriate location
4. Add usage example

## Questions?

- Check existing [documentation](docs/)
- Review the [constitution](.specify/memory/constitution.md)
- Open a [GitHub issue](https://github.com/yourusername/simple-circuit-engine/issues)

## Code of Conduct

Be respectful, inclusive, and constructive. This is an educational project - we welcome contributors of all skill levels.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
