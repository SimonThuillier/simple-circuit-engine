# Feature Specification: Sample Circuit Generation Scripts

**Feature Branch**: `001-sample-circuit-scripts`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Create scripts to build 4 sample circuits (small, between 2 and 10 components) and export their json file into one test output directory. Use existing ComponentTypes."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate Sample Circuit Data (Priority: P1)

As a developer or tester, I need to generate consistent, reusable sample circuit JSON files so that I can test circuit loading, rendering, and simulation features without manually creating circuits each time.

**Why this priority**: This is the core value of the feature - generating test data is foundational for all downstream testing and development work. Without sample circuits, developers cannot test circuit functionality.

**Independent Test**: Can be fully tested by running a script and verifying that JSON files are created in the output directory with valid circuit structure, and delivers immediate value for manual testing and development.

**Acceptance Scenarios**:

1. **Given** a project with existing ComponentTypes, **When** I run the sample circuit generation script, **Then** 4 JSON files are created in the test output directory
2. **Given** the generation script has completed, **When** I inspect the JSON files, **Then** each file contains a valid circuit with between 2 and 10 components using existing ComponentTypes
3. **Given** I run the generation script multiple times, **When** I compare outputs, **Then** the same circuits are generated consistently (deterministic output)

---

### User Story 2 - Validate Circuit Diversity (Priority: P2)

As a tester, I need the sample circuits to demonstrate different topologies and component combinations so that I can validate the circuit engine works across various configurations.

**Why this priority**: While having sample circuits (P1) is essential, having diverse samples increases test coverage and reveals edge cases. This is valuable but not absolutely critical for initial testing.

**Independent Test**: Can be tested by analyzing the generated JSON files and verifying that circuits use different component counts, different ComponentTypes, and different connection patterns, delivering broader test coverage.

**Acceptance Scenarios**:

1. **Given** 4 generated sample circuits, **When** I analyze their structure, **Then** each circuit uses a different combination of ComponentTypes
2. **Given** 4 generated sample circuits, **When** I count components per circuit, **Then** circuits have varying component counts within the 2-10 range
3. **Given** 4 generated sample circuits, **When** I examine the wire connections, **Then** circuits demonstrate different topologies (series, parallel, mixed)

---

### User Story 3 - Load and Verify Sample Circuits (Priority: P3)

As a developer, I need to verify that generated sample circuits can be successfully loaded into the Circuit class so that I can confirm the JSON format is valid and usable.

**Why this priority**: Validation is important for quality assurance but assumes the circuits are already generated (P1). This is a secondary verification step rather than primary functionality.

**Independent Test**: Can be tested by creating a simple validation script that loads each JSON file using Circuit.fromJSON() and verifies no errors occur, delivering confidence in data quality.

**Acceptance Scenarios**:

1. **Given** a generated sample circuit JSON file, **When** I load it using Circuit.fromJSON(), **Then** the circuit loads without errors
2. **Given** a loaded sample circuit, **When** I inspect the Circuit object, **Then** all components, ENodes, and wires are correctly instantiated
3. **Given** all 4 sample circuits, **When** I attempt to load each one sequentially, **Then** all circuits load successfully

---

### Edge Cases

- Output directory is {PROJECT_ROOT_DIR}/output/sample-circuits by default; if /output or /output/sample-circuits it doesn't exist, create it.
- Q: What happens when the output directory already contains files with the same names? A: log it clearly, delete existing file and write new one.
- ComponentTypes will be updated with backward-compatibility: no previously used type will be removed from the codebase after scripts are written.
- Q: What if the script is run with insufficient file system permissions? A: catch the error and rethrow exception with a clear message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate exactly 4 distinct sample circuit definitions
- **FR-002**: Each sample circuit MUST contain between 2 and 10 components (inclusive)
- **FR-003**: Sample circuits MUST only use ComponentTypes defined in ComponentType.ts (Battery, Switch, Lightbulb, Relay, Transistor, SmallLED, RectangleLED, Cube)
- **FR-004**: Each sample circuit MUST be exported as a valid JSON file compatible with Circuit.fromJSON()
- **FR-005**: All generated JSON files MUST be saved to a single designated test output directory
- **FR-006**: Sample circuits MUST include circuit metadata (name, size, divisions, cameraOptions)
- **FR-007**: Sample circuits MUST include properly connected components via wires and ENodes
- **FR-008**: Generation MUST be deterministic (same input produces same output)
- **FR-009**: Each sample circuit MUST demonstrate different component combinations or topologies
- **FR-010**: JSON files MUST use descriptive naming convention that identifies them as sample circuits

### Key Entities

- **Sample Circuit**: A complete circuit definition including metadata, components, ENodes, and wires, designed for testing purposes
- **Circuit JSON File**: Serialized representation of a Sample Circuit compatible with the Circuit.fromJSON() method
- **Test Output Directory**: File system location where all sample circuit JSON files are stored
- **Script**: Executable program that programmatically creates Sample Circuits and exports them as JSON files

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 4 valid JSON files are created in the test output directory on each script execution
- **SC-002**: Each generated circuit file can be successfully loaded using Circuit.fromJSON() without errors
- **SC-003**: Sample circuits collectively use at least 5 different ComponentTypes from the available set
- **SC-004**: Each sample circuit contains a unique number of components or unique ComponentType combination
- **SC-005**: Developers can locate and use sample circuits for testing without reading documentation (self-explanatory file names and location)

## Assumptions _(optional)_

- The Circuit class and ComponentType definitions are stable and will not have breaking changes during development
- The file system supports creating directories and writing JSON files
- Scripts will be run from the project root directory or have a predictable working directory
- Standard JSON file encoding (UTF-8) is acceptable for all generated files
- Test output directory will be excluded from version control (e.g., via .gitignore)

## Dependencies _(optional)_

- Existing Circuit, Component, ENode, and Wire classes with JSON serialization support
- Existing ComponentType definitions and metadata
- Node.js/TypeScript runtime for executing generation scripts
- File system write permissions for the designated output directory

## Out of Scope _(optional)_

- Interactive circuit builder UI
- Circuit validation or simulation functionality
- Circuit visualization or rendering
- Command-line arguments for customizing circuit generation (number of circuits, component counts, etc.)
- Automated testing framework integration (scripts generate data only; tests consume it separately)
- Circuit templates or user-defined circuit patterns
- Performance optimization for generating large numbers of circuits
