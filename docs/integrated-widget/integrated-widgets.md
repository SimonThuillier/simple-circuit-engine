# integrated widgets spec

## context

In the early stages of the project the main idea was that this library had to focus exclusively on the core and scene (three.js scene and objects management).
Any modals/dialogs/tooltips or widget should have been managed by the client application. 
Although this idea had merits, enforcing a strict and clear separation of responsibility between this library and its client apps 
it had limitations that compel us to reconsider now:
- With time the library was increased to display modals (Config Form with lil-gui) and even tooltips (pinTooltip). 
- UX ergnonomy requirements now leads to having convenient widget buttons positioned over the scene for the user to conveniently perform actions without having to leave the main scene area where everything happens. 

- Though it would still be possible for client apps to handle all the widget interaction (through the engine event emitting) it would be cumbersome to take this direction. 
So the goal of this spec is to integrate some widgets (html elements overlayed transiently or permanently over the scene area) into the library. 

## widgets

### Mode Widget

This widget is a rounded button that should appear near the left-top corner of the scene area an upon click toggle mode between edit and simulation : 
see `./widget-mode-edit.png` and `./widget-mode-simulation.png`.

**Snippets (HTML/CSS):**
<div class="mode-indicator simulation" id="mode-indicator">...</div>

/* Mode indicator overlay */
.mode-indicator {
position: absolute;
top: 12px;
right: 12px;
padding: 6px 12px;
border-radius: 4px;
font-size: 12px;
font-weight: 500;
cursor: pointer;
transition: transform 0.1s, box-shadow 0.1s;
}

      .mode-indicator:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .mode-indicator:active {
        transform: scale(0.98);
      }

      .mode-indicator.edit {
        background: rgba(76, 175, 80, 0.9);
        color: white;
      }

      .mode-indicator.simulation {
        background: rgba(33, 150, 243, 0.9);
        color: white;
      }

### Tools widget

A couple of squared rounded button with active/inactive css variant to easily switch between the two tools in edit mode.

- the build tool button with an icon wrench-screwdriver of https://heroicons.com/
- the multi-select tool button with an icon cube-transparent of https://heroicons.com/

These buttons will only appear when engine is in edit mode. 
Active/inactive of those buttons should be synchronized with which is the current tool. 

They should be positioned near the left border of the scene area. one under the other, and under the mode widget.

### Multi-wiring widget

A squared rounded button with active/inactive css variant and icon bars-arrow-down of https://heroicons.com/

It will tiggle a new flag attribute (like a verr maj) "multiWiring" that should flow down to engine and edit controller.
What this attribute will do is out of scope of the current spec but for your info 
it will allow creating several wires at once when linking pins of logic interfaces (like wiring pins 0..7 of one interface to pins 0..7 of the other in one action just by pulling one wire).

It will only appear in edit mode and should stay synchronized with the engine multiWiring flag. 

### Simulation-player widget 

A complex widget with an horizontal slider like `./slider.png` allowing to set the current speed of simulation. 
on its right a small indicator will display the current speed (ticks per second). 
on its left a small stop button will allow to stop and reset the simulation at tick 0. 
Double-clicking on the slider should pause the simulation. 
When paused and upon simple click the simulation should advance one step.  
When paused and upon double click the simulation should play again.  

This widget should appear only in simulation mode under the mode widget (thus replacing the widgets of edition mode). 

## development guide

To keep the library self-embedded but lean on dependency it should avoid adding icon/style dependencies or web loading at runtime and embed them.
For example the icons data (heroicon linked to tailwind) will be stored  as svg in an adequate place in the project.

New implementation should be in the scene module in the places you deem adequat (staying coherent with current architecture and conventions).

## events

Some new events should be necessary. Before some actions (changing mode, tools, simulation runtime parameters) were only done from client to engine.
Now that these actions will be done from withtin the engine new events that inform the client app of changes should be added. 


