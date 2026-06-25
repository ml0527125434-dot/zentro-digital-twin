/**
 * BASE LIBRARY — Recirculation Pump
 *
 * Generic recirculation pump. Circulates return water back to the storage tank.
 * Monitored via flow sensor. Enable/disable command is non-dangerous.
 */

import type { ComponentDefinition } from '../component-registry.js';

export const RECIRC_PUMP: ComponentDefinition = {
  typeId:   'recirc_pump',
  category: 'pump',
  label:    'Recirculation Pump',

  ports: [
    { id: 'in',  label: 'Recirc In',  medium: 'recirc', role: 'inlet',  anchor: 'left'  },
    { id: 'out', label: 'Recirc Out', medium: 'recirc', role: 'outlet', anchor: 'right' },
  ],

  properties: [],

  sensorSlots: [
    { id: 'flow', label: 'Flow Rate', metric: 'flow', unit: 'L/min', required: true, defaultTtlSeconds: 60 },
  ],

  commands: [
    { id: 'enable', label: 'Enable / Disable', dangerous: false, confirm: false },
  ],

  visual: {
    shape:               'pump',
    primaryStatusMetric: 'flow',
    portAnchors:         { in: 'left', out: 'right' },
    dashboardCard:       { fields: ['flow'] },
    propertyPanel:       { sections: ['live', 'commands', 'history', 'maintenance', 'config'] },
  },
};
