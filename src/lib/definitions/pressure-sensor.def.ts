import type { ComponentDefinition } from '../component-registry.js';

export const PRESSURE_SENSOR: ComponentDefinition = {
  typeId:   'pressure_sensor',
  category: 'sensor',
  label:    'Pressure Sensor',

  ports: [],

  properties: [
    { key: 'location',  label: 'Location Label', type: 'string', editable: true, default: '' },
    { key: 'range_bar', label: 'Range (bar)',     type: 'number', unit: 'bar', editable: false, default: 10 },
  ],

  sensorSlots: [
    { id: 'pressure', label: 'Pressure', metric: 'pressure', unit: 'bar', required: true, defaultTtlSeconds: 60 },
  ],

  commands: [],

  visual: {
    shape: 'sensor',
    icon: '⦿',
    primaryStatusMetric: 'pressure',
    portAnchors: {},
    dashboardCard: { fields: ['pressure'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
