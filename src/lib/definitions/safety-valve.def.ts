import type { ComponentDefinition } from '../component-registry.js';

export const SAFETY_VALVE: ComponentDefinition = {
  typeId:   'safety_valve',
  category: 'valve',
  label:    'Safety Valve',

  ports: [
    { id: 'in',    label: 'Inlet',       medium: 'hot_water', role: 'inlet',  anchor: 'left'   },
    { id: 'drain', label: 'Drain / Vent', medium: 'hot_water', role: 'outlet', anchor: 'bottom' },
  ],

  properties: [
    { key: 'set_pressure_bar', label: 'Set Pressure (bar)', type: 'number', unit: 'bar', editable: false, default: 6 },
  ],

  sensorSlots: [],
  commands: [],

  visual: {
    shape: 'valve',
    icon: '🛡',
    primaryStatusMetric: 'pressure',
    portAnchors: { in: 'left', drain: 'bottom' },
    dashboardCard: { fields: [] },
    propertyPanel: { sections: ['alarms', 'config', 'maintenance'] },
  },
};
