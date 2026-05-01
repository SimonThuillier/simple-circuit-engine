# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Integrated On scene widgets for mode (edit/simulation) change, help, build tools and simulation controls.
- Added multi-wiring feature creating several wires/branching points at once for fast wiring between multi bits interfaces.
- Added `interface` components group with blocks of 1,2,4,8 inputs (switches) and lights.

## [0.0.13] - 2026-04-16

### Added

- Added i18n as peerDependency and translations for component names and config parameters in English and French. 
- Added `arithmetic` components group with 4 new components : `half-adder`, `adder`, `8bit-adder` and `8bit-one's complement`.
- Added a `pinTooltip` that displays pin/component name when hovering a pin on the scene. 

### Changed

- Big optimizations of core state/event system to speed up animations. 
- Increased max simulation speed from 50 to 100 ticks per second. 

### Fixed

- Fixed `Lightbulb` bulb crop display issue.

## [0.0.12] - 2026-04-07

### Added

- `clock` basic component that periodically switch from logic HIGH to logic LOW.
- in edit mode added a pin/component toolTip when hovering a pin.

### Changed

- Used three.js animation system to produce smooth animations during components transitions.
- Significant improvements on relays transitions animations.
- Improvements on lightbulbs rendering and animations. 
- Switches and DoubleThrowSwitches are now toggled top to bottom instead of laterally during simulation. 
- update of dependencies (typescript, vite, three)
- made three.js a peerDependency to prevent duplicate imports from consumers.
- Various optimizations on the `core` event/behaviors engine. 

### Removed

- Script visualizer and its devDependencies.

### Fixed

- Fixed logic gates negative marker global material change when one hovered/selected.

## [0.0.11] - 2026-03-14

### Added

- `LogicFamily` are added to specify how upper-level components are built and define propagation delays.
- logic families `CMOS1` (built upon inverter activating in one tick), `TTL1` (NAND2 activating in one tick) and `Sandbox` (letting user freely choose activation delay).
- `CircuitOptions` encapsulate name and circuit's default logic family.
- Added **logicFamily** config parameter to logic gates: Newly added logic components inherit the circuit's default logic family.
- Added `DoubleThrowSwitch` (DTSP) basic component.
- Added `XOR4` and `XOR8` logic gates.

### Changed

- `Buffer/Inverter` is now included in logic gates instead of basic components.
- Logic gates `Buffer`, `AND` and `OR` have negative `activationLogic` by default and renamed to `Inverter`, `NAND` and `NOR` : it is more realistic with main logic families.
- When logic gates and upper level components have a non sandbox `logicFamily` their activation delay is read-only and updated automatically.
- Logic **HIGH** is now modeled as an input with voltage and without access to ground (appearing red) .
- Logic **LOW** is now modeled as an input without voltage and with access to ground (appearing blue).
- Logic gates now all have a special small `vcc` (voltage) and `gnd` (current) pin that reminds they must always be connected to those two to work.
- inputs with both access to voltage and ground or none are considered **indeterminate** inputs for logic gates: receiving it on any input deactivate them (they output nothing).
- A logic gate inactive but not indeterminate outputs at ground (blue) instead of nothing as before.
- various graphic improvements on components and scene rendering.
- Refactorization of `core` module.

### Removed

- removed `Transistor` component: after research it's not realistic to use it with this engine: basic logic gates built upon it will be preferred.

## [0.0.10] - 2026-02-28

### Added

- added `GroupedFactoryRegistry` : components are now registered into the engine within groups (basic, gates ...) for better organization.
- added basic component `Inverter` (configurable to inverter with `activationLogic`).
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
