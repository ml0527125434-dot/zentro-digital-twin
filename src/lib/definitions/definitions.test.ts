import { describe, it, expect } from 'vitest';
import { validateDefinition } from '../definition-validator.js';
import { createComponentRegistry } from '../component-registry.js';
import { registerBaseLibrary, BASE_DEFINITIONS } from '../component-library.js';
import { STORAGE_TANK } from './storage-tank.def.js';
import { HEAT_PUMP    } from './heat-pump.def.js';
import { RECIRC_PUMP  } from './recirc-pump.def.js';
import { MIXING_VALVE } from './mixing-valve.def.js';
import { GAS_BACKUP   } from './gas-backup.def.js';
import { POINT_OF_USE } from './point-of-use.def.js';

// ---------------------------------------------------------------------------
// SDK §6 conformance — each definition must pass validateDefinition()
// ---------------------------------------------------------------------------

describe('SDK §6 conformance — base library', () => {
  it('storage_tank passes validateDefinition()', () => {
    expect(validateDefinition(STORAGE_TANK)).toEqual({ valid: true });
  });

  it('heat_pump passes validateDefinition()', () => {
    expect(validateDefinition(HEAT_PUMP)).toEqual({ valid: true });
  });

  it('recirc_pump passes validateDefinition()', () => {
    expect(validateDefinition(RECIRC_PUMP)).toEqual({ valid: true });
  });

  it('mixing_valve passes validateDefinition()', () => {
    expect(validateDefinition(MIXING_VALVE)).toEqual({ valid: true });
  });
});

describe('SDK §6 conformance — conformance-specific definitions', () => {
  it('gas_backup passes validateDefinition()', () => {
    expect(validateDefinition(GAS_BACKUP)).toEqual({ valid: true });
  });

  it('point_of_use passes validateDefinition()', () => {
    expect(validateDefinition(POINT_OF_USE)).toEqual({ valid: true });
  });
});

// ---------------------------------------------------------------------------
// Base library registration
// ---------------------------------------------------------------------------

describe('registerBaseLibrary()', () => {
  it('registers exactly 4 base definitions', () => {
    const registry = createComponentRegistry();
    registerBaseLibrary(registry);
    expect(registry.listAll()).toHaveLength(4);
  });

  it('registers storage_tank, heat_pump, recirc_pump, mixing_valve', () => {
    const registry = createComponentRegistry();
    registerBaseLibrary(registry);
    const ids = registry.listAll().map(d => d.typeId).sort();
    expect(ids).toEqual(['heat_pump', 'mixing_valve', 'recirc_pump', 'storage_tank']);
  });

  it('does NOT register gas_backup (conformance-specific)', () => {
    const registry = createComponentRegistry();
    registerBaseLibrary(registry);
    expect(registry.get('gas_backup')).toBeUndefined();
  });

  it('does NOT register point_of_use (conformance-specific)', () => {
    const registry = createComponentRegistry();
    registerBaseLibrary(registry);
    expect(registry.get('point_of_use')).toBeUndefined();
  });

  it('calling registerBaseLibrary twice throws on duplicate typeId', () => {
    const registry = createComponentRegistry();
    registerBaseLibrary(registry);
    expect(() => registerBaseLibrary(registry)).toThrow(/already registered/);
  });

  it('BASE_DEFINITIONS exports all four base definitions', () => {
    expect(BASE_DEFINITIONS).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Definition shape contracts
// ---------------------------------------------------------------------------

describe('storage_tank shape', () => {
  it('has hot_out outlet port (hot_water)', () => {
    const p = STORAGE_TANK.ports.find(p => p.id === 'hot_out');
    expect(p?.role).toBe('outlet');
    expect(p?.medium).toBe('hot_water');
  });

  it('has recirc_in inlet port (recirc)', () => {
    const p = STORAGE_TANK.ports.find(p => p.id === 'recirc_in');
    expect(p?.role).toBe('inlet');
    expect(p?.medium).toBe('recirc');
  });

  it('has heat_in_1 and heat_in_2 inlet ports (hot_water)', () => {
    const h1 = STORAGE_TANK.ports.find(p => p.id === 'heat_in_1');
    const h2 = STORAGE_TANK.ports.find(p => p.id === 'heat_in_2');
    expect(h1?.role).toBe('inlet');
    expect(h2?.role).toBe('inlet');
    expect(h1?.medium).toBe('hot_water');
    expect(h2?.medium).toBe('hot_water');
  });

  it('set_setpoint command is dangerous and has interlockKeys', () => {
    const cmd = STORAGE_TANK.commands.find(c => c.id === 'set_setpoint');
    expect(cmd?.dangerous).toBe(true);
    expect(cmd?.interlockKeys?.length).toBeGreaterThan(0);
  });

  it('has required temp sensorSlot', () => {
    const slot = STORAGE_TANK.sensorSlots.find(s => s.id === 'temp');
    expect(slot?.required).toBe(true);
    expect(slot?.metric).toBe('temperature');
  });
});

describe('mixing_valve shape', () => {
  it('has hot_in, cold_in, mixed_out ports', () => {
    const ids = MIXING_VALVE.ports.map(p => p.id).sort();
    expect(ids).toContain('hot_in');
    expect(ids).toContain('cold_in');
    expect(ids).toContain('mixed_out');
  });

  it('mixed_out is hot_water outlet', () => {
    const p = MIXING_VALVE.ports.find(p => p.id === 'mixed_out');
    expect(p?.role).toBe('outlet');
    expect(p?.medium).toBe('hot_water');
  });

  it('has no sensor slots and no commands (passive)', () => {
    expect(MIXING_VALVE.sensorSlots).toHaveLength(0);
    expect(MIXING_VALVE.commands).toHaveLength(0);
  });
});

describe('point_of_use shape', () => {
  it('drain_out is recirc outlet', () => {
    const p = POINT_OF_USE.ports.find(p => p.id === 'drain_out');
    expect(p?.role).toBe('outlet');
    expect(p?.medium).toBe('recirc');
  });

  it('has required temp sensorSlot', () => {
    const slot = POINT_OF_USE.sensorSlots.find(s => s.id === 'temp');
    expect(slot?.required).toBe(true);
    expect(slot?.metric).toBe('temperature');
  });
});
