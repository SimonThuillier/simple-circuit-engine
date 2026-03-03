TTL (Transistor-Transistor Logic)

- Built with bipolar junction transistors (BJT)
- The dominant family at the time, mainly the 7400 series from Texas Instruments
- Fast switching speed — typically 5-10 ns propagation delay
- Operates at a fixed 5V supply
- High power consumption — each gate draws several milliwatts even when idle (static power)
- Strong drive capability — can source/sink significant current, making it easy to interface with other circuits
- Logic levels: LOW = 0 to 0.8V, HIGH = 2.0 to 5V (with a comfortable noise margin)
- Several sub-families existed: standard TTL, Low-power (74L), Schottky (74S), Low-power Schottky (74LS) — each trading off speed vs power

CMOS (Complementary Metal-Oxide-Semiconductor)

- Built with complementary pairs of MOSFETs (one N-channel, one P-channel)
- The 4000 series from RCA was the main family
- Much slower than TTL at the time — typically 50-100 ns propagation delay
- Extremely low static power — near-zero current draw when not switching (only leakage), making it ideal for battery-powered devices
- Flexible supply voltage — could operate from roughly 3V to 15V
- Logic levels are rail-to-rail: LOW ≈ 0V, HIGH ≈ Vdd, giving excellent noise margins
- Fragile inputs — very sensitive to electrostatic discharge (ESD), required careful handling
- Dynamic power consumption increases with switching frequency

Key differences summarized

┌─────────────────┬────────────────┬───────────────────┐
│ Characteristic  │   TTL (7400)   │    CMOS (4000)    │
├─────────────────┼────────────────┼───────────────────┤
│ Transistor type │ Bipolar (BJT)  │ MOSFET            │
├─────────────────┼────────────────┼───────────────────┤
│ Speed           │ Fast (~10 ns)  │ Slow (~50-100 ns) │
├─────────────────┼────────────────┼───────────────────┤
│ Static power    │ High (mW/gate) │ Near zero         │
├─────────────────┼────────────────┼───────────────────┤
│ Supply voltage  │ 5V fixed       │ 3–15V flexible    │
├─────────────────┼────────────────┼───────────────────┤
│ Noise margin    │ Good           │ Excellent         │
├─────────────────┼────────────────┼───────────────────┤
│ Drive strength  │ Strong         │ Weak              │
├─────────────────┼────────────────┼───────────────────┤
│ Input impedance │ Low            │ Very high         │
├─────────────────┼────────────────┼───────────────────┤
│ ESD sensitivity │ Robust         │ Fragile           │
└─────────────────┴────────────────┴───────────────────┘

The 1979 perspective

In 1979, TTL was king for most digital designs — computers, controllers, anything where speed mattered. CMOS was used where low power was essential (watches, calculators, battery devices). But the seeds of CMOS dominance were
already planted: as feature sizes shrank, CMOS would get faster while keeping its power advantage. By the late 1980s, CMOS overtook TTL, and today virtually all digital ICs (including modern processors) are CMOS-based.

MOSFETs

