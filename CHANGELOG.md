# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `release.sh` quality of life automation script for releasing
- param `simulationSpeed` (default 3) in `controllerOptions`: sets the initial simulation speed when simulation mode is entered
- param `simulationAutoPlay` (default false) in `controllerOptions` allows to trigger default play as soon as simulation mode is entered
- `BACKLOG.md` to group future evolutions demands

### Changed

- Updated `README.md` with the **Use Cases** section (clarifications on the project's scope and simulation model capabilities)
- Cleaned and updated `CLAUDE.md`
- Set camera default max distance from 100 to 200
- Upon initialization Engine emits a first `modeChanged` event. Therefore `previousMode` is now optional in that event.

### Removed

- Legacy Specs documents 1-15 

### Fixed

- When CircuitEngine in Simulation state switches circuit Initial electrical state graphics of the new circuit is now well displayed 

## [0.0.1] - 2026-01-09

### Added

- Public release of simple-circuit-engine
