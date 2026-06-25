import type { ComponentDefinition } from '../component-registry.js';

export const FILTER: ComponentDefinition = {
  typeId:   'filter',
  category: 'air',
  label:    'Filter / Strainer',

  ports: [
    { id: 'in',  label: 'Inlet',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Outlet', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'mesh_mm',  label: 'Mesh Size (mm)', type: 'number', unit: 'mm', editable: false },
  ],

  sensorSlots: [
    { id: 'diff_pressure', label: 'Differential Pressure', metric: 'diff_pressure', unit: 'bar', required: false, defaultTtlSeconds: 120 },
  ],

  commands: [
    { id: 'flush', label: 'Flush / Clean', dangerous: false, confirm: false },
  ],

  visual: {
    shape: 'generic',
    icon: '⊡',
    primaryStatusMetric: 'diff_pressure',
    portAnchors: { in: 'left', out: 'right' },
    dashboardCard: { fields: ['diff_pressure'] },
    propertyPanel: { sections: ['live', 'commands', 'alarms', 'maintenance', 'config'] },
  },
};
