# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.10] - 2026-02-28

### Added

- added `GroupedFactoryRegistry` : components are now registered into the engine within groups (basic, gates ...) for better organization.
- added basic component `Buffer` (configurable to inverter with `activationLogic`).
- added logic gates components : `AND`, `AND4`, `AND8`, `OR`, `OR4`, `OR8`, `XOR`.

### Changed

- `BuildTool` integrates `addComponent` function : when dbl-clicking on empty space a widget appears to choose which component (or branching point) to add, activating the preview. Clicking on empty space then add the component/BP to the grid.
- Component Selection is now a widget on scene: the wanted group of components must be selected before choosing one in the group's list.
- When adding a component (preview-mode) map zoom control is now possible but it's no longer possible to CTRL+Scroll to change component type or to scroll to rotate it.
- When `BuildTool` is active all elements can now be placed anywhere and Grid size is recomputed automatically at the end of all add/drag/paste/remove operations.
- Transistors with `activationLogic`false now have a negative marker added .

### Removed

- `addComponent` tool has been removed following the merge of its features into `BuildTool`.

### Fixed

- `BuildTool`: inactivated dbl-click handler when CTRL hold to fix a bug of component rotation while holding Ctrl.

## [0.0.9] - 2026-02-02

### Added

### Changed

### Removed

### Fixed

- Fixed edition defaultTool activation when engine default mode is simulation.

## [0.0.8] - 2026-01-19

### Fixed

- Debugged `release.sh` automation script for releasing

## [0.0.3] - 2026-01-19

### Added

- `release.sh` quality of life automation script for releasing
- param `simulationSpeed` (default 3) in `controllerOptions`: sets the initial simulation speed when simulation mode is entered
- param `simulationAutoPlay` (default false) in `controllerOptions` allows to trigger default play as soon as simulation mode is entered
- `BACKLOG.md` to group future evolutions demands
- `AGENTS.md` added and referenced into `package.json` for use by agents in client projects

### Changed

- Updated `README.md` with the **Use Cases** section (clarifications on the project's scope and simulation model capabilities)
- Cleaned and updated `CLAUDE.md`
- Set camera default max distance from 100 to 200
- Upon initialization Engine emits a first `modeChanged` event. Therefore `previousMode` is now optional in that event.
- setup methods `oldRegisterBasicComponentsFactories` and `registerBasicComponentsBehaviors` are now chainable (Quality of life)
- Classes of `scene/shared/utils/Options` are publicly exported
- Default `simulationSpeed` set to 3 ticks per second

### Removed

- Legacy Specs documents 1-15

### Fixed

- When CircuitEngine in Simulation state switches circuit Initial electrical state graphics of the new circuit is now well displayed

## [0.0.1] - 2026-01-09

### Added

- Public release of simple-circuit-engine
