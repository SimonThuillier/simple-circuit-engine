# Plan: US-3 (Logic Family Attribute) & US-4 (Default Logic Family per Grid)

Implements [SPEC-logic-family-timing.md](./SPEC-logic-family-timing.md) US-3 and US-4.
Tracks progress in [CHECKLIST-logic-family-timing.md](./CHECKLIST-logic-family-timing.md).

## Context

Gates currently have hardcoded propagation delays (`transitionSpan`). US-3 introduces a `logicFamily` config attribute that auto-computes delays from CMOS/TTL delay tables, with a Sandbox mode for manual override. US-4 adds a grid-level `defaultLogicFamily` so users don't configure each gate individually.

Two new mechanisms are needed:
1. **Locked/readonly config fields** — `transitionSpan` is read-only when logicFamily != Sandbox
2. **Config interdependency** — changing `logicFamily` or `activationLogic` recomputes `transitionSpan`

Breaking changes are accepted (no backward compat).

---

## Phase 1: Core — New Types

### 1a. NEW `src/core/types/LogicFamily.ts`

- `LogicFamily` type: `'CMOS1' | 'TTL1' | 'Sandbox'`
- `ALL_LOGIC_FAMILIES`, `DEFAULT_LOGIC_FAMILY = 'CMOS1'`
- `GateFamily` type: `'NOT' | 'Buffer' | 'NAND' | 'AND' | 'NOR' | 'OR' | 'XOR' | 'XNOR'`
- `computeGateDelay(logicFamily, gateFamily, inputCount): number` — pure function
  - CMOS1: NOT=1, Buffer=2, NAND/NOR=log2(n), AND/OR=log2(n)+1, XOR=log2(n)*2, XNOR=log2(n)*2+1
  - TTL1: lookup table per spec
  - Sandbox: throws (caller should not call for Sandbox)
- `classifyGate(componentType, activationLogic): { gateFamily, inputCount } | null` — maps ComponentType + activationLogic to GateFamily+inputCount
  - Inverter: negative→NOT(1), positive→Buffer(1)
  - NandGate: negative→NAND(2), positive→AND(2)
  - Nand4Gate: negative→NAND(4), positive→AND(4)
  - Nand8Gate: negative→NAND(8), positive→AND(8)
  - NorGate: negative→NOR(2), positive→OR(2)
  - Nor4Gate: negative→NOR(4), positive→OR(4)
  - Nor8Gate: negative→NOR(8), positive→OR(8)
  - XorGate: positive→XOR(2), negative→XNOR(2)
  - Non-gate types return null

### 1b. UPDATE `src/core/types/ComponentType.ts`

Add `logicFamily` and `transitionSpan` to **all gate configs** in `COMPONENT_TYPE_METADATA`:

```
config: new Map([
  ['logicFamily', 'CMOS1'],
  ['activationLogic', 'negative'],
  ['transitionSpan', '1'],        // computed from CMOS1 + gate classification
  ['initializationOrder', ''],
])
```

Default transitionSpan values (CMOS1):
- Inverter: `'1'` (NOT)
- NandGate/NorGate: `'1'` (2-input)
- Nand4Gate/Nor4Gate: `'2'` (4-input)
- Nand8Gate/Nor8Gate: `'3'` (8-input)
- XorGate: `'2'` (XOR 2-input) — replaces current hardcoded `'2'`

---

## Phase 2: Core — CircuitMetadata Split & resolveTransitionSpan

### 2a. UPDATE `src/core/Circuit.ts` — Split ICircuitMetadata

```typescript
type ManagedCircuitMetadata = {
  size: number;
  divisions: number;
  cameraOptions: ICameraOptions;
};

type WritableCircuitMetadata = {
  name: string;
  defaultLogicFamily: LogicFamily;
};

type ICircuitMetadata = ManagedCircuitMetadata & WritableCircuitMetadata;
```

- `CircuitMetadata` constructor gains `defaultLogicFamily: LogicFamily = 'CMOS1'`
- `toJSON()` includes `defaultLogicFamily`
- `fromJSON()` reads `defaultLogicFamily` (fallback `'CMOS1'` for old files)
- Export `ManagedCircuitMetadata` and `WritableCircuitMetadata` from `src/core/index.ts`

### 2b. UPDATE `src/core/Circuit.ts` — addComponent + resolveTransitionSpan

Add public `resolveTransitionSpan(component: Component)`:
- If `logicFamily` is absent or `'Sandbox'` → return (no-op)
- Use `classifyGate(component.type, activationLogic)` to get gateFamily + inputCount
- If null (non-gate) → return
- Compute delay via `computeGateDelay()`, set `transitionSpan` on component config

