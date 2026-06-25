import type { ComponentDefinition } from '../component-registry.js';

export const ENERGY_METER: ComponentDefinition = {
  typeId:   'energy_meter',
  category: 'meter',
  label:    'Energy Meter',

  ports: [
    { id: 'supply_in',  label: 'Supply In',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'return_out', label: 'Return Out', medium: 'recirc',    role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'pulse_per_kwh', label: 'Pulse/kWh', type: 'number', editable: false },
  ],

  sensorSlots: [
    { id: 'energy', label: 'Energy (kWh)',   metric: 'energy', unit: 'kWh',    required: true,  defaultTtlSeconds: 300 },
    { id: 'flow',   label: 'Flow Rate',      metric: 'flow',   unit: 'L/min',  required: false, defaultTtlSeconds: 60  },
  ],

  commands: [],

  visual: {
    shape: 'sensor',
    icon: '⚡',
    primaryStatusMetric: 'energy',
    portAnchors: { supply_in: 'left', return_out: 'right' },
    dashboardCard: { fields: ['energy', 'flow'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
