/**
 * CONFORMANCE-SPECIFIC — Point of Use
 *
 * Used in the hot-water conformance seed only.
 * Not part of the universal base library.
 *
 * End-point consuming hot water (shower, tap, bath). Measured temperature at
 * the outlet determines scald/cold/ok status via the point-of-use profile.
 * Drain port feeds the recirculation return loop.
 */

import type { ComponentDefinition } from '../component-registry.js';

export const POINT_OF_USE: ComponentDefinition = {
  typeId:   'point_of_use',
  category: 'consumer',
  label:    'Point of Use',

  ports: [
    { id: 'hot_in',    label: 'Hot Water In',   medium: 'hot_water', role: 'inlet',  anchor: 'left'  },
    { id: 'drain_out', label: 'Return Drain',   medium: 'recirc',    role: 'outlet', anchor: 'right' },
  ],

  properties: [],

  sensorSlots: [
    { id: 'temp', label: 'Outlet Temperature', metric: 'temperature', unit: '°C', required: true, defaultTtlSeconds: 120 },
  ],

  commands: [],

  defaultOperationalProfileId: 'op_point_of_use_default',

  visual: {
    shape:               'generic',
    primaryStatusMetric: 'temperature',
    portAnchors:         { hot_in: 'left', drain_out: 'right' },
    dashboardCard:       { fields: ['temp'] },
    propertyPanel:       { sections: ['live', 'history', 'alarms', 'config', 'dependencies'] },
  },
};