In `addComponent()`, after creating component:
- If component has `logicFamily` config and it's empty → set to `this.metadata.defaultLogicFamily`
- Call `this.resolveTransitionSpan(component)`

### 2c. UPDATE `src/core/index.ts`

Export new types: `LogicFamily`, `GateFamily`, `ALL_LOGIC_FAMILIES`, `DEFAULT_LOGIC_FAMILY`, `computeGateDelay`, `classifyGate`

---

## Phase 3: Scene — Config Field Disabled + Form Refresh

### 3a. UPDATE `src/scene/shared/types.ts`

Add to `ConfigFieldDefinition`:
```typescript
disabled?: boolean;  // read-only field in the form
```

### 3b. UPDATE `src/scene/shared/components/ComponentVisualFactory.ts`

Change `getConfigFormDefinition` signature to accept optional config:
```typescript
getConfigFormDefinition(config?: Map<string, string>): ConfigFormDefinition | null;
```

### 3c. UPDATE `src/scene/static/tools/ConfigPanelWidget.ts`

1. **Support `disabled`**: After creating each lil-gui controller, call `controller.disable(true)` if `field.disabled`
2. **Pass config to getConfigFormDefinition**: `factory.getConfigFormDefinition(component.config)`
3. **Form refresh on interdependent change**: After `onValueChange`, if the changed key is `logicFamily` or `activationLogic`, destroy and rebuild the GUI (re-read updated component.config for new disabled states and computed values)
4. Track `changedKey` by passing it through `onValueChange` callback

---

## Phase 4: Scene — Gate Visual Factories

### Pattern for all gate factories

`getConfigFormDefinition(config?)`:
```typescript
const logicFamily = config?.get('logicFamily') || 'CMOS1';
return {
  fields: [
    { key: 'logicFamily', label: 'Logic Family', type: 'dropdown',
      options: { 'CMOS': 'CMOS1', 'TTL': 'TTL1', 'Sandbox': 'Sandbox' } },
    { key: 'activationLogic', label: 'Activation Logic', type: 'boolean' },
    { key: 'transitionSpan', label: 'Propagation delay (ticks)', type: 'number',
      min: 1, disabled: logicFamily !== 'Sandbox' },
    { key: 'initializationOrder', label: 'Init Order', type: 'number' },
  ],
};
```

`mapCoreConfigToForm(config)`: Add `formData.set('logicFamily', config.get('logicFamily') || 'CMOS1')`

`mapFormToCoreConfig(formData)`: Add `config.set('logicFamily', formData.get('logicFamily'))`

### Files to update:
- `src/scene/shared/components/gates/InverterVisualFactory.ts`
- `src/scene/shared/components/gates/NandGateVisualFactory.ts` (parent — Nand4/Nand8 inherit)
- `src/scene/shared/components/gates/NorGateVisualFactory.ts` (parent — Nor4/Nor8 inherit)
- `src/scene/shared/components/gates/XorGateVisualFactory.ts`

---

## Phase 5: Scene — CircuitWriter Recomputation

### UPDATE `src/scene/static/CircuitWriter.ts`

In `saveEditComponentConfig()`, after merging parameters into `component.config`:
```typescript
circuit.resolveTransitionSpan(component);
```

In `cycleComponentConfig()`, after cycling `activationLogic`:
```typescript
circuit.resolveTransitionSpan(component);
```

This ensures transitionSpan is always recomputed when logicFamily or activationLogic changes.

---

## Phase 6: Tests

### NEW `tests/core/types/LogicFamily.test.ts`
- `computeGateDelay` CMOS1: all gate families, input counts 1/2/4/8
- `computeGateDelay` TTL1: full table verification
- `computeGateDelay` Sandbox: throws
- `classifyGate`: every ComponentType + activationLogic combo
- `classifyGate`: non-gate returns null

### EXTEND circuit tests (new file or existing)
- CircuitMetadata serialization with defaultLogicFamily
- addComponent resolves logicFamily from grid default
- resolveTransitionSpan computes correct delays for each gate type
- Changing grid default does NOT affect existing components
- Sandbox family leaves transitionSpan unchanged

### EXTEND existing gate behavior tests
- Verify behaviors still read transitionSpan correctly (should pass unchanged)

---

## Phase 7: Checklist Update

Update `docs/CHECKLIST-logic-family-timing.md` — check off completed US-3 and US-4 items.

---

## Verification

1. `npm test` — all existing + new tests pass
2. `npm run lint` — clean
3. Manual verification: gate config form shows Logic Family dropdown, transitionSpan disabled for CMOS1/TTL1, editable for Sandbox
4. Changing logicFamily in form updates transitionSpan value and disabled state
5. New gates placed on grid inherit `defaultLogicFamily` from CircuitMetadata
