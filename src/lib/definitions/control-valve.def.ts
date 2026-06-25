import type { ComponentDefinition } from '../component-registry.js';

export const CONTROL_VALVE: ComponentDefinition = {
  typeId:   'control_valve',
  category: 'valve',
  label:    'Control Valve',

  ports: [
    { id: 'in',  label: 'Inlet',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Outlet', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'cv',       label: 'Valve Cv',     type: 'number', editable: false },
    { key: 'position', label: 'Position (%)', type: 'number', unit: '%', editable: true, default: 100 },
  ],

  sensorSlots: [],

  commands: [
    { id: 'open',         label: 'Open Valve',          dangerous: false, confirm: false },
    { id: 'close',        label: 'Close Valve',         dangerous: false, confirm: false },
    { id: 'set_position', label: 'Set Position',        dangerous: false, confirm: false },
  ],

  visual: {
    shape: 'valve',
    primaryStatusMetric: 'runtime',
    portAnchors: { in: 'left', out: 'right' },
    dashboardCard: { fields: [] },
    propertyPanel: { sections: ['commands', 'alarms', 'config'] },
  },
};
