import type { ComponentDefinition } from '../component-registry.js';

export const SOLAR_COLLECTOR: ComponentDefinition = {
  typeId:   'solar_collector',
  category: 'source',
  label:    'Solar Collector',

  ports: [
    { id: 'cold_in',  label: 'Fluid Return In',  medium: 'hot_water', role: 'inlet',  anchor: 'bottom' },
    { id: 'hot_out',  label: 'Heated Fluid Out',  medium: 'hot_water', role: 'outlet', anchor: 'top'    },
  ],

  properties: [
    { key: 'area_m2',   label: 'Collector Area (m²)', type: 'number', unit: 'm²', editable: false },
    { key: 'panel_count', label: 'Panel Count',        type: 'number',             editable: false },
  ],

  sensorSlots: [
    { id: 'temp',    label: 'Collector Temp',  metric: 'temperature', unit: '°C', required: true,  defaultTtlSeconds: 120 },
    { id: 'runtime', label: 'Active State',    metric: 'runtime',                required: false, defaultTtlSeconds: 60  },
  ],

  commands: [],

  visual: {
    shape: 'exchanger',
    icon: '☀',
    primaryStatusMetric: 'temperature',
    portAnchors: { cold_in: 'bottom', hot_out: 'top' },
    dashboardCard: { fields: ['temp', 'runtime'] },
    propertyPanel: { sections: ['live', 'alarms', 'config'] },
  },
};
