# Contributing to Simple Circuit Engine

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## requesting changes

If you have any requests for features, fixes or quality of life enhancements you may push a PR with your new requests in `BACKLOG.md`.

## Getting Started

1. **Read the Constitution**: Familiarize yourself with the [project constitution](.specify/memory/constitution.md) which defines core principles and architectural constraints.

2. **Understand the Architecture**: Review the [architecture documentation](docs/ARCHITECTURE.md) to understand the modular structure.

3. **Set Up Development Environment**:
   ```bash
   git clone https://github.com/SimonThuillier/simple-circuit-engine.git
   cd simple-circuit-engine
   npm install
   npm test
   ```

## Development Workflow

### 1. Create a Branch from dev

```bash
git fetch origin
git checkout dev
git pull
# then
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

Follow these guidelines:

- **Code Style**: TypeScript strict mode, no `any` types
- **Testing**: Write tests for new functionality (the goal is 80% coverage for core module, 60% for scene module)
- **Documentation**: Add JSDoc comments to all public APIs
- **Commits**: Write clear, descriptive commit messages

### 3. Test

During development, you can check changes on the fly with the demo page:

```bash
# Hot Reload the demo page in your browser while making changes
npm run dev:demo
```

```bash
# Run all tests
npm run test

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
- Open a pull request against `dev`
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

| Module   | May Import           | May NOT Import        |
| -------- | -------------------- | --------------------- |
| `core/`  | nothing              | three, scene, lil-gui |
| `scene/` | core, three, lil-gui | -                     |

Please do relative file imports within the same module and use core module exports for scene-core cross-module dependencies.
Example in scene :

```typescript
import { Circuit } from 'simple-circuit-engine/core';
```

### Documentation

All public APIs must have JSDoc comments, it helps a lot and allow a pretty informative typedoc generation.
You can generate a local typedoc site with :

```bash
npm run docs:generate
```

### Testing

- **Unit tests**: Test individual functions and classes : the majority of tests
- **Integration tests**: Test scene-core integration
- **End-to-end tests**: Test full scenarios via the demo page (not automated yet)
- **Test coverage**: Core module must maintain 80%+ coverage

### Linting and Formatting

Use ESLint and Prettier to maintain code quality and consistency.

```bash
npm run lint
npm run format
```

### Commit Messages

Please write clear, descriptive commit messages.

## Architecture Constraints

### Architecture

The project has a model-controller architecture:

- **Core** contains pure domain logic and have no dependencies on **Scene**.
- **Scene** controls THREE objects and user interactions, relying on **Core** for simulation logic.

### Resource Management

Always clean up resources when they're no longer useful to prevent in-browser memory leaks, notably:

- WebGL contexts in `dispose()`
- Event listeners
- Animation loops

## Adding New Features

### New Component Type

1. Define type in `src/core/types.ts`
2. Implement logic in `src/core/components/`
3. Write tests in `tests/core/Components.test.ts`
4. Add visual factory in `src/scene/shared/components/`

### New Event

1. Define event type
2. Document in `docs/API.md`
3. Emit from appropriate location
4. Add usage example

## Use of AI agents

This is an AI agents friendly project and the speckit toolbox with Claude Code was heavily used to generate initial code specs, drafts, tests, and documentation.
Still the Author believes the Human touch and intervention is essential to ensure human readability, quality and long-term maintainability.

## Questions?

- Check existing [documentation](docs/)
- Review the [constitution](.specify/memory/constitution.md)
- Open a [GitHub issue](https://github.com/SimonThuillier/simple-circuit-engine/issues)

## Code of Conduct

Be respectful, inclusive, and constructive. This is an educational project - we welcome contributors of all skill levels.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