MOSFETs have become one of the most widely
used components in electronics, everywhere
from computer memory to high-amperage
switching power supplies. The name is an acronym for metal-oxide semiconductor field-effect
transistor. A simplified cross-section of an Nchannel MOSFET is shown in Figure 29-8.
Two MOSFETs are shown in Figure 29-9.
Like a JFET, a MOSFET has three terminals, identified as drain, gate, and source, and it functions
by creating a field effect that controls current
flowing through a channel. (Some MOSFETS
have a fourth terminal, described later). However, it has a metal source and drain making contact
with each end of the channel (hence the term
“metal” in its acronym) and also has a thin layer
of silicon dioxide (hence the term “oxide” in its
acronym) separating the gate from the channel,
thus raising the impedance at the gate to at least
100,000 gigaohms and reducing gate current essentially to zero. The high gate impedance of a
MOSFET allows it to be connected directly to the
output of a digital integrated circuit. The layer of
silicon dioxide is a dielectric, meaning that a field
appled to one side creates an opposite field on
the other side. The gate attached to the surface
of the layer functions in the same way as one
plate of a capacitor.
The silicon dioxide also has the highly desirable
property of insulating the gate from the channel,
thus preventing unwanted reverse current. In a
JFET, which lacks a dielectric layer, if source voltage is allowed to rise more than about 0.6V higher than gate voltage, the direct internal connection between gate and channel allows negative
charges to flow freely from source to gate, and as
the internal resistance will be very low, the resulting current can be destructive. This is why the
JFET must always be reverse-biased.
A MOSFET is freed from these restrictions, and
the gate voltage can be higher or lower than the
source voltage. This property enables an Nchannel MOSFET to be designed not only as a
depletion device, but alternatively as an enhancement device, which is “normally off” and
can be switched on by being forward-biased. The
primary difference is the extent to which the
channel in the MOSFET is N-doped with charge
carriers, and therefore will or will not conduct
without some help from the gate bias.
In a depletion device, the channel conducts, but
applying negative voltage to the gate can pinch
off the current.
In an enhancement device, the channel does not
conduct, but applying positive voltage to the
gate can make it start to do so.
In either case, a shift of bias from negative to
positive encourages channel conduction; the
depletion and enhancement versions simply
start from different points.
This is clarified in Figure 29-10. The vertical (logarithmic) scale suggests the current being conducted through the channel of the MOSFET,
while the green curve describes the behavior of
a depletion version of the device. Where this
curve crosses the center line representing 0 volts
bias, the channel is naturally conductive, like a
JFET. Moving left down the curve, as reverse bias
is applied (shown on the horizontal axis), the
component becomes less conductive until finally its conductivity reaches zero.
Meanwhile on the same graph, the orange curve
represents an enhancement MOSFET, which is
nonconductive at 0 volts bias. As forward bias
increases, the current also increases—similar to
a bipolar transistor.
To make things more confusing, a MOSFET, like a
JFET, can have a P-doped channel; and once
again it can function in depletion or enhancement mode. The behavior of this variant is shown
in Figure 29-11. As before, the green curve shows
the behavior of a depletion MOSFET, while the
orange curve refers to the enhancement version.
The horizontal axis now shows the voltage difference between the gate and the drain terminal.
The depletion component is naturally conductive at zero bias, until the gate voltage increases
above the drain voltage, pinching off the current
flow. The enhancement component is not conductive until reverse bias is applied.
Figure 29-12 shows schematic symbols that represent depletion MOSFETs. The two symbols on
the left are functionally identical, representing Nchannel versions, while the two symbols on the
right represent P-channel versions. As in the case
of JFETs, the letter “S” should be (but often is not)
added to the symmetrical versions of the symbols, to clarify which is the source terminal. The
left-pointing arrow identifies the components as
N-channel, while in the symbols on the right, the
right-pointing arrows indicate P-channel MOSFETs. The gap between the two vertical lines in
each symbol suggests the silicon dioxide dielectric. The right-hand vertical line represents the
channel.
For enhancement MOSFETs, a slightly different
symbol uses a broken line between the source
and drain (as shown in Figure 29-13) to remind
us that these components are “normally off”
when zero-biased, instead of “normally on.” Here
again a left-pointing arrow represents an N
Because there is so much room for confusion regarding MOSFETs, a summary is presented in
Figure 29-14 and Figure 29-15. In these figures,
the relevant parts of each schematic symbol are
shown disassembled alongside text explaining
their meaning. Either of the symbols in
Figure 29-14 can be superimposed on either of
the symbols in Figure 29-15, to combine their
functions. So, for instance, if the upper symbol in
Figure 29-14 is superimposed on the lower symbol in Figure 29-15, we get an N-channel MOSFET
of the enhancement type.
In an additional attempt to clarify MOSFET behavior, four graphs are provided in Figure 29-16,
Figure 29-17, Figure 29-18, and Figure 29-19. Like
JFETs, MOSFETs have an initial ohmic region, followed by a saturation region where current flows
relatively freely through the device. The gate-tosource voltage will determine how much flow is
permitted. However, it is important to pay close
attention to the graph scales, which differ for
each of the four types of MOSFET.
In all of these graphs, a bias voltage exists, which
allows zero current to flow (represented by the
graph line superimposed on the horizontal axis).
In other words, the MOSFET can operate as a
switch. The actual voltages where this occurs will
vary with the particular component under consideration.
The N-channel, enhancement-type MOSFET is
especially useful as a switch because in its
normally-off state (with zero bias) it presents a
very high resistance to current flow. It requires a
relatively low positive voltage at the gate, and
effectively no gate current, to begin conducting
conventional current from its drain terminal to its
source terminal. Thus it can be driven directly by
typical 5-volt logic chips.
Depletion-type MOSFETs are now less commonly used than the enhancement-type.



