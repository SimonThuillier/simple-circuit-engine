# Spec: Logic Family & Timing Model Overhaul

Status: Draft
Date: 2026-03-02
Sprint: Next

## Context

Following research into CMOS and TTL circuit architectures, the simulation engine needs
to evolve its gate timing model to be grounded in real-world physics while remaining
at a discrete tick-based abstraction level. This spec captures the requirements derived
from that research.

## US-1: Remove Transistor Component

**As a** project maintainer
**I want to** remove the transistor from available components
**So that** users are not misled into thinking a single transistor can function as a logic gate

### Acceptance Criteria

- Transistor is no longer available in the component picker
- Transistor type is deprecated/removed from ComponentType
- Existing circuits referencing transistors won't work anymore : it should be replaced with inverter / buffer
- Documentation explains why: a single transistor requires specific biasing and complementary
  pairing (CMOS) or multi-emitter topology (TTL) to produce logic — this level of analog
  detail is out of scope for the engine

### Rationale

A CMOS inverter requires 2 transistors (one N-channel, one P-channel) working as a
complementary pair. A TTL NAND requires a multi-emitter BJT with a totem-pole output stage.
A standalone transistor as a "gate-controlled switch" is misleading in a digital logic context.

---

## US-2: Rename Buffer to Inverter and Move to Gates, replacing AND by NAND and OR by NOR

**As a** user learning digital electronics
**I want** the inverter (NOT gate) to be the primary single-input gate
**So that** it reflects the true CMOS primitive

### Acceptance Criteria

- The Buffer component is renamed to Inverter with `activationLogic: negative` as default
- Inverter is moved from basic components category to the gates category
- A Buffer remains available as a convenience component but is documented as
  "two inverters in series" with a propagation delay of 2x the inverter's delay
- The inverter uses the standard NOT gate symbol
- AND gates are renamed to their NAND counterparts with `activationLogic: negative` as default
- OR gates are renamed to their NOR counterparts with `activationLogic: negative` as default

### Rationale

In CMOS, the inverter (single complementary pair) is the fundamental building block.
All other gates are compositions involving inverters. Making this the primitive teaches
the correct mental model.

---

## US-3: Introduce Logic Family Attribute

**As a** user
**I want** gates to have a configurable logic family attribute
**So that** propagation delays are automatically and correctly derived from the technology

### Acceptance Criteria

- Each gate component has a `logicFamily` attribute
- Supported families: `CMOS1`, `TTL1`, `Sandbox` (initial set)
- The naming convention `<technology><N>` means the technology's base primitive has
  a propagation delay of N ticks. All other gate delays are derived by multiplying
  the technology's delay formula by N.
- Future families (e.g., `CMOS2`, `TTL2`, `CMOS3`...) can be added by simply scaling:
  all delays in the table are multiplied by N. For example, CMOS2 inverter = 2 ticks,
  CMOS2 NAND2 = 2 ticks, CMOS2 AND2 = 4 ticks, etc.
- The logic family determines the propagation delay of the gate according to the
  technology's delay table (see Reference Tables below)
- When logic family is set, propagation delay is **read-only** (computed from the table)
- In `Sandbox` family, propagation delay is **user-editable** (free override)

### Logic Family Delay Tables

#### CMOS1

Base unit: 1 inverter = 1 tick. Formulas:

| Gate family | Formula (n inputs)  |
|-------------|---------------------|
| NOT         | 1 (constant)        |
| Buffer      | 2 (constant)        |
| NAND / NOR  | log2(n)             |
| AND / OR    | log2(n) + 1         |
| XOR         | log2(n) x 2         |
| XNOR        | log2(n) x 2 + 1     |

Full CMOS1 delay table:

| Gate | 2-input | 4-input | 8-input | 16-input |
|------|---------|---------|---------|----------|
| NAND | 1       | 2       | 3       | 4        |
| AND  | 2       | 3       | 4       | 5        |
| NOR  | 1       | 2       | 3       | 4        |
| OR   | 2       | 3       | 4       | 5        |
| XOR  | 2       | 4       | 6       | 8        |
| XNOR | 3      | 5       | 7       | 9        |

