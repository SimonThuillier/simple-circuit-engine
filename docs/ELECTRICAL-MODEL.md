# Electrical Model

Simple Circuit Engine uses a **simplified boolean model** designed for educational clarity, not physical accuracy.

## Core Principles

### This is NOT a SPICE Simulator

SPICE simulators model analog circuits with continuous voltages, currents, impedance, and complex physical phenomena. Simple Circuit Engine intentionally simplifies this to focus on digital logic fundamentals.

### Boolean States

All electrical signals are **boolean**:
- **Voltage**: Either present (HIGH/1) or absent (LOW/0)
- **Current**: Either flowing or not flowing
- No analog voltage levels (no 3.3V vs 5V)
- No current magnitude (no amperes)

### Discrete Time

Time advances in **discrete integer ticks**, not continuous milliseconds:
- Each tick represents one simulation step
- Component delays are integer tick counts
- Propagation is deterministic and synchronous

### Ideal Components

All components have idealized behavior:
- **Wires**: Zero resistance, perfect conductivity, instant propagation
- **Gates**: Perfect boolean logic, configurable integer delay
- **Power/Ground**: Infinite current source/sink at constant potential

## Electrical Concepts

### Power and Ground

- **Power**: Positive voltage source, provides "electricity"
- **Ground**: 0V reference, sink for current (source of electrons)
- Multiple power nodes are all at the same potential
- Multiple ground nodes are all at the same potential
- Current flows from power → components → ground

### Current Flow

Current flow is **deterministic** and **boolean**:
- A wire either has current flowing (TRUE) or not (FALSE)
- Current flows when there's a complete path from power to ground
- Current direction is always power → ground
- Current visualization shows this boolean flow state

### Component Delays

Components can have **propagation delay**:
- Specified as integer tick count
- Example: 2-tick delay means output changes 2 ticks after input changes
- Models real-world gate delay in simplified form
- Allows visualization of signal propagation through circuits

**Example:**
```
Tick 0: Input changes from LOW to HIGH
Tick 1: (propagating...)
Tick 2: Output changes to HIGH
```

## Component Types

### Basic Components

#### Power Source
- **Type**: `power`
- **Pins**: `out`
- **Behavior**: Always provides HIGH signal
- **Visual**: Positive terminal symbol

#### Ground
- **Type**: `ground`
- **Pins**: `in`
- **Behavior**: Always accepts current, provides 0V reference
- **Visual**: Ground symbol

#### Switch
- **Type**: `switch`
- **Pins**: `source` (in), `out`
- **Behavior**:
  - ON: Connects source to output (current flows if source is HIGH)
  - OFF: Disconnects source from output (no current)
- **State**: `on` | `off`

#### LED
- **Type**: `led`
- **Pins**: `in`, `out`
- **Behavior**:
  - Lights up when current flows through
  - Acts as pass-through (out = in)
- **Visual**: Glows when current present

### Logic Gates

All gates have configurable delay (default: 0 ticks).

#### AND Gate
- **Type**: `and`
- **Pins**: `in_a`, `in_b`, `out`
- **Logic**: `out = in_a AND in_b`

#### OR Gate
- **Type**: `or`
- **Pins**: `in_a`, `in_b`, `out`
- **Logic**: `out = in_a OR in_b`

#### NOT Gate
- **Type**: `not`
- **Pins**: `in`, `out`
- **Logic**: `out = NOT in`

#### NAND Gate
- **Type**: `nand`
- **Pins**: `in_a`, `in_b`, `out`
- **Logic**: `out = NOT (in_a AND in_b)`

#### NOR Gate
- **Type**: `nor`
- **Pins**: `in_a`, `in_b`, `out`
- **Logic**: `out = NOT (in_a OR in_b)`

#### XOR Gate
- **Type**: `xor`
- **Pins**: `in_a`, `in_b`, `out`
- **Logic**: `out = in_a XOR in_b`

## Signal Propagation

### Propagation Algorithm

1. **Initialize**: Set all component states based on initial configuration
2. **Tick**: Advance simulation by one tick
3. **Evaluate**: For each component, compute new output based on current inputs
4. **Delay**: Components with delay > 0 buffer output changes
5. **Propagate**: Update wire states based on component outputs
6. **Repeat**: Continue until scenario complete or paused

### Determinism

The simulation is **fully deterministic**:
- Same circuit + same inputs → same outputs every time
- No randomness or uncertainty
- Allows automated testing with exact expectations

### Cycle Detection

The engine detects and handles cycles:
- **Combinational loops**: Detected and reported as errors
- **Sequential circuits**: Supported via component delays
- Ensures simulation always converges

## Educational Trade-offs

What we **simplified** for clarity:

| Real Electronics | Simple Circuit Engine |
|-----------------|------------------------|
| Continuous analog voltages | Boolean HIGH/LOW |
| Current in amperes | Boolean flowing/not flowing |
| Continuous time | Discrete integer ticks |
| Resistance, capacitance, inductance | Not modeled |
| Voltage drops | Not modeled |
| Power consumption | Not modeled |
| AC circuits | DC only |
| Signal rise/fall time | Instant (delay is discrete) |

What we **preserved** for learning:

- Boolean logic fundamentals
- Signal propagation through circuits
- Gate delay concepts
- Circuit structure (components, wires, connections)
- Current flow visualization
- Truth tables and logic verification

## Example Circuit

A simple AND gate circuit:

```
Power ──┬── Switch A ──┐
        │              ├── AND Gate ── LED ── Ground
        └── Switch B ──┘
```

**Behavior:**
- Power provides HIGH to both switches
- If Switch A ON AND Switch B ON → AND output HIGH → LED lights
- Otherwise → AND output LOW → LED off
- With 2-tick delay on AND gate, LED lights 2 ticks after both switches turn ON

**Truth Table:**
| Switch A | Switch B | LED (after delay) |
|----------|----------|-------------------|
| OFF      | OFF      | OFF               |
| ON       | OFF      | OFF               |
| OFF      | ON       | OFF               |
| ON       | ON       | ON                |

## Future Extensions

Potential future components (maintaining boolean model):
- Flip-flops (state storage)
- Multiplexers
- Decoders
- Counters
- Registers

All would maintain discrete boolean behavior for educational clarity.
