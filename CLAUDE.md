# simple-circuit-engine Development Guidelines

Provide a simple and easy-to-use electronic circuit simulation library for educational purposes.
It allows users to create, edit and simulate electronic circuits in a web environment.
The library should be easily importable and usable in client applications and follow open-source typeScript libraries good practices.

Last updated: 2026-03-14

## Goals and principles

To provide a vulgarization library that teaches the frontier between electronics and low level coding.
The electrical model is very simplified (no level of voltage/current, resistance, capacitance or inductance, type or frequency of current)
and reduced to a logic state (has voltage/electrons sink true or false, has ground/electrons source true or false)/event engine.
However, it aims to teach real-world electronic design principles so modeling of components propagation delay and logic families is emphasized.

## Active Technologies

- TypeScript 6.0+ (strict mode), targeting ES2022
- Three.js 0.183+ (scene, camera, controls, 3D objects, Line2)
- lil-gui as helper for small interactive modal forms
- i18next for internationalization (see `src/i18n/CLAUDE.md` for conventions)
- in-memory circuit model, optional loading/saving from/to a JSON file

## Project Structure

Simple Circuit Engine follows a **Model-Controller** architecture with clear separation between:

- **Core module** (`src/core/`): Pure TypeScript domain **Model** and simulation engine (no dependencies).
- **Scene module** (`src/scene/`): Three.js visualization layer with editing **Controller** and its tools and the simulation animated **Controller**.
- **i18next Internationalization** (`src/i18n/`) : localization setup and locales

### Core Module (`src/core/`)

The core module is **dependency-free** and contains all domain logic.
Refer to its [CLAUDE.md](src/core/CLAUDE.md) for more details.

### Scene Module (`src/scene/`)

The scene module handles Three.js visualization, user interaction and simulation animation.
Refer to its [CLAUDE.md](src/scene/CLAUDE.md) for more details.

## Testing strategy

Unit tests are divided between core `tests/core` and scene `tests/scene`.
Coverage goals are :

- 80% on `core`: this module is the foundation of the model and simulation logic, hence it must be thoroughly tested
- 60% on `scene`: coverage goal deliberately less strict to allow for more visualization tinkering

## Commands

npm test && npm run lint

## Code Style

TypeScript (strict mode), targeting ES2022: Follow standard conventions
