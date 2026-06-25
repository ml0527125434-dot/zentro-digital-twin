/**
 * BASE LIBRARY — Heat Pump
 *
 * Generic heat pump. Produces hot water output. Monitored via runtime sensor.
 * Enable/disable command is non-dangerous (no safety interlock required).
 */

import type { ComponentDefinition } from '../component-registry.js';

export const HEAT_PUMP: ComponentDefinition = {
  typeId:   'heat_pump',
  category: 'source',
  label:    'Heat Pump',

  ports: [
    { id: 'out', label: 'Hot Water Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [],

  sensorSlots: [
    { id: 'runtime', label: 'Run State', metric: 'runtime', required: true, defaultTtlSeconds: 60 },
  ],

  commands: [
    { id: 'enable', label: 'Enable / Disable', dangerous: false, confirm: false },
  ],

  visual: {
    shape:               'pump',
    primaryStatusMetric: 'runtime',
    portAnchors:         { out: 'right' },
    dashboardCard:       { fields: ['runtime'] },
    propertyPanel:       { sections: ['live', 'commands', 'history', 'maintenance', 'config'] },
  },
};
