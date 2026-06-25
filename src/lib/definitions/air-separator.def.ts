import type { ComponentDefinition } from '../component-registry.js';

export const AIR_SEPARATOR: ComponentDefinition = {
  typeId:   'air_separator',
  category: 'air',
  label:    'Air Separator',

  ports: [
    { id: 'in',   label: 'Inlet',    medium: 'hot_water', role: 'inlet',  anchor: 'left'   },
    { id: 'out',  label: 'Outlet',   medium: 'hot_water', role: 'outlet', anchor: 'right'  },
    { id: 'vent', label: 'Air Vent', medium: 'air',       role: 'outlet', anchor: 'top'    },
  ],

  properties: [
    { key: 'diameter_mm', label: 'Diameter (mm)', type: 'number', unit: 'mm', editable: false },
  ],

  sensorSlots: [],
  commands: [],

  visual: {
    shape: 'generic',
    icon: '⊞',
    primaryStatusMetric: 'flow',
    portAnchors: { in: 'left', out: 'right', vent: 'top' },
    dashboardCard: { fields: [] },
    propertyPanel: { sections: ['alarms', 'maintenance', 'config'] },
  },
};
