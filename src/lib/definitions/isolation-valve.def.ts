import type { ComponentDefinition } from '../component-registry.js';

export const ISOLATION_VALVE: ComponentDefinition = {
  typeId:   'isolation_valve',
  category: 'valve',
  label:    'Isolation Valve',

  ports: [
    { id: 'in',  label: 'Inlet',  medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Outlet', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [
    { key: 'state', label: 'Default State', type: 'enum', options: ['open', 'closed'], default: 'open', editable: false },
  ],

  sensorSlots: [],

  commands: [
    { id: 'open',  label: 'Open',  dangerous: false, confirm: false },
    { id: 'close', label: 'Close', dangerous: true,  confirm: true  },
  ],

  visual: {
    shape: 'valve',
    icon: '🔒',
    primaryStatusMetric: 'runtime',
    portAnchors: { in: 'left', out: 'right' },
    dashboardCard: { fields: [] },
    propertyPanel: { sections: ['commands', 'alarms', 'config'] },
  },
};
