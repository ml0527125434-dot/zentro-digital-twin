import type { ComponentDefinition } from '../component-registry.js';

export const DISTRIBUTION_MANIFOLD: ComponentDefinition = {
  typeId:   'distribution_manifold',
  category: 'zone',
  label:    'Distribution Manifold',

  ports: [
    { id: 'supply_in',  label: 'Supply In',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'zone_1_out', label: 'Zone 1 Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
    { id: 'zone_2_out', label: 'Zone 2 Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
    { id: 'zone_3_out', label: 'Zone 3 Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
    { id: 'return_in',  label: 'Return In',  medium: 'recirc',    role: 'inlet',  anchor: 'top'   },
  ],

  properties: [
    { key: 'zones', label: 'Zone Count', type: 'number', editable: false, default: 3 },
  ],

  sensorSlots: [
    { id: 'temp', label: 'Supply Temp', metric: 'temperature', unit: '°C', required: false, defaultTtlSeconds: 120 },
  ],

  commands: [],

  visual: {
    shape: 'zone',
    icon: '⊢',
    primaryStatusMetric: 'temperature',
    portAnchors: { supply_in: 'left', zone_1_out: 'right', zone_2_out: 'right', zone_3_out: 'right', return_in: 'top' },
    dashboardCard: { fields: ['temp'] },
    propertyPanel: { sections: ['live', 'alarms', 'config', 'dependencies'] },
  },
};
