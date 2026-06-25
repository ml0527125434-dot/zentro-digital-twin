import type { ComponentDefinition } from '../component-registry.js';

export const TAP: ComponentDefinition = {
  typeId:   'tap',
  category: 'consumer',
  label:    'Tap / Faucet',

  ports: [
    { id: 'hot_in',   label: 'Hot Water In',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'drain_out',label: 'Drain',         medium: 'recirc',    role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'location', label: 'Location', type: 'string', editable: true, default: '' },
  ],

  sensorSlots: [
    { id: 'temp', label: 'Hot Water Temp', metric: 'temperature', unit: '°C', required: true, defaultTtlSeconds: 120 },
  ],

  commands: [],

  defaultOperationalProfileId: 'op_point_of_use_default',

  visual: {
    shape: 'generic',
    icon: '🚰',
    primaryStatusMetric: 'temperature',
    portAnchors: { hot_in: 'left', drain_out: 'right' },
    dashboardCard: { fields: ['temp'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