Each gate has a tick cost representing its propagation delay, and you don't pretend to simulate analog waveforms.

This maps well to reality too:

- A buffer (2 inverter stages) would cost more ticks than a single inverter — which is physically accurate since the signal passes through twice the transistors
- A NAND/NOR gate would have a similar cost to an inverter (one stage of complementary logic)
- An AND/OR gate would cost more (NAND/NOR + inverter), again matching reality

So something like:

┌────────────────┬───────────┬──────────────────────────────┐
│      Gate      │ Tick cost │             Why              │
├────────────────┼───────────┼──────────────────────────────┤
│ Inverter (NOT) │ 1         │ Single complementary pair    │
├────────────────┼───────────┼──────────────────────────────┤
│ Buffer         │ 2         │ Two inverter stages          │
├────────────────┼───────────┼──────────────────────────────┤
│ NAND           │ 1         │ Single stage (like inverter) │
├────────────────┼───────────┼──────────────────────────────┤
│ NOR            │ 1         │ Single stage (like inverter) │
├────────────────┼───────────┼──────────────────────────────┤
│ AND            │ 2         │ NAND + inverter              │
├────────────────┼───────────┼──────────────────────────────┤
│ OR             │ 2         │ NOR + inverter               │
└────────────────┴───────────┴──────────────────────────────┘

This is simple, consistent with the underlying physics, and gives users an intuitive sense of why inverting gates are "cheaper" than non-inverting ones — a real lesson from CMOS design.

It also means that when users build complex circuits, timing differences will emerge naturally. A chain of NAND gates will be faster than a chain of AND gates, just like in real hardware.


┌──────┬─────────┬─────────┬─────────┬──────────┐                                                                                                                                                                                 
│ Gate │ 2-input │ 4-input │ 8-input │ 16-input │                                                                                                                                                                                 
├──────┼─────────┼─────────┼─────────┼──────────┤                                                                                                                                                                                 
│ NAND │ 1       │ 2       │ 3       │ 4        │
├──────┼─────────┼─────────┼─────────┼──────────┤                                                                                                                                                                                 
│ AND  │ 2       │ 3       │ 4       │ 5        │
├──────┼─────────┼─────────┼─────────┼──────────┤
│ NOR  │ 1       │ 2       │ 3       │ 4        │
├──────┼─────────┼─────────┼─────────┼──────────┤
│ OR   │ 2       │ 3       │ 4       │ 5        │
├──────┼─────────┼─────────┼─────────┼──────────┤
│ XOR  │ 2       │ 4       │ 6       │ 8        │
├──────┼─────────┼─────────┼─────────┼──────────┤
│ XNOR │ 3       │ 5       │ 7       │ 9        │
└──────┴─────────┴─────────┴─────────┴──────────┘

The reasoning for 16-input:

- NAND16 / NOR16: 4 ticks — a tree of 2-input gates needs 4 levels deep (log2(16) = 4)
- AND16 / OR16: 5 ticks — NAND16/NOR16 + 1 inverter
- XOR16: 8 ticks — tree of XOR2s, 4 levels deep (4 × 2)
- XNOR16: 9 ticks — XOR16 + 1 inverter

