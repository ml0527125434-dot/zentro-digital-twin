import type { ComponentDefinition } from '../component-registry.js';

export const BUFFER_TANK: ComponentDefinition = {
  typeId:   'buffer_tank',
  category: 'storage',
  label:    'Buffer Tank',

  ports: [
    { id: 'hot_in',   label: 'Heat Source In',  medium: 'hot_water', role: 'inlet',  anchor: 'left'   },
    { id: 'hot_out',  label: 'Hot Water Out',    medium: 'hot_water', role: 'outlet', anchor: 'top'    },
    { id: 'return_in',label: 'Return In',        medium: 'recirc',    role: 'inlet',  anchor: 'right'  },
    { id: 'cold_in',  label: 'Cold Water In',    medium: 'cold_water',role: 'inlet',  anchor: 'bottom' },
  ],

  properties: [
    { key: 'capacity_l', label: 'Capacity (L)', type: 'number', unit: 'L',  editable: false },
    { key: 'setpoint_c', label: 'Target Temp (°C)', type: 'number', unit: '°C', editable: true, default: 55 },
  ],

  sensorSlots: [
    { id: 'temp', label: 'Temperature', metric: 'temperature', unit: '°C', required: true, defaultTtlSeconds: 120 },
  ],

  commands: [],

  visual: {
    shape: 'tank',
    primaryStatusMetric: 'temperature',
    portAnchors: { hot_in: 'left', hot_out: 'top', return_in: 'right', cold_in: 'bottom' },
    dashboardCard: { fields: ['temp'] },
    propertyPanel: { sections: ['live', 'alarms', 'config', 'dependencies'] },
  },
};
