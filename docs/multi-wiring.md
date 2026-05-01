# multi-wiring specification

As bigger components as modelled the number of individual binary pins they get grow : For example the 8 bits adders has 26 logic pins (2*8 inputs, 8 outputs, the carry in and the carry out)
It would be cumbersome for the users to have to wire them individually each time. 

Instead a feature of multi-wiring must be implemented using the properties of ILogicPinMetadata which embed the interface of the pin and its numeral index in it (starting from 0). 
This data is now wired in ENodes and pins userData : from there it can be used by scene edit tools handlers.

## Rules

This features should only be active when engine/controller multi-wiring flag is true. 
Planning and implementation of the various features of this specification will be done incrementally one feature at a time because they'll need some manual human testing between each stage.  

### 1 - wiring two logic interfaces together [DONE]

If activated it will trigger the following rules : 
When a user ends wiring from a component's start pin 
and this pin is a logic one (input or output) and this pin has a non null logicMetadata 
and is pin i of interface A  
and the target end pin is a logic one (input or output) and that pin has a non null logic Metadata
and is pin j of interface B
and interface A and B are not the exact same interfaces (not same component/interface name)
then a wire is created between start pin and target pin (current behavior)
and other wires are created between pins i+1...max index of interface A and pins j+1 max index of interface B

example : 
user wire from output-0 of a 8 bit one's complement to inputB-0 of a eight bits adder -> 8 wires a creates output-0:inputB-0 .... output-7:inputB-7
user wire from output-0 from an eight-bit adder to input-0 of a 7 segment display (4 inputs for displaying an hexa 4 bits number) -> 4 wires are created output-0:input-0 ... output-3:input-3
user wire from output-4 from an eight-bit adder to input-4 of a 7 segment display (4 inputs for displaying an hexa 4 bits number) -> 4 wires are created output-4:input-0 ... output-7:input-3

### 2 - direct injection wiring from a logic interface to a branching point [DONE]

Given multi-wiring activated
When a user ends wiring from a component's start pin
and this pin is a logic one (input or output) and this pin has a non null logicMetadata
and is pin i of interface A
and the target is a new branching point created at the end of this wiring
then a wire is created between start pin and the new target branching point (current behavior)
and i+1...max interface A index new branching points target are created and positioned according to the followUps branching points placement algorithm below
and i+1...max interface A index new wires are created between the pins i+1 of the interface and the new i+1 followUps branching points

#### followUps branching point placement algorithm

1 - from the position of the new branching point the user placed you can compute followUps branching points i + j with j in [1...interface A length -1] positions 
First ake it so that all wires between pins i+j and branching points i + j would be parallel to the first wire and same length. 
The visual distance between first branching point (i) and the next is now the same as the visual distance between pin i and pin i+1 and so on. let call it Di

2 - adjustment
According to the interface is a logicInput or logicOutput : 

if logicInput length of wire must grow slightly with the index : 
prolongate the followUp wires length (in fact moving the target followUp branching point) so that distance BPi - BPi+1 is multiplied by square(2)

if logicOutput length of wire must shrink slightly with the index :
Shrink the followUp wires length (in fact moving the target followUp branching point) so that distance BPi - BPi+1 is multiplied by square(2) but the branching point get in fact closer to pin i+1.
Iterate the operation until last wire.

### 3A - indirect injection wiring from to a branching point to a new branching point [DONE]

