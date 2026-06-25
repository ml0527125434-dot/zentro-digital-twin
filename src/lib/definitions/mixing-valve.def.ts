/**
 * BASE LIBRARY — Mixing Valve (TMV)
 *
 * Generic thermostatic mixing valve. Blends hot and cold water to produce
 * a mixed output at a controlled temperature. Passive — no sensors, no commands.
 * The output temperature is measured at the point-of-use, not on the valve.
 */

import type { ComponentDefinition } from '../component-registry.js';

export const MIXING_VALVE: ComponentDefinition = {
  typeId:   'mixing_valve',
  category: 'valve',
  label:    'Mixing Valve (TMV)',

  ports: [
    { id: 'hot_in',    label: 'Hot Water In',  medium: 'hot_water',  role: 'inlet',  anchor: 'left'   },
    { id: 'cold_in',   label: 'Cold Water In', medium: 'cold_water', role: 'inlet',  anchor: 'bottom' },
    { id: 'mixed_out', label: 'Mixed Out',     medium: 'hot_water',  role: 'outlet', anchor: 'right'  },
  ],

  properties: [
    { key: 'setpoint_c', label: 'Mixed Temp Target (°C)', type: 'number', unit: '°C', editable: true, default: 43 },
  ],

  sensorSlots: [],

  commands: [],

  visual: {
    shape:               'valve',
    primaryStatusMetric: 'temperature',
    portAnchors: {
      hot_in:    'left',
      cold_in:   'bottom',
      mixed_out: 'right',
    },
    dashboardCard:  { fields: ['setpoint_c'] },
    propertyPanel:  { sections: ['live', 'history', 'config', 'dependencies'] },
  },
};