Physical basis: in CMOS, each additional input adds a transistor in series.
Higher input counts are implemented as trees of 2-input gates (log2(n) levels deep).
Non-inverting gates (AND, OR) add +1 for the output inverter stage.
NOR and NAND have equal delays (in reality NOR is slightly slower due to P-channel
series resistance, but this is sub-tick granularity).

#### TTL1

Base unit: 1 NAND2 = 1 tick. The NAND is TTL's primitive, not the inverter.

| Gate | 2-input | 4-input | 8-input | 16-input |
|------|---------|---------|---------|----------|
| NAND | 1       | 1       | 2       | 2        |
| AND  | 2       | 2       | 3       | 3        |
| NOR  | 1       | 2       | 2       | 3        |
| OR   | 2       | 3       | 3       | 4        |
| XOR  | 2       | 4       | 6       | 8        |
| XNOR | 3      | 5       | 7       | 9        |

Physical basis: TTL uses multi-emitter BJTs, so a NAND4 is still a single-stage
circuit (1 tick). NAND scales better than in CMOS. NOR is disadvantaged in TTL
(not the natural dual). NOT and Buffer: same as CMOS (1 and 2 ticks).

#### Sandbox

- All gates: user-defined propagation delay (integer >= 0)
- No constraints from technology
- For educational experimentation and testing

---

## US-4: Default Logic Family per Grid File

**As a** user building a circuit
**I want** the grid file to have a default logic family setting
**So that** I don't have to manually set the family for each individual gate

### Acceptance Criteria

- Grid/circuit files include a `defaultLogicFamily` property (default: `CMOS1`)
- When a new gate is placed, it inherits the grid's default logic family
- Individual gates can override the grid default (to allow mixed-family tutorials)
- Changing the grid default does NOT retroactively change gates already placed
  (prevents accidental mass changes)
- The configuration panel exposes the grid-level default setting

### Rationale

A single grid can host two disjoint sub-circuits (e.g., one CMOS, one TTL for comparison
tutorials). The grid default reduces per-component configuration burden while still
allowing mixed families when intentional.

---

## US-5: Gate Timing Rules — Vcc/Source Behavior

**As a** simulation engine
**I want** to model asymmetric Vcc behavior
**So that** gate timing is physically grounded

### Acceptance Criteria

The following rules apply to all gates regardless of logic family:

| Event                                 | Output Effect    | Delay                  |
|---------------------------------------|------------------|------------------------|
| Vcc goes LOW                          | Output -> LOW    | 0 ticks (instant)      |
| Vcc goes HIGH (gate inputs adequate)  | Output -> HIGH   | Full propagation delay |
| Vcc goes HIGH (gate inputs inadequate)| Output stays LOW | -                      |
| Gate input changes (Vcc HIGH)         | Output changes   | Full propagation delay |
| Gate input changes (Vcc LOW)          | No effect        | -                      |

### Rule Summary

- **Vcc changes are asymmetric**: loss is instant (0 ticks), gain costs full propagation delay
- **Gate/base input changes are symmetric**: both HIGH->LOW and LOW->HIGH cost the
  same propagation delay
- **No power = no output**: Vcc LOW means output is always LOW regardless of gate state

### Physical Basis

When power is cut, there is nothing to sustain the output — the charge collapses instantly.
When power is restored, the MOSFET gate capacitors must charge and transistors must
establish their channels — this takes time equal to the propagation delay.

---

## US-6: Gate Timing Rules — Transient State Handling

**As a** simulation engine
**I want** to correctly handle input changes during propagation transitions
**So that** fast-switching edge cases produce physically correct results

### Acceptance Criteria

- When a gate is in a transient state (RISING or FALLING) and the triggering input
  **reverts** to its original value: **cancel the pending event**, output stays at its
  current (unchanged) value. Cost: 0 ticks.