Given multi-wiring activated
When a user ends wiring from a branching point (start BP)
and the target is a new branching point (target BP) created at the end of this wiring
then a wire is created between start BP and the new target BP (current behavior)
then the networking exploration algorithm below analyzes the source of start BP
if it returns a single logic interface A and a single logic index i (one single pin connected) and the logic distance Dl between start BP and the interface's pin (0 being direct wire, 1 one branching point away, etc...) is >0
then the forward exploration algorithm below explores the network of branching points linked to the followUp pins of the interface A
it returns all siblings candidate branching points (no pins in this case) having the logic distance Dl and their index of connection
Then iteratively starting from i+1 : 
It looks at siblings candidates of this index
if it finds one within a reasonable distance xz ( reasonable being 3*the distance between the two pins of origin i-i+1) 
it serves as basis for a new wire/followUp branching point which will be positioned relatively to the first target branching point
In this case positionning the followUps is simple : we simply add the constant delta vector between the BP the user placed minus the last previous point in it's path to the interface to each followUps BP
else is breaks and stop treatment
it iterates until either reaching the max index or at a break in the process. 

#### networking exploration algorithm

The goal is given a branching point or pin to find the pins and logicalInput/Output interfaces that are connected to it. 
It involves traversing the wiring from this branching point/pin. Only branching points are passing along the way : Each time a pin is reached this explorated branch stops here. 
After fast thinking it seems there's no real difference between exploration backward and forward in this scenario. It seems to be a symmetrical ops.
To design further.

### 3B - indirect injection linking from a branching point to an interface's pin [TODO]

Given multi-wiring activated
When a user ends wiring from a branching point (start BP)
and the target is an existing component's pin
then a wire is created between start BP and the target component's pin (current behavior)
and this pin is a logic one (input or output) and this pin has a non null logicMetadata
and is pin i of interface component A - interface AA
and there are existing followUp pins i+1...max interface AA index on interface AA
Then the networking exploration algorithm designed for 3A is run to find other interfaces linked to the start BP
Only interfaces of the other type of interface AA are searched (eg if interface AA is logicInput we search only for logicOutput, if interface AA is logicOutput we search only for logicInput)
During the exploration if such an interface is found , exploration stops and this interface BB of component B is used (note B can be the same as A only the type of interface must differ)
Using the networking exploration algorithm of rule 3A in forward mode siblings of start BP are found
And new wires are created between those siblings and the followUp pins of interface AA
During this operation no new branching points are created : if we run short of siblings BP while pins of AA are stil remaining op stops
On the contrary if there are more siblings than pins of AA we stop when all pins of AA following i+1 have been wired just once.

### 3C - indirect injection linking from an interface's pin to an existing branching point [TODO]

It is the symmetrical counterpart of 5A but when the user does the operation the other way.

Given multi-wiring activated
When a user ends wiring from an existing component's pin to an existing branching point (start pin)
and the target is an existing branching point (target BP)
then a wire is created between start pin and the target branching point (current behavior)
and start pin is a logic one (input or output) and start pin has a non null logicMetadata
and is pin i of interface component A - interface AA
and there are existing followUp pins i+1...max interface AA index on interface AA
Then the same logic as 5A is used from the target branching point

### 4 - followUp branching points during wire split [TODO]

Given multi-wiring activated
When a user splits an existing wire w at a given position
Then it creates a new branching point newBP at the given position, and the existing wire is split in two (current behavior)
then the networking exploration algorithm of 3A analyzes the sources of newBP
During the exploration as soon as a a component's logic interface is found , exploration stops
Given the pin on which newBP is linked is pin i of interface A (going from 0 to maxA with i<=maxA) at distance DL
Then for all pins of A between i+1 and maxA the networking exploration find all siblings at distance DL
Then knowing that newBP enforceably is linked to two wires, one that links him to interfaceA at distance DL, the other that goes beyond DL
taking the wire that goes beyond DL and its beyondEnode (enode other than newBP)
The position of beyondEnode is retrieved (both cases if beyondEnode is a pin or BP are handled)
and the vector3 delta (v3Delta) between beyondEnode and newBP is computed 

Finally for each siblings at distanceDL we compute the positions sibling - v3Delta. Among those position we select the one closer to newBP.
If the distance between this closePosition and newBP is small enough (< 3 * interface A pin i - i+j distance) then a new branching point is created at this position and the correspondent wire is split in two.
And we iterate until maxA
