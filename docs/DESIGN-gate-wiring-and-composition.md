# Gate Wiring Rules and Composition Laws

Status: Reference
Date: 2026-03-05

## Purpose

This document captures fundamental rules of digital circuit design that apply to both
CMOS and TTL technologies. These rules are grounded in transistor-level physics and
constrain how gates can be wired and composed. The simulation engine must enforce or
communicate these constraints to users.

---

## Part 1: Wiring Rules

### Rule 1 — Gate outputs must never be wired together

Two gate outputs sharing the same electrical node causes **output contention**.

Every standard CMOS gate has two active drivers on its output:
- A P-channel MOSFET pulling **up** to Vcc (when output is HIGH)
- An N-channel MOSFET pulling **down** to ground (when output is LOW)

When two gates share an output and disagree, one pulls up while the other pulls down,
creating a **direct short circuit from Vcc to ground**. This causes:
- High current draw and heat (potential physical damage)
- Undefined voltage level (neither valid HIGH nor valid LOW)
- Indeterminate logic for downstream gates

This also applies to TTL, where the totem-pole output stage has the same active
pull-up and pull-down structure.

**Exception:** Open-drain (CMOS) or open-collector (TTL) outputs are specifically
designed for shared-output topologies (wired-AND). These use an external pull-up
resistor instead of an active pull-up transistor. This is a specialty configuration
(used in buses like I2C), not the default gate output type.

### Rule 2 — Gate Vcc pins connect to the power rail only

The Vcc pin of a gate connects to the circuit's power supply rail. It does **not**
receive its power from another gate's output.

A gate output is a **logic signal**, not a power source. It cannot reliably supply the
current required by another gate's internal transistors. Connecting a gate output to
another gate's Vcc would create unpredictable behavior: the "powered" gate would only
function when the driving gate's output happens to be HIGH, and even then the current
capacity may be insufficient.

In real circuits, all gates share a common Vcc rail provided by a dedicated power supply.

### Rule 3 — Gates compose via output-to-input connections

The only valid way to compose gates is:
- A gate's **output** pin connects to one or more **input** pins of downstream gates
- The number of inputs driven is limited by **fan-out** (typically 10-50 for CMOS,
  ~20 for TTL)
- Each input pin receives signal from exactly one source (one gate output or one
  external signal)

### Summary of valid and invalid connections

| Connection type           | Valid | Reason                                        |
|---------------------------|-------|-----------------------------------------------|
| Output → Input(s)         | Yes   | Standard gate composition                     |
| Output → Output           | No    | Output contention, short circuit risk          |
| Output → Vcc              | No    | Insufficient current, unreliable power source  |
| Power rail → Vcc          | Yes   | Correct power supply path                      |
| Power rail → Input        | Yes   | Valid way to tie an input HIGH                 |
| Ground rail → Input       | Yes   | Valid way to tie an input LOW                  |

### Fan-in and fan-out

**Fan-in** is the number of inputs a single gate accepts. Higher fan-in means more
transistors internally, which affects propagation delay:
- In CMOS: more inputs = more transistors in series = more delay
- In TTL: NAND gates scale well (multi-emitter BJT) but other gate types do not

**Fan-out** is the number of downstream inputs a single gate output can reliably drive:
- CMOS: ~10-50 inputs (limited by capacitive loading, which slows transitions)
- TTL: ~20 inputs (limited by current draw, each input sinks/sources real current)

These are electrical constraints that the simulation engine abstracts away by using
atomic gate components. They should be documented so users understand why certain
topologies are not possible.

---

## Part 2: Gate Composition Laws

### CMOS primitives

In CMOS, only **inverting gates** are single-stage primitives:
- **NOT** (inverter): 1 complementary pair
- **NAND** (any fan-in): N-channels in series, P-channels in parallel
- **NOR** (any fan-in): N-channels in parallel, P-channels in series

Non-inverting gates are always compositions:
- **AND** = NAND + output inverter
- **OR** = NOR + output inverter
- **Buffer** = two inverters in series

### The alternating tree principle

Larger gates are built from binary trees of 2-input primitives. The key insight is
that **alternating NAND and NOR layers** cancel inversions through De Morgan's law,
avoiding wasted inverter stages.

**De Morgan's identities:**
- NOR(NOT(a), NOT(b)) = NOT(NOT(a) OR NOT(b)) = a AND b
- NAND(NOT(a), NOT(b)) = NOT(NOT(a) AND NOT(b)) = a OR b

Each NAND or NOR gate inverts its output. When this inverted output feeds the next
layer of the opposite gate type, De Morgan's law converts the double negation into
the desired logic operation.

### NAND composition: NAND-NOR-NAND-...

To build a NAND gate from 2-input primitives, alternate NAND and NOR layers
starting with NAND.

**Example — NAND8 (3 levels):**

```
Level 1 (NAND2):  N1=NAND(a,b)  N2=NAND(c,d)  N3=NAND(e,f)  N4=NAND(g,h)
Level 2 (NOR2):   R1=NOR(N1,N2)                R2=NOR(N3,N4)
Level 3 (NAND2):  OUT=NAND(R1,R2)
```