- When a gate is in a transient state and a **new** input change occurs that would
  cause a different transition: **cancel the pending event**, start a **new** transition
  with the **full propagation delay**. No partial credit.
- When Vcc cycles faster than the propagation delay: the gate remains at LOW
  (natural consequence of instant Vcc-loss + full delay on Vcc-gain)

### Rule Summary

- Any input change restarts the propagation delay counter from zero
- No partial credit, no shortcuts
- A transient state means the output hasn't changed yet — reverting is free (canceling
  something that hasn't happened)
- Starting a new transition always costs the full delay

### Physical Basis

The MOSFET gate capacitor doesn't "remember" partial charge in our tick-based model.
In reality, partial charge/discharge does occur, but modeling it would require continuous
analog simulation. The full-delay-restart rule is the correct discrete approximation
that avoids input-order-dependent timing anomalies.

---

## US-7: Gate Visual Representation Rules

**As a** user observing simulation
**I want** the gate visual to reflect its actual output state
**So that** I can immediately read the circuit state visually

### Acceptance Criteria

- **Full/filled visual** = gate output is HIGH
- **Empty/border-only visual** = gate output is LOW
- The visual represents the **output**, not "readiness" or "primed" state
- During transient states (RISING/FALLING), the visual as half-full clearly marking the transitional state
  output value until the transition completes
- Vcc LOW always produces an empty visual (no power = no output)

### Truth table for an inverter visual:

| Input | Vcc  | Output | Visual |
|-------|------|--------|--------|
| LOW   | HIGH | HIGH   | Full   |
| HIGH  | HIGH | LOW    | Empty  |
| LOW   | LOW  | LOW    | Empty  |
| HIGH  | LOW  | LOW    | Empty  |

---

## US-8: Relay Preservation

**As a** user learning about logic history
**I want** electro-mechanical relays to remain available
**So that** I can learn how pre-electronic logic circuits worked

### Acceptance Criteria

- Relays remain in the basic components category
- Relay behavior is unchanged: when coil is energized, contact closes and
  immediately conducts (0-tick propagation for the contact closure path once
  the coil activation delay has elapsed)
- Documentation highlights the difference: relays are mechanical switches
  (direct conduction path), while CMOS/TTL gates use field effects
  (propagation delay on every activation)

### Rationale

Relays are historically important (first electrical logic circuits) and mechanically
intuitive. They serve as a pedagogical stepping stone before introducing semiconductor gates.
The behavioral difference with CMOS/TTL gates is itself a teaching moment.

---

## Reference: CMOS vs TTL Architecture Summary

### CMOS Primitives
- **Inverter** (NOT): 1 complementary pair (1 N-channel + 1 P-channel MOSFET)
- All gates built from compositions of complementary pairs
- More inputs = more transistors in series = more delay

### TTL Primitives
- **NAND**: multi-emitter BJT (2, 4, or even 8 inputs in a single transistor)
- NAND2 and NAND4 are both single-stage primitives (same delay)
- NOR is not the natural dual — it uses a less efficient parallel input topology

### Key Architectural Differences
- CMOS treats NAND and NOR as symmetric duals (equal delay)
- TTL strongly favors NAND over NOR
- CMOS scales poorly with input count (series transistors)
- TTL NAND scales well (multi-emitter trick) but other gates don't

### Educational Comparison
The comparison between CMOS and TTL on the same grid teaches:
- Why NAND is the universal gate of choice in TTL
- Why inverting gates (NAND, NOR) are faster than non-inverting (AND, OR)
- Why XOR/XNOR are expensive in any technology
- How the same logical function can have different physical costs

---

## Out of Scope

- Transistor-level simulation (individual MOSFETs or BJTs)
- Analog voltage levels, current measurement, impedance
- Rise/fall time curves (handled as discrete tick transitions)
- Power consumption modeling
- ESD or damage simulation
- BiCMOS or other hybrid technologies
