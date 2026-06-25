/**
 * CONFORMANCE-SPECIFIC — Gas Backup Boiler
 *
 * Used in the hot-water conformance seed only.
 * Not part of the universal base library.
 *
 * Gas boiler as a secondary heat source. Monitored via dry-contact run state.
 * No commands — on/off is controlled externally via the thermostat.
 */

import type { ComponentDefinition } from '../component-registry.js';

export const GAS_BACKUP: ComponentDefinition = {
  typeId:   'gas_backup',
  category: 'source',
  label:    'Gas Backup Boiler',

  ports: [
    { id: 'out', label: 'Hot Water Out', medium: 'hot_water', role: 'outlet', anchor: 'right' },
  ],

  properties: [],

  sensorSlots: [
    { id: 'runtime', label: 'Run State (dry contact)', metric: 'runtime', required: false, defaultTtlSeconds: 60 },
  ],

  commands: [],

  visual: {
    shape:               'generic',
    primaryStatusMetric: 'runtime',
    portAnchors:         { out: 'right' },
    dashboardCard:       { fields: ['runtime'] },
    propertyPanel:       { sections: ['live', 'history', 'maintenance', 'config'] },
  },
};
