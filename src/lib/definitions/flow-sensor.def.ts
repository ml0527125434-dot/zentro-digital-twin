import type { ComponentDefinition } from '../component-registry.js';

export const FLOW_SENSOR: ComponentDefinition = {
  typeId:   'flow_sensor',
  category: 'sensor',
  label:    'Flow Sensor',

  ports: [
    { id: 'in',  label: 'Inlet',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Outlet', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'nominal_flow',  label: 'Nominal Flow (L/min)', type: 'number', unit: 'L/min', editable: false },
  ],

  sensorSlots: [
    { id: 'flow', label: 'Flow Rate', metric: 'flow', unit: 'L/min', required: true, defaultTtlSeconds: 60 },
  ],

  commands: [],

  visual: {
    shape: 'sensor',
    icon: '≋',
    primaryStatusMetric: 'flow',
    portAnchors: { in: 'left', out: 'right' },
    dashboardCard: { fields: ['flow'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