You can see the general formulas:

┌─────────────┬────────────────────┐
│ Gate family │ Formula (n inputs) │
├─────────────┼────────────────────┤
│ NAND / NOR  │ log2(n)            │
├─────────────┼────────────────────┤
│ AND / OR    │ log2(n) + 1        │
├─────────────┼────────────────────┤
│ XOR         │ log2(n) × 2        │
├─────────────┼────────────────────┤
│ XNOR        │ log2(n) × 2 + 1    │
└─────────────┴────────────────────┘

Those formulas also cover any future gate size if you ever reconsider your limits. And they make it obvious why XOR/XNOR get expensive fast — they scale linearly with depth while the others scale logarithmically.


Only I would like to refine a bit this visual representation. Take a cmos inverter with base HIGH but source LOW : the inverter is full (it could let pass if source was HIGH) but its output is LOW (source LOW). The moment     
source goes to HIGH then the output instanly goes to HIGH (0 tick delta) in my modelling. Is that a good approximation ?

● No, I don't think that's a good approximation. Even if the gate was already "primed" (base set up correctly), when the source signal arrives, the gate still needs to switch — that silicon dioxide capacitor still needs to      
charge/discharge. The propagation delay applies regardless of whether the input change comes from the base or the source side.

Think of it physically: the MOSFET gate capacitor doesn't "pre-charge" just because one input is ready. The output only changes after all inputs are in the right state and the transistors have had time to switch. That
switching time is the propagation delay — always 1 tick for an inverter.

So the correct behavior should be:

1. Base is HIGH, source is LOW → output is LOW
2. Source goes HIGH → output is still LOW for this tick
3. Next tick → output goes HIGH (1 tick delay)

If you make primed gates react in 0 ticks, you'd get some odd consequences:
- An AND gate (NAND + NOT in series) where the NAND is primed could appear to react in 1 tick instead of 2
- Timing would become input-order dependent — the same gate would have different delays depending on which input changed last
- Users building complex circuits would get unpredictable, hard-to-reason-about timing

The beauty of your tick model is its consistency: every gate always costs the same number of ticks, regardless of internal state. I'd keep that invariant. The filled/empty visual can still show which gates are primed and ready
to react on the next tick — that's useful information — but the reaction itself should always cost the full tick delay.

❯ Si what's your saying basically is that the active - full / inactive empty representation : should follow this rule : active full if and only if source is high and gate/base is high. For example an inverter with gate/base     
high but vcc/source low should be represented inactive / empty ?

● Exactly. Active/full if and only if the gate is actually producing a HIGH output. The visual state should represent the output, not the "readiness."

For an inverter specifically though, let's be careful — an inverter outputs HIGH when its input is LOW:

┌───────┬──────────────┬────────┬────────┐                                                                                                                                                                                        
│ Input │ Source (Vcc) │ Output │ Visual │
├───────┼──────────────┼────────┼────────┤
│ LOW   │ HIGH         │ HIGH   │ Full   │
├───────┼──────────────┼────────┼────────┤
│ HIGH  │ HIGH         │ LOW    │ Empty  │
├───────┼──────────────┼────────┼────────┤
│ LOW   │ LOW          │ LOW    │ Empty  │
├───────┼──────────────┼────────┼────────┤
│ HIGH  │ LOW          │ LOW    │ Empty  │
└───────┴──────────────┴────────┴────────┘

The rule is simply: full = output is HIGH, empty = output is LOW. And Vcc must be HIGH for any output to be HIGH, because without power nothing works.

This keeps things clean and consistent:
- The visual directly represents the electrical reality — what voltage is actually present at the output
- No misleading "primed but not yet producing" state
- Users can look at any gate and immediately know its output just from the visual
- The propagation delay is always respected — a gate goes from empty to full (or vice versa) only on the tick when its output actually changes

