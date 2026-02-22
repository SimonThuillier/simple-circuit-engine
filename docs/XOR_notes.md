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