import type { ComponentDefinition } from '../component-registry.js';

export const TEMPERATURE_SENSOR: ComponentDefinition = {
  typeId:   'temperature_sensor',
  category: 'sensor',
  label:    'Temperature Sensor',

  ports: [],

  properties: [
    { key: 'location', label: 'Location Label', type: 'string', editable: true, default: '' },
    { key: 'range_min', label: 'Range Min (°C)', type: 'number', unit: '°C', editable: false, default: -10 },
    { key: 'range_max', label: 'Range Max (°C)', type: 'number', unit: '°C', editable: false, default: 120 },
  ],

  sensorSlots: [
    { id: 'temp', label: 'Temperature', metric: 'temperature', unit: '°C', required: true, defaultTtlSeconds: 60 },
  ],

  commands: [],

  visual: {
    shape: 'sensor',
    icon: '🌡',
    primaryStatusMetric: 'temperature',
    portAnchors: {},
    dashboardCard: { fields: ['temp'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