Proof: R1 = NOR(NOT(a·b), NOT(c·d)) = a·b·c·d (by De Morgan).
Similarly R2 = e·f·g·h. OUT = NAND(R1, R2) = NOT(a·b·c·d·e·f·g·h) = NAND8.

### NOR composition: NOR-NAND-NOR-...

The dual structure — alternate NOR and NAND layers starting with NOR.

**Example — NOR8 (3 levels):**

```
Level 1 (NOR2):   R1=NOR(a,b)  R2=NOR(c,d)  R3=NOR(e,f)  R4=NOR(g,h)
Level 2 (NAND2):  N1=NAND(R1,R2)              N2=NAND(R3,R4)
Level 3 (NOR2):   OUT=NOR(N1,N2)
```

Proof: N1 = NAND(NOT(a+b), NOT(c+d)) = a+b+c+d (by De Morgan).
Similarly N2 = e+f+g+h. OUT = NOR(N1, N2) = NOT(a+b+c+d+e+f+g+h) = NOR8.

### The parity rule

The alternating tree with **L levels** produces:
- An **inverting** result (NAND/NOR) when L is **odd**
- A **non-inverting** result (AND/OR) when L is **even**

Since L = log2(n) for n inputs, and n = 2^L:

| Input count n | Levels L | Tree produces       | To get NAND/NOR            | To get AND/OR              |
|---------------|----------|---------------------|----------------------------|----------------------------|
| 2^odd (8,32)  | odd      | Inverting (NAND/NOR)| Direct — no extra cost     | +1 inverter at output      |
| 2^even (4,16) | even     | Non-inverting (AND/OR)| +1 inverter at output    | Direct — no extra cost     |

In other words:
- **NAND/NOR with 2^even inputs** (4, 16, 64...): the tree naturally gives AND/OR,
  an extra output inverter is needed → cost = log2(n) + 1 from tree composition
- **AND/OR with 2^odd inputs** (8, 32, 128...): the tree naturally gives NAND/NOR,
  an extra output inverter is needed → cost = log2(n) + 1 from tree composition

### Monolithic gates vs tree composition

For small fan-in (2 and 4 inputs), monolithic CMOS gates exist as single-stage
circuits. A monolithic NAND4 has 4 N-channel transistors in series — slower than
NAND2 (2 in series), but faster than building NAND4 from a tree of 2-input gates
that would require an extra inverter.

This is why NAND4 and NOR4 exist as standard ICs (e.g., 74HC20, 74HC4002): the
monolithic implementation at log2(n) delay beats the tree composition at log2(n) + 1.

For large fan-in (8+), monolithic gates become impractical (too many series
transistors), and tree composition is the standard approach.

### Coherence with the CMOS1 delay table

The delay table from the spec:

| Gate | 2-input | 4-input | 8-input | 16-input |
|------|---------|---------|---------|----------|
| NAND | 1       | 2       | 3       | 4        |
| AND  | 2       | 3       | 4       | 5        |
| NOR  | 1       | 2       | 3       | 4        |
| OR   | 2       | 3       | 4       | 5        |

The table uses a consistent model:
- **NAND/NOR: log2(n)** — represents the optimal implementation for each size
  (monolithic for small fan-in, tree for large fan-in)
- **AND/OR: log2(n) + 1** — always the inverting gate + output inverter

The +1 for AND/OR reflects the fundamental CMOS constraint: non-inverting gates are
not primitives and always require an output inversion stage, regardless of fan-in.

For the tree composition specifically:
- **Odd levels** (NAND/NOR 8, 32...): tree produces the inverting gate directly at
  log2(n) ticks — matches the table exactly
- **Even levels** (NAND/NOR 4, 16...): tree would cost log2(n) + 1, but monolithic
  gates achieve log2(n) — the table reflects the better monolithic implementation

---

## Part 3: Implications for the Simulation Engine

### Short term — Vcc default to powered

Since gate Vcc pins must always connect to the power rail, they should be
**powered by default**. Requiring users to manually wire Vcc to a power source
for every gate adds no educational value — it's busywork that obscures the actual
circuit logic.

The Vcc pin remains visible on the gate visual so users understand power is required,
but it comes pre-connected to the power rail.

### Medium term — Non-connectable pins

Certain pins should be marked as **not connectable** by the user:
- Gate Vcc pins (already powered from the rail, no wiring needed)

These pins appear on the visual representation (so users don't forget they exist)
but the build tool prevents wires from being attached to them.

### Long term — Wiring rule enforcement

Implement a **wiring watcher** that validates connections and prevents invalid
topologies:
- **No output-to-output connections**: detect when a user attempts to wire two gate
  outputs to the same node and prevent or warn
- **No output-to-Vcc connections**: prevent gate outputs from being wired to Vcc pins
- **Fan-out limits** (optional): warn when a single output drives too many inputs

This requires the engine to understand pin roles (input, output, power) and validate
the circuit graph against the wiring rules. This is a significant feature that
deserves its own specification.
