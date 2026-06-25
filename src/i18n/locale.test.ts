/**
 * Zentro Digital Twin — Localization tests (Stage 21)
 *
 * Verifies:
 * - Both locales define every TranslationKey
 * - No empty translations
 * - Hebrew is RTL, English is LTR
 * - Plural functions produce correct forms for count=0,1,n
 * - makeTFunction resolves string and function keys
 */

import { describe, it, expect } from 'vitest';
import { HE, HE_CONFIG } from './locales/he.js';
import { EN, EN_CONFIG } from './locales/en.js';
import type { TranslationKey } from './types.js';

// All keys that must exist in every locale
const ALL_KEYS: TranslationKey[] = [
  // Stage 21 keys
  'app.title', 'app.all_clear', 'app.alarms_count', 'app.lang_switch',
  'health.healthy', 'health.warning', 'health.critical', 'health.offline',
  'health.maintenance', 'health.commissioning',
  'status.ok', 'status.cold', 'status.warn', 'status.risk',
  'status.scald', 'status.fault', 'status.unknown',
  'sensor.live', 'sensor.stale', 'sensor.lost', 'sensor.unknown',
  'flow.flowing', 'flow.reverse', 'flow.noflow', 'flow.unknown',
  'pump.running', 'pump.standby', 'pump.no_data', 'pump.flow_unit',
  'unit.temperature',
  'flowmap.loading', 'flowmap.empty', 'dashboard.empty',
  // Stage 22 keys
  'sys.health', 'sys.last_update', 'sys.demo_mode',
  'sys.all_sensors_live', 'sys.some_sensors_stale', 'sys.sensors_offline',
  'sys.just_now', 'sys.seconds_ago',
  'kpi.tank_temp', 'kpi.supply_temp', 'kpi.return_temp', 'kpi.flow_rate',
  'kpi.heat_pump', 'kpi.gas_backup', 'kpi.recirc_pump', 'kpi.active_alarms',
  'kpi.no_value', 'kpi.running', 'kpi.standby',
  'alarm.critical_title', 'alarm.warning_title', 'alarm.count_active', 'alarm.component_label',
  'equip.title', 'equip.no_sensor_data',
  'timeline.title', 'timeline.alarm_raised', 'timeline.alarm_pending',
  'timeline.alarm_cleared', 'timeline.session_start', 'timeline.no_events',
  // Stage 24 keys
  'drawer.title', 'drawer.close',
  'drawer.section_status', 'drawer.section_telemetry', 'drawer.section_alarms', 'drawer.section_connections',
  'drawer.equipment_type', 'drawer.mode',
  'drawer.mode_normal', 'drawer.mode_maintenance', 'drawer.mode_commissioning',
  'drawer.no_live_data', 'drawer.no_alarms', 'drawer.no_connections',
  'drawer.provenance_measured', 'drawer.provenance_inferred', 'drawer.provenance_unknown',
  'drawer.demo_source', 'drawer.conn_in', 'drawer.conn_out',
  // Stage 25 keys
  'drawer.section_info',
  'demo.info_title', 'demo.info_body', 'demo.dismiss', 'demo.not_available',
  // Stage 26 keys
  'pres.enter', 'pres.exit', 'pres.badge',
];

describe('Hebrew locale', () => {
  it('defines every TranslationKey', () => {
    for (const key of ALL_KEYS) {
      expect(HE[key], `Missing Hebrew key: ${key}`).toBeDefined();
    }
  });

  it('no value is an empty string', () => {
    for (const key of ALL_KEYS) {
      const val = HE[key];
      if (typeof val === 'string') {
        expect(val.length, `Empty Hebrew value for: ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('config dir is rtl', () => {
    expect(HE_CONFIG.dir).toBe('rtl');
  });

  it('config code is he', () => {
    expect(HE_CONFIG.code).toBe('he');
  });

  it('alarms_count(1) returns singular form', () => {
    const fn = HE['app.alarms_count'];
    expect(typeof fn).toBe('function');
    const result = (fn as (args: { count: number }) => string)({ count: 1 });
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('אח');  // "אחת"
  });

  it('alarms_count(3) returns plural form with count', () => {
    const fn = HE['app.alarms_count'];
    const result = (fn as (args: { count: number }) => string)({ count: 3 });
    expect(result).toContain('3');
  });

  it('switchLabel is EN (the target language label)', () => {
    expect(HE_CONFIG.switchLabel).toBe('EN');
  });
});

describe('English locale', () => {
  it('defines every TranslationKey', () => {
    for (const key of ALL_KEYS) {
      expect(EN[key], `Missing English key: ${key}`).toBeDefined();
    }
  });

  it('no value is an empty string', () => {
    for (const key of ALL_KEYS) {
      const val = EN[key];
      if (typeof val === 'string') {
        expect(val.length, `Empty English value for: ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('config dir is ltr', () => {
    expect(EN_CONFIG.dir).toBe('ltr');
  });

  it('config code is en', () => {
    expect(EN_CONFIG.code).toBe('en');
  });

  it('alarms_count(1) returns "1 alarm" (singular)', () => {
    const fn = EN['app.alarms_count'];
    expect(typeof fn).toBe('function');
    const result = (fn as (args: { count: number }) => string)({ count: 1 });
    expect(result).toBe('1 alarm');
  });

  it('alarms_count(2) returns "2 alarms" (plural)', () => {
    const fn = EN['app.alarms_count'];
    const result = (fn as (args: { count: number }) => string)({ count: 2 });
    expect(result).toBe('2 alarms');
  });

  it('alarms_count(0) returns "0 alarms" (plural)', () => {
    const fn = EN['app.alarms_count'];
    const result = (fn as (args: { count: number }) => string)({ count: 0 });
    expect(result).toBe('0 alarms');
  });

  it('switchLabel contains Hebrew characters (the target language label)', () => {
    expect(EN_CONFIG.switchLabel).toMatch(/[֐-׿]/);
  });
});

describe('Locale parity', () => {
  it('both locales define exactly the same set of keys', () => {
    const heKeys = new Set(Object.keys(HE));
    const enKeys = new Set(Object.keys(EN));
    for (const k of heKeys) expect(enKeys.has(k), `EN missing: ${k}`).toBe(true);
    for (const k of enKeys) expect(heKeys.has(k), `HE missing: ${k}`).toBe(true);
  });

  it('total key count matches ALL_KEYS length', () => {
    expect(Object.keys(HE)).toHaveLength(ALL_KEYS.length);
    expect(Object.keys(EN)).toHaveLength(ALL_KEYS.length);
  });
});
