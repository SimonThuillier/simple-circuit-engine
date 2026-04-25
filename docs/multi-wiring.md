# multi-wiring specification

As bigger components as modelled the number of individual binary pins they get grow : For example the 8 bits adders has 26 logic pins (2*8 inputs, 8 outputs, the carry in and the carry out)
It would be cumbersome for the users to have to wire them individually each time. 

Instead a feature of multi-wiring must be implemented using the properties of ILogicPinMetadata which embed the interface of the pin and its numeral index in it (starting from 0). 
This data is now wired in ENodes and pins userData : from there it can be used by scene edit tools handlers.

## Rules

This features should only be active when engine/controller multi-wiring flag is true. 
Planning and implementation of the various features of this specification will be done incrementally one feature at a time because they'll need some manual human testing between each stage.  

### 1 - wiring two logic interfaces together

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

