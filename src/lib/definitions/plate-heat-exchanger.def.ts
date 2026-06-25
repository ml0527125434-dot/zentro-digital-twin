import type { ComponentDefinition } from '../component-registry.js';

export const PLATE_HEAT_EXCHANGER: ComponentDefinition = {
  typeId:   'plate_heat_exchanger',
  category: 'source',
  label:    'Plate Heat Exchanger',

  ports: [
    { id: 'primary_in',    label: 'Primary In',    medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'primary_out',   label: 'Primary Out',   medium: 'hot_water', role: 'outlet', anchor: 'right' },
    { id: 'secondary_in',  label: 'Secondary In',  medium: 'cold_water',role: 'inlet',  anchor: 'bottom'},
    { id: 'secondary_out', label: 'Secondary Out', medium: 'hot_water', role: 'outlet', anchor: 'top'   },
  ],

  properties: [
    { key: 'plates',     label: 'Plate Count',    type: 'number', editable: false },
    { key: 'power_kw',   label: 'Transfer (kW)',  type: 'number', unit: 'kW', editable: false },
  ],

  sensorSlots: [
    { id: 'temp_primary_in',   label: 'Primary In Temp',   metric: 'temperature', unit: '°C', required: false, defaultTtlSeconds: 120 },
    { id: 'temp_primary_out',  label: 'Primary Out Temp',  metric: 'temperature', unit: '°C', required: false, defaultTtlSeconds: 120 },
    { id: 'temp_secondary_out',label: 'Secondary Out Temp',metric: 'temperature', unit: '°C', required: false, defaultTtlSeconds: 120 },
  ],

  commands: [],

  visual: {
    shape: 'exchanger',
    icon: '⇄',
    primaryStatusMetric: 'temperature',
    portAnchors: { primary_in: 'left', primary_out: 'right', secondary_in: 'bottom', secondary_out: 'top' },
    dashboardCard: { fields: ['temp_primary_out', 'temp_secondary_out'] },
    propertyPanel: { sections: ['live', 'alarms', 'config', 'dependencies'] },
  },
};
