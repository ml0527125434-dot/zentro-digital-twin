import type { LocaleConfig, Translations } from '../types.js';

export const EN_CONFIG: LocaleConfig = {
  code:        'en',
  name:        'English',
  dir:         'ltr',
  switchLabel: 'עב',
  htmlLang:    'en',
};

export const EN: Translations = {
  // App chrome
  'app.title':        'Zentro Digital Twin',
  'app.all_clear':    '✓ All clear',
  'app.alarms_count': ({ count }) =>
    count === 1 ? '1 alarm' : `${count} alarms`,
  'app.lang_switch':  'עב',

  // HealthState
  'health.healthy':       'Healthy',
  'health.warning':       'Warning',
  'health.critical':      'Critical',
  'health.offline':       'Offline',
  'health.maintenance':   'Maintenance',
  'health.commissioning': 'Commissioning',

  // NodeStatus
  'status.ok':      'OK',
  'status.cold':    'Cold',
  'status.warn':    'Warn',
  'status.risk':    'Risk',
  'status.scald':   'Scald',
  'status.fault':   'Fault',
  'status.unknown': 'Unknown',

  // SensorState
  'sensor.live':    'Live',
  'sensor.stale':   'Stale',
  'sensor.lost':    'Lost',
  'sensor.unknown': 'Unknown',

  // FlowState
  'flow.flowing': 'Flowing',
  'flow.reverse': 'Reverse',
  'flow.noflow':  'No flow',
  'flow.unknown': 'Unknown',

  // PumpNode
  'pump.running':   '▶ Running',
  'pump.standby':   '◼ Standby',
  'pump.no_data':   '? No data',
  'pump.flow_unit': 'L/m',

  // Units
  'unit.temperature': '°C',

  // Loading / empty states
  'flowmap.loading': 'Computing layout…',
  'flowmap.empty':   'No components to display',
  'dashboard.empty': 'No components',
};