This also means your series wiring demo stays correct: when an upstream gate flips, the downstream gate's visual doesn't change until its own propagation delay has elapsed, even if it was "ready." The filled/empty states
ripple through the chain tick by tick, which is exactly what you want users to observe.

❯ that's a difference between transistors and other king of logic components. For example an electro-mechanical relay can be closed and immediately conduct the moment there is power source. But for cmos/ttl components what      
activate them really is the difference or equality of tension between source and gate. Just to be sure : let's inverse : imagine the cmos inverter with gate LOW and source HIGH at tick 0. it's active with HIGH output         
(drain). then at tick 1 source goes to LOW. What happens with drain output ? immediately LOW or LOW after one tick ?

● Immediately LOW — 0 tick delay.

And that's physically accurate. When you cut the power (Vcc/source goes LOW), there's nothing to sustain the output. The charge at the drain has no supply feeding it anymore. It collapses. There's no "switching" happening in  
the transistors — the power is simply gone.

Think of it like a water pipe: the gate controls the valve (that takes time to open/close), but if you cut the water supply, the pipe is empty regardless of the valve position.

So the rules are:

┌───────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│                           Event                           │                         Delay                          │
├───────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Input (gate/base) changes → output changes                │ 1 tick (propagation delay, capacitor charge/discharge) │
├───────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Vcc/source goes LOW → output goes LOW                     │ 0 ticks (no power = no output, instant)                │
├───────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Vcc/source goes HIGH, gate already set → output goes HIGH │ 1 tick (transistors still need to switch)              │
└───────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘

That last line is the key distinction from your relay analogy. A relay is a mechanical switch — once closed, it's a direct conductor, so applying power instantly produces output. A MOSFET gate controls a field effect through a
capacitor — even if the gate voltage is already there, restoring Vcc means the transistors need to establish the channel and charge the output capacitance. That costs 1 tick.

So to summarize:
- Losing power is instant (0 ticks) — physics can't maintain a HIGH without a source
- Gaining or switching anything else costs time (1+ ticks) — transistors need to react

❯ Ok so changes of Vcc/source are asymmetrical : going LOW immediately make output LOW, while going HIGH make output goes HIGH( if gate/base adequat) after one propagation delay (same time as when changing gate/base).

● Yes, that's a perfect summary. And it's physically honest:

- Power loss is passive — nothing needs to happen, the energy just isn't there anymore
- Power gain is active — the transistors need to establish their channels, charge the gate capacitances, settle the output

This asymmetry is real in CMOS circuits. In fact it's one of the reasons why power sequencing matters so much in real digital design — you can't just slam Vcc on and expect everything to be correct instantly. Chips have
power-on reset circuits specifically because the gates need time to settle into valid states after power is applied.

For your simulation model, the complete rule set is clean:

┌─────────────────────────────────┬──────────────────┬──────────────────────┐
│              Event              │  Output effect   │        Delay         │
├─────────────────────────────────┼──────────────────┼──────────────────────┤
│ Vcc goes LOW                    │ Output → LOW     │ 0 ticks              │
├─────────────────────────────────┼──────────────────┼──────────────────────┤
│ Vcc goes HIGH (gate adequate)   │ Output → HIGH    │ 1 tick (propagation) │
├─────────────────────────────────┼──────────────────┼──────────────────────┤
│ Vcc goes HIGH (gate inadequate) │ Output stays LOW │ —                    │
├─────────────────────────────────┼──────────────────┼──────────────────────┤
│ Gate changes (Vcc HIGH)         │ Output changes   │ 1 tick (propagation) │
├─────────────────────────────────┼──────────────────┼──────────────────────┤
│ Gate changes (Vcc LOW)          │ No effect        │ —                    │
└─────────────────────────────────┴──────────────────┴──────────────────────┘

Five cases, no ambiguity. This gives you a consistent, physically grounded timing model that applies uniformly to all your CMOS/TTL gates — just scale the propagation delay column by the gate's tick cost.

❯ On the other hand you agree at Vcc/source HIGH constant changes of gate/base are symmetrical ?

