# Adding a new component

This is a cookbook for creating new components for simple-circuit-engine. IMPORTANT: Read **CAREFULLY** this recipe before implementing a new component.

You should CLEARLY identify from user's demand:
- {{component}} : the name of the new component
- {{component_group}} : the name of the group in which the component will be added
- {{pins}} : pins of the component and their data
- {{config}} : component config parameters and their data

in case of ambiguities or doubt ask the user for confirmation. 
Description of component's intent, states, events, behavior, visual representation and animation must also be clearly captured from user's prompt.

Components core and scene creation should be standardized for efficiency and consistency.
When implementing follow common patterns in similar files and use adequately utilities methods in abstract upper classes and helpers. 

## Core module actions

1. in `src/core/topology/types.ts` IF NOT EXIST, append {{component}} to the `ComponentType` enum and its metadata to `COMPONENT_TYPE_METADATA`.
2. in `src/core/simulation/states` IF NOT EXIST, add a subdirectory for the {{component_group}}.
3. in `src/core/simulation/states/{{component_group}}` create the state class extending ComponentState. Read `src/core/simulation/states/ComponentState.ts` and an example like `src/core/simulation/states/basic/SwitchState.ts`
4. in `src/core/simulation/states/index.ts` add the new state export
5. in `src/core/simulation/behaviors` IF NOT EXIST, add a subdirectory for the {{component_group}}.
6. in `src/core/simulation/behaviors/{{component_group}}` create the behavior class implementing IComponentBehavior. It must extend ComponentBehaviorMixin OR a subclass depending on {{component_group}}. Read `src/core/simulation/behaviors/ComponentBehavior.ts` and an example like `src/core/simulation/behaviors/gates/InverterBehavior.ts`. IMPORTANT: Be sure to understand well pins, config, states and events of the components to implement it well.
7. in `src/core/simulation/behaviors/index.ts` add the new behavior export.
8. in `src/core/setup.ts` add the {{component_group}} registering method IF NOT EXIST, then register the new component's behavior in it. 

## Internationalization module actions

1. in `src/i18n/locales/en.json` IF NOT EXISTS, add the english localizations.
2. in `src/i18n/locales/fr.json` IF NOT EXISTS, add the french localizations.

## Scene module actions

1. in `src/scene/shared/components` IF NOT EXIST, add a subdirectory for the {{component_group}}.
2. Read `src/scene/shared/components/ComponentVisualFactory.ts` and an example `src/scene/shared/components/gates/InverterVisualFactory.ts` to get the standard patterns and used APIs. 
3. If the user asked to use specific extrude geometries find them in `src/scene/shared/utils/GeometryUtils.ts`. 
4. in `src/scene/shared/components/{{component_group}}` create the visual factory for the component. 
5. in `src/scene/shared/components/index.ts` add the new visual factory export.
6. in `src/scene/setup.ts` add the {{component_group}} registering method IF NOT EXIST, then register the new component's visual factory in it. 

