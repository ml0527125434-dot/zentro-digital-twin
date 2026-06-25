import type { ComponentDefinition } from '../component-registry.js';

export const EXPANSION_VESSEL: ComponentDefinition = {
  typeId:   'expansion_vessel',
  category: 'storage',
  label:    'Expansion Vessel',

  ports: [
    { id: 'connect', label: 'System Connection', medium: 'hot_water', role: 'bidirectional', anchor: 'bottom' },
  ],

  properties: [
    { key: 'volume_l',     label: 'Volume (L)',      type: 'number', unit: 'L',   editable: false },
    { key: 'pre_charge_bar',label: 'Pre-charge (bar)',type: 'number', unit: 'bar', editable: false, default: 1.5 },
  ],

  sensorSlots: [
    { id: 'pressure', label: 'System Pressure', metric: 'pressure', unit: 'bar', required: false, defaultTtlSeconds: 120 },
  ],

  commands: [],

  visual: {
    shape: 'generic',
    icon: '⊕',
    primaryStatusMetric: 'pressure',
    portAnchors: { connect: 'bottom' },
    dashboardCard: { fields: ['pressure'] },
    propertyPanel: { sections: ['live', 'alarms', 'maintenance', 'config'] },
  },
};