● Yes, absolutely. With Vcc stable at HIGH:

- Gate goes LOW → HIGH: output changes after propagation delay
- Gate goes HIGH → LOW: output changes after same propagation delay

Both directions require the same work — the MOSFET gate capacitor needs to charge in one case, discharge in the other. Both take time, and roughly the same amount of time.

In reality there's a tiny asymmetry (rise time vs fall time differ slightly because N-channel and P-channel transistors aren't perfectly matched), but as we discussed earlier, that's sub-tick granularity. At your abstraction
level, symmetrical is the correct model.

So the full picture is simple:

- Vcc changes: asymmetrical (loss is instant, gain costs a tick)
- Gate/base changes: symmetrical (both directions cost the same tick delay)



CMOS (our established model):

┌──────┬─────┬─────┬─────┬─────┐
│ Gate │  2  │  4  │  8  │ 16  │
├──────┼─────┼─────┼─────┼─────┤
│ NAND │ 1   │ 2   │ 3   │ 4   │
├──────┼─────┼─────┼─────┼─────┤
│ AND  │ 2   │ 3   │ 4   │ 5   │
├──────┼─────┼─────┼─────┼─────┤
│ NOR  │ 1   │ 2   │ 3   │ 4   │
├──────┼─────┼─────┼─────┼─────┤
│ OR   │ 2   │ 3   │ 4   │ 5   │
├──────┼─────┼─────┼─────┼─────┤
│ XOR  │ 2   │ 4   │ 6   │ 8   │
├──────┼─────┼─────┼─────┼─────┤
│ XNOR │ 3   │ 5   │ 7   │ 9   │
└──────┴─────┴─────┴─────┴─────┘

TTL (proposed):

┌──────┬─────┬─────┬─────┬─────┐
│ Gate │  2  │  4  │  8  │ 16  │
├──────┼─────┼─────┼─────┼─────┤
│ NAND │ 1   │ 1   │ 2   │ 2   │
├──────┼─────┼─────┼─────┼─────┤
│ AND  │ 2   │ 2   │ 3   │ 3   │
├──────┼─────┼─────┼─────┼─────┤
│ NOR  │ 1   │ 2   │ 2   │ 3   │
├──────┼─────┼─────┼─────┼─────┤
│ OR   │ 2   │ 3   │ 3   │ 4   │
├──────┼─────┼─────┼─────┼─────┤
│ XOR  │ 2   │ 4   │ 6   │ 8   │
├──────┼─────┼─────┼─────┼─────┤
│ XNOR │ 3   │ 5   │ 7   │ 9   │
└──────┴─────┴─────┴─────┴─────┘


So the unified rule is: any input change (gate or Vcc) restarts the propagation delay counter from zero. No partial credit, no shortcuts, regardless of which input changed.
a transient state means the output hasn't changed yet. So reverting is free — you're canceling something that hasn't happened. But starting a new transition always costs the full delay.





- I included electro-mechanical relays at the first lessons because they're dead simple and historically played a part (first logic electrical circuit pre electronic)
- I also included transistors thinking they were simply used too : I was very wrong. They're delicate components who need some specifc wiring to really produce logic gates : you can just treat a single transistor as a gate commanded switch, I realized. And Frankly my engine doesn't allow to explain why. So I will just exclude them from available components.
- The first real gates that will matter is the Buffer : in fact I will say that by default its activationLogic is negative and rename it an inverter, moving it from basic components to gates. 
- I'll introduce for gates a new configurable attribute : logic family : the idea is that this family will constrain the propagation delay : for example CMOS 1 will be the family built from inverter of 1 tick of propagation delay and upper gates will get the propagation time defined from that following our table. 
- A special family "sandbox" will still allow users to meddle with propagation delays for educational or test purposes but by default my pedagogy will use CMOS 1. 
- behaviors and display will be changed in accordance to the rules we stated before. 
- then the educational project can resume cleanly since the discrete engine of this project can handle cases from here on : only the underlying physical analogous complexity will be respected. 