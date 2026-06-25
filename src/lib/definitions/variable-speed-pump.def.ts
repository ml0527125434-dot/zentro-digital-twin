import type { ComponentDefinition } from '../component-registry.js';

export const VARIABLE_SPEED_PUMP: ComponentDefinition = {
  typeId:   'variable_speed_pump',
  category: 'pump',
  label:    'Variable Speed Pump',

  ports: [
    { id: 'in',  label: 'Inlet',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Outlet', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'max_flow_lpm',  label: 'Max Flow (L/min)',  type: 'number', unit: 'L/min', editable: false },
    { key: 'max_head_m',    label: 'Max Head (m)',       type: 'number', unit: 'm',     editable: false },
    { key: 'speed_pct',     label: 'Speed Setting (%)',  type: 'number', unit: '%',     editable: true, default: 100 },
  ],

  sensorSlots: [
    { id: 'flow',    label: 'Flow Rate',  metric: 'flow',    unit: 'L/min', required: true,  defaultTtlSeconds: 60 },
    { id: 'runtime', label: 'Run State',  metric: 'runtime',               required: false, defaultTtlSeconds: 60 },
  ],

  commands: [
    { id: 'enable',    label: 'Enable / Disable',    dangerous: false, confirm: false },
    { id: 'set_speed', label: 'Set Speed (%)',        dangerous: false, confirm: false },
  ],

  visual: {
    shape: 'pump',
    primaryStatusMetric: 'flow',
    portAnchors: { in: 'left', out: 'right' },
    dashboardCard: { fields: ['flow', 'runtime'] },
    propertyPanel: { sections: ['live', 'commands', 'alarms', 'config'] },
  },
};
