import type { ComponentDefinition } from '../component-registry.js';

export const ELECTRIC_HEATER: ComponentDefinition = {
  typeId:   'electric_heater',
  category: 'source',
  label:    'Electric Heater',

  ports: [
    { id: 'water_in',  label: 'Water In',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'water_out', label: 'Water Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'power_kw',  label: 'Power (kW)', type: 'number', unit: 'kW', editable: false },
    { key: 'setpoint_c',label: 'Target Temp (°C)', type: 'number', unit: '°C', editable: true, default: 60 },
  ],

  sensorSlots: [
    { id: 'runtime', label: 'Running State', metric: 'runtime', required: true,  defaultTtlSeconds: 60  },
    { id: 'temp',    label: 'Outlet Temp',   metric: 'temperature', unit: '°C', required: false, defaultTtlSeconds: 120 },
  ],

  commands: [
    { id: 'enable',  label: 'Enable / Disable', dangerous: false, confirm: false },
  ],

  visual: {
    shape: 'generic',
    icon: '⚡',
    primaryStatusMetric: 'runtime',
    portAnchors: { water_in: 'left', water_out: 'right' },
    dashboardCard: { fields: ['runtime', 'temp'] },
    propertyPanel: { sections: ['live', 'commands', 'alarms', 'config'] },
  },
};
