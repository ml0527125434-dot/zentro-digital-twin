import type { ComponentDefinition } from '../component-registry.js';

export const WATER_METER: ComponentDefinition = {
  typeId:   'water_meter',
  category: 'meter',
  label:    'Water Meter',

  ports: [
    { id: 'in',  label: 'Inlet',  medium: 'cold_water', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Outlet', medium: 'cold_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'pulse_per_l', label: 'Pulse/Litre', type: 'number', editable: false },
  ],

  sensorSlots: [
    { id: 'flow', label: 'Flow Rate (L/min)', metric: 'flow', unit: 'L/min', required: true, defaultTtlSeconds: 60 },
  ],

  commands: [],

  visual: {
    shape: 'sensor',
    icon: '💧',
    primaryStatusMetric: 'flow',
    portAnchors: { in: 'left', out: 'right' },
    dashboardCard: { fields: ['flow'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
