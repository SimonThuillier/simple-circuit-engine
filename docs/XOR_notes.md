Done. XOR gate key difference is the input logic: input1High !== input2High (inputs differ → output high). With negative activationLogic it becomes XNOR (inputs equal → output high).

✻ Worked for 38s

❯ by the way what would be the logic for a XOR gate with 4 inputs ? HIGH only if one input is high among all ?

● There are actually two interpretations:

1. Odd parity (standard): Output is high when an odd number of inputs are high. This is the standard definition in digital electronics — it's what you get by cascading 2-input XOR gates. A 4-input XOR with inputs A,B,C,D      
   computes A ⊕ B ⊕ C ⊕ D. So inputs 1100 → low, 1110 → high, 1111 → low.
2. Exactly-one (one-hot): Output is high only when exactly one input is high. More restrictive — 1100 → low, 1000 → high.

The standard in digital electronics is odd parity. It's also the more useful one since it's the building block for parity checkers, adders, etc.

For your educational library, odd parity is what people would expect from a component labeled "XOR gate" with 4 inputs.

❯ the same odd parity principle scale to a XOR gate with 8 inputs ?

● Yes, exactly. A ⊕ B ⊕ C ⊕ D ⊕ E ⊕ F ⊕ G ⊕ H — output high when an odd number of the 8 inputs are high. It scales to any number of inputs by cascading.

In practice an 8-input XOR is a parity generator — it outputs the parity bit of the 8-input word, which is directly useful for error detection.


## CMOS design 

CMOS 2-tick XOR — Transmission Gate Design

The native CMOS XOR uses a complementary transmission gate multiplexer, not gate-level decomposition. Here's the 8-transistor, 2-stage design:

Schematic

          Vdd         Vdd
           │           │
          M1(P)       M3(P)
    A ──┤gate    B ──┤gate
           │           │
           ├── A̅       ├── B̅
           │           │
          M2(N)       M4(N)
    A ──┤gate    B ──┤gate
           │           │
          GND         GND


    ── STAGE 1 (tick 1): two parallel inverters ──────────


          TG1: passes B when A=0          TG2: passes B̅ when A=1
         ┌─────────────────┐             ┌─────────────────┐
         │  M5(P)          │             │  M7(P)          │
    B ───┤src         drain├──┐    B̅ ───┤src         drain├──┐
         │  gate=A         │  │         │  gate=A̅         │  │
         │                 │  │         │                  │  │
         │  M6(N)          │  ├── OUT   │  M8(N)          │  ├── OUT
    B ───┤src         drain├──┘    B̅ ───┤src         drain├──┘
         │  gate=A̅        │             │  gate=A         │
         └─────────────────┘             └─────────────────┘


    ── STAGE 2 (tick 2): transmission gate mux ───────────

How it works

Stage 1 (tick 1) — Two inverters run in parallel, producing A̅ and B̅.

Stage 2 (tick 2) — Two transmission gates act as a 2:1 multiplexer:
- TG1 (M5 PMOS gate=A, M6 NMOS gate=A̅): conducts when A=0, passes B to output
- TG2 (M7 PMOS gate=A̅, M8 NMOS gate=A): conducts when A=1, passes B̅ to output

Verification

┌─────┬─────┬───────────┬────────┬──────┐
│  A  │  B  │ Active TG │ Output │ XOR? │
├─────┼─────┼───────────┼────────┼──────┤
│ 0   │ 0   │ TG1       │ B = 0  │ 0    │
├─────┼─────┼───────────┼────────┼──────┤
│ 0   │ 1   │ TG1       │ B = 1  │ 1    │
├─────┼─────┼───────────┼────────┼──────┤
│ 1   │ 0   │ TG2       │ B̅ = 1  │ 1    │
├─────┼─────┼───────────┼────────┼──────┤
│ 1   │ 1   │ TG2       │ B̅ = 0  │ 0    │
└─────┴─────┴───────────┴────────┴──────┘

Why 2 ticks maps to log2(n) * 2

Each tick = 1 inverter-equivalent stage. The XOR needs:
1. Complement generation — 1 inverter delay (the inverters on A and B run in parallel, so it's still 1 tick)
2. Transmission gate selection — 1 inverter-equivalent delay (the TG switching speed is comparable to an inverter)