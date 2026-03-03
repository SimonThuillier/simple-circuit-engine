# Checklist: Logic Family & Timing Model Overhaul

Tracks progress on [SPEC-logic-family-timing.md](./SPEC-logic-family-timing.md).

---

## US-1: Remove Transistor Component

- [x] Transistor removed from `ComponentType` enum
- [x] `TransistorBehavior` removed
- [x] `TransistorState` removed
- [x] `TransistorVisualFactory` removed
- [x] Transistor removed from setup registrations (core + scene)
- [x] Transistor removed from component picker
- [x] Sample circuits updated (transistor-circuit replaced with inverter-circuit)
- [x] Unit tests updated (no remaining references to `ComponentType.Transistor`)
- [x] Documentation explains why transistor was removed (CMOS/TTL rationale)

---

## US-2: Rename Buffer to Inverter, AND to NAND, OR to NOR

- [x] Buffer renamed to Inverter with `activationLogic: negative` default
- [x] Inverter moved from basic components to gates category
- [x] AND gates renamed to NAND counterparts (`NandGate`, `Nand4Gate`, `Nand8Gate`)
- [x] OR gates renamed to NOR counterparts (`NorGate`, `Nor4Gate`, `Nor8Gate`)
- [x] All renamed gates have `activationLogic: negative` as default
- [x] Behaviors renamed and updated (`InverterBehavior`, `NandGateBehavior`, `NorGateBehavior`, etc.)
- [x] States renamed (`InverterState`, `NandGateState`, `NorGateState`, etc.)
- [x] Visual factories renamed (`InverterVisualFactory`, `NandGateVisualFactory`, etc.)
- [x] Unit tests updated for all renames
- [x] Buffer re-added as convenience component (two inverters in series, 2x propagation delay)
- [x] Inverter uses standard NOT gate symbol in visual factory

---

## US-3: Introduce Logic Family Attribute

- [x] Add `logicFamily` config attribute to gate components in `COMPONENT_TYPE_METADATA`
- [x] Create `LogicFamily` type (`CMOS1`, `TTL1`, `Sandbox`) in `src/core/types/LogicFamily.ts`
- [x] Implement CMOS1 delay table (NOT=1, Buffer=2, NAND/NOR=log2(n), AND/OR=log2(n)+1, XOR=log2(n)*2, XNOR=log2(n)*2+1)
- [x] Implement TTL1 delay table (NAND as primitive, different scaling)
- [x] Implement Sandbox mode (user-editable propagation delay, `resolveTransitionSpan` is no-op)
- [x] Propagation delay is read-only in the config form when logic family is non-Sandbox (`disabled: true`)
- [x] Propagation delay is user-editable in Sandbox family (`disabled: false`)
- [ ] Scaling support: `<technology><N>` multiplies all delays by N (future families, deferred)
- [x] Unit tests for delay computation per family and gate type (`tests/core/types/LogicFamily.test.ts`)

---

## US-4: Default Logic Family per Grid File

- [x] Add `defaultLogicFamily` property to `CircuitMetadata` (default: `CMOS1`)
- [x] New gates inherit grid's default logic family on placement (`addComponent()` in Circuit)
- [x] Individual gates can override the grid default (explicit logicFamily in config)
- [x] Changing grid default does NOT retroactively change existing gates
- [ ] Configuration panel exposes grid-level default setting (deferred to future scene UI task)
- [x] JSON serialization/deserialization of `defaultLogicFamily`
- [x] Unit tests for grid default inheritance and override (`tests/core/CircuitLogicFamily.test.ts`)

---

## US-5: Gate Timing Rules — Vcc/Source Behavior

- [ ] Vcc goes LOW → output instantly LOW (0 ticks)
- [ ] Vcc goes HIGH + adequate inputs → output HIGH after full propagation delay
- [ ] Vcc goes HIGH + inadequate inputs → output stays LOW
- [ ] Gate input changes while Vcc HIGH → output changes after full propagation delay
- [ ] Gate input changes while Vcc LOW → no effect
- [ ] Unit tests for all Vcc timing scenarios

---

## US-6: Gate Timing Rules — Transient State Handling

- [ ] Input reverts during RISING/FALLING → cancel pending event, output unchanged (0 ticks)
- [ ] New input change during transient → cancel pending, start new transition with full delay
- [ ] Vcc cycles faster than propagation delay → gate remains LOW
- [ ] No partial credit on delay counter
- [ ] Unit tests for transient cancellation and restart scenarios

---

## US-7: Gate Visual Representation Rules

- [ ] Full/filled visual = output HIGH
- [ ] Empty/border-only visual = output LOW
- [ ] Half-full visual during transient states (RISING/FALLING)
- [ ] Vcc LOW always produces empty visual
- [ ] Visual represents output state, not readiness
- [ ] Unit tests / visual verification for all state combinations

---

## US-8: Relay Preservation

- [x] Relays remain in basic components category
- [x] Relay behavior unchanged (0-tick contact closure after coil activation delay)
- [ ] Documentation highlights relay vs CMOS/TTL behavioral difference
