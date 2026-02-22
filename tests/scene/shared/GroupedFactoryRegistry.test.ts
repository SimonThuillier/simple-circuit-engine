/**
 * Unit tests for GroupedFactoryRegistry
 * @module tests/scene/shared/GroupedFactoryRegistry.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentType } from '../../../src/core/types/ComponentType';
import {
  GroupedFactoryRegistry,
  DefaultVisualFactory,
  BatteryVisualFactory,
  SwitchVisualFactory,
  LightbulbVisualFactory,
  SmallLEDVisualFactory,
  RectangleLEDVisualFactory,
  RelayVisualFactory,
  TransistorVisualFactory,
  LabelVisualFactory,
} from '../../../src/scene/shared/components';
import { registerBasicComponentsFactories } from '../../../src/scene/setup';

describe('GroupedFactoryRegistry', () => {
  let registry: GroupedFactoryRegistry;

  beforeEach(() => {
    registry = new GroupedFactoryRegistry(new DefaultVisualFactory());
  });

  describe('Constructor', () => {
    it('should initialize with no groups or registered types', () => {
      expect(registry.getGroups()).toHaveLength(0);
      expect(registry.getRegisteredTypes()).toHaveLength(0);
    });

    it('should throw TypeError for null fallback factory', () => {
      expect(() => new GroupedFactoryRegistry(null as any)).toThrow(TypeError);
    });

    it('should throw TypeError for undefined fallback factory', () => {
      expect(() => new GroupedFactoryRegistry(undefined as any)).toThrow(TypeError);
    });

    it('should store the provided fallback factory', () => {
      const fallback = new DefaultVisualFactory();
      const r = new GroupedFactoryRegistry(fallback);
      expect(r.getFallbackFactory()).toBe(fallback);
    });
  });

  describe('addGroup()', () => {
    it('should create a new group', () => {
      registry.addGroup('basic', 'Basic Components', () => {});

      expect(registry.getGroups()).toHaveLength(1);
      expect(registry.getGroups()[0]).toEqual({ id: 'basic', label: 'Basic Components' });
    });

    it('should return this for chaining', () => {
      const result = registry.addGroup('basic', 'Basic Components', () => {});
      expect(result).toBe(registry);
    });

    it('should support multiple groups and preserve insertion order', () => {
      registry
        .addGroup('basic', 'Basic Components', () => {})
        .addGroup('outputs', 'Output Components', () => {})
        .addGroup('transistors', 'Transistors', () => {});

      const groups = registry.getGroups();
      expect(groups).toHaveLength(3);
      expect(groups[0].id).toBe('basic');
      expect(groups[1].id).toBe('outputs');
      expect(groups[2].id).toBe('transistors');
    });

    it('should register factories via the builder callback', () => {
      registry.addGroup('basic', 'Basic Components', (group) => {
        group
          .add(ComponentType.Battery, new BatteryVisualFactory())
          .add(ComponentType.Switch, new SwitchVisualFactory());
      });

      expect(registry.has(ComponentType.Battery)).toBe(true);
      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.getRegisteredTypes('basic')).toContain(ComponentType.Battery);
      expect(registry.getRegisteredTypes('basic')).toContain(ComponentType.Switch);
    });

    it('should merge components into existing group on duplicate id', () => {
      registry
        .addGroup('basic', 'Basic Components', (group) => {
          group.add(ComponentType.Battery, new BatteryVisualFactory());
        })
        .addGroup('basic', 'Ignored Label', (group) => {
          group.add(ComponentType.Switch, new SwitchVisualFactory());
        });

      expect(registry.getGroups()).toHaveLength(1);
    });

    it('should preserve the label from the first registration on merge', () => {
      registry
        .addGroup('basic', 'Basic Components', () => {})
        .addGroup('basic', 'Different Label', () => {});

      expect(registry.getGroups()[0].label).toBe('Basic Components');
    });

    it('should contain all merged types after duplicate id', () => {
      registry
        .addGroup('basic', 'Basic Components', (group) => {
          group.add(ComponentType.Battery, new BatteryVisualFactory());
        })
        .addGroup('basic', 'Ignored Label', (group) => {
          group.add(ComponentType.Switch, new SwitchVisualFactory());
        });

      const types = registry.getRegisteredTypes('basic');
      expect(types).toContain(ComponentType.Battery);
      expect(types).toContain(ComponentType.Switch);
    });

    it('should throw TypeError on empty group id', () => {
      expect(() => registry.addGroup('', 'Label', () => {})).toThrow(TypeError);
      expect(() => registry.addGroup('  ', 'Label', () => {})).toThrow(TypeError);
    });

    it('should throw TypeError on empty group label', () => {
      expect(() => registry.addGroup('id', '', () => {})).toThrow(TypeError);
      expect(() => registry.addGroup('id', '  ', () => {})).toThrow(TypeError);
    });

    it('should allow an empty builder callback (creates empty group)', () => {
      expect(() => registry.addGroup('empty', 'Empty Group', () => {})).not.toThrow();

      expect(registry.getGroups()).toHaveLength(1);
      expect(registry.getRegisteredTypes('empty')).toHaveLength(0);
    });

    it('should move type to the new group when re-registered in a different group', () => {
      registry
        .addGroup('basic', 'Basic', (group) => {
          group.add(ComponentType.Battery, new BatteryVisualFactory());
        })
        .addGroup('other', 'Other', (group) => {
          group.add(ComponentType.Battery, new BatteryVisualFactory()); // move Battery here
        });

      expect(registry.getRegisteredTypes('basic')).not.toContain(ComponentType.Battery);
      expect(registry.getRegisteredTypes('other')).toContain(ComponentType.Battery);
      expect(registry.getGroupOf(ComponentType.Battery)?.id).toBe('other');
    });
  });

  describe('Builder .add() validation', () => {
    it('should throw TypeError on empty type string', () => {
      expect(() => {
        registry.addGroup('basic', 'Basic', (group) => {
          group.add('' as ComponentType, new DefaultVisualFactory());
        });
      }).toThrow(TypeError);
    });

    it('should throw TypeError on whitespace-only type string', () => {
      expect(() => {
        registry.addGroup('basic', 'Basic', (group) => {
          group.add('  ' as ComponentType, new DefaultVisualFactory());
        });
      }).toThrow(TypeError);
    });

    it('should throw TypeError on null factory', () => {
      expect(() => {
        registry.addGroup('basic', 'Basic', (group) => {
          group.add(ComponentType.Battery, null as any);
        });
      }).toThrow(TypeError);
    });

    it('should throw TypeError on undefined factory', () => {
      expect(() => {
        registry.addGroup('basic', 'Basic', (group) => {
          group.add(ComponentType.Battery, undefined as any);
        });
      }).toThrow(TypeError);
    });

    it('should throw TypeError on object without createVisual method', () => {
      expect(() => {
        registry.addGroup('basic', 'Basic', (group) => {
          group.add(ComponentType.Battery, {} as any);
        });
      }).toThrow(TypeError);
    });
  });

  describe('get()', () => {
    it('should return the registered factory for a component type', () => {
      const factory = new BatteryVisualFactory();
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, factory);
      });

      expect(registry.get(ComponentType.Battery)).toBe(factory);
    });

    it('should return the fallback factory for an unregistered type', () => {
      const fallback = new DefaultVisualFactory();
      const r = new GroupedFactoryRegistry(fallback);

      expect(r.get('UnknownType' as ComponentType)).toBe(fallback);
    });

    it('should never return null or undefined', () => {
      const result = registry.get(ComponentType.Battery);
      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });
  });

  describe('has()', () => {
    it('should return true for a registered type', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      expect(registry.has(ComponentType.Battery)).toBe(true);
    });

    it('should return false for an unregistered type', () => {
      expect(registry.has(ComponentType.Battery)).toBe(false);
    });

    it('should return false after unregister', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });
      registry.unregister(ComponentType.Battery);

      expect(registry.has(ComponentType.Battery)).toBe(false);
    });
  });

  describe('getGroups()', () => {
    it('should return empty array initially', () => {
      expect(registry.getGroups()).toEqual([]);
    });

    it('should return a new array on each call', () => {
      registry.addGroup('basic', 'Basic', () => {});

      const groups1 = registry.getGroups();
      const groups2 = registry.getGroups();
      expect(groups1).toEqual(groups2);
      expect(groups1).not.toBe(groups2);
    });

    it('should return the correct id and label', () => {
      registry.addGroup('basic', 'Basic Components', () => {});

      const groups = registry.getGroups();
      expect(groups[0].id).toBe('basic');
      expect(groups[0].label).toBe('Basic Components');
    });
  });

  describe('getGroupOf()', () => {
    it('should return the correct group for a registered type', () => {
      registry.addGroup('basic', 'Basic Components', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      const group = registry.getGroupOf(ComponentType.Battery);
      expect(group).toBeDefined();
      expect(group?.id).toBe('basic');
      expect(group?.label).toBe('Basic Components');
    });

    it('should return undefined for an unregistered type', () => {
      expect(registry.getGroupOf(ComponentType.Battery)).toBeUndefined();
    });

    it('should return undefined after unregister', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });
      registry.unregister(ComponentType.Battery);

      expect(registry.getGroupOf(ComponentType.Battery)).toBeUndefined();
    });
  });

  describe('getRegisteredTypes()', () => {
    it('should return all types when called with no argument', () => {
      registry
        .addGroup('basic', 'Basic', (group) => {
          group.add(ComponentType.Battery, new BatteryVisualFactory());
        })
        .addGroup('outputs', 'Outputs', (group) => {
          group.add(ComponentType.Lightbulb, new LightbulbVisualFactory());
        });

      const types = registry.getRegisteredTypes();
      expect(types).toHaveLength(2);
      expect(types).toContain(ComponentType.Battery);
      expect(types).toContain(ComponentType.Lightbulb);
    });

    it('should return types filtered by group', () => {
      registry
        .addGroup('basic', 'Basic', (group) => {
          group
            .add(ComponentType.Battery, new BatteryVisualFactory())
            .add(ComponentType.Switch, new SwitchVisualFactory());
        })
        .addGroup('outputs', 'Outputs', (group) => {
          group.add(ComponentType.Lightbulb, new LightbulbVisualFactory());
        });

      const basicTypes = registry.getRegisteredTypes('basic');
      expect(basicTypes).toHaveLength(2);
      expect(basicTypes).toContain(ComponentType.Battery);
      expect(basicTypes).toContain(ComponentType.Switch);
      expect(basicTypes).not.toContain(ComponentType.Lightbulb);
    });

    it('should return empty array for unknown group id', () => {
      expect(registry.getRegisteredTypes('nonexistent')).toEqual([]);
    });

    it('should return a new array on each call', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      const types1 = registry.getRegisteredTypes('basic');
      const types2 = registry.getRegisteredTypes('basic');
      expect(types1).toEqual(types2);
      expect(types1).not.toBe(types2);
    });

    it('should reflect unregister when filtered by group', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group
          .add(ComponentType.Battery, new BatteryVisualFactory())
          .add(ComponentType.Switch, new SwitchVisualFactory());
      });

      registry.unregister(ComponentType.Battery);

      const types = registry.getRegisteredTypes('basic');
      expect(types).not.toContain(ComponentType.Battery);
      expect(types).toContain(ComponentType.Switch);
    });

    it('should reflect unregister when no group filter is used', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      registry.unregister(ComponentType.Battery);

      expect(registry.getRegisteredTypes()).not.toContain(ComponentType.Battery);
    });
  });

  describe('unregister()', () => {
    it('should return true for a registered type', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      expect(registry.unregister(ComponentType.Battery)).toBe(true);
    });

    it('should return false for an unregistered type', () => {
      expect(registry.unregister(ComponentType.Battery)).toBe(false);
    });

    it('should remove the type from all registered types', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      registry.unregister(ComponentType.Battery);

      expect(registry.getRegisteredTypes()).not.toContain(ComponentType.Battery);
    });

    it('should remove the type from the group list', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      registry.unregister(ComponentType.Battery);

      expect(registry.getRegisteredTypes('basic')).not.toContain(ComponentType.Battery);
    });

    it('should preserve the empty group record after the last type is removed', () => {
      registry.addGroup('basic', 'Basic Components', (group) => {
        group.add(ComponentType.Battery, new BatteryVisualFactory());
      });

      registry.unregister(ComponentType.Battery);

      const groups = registry.getGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('basic');
    });

    it('should not affect sibling types in the same group', () => {
      registry.addGroup('basic', 'Basic', (group) => {
        group
          .add(ComponentType.Battery, new BatteryVisualFactory())
          .add(ComponentType.Switch, new SwitchVisualFactory());
      });

      registry.unregister(ComponentType.Battery);

      expect(registry.has(ComponentType.Switch)).toBe(true);
      expect(registry.getRegisteredTypes('basic')).toContain(ComponentType.Switch);
    });
  });

  describe('register() disabled', () => {
    it('should throw an Error', () => {
      expect(() => {
        registry.register(ComponentType.Battery, new BatteryVisualFactory());
      }).toThrow(Error);
    });

    it('should throw an error mentioning addGroup', () => {
      expect(() => {
        registry.register(ComponentType.Battery, new BatteryVisualFactory());
      }).toThrow(/addGroup/);
    });
  });

  describe('IFactoryRegistry compatibility', () => {
    it('should implement all IFactoryRegistry methods', () => {
      expect(typeof registry.get).toBe('function');
      expect(typeof registry.has).toBe('function');
      expect(typeof registry.getFallbackFactory).toBe('function');
      expect(typeof registry.unregister).toBe('function');
      expect(typeof registry.getRegisteredTypes).toBe('function');
      expect(typeof registry.register).toBe('function');
    });
  });

  describe('Integration: registerBasicComponentsFactories', () => {
    it('should register types across 1 group', () => {
      const groupedRegistry = new GroupedFactoryRegistry(new DefaultVisualFactory());
      registerBasicComponentsFactories(groupedRegistry);

      expect(groupedRegistry.getGroups()).toHaveLength(1);
    });

    it('should have correct group ids and labels', () => {
      const groupedRegistry = new GroupedFactoryRegistry(new DefaultVisualFactory());
      registerBasicComponentsFactories(groupedRegistry);

      const groups = groupedRegistry.getGroups();
      expect(groups.find((g) => g.id === 'basic')?.label).toBe('Basic Components');
    });

    it('should put Battery, Switch, Lightbulb, SmallLED, RectangleLED, Relay, Transistor in basic group', () => {
      const groupedRegistry = new GroupedFactoryRegistry(new DefaultVisualFactory());
      registerBasicComponentsFactories(groupedRegistry);

      const basicTypes = groupedRegistry.getRegisteredTypes('basic');
      expect(basicTypes).toContain(ComponentType.Battery);
      expect(basicTypes).toContain(ComponentType.Switch);
      expect(basicTypes).toContain(ComponentType.Lightbulb);
      expect(basicTypes).toContain(ComponentType.SmallLED);
      expect(basicTypes).toContain(ComponentType.RectangleLED);
      expect(basicTypes).toContain(ComponentType.Relay);
      expect(basicTypes).toContain(ComponentType.Transistor);
    });
  });
});
