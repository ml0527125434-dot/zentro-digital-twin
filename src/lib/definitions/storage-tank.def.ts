/**
 * BASE LIBRARY — Storage Tank
 *
 * Generic hot-water storage tank. Accepts cold water feed, exports hot water,
 * accepts recirculation return, and supports two heat-source inlets for
 * primary and secondary heating equipment.
 */

import type { ComponentDefinition } from '../component-registry.js';

export const STORAGE_TANK: ComponentDefinition = {
  typeId:   'storage_tank',
  category: 'storage',
  label:    'Storage Tank',

  ports: [
    { id: 'cold_in',    label: 'Cold Water In',      medium: 'cold_water', role: 'inlet',  anchor: 'bottom' },
    { id: 'hot_out',    label: 'Hot Water Out',       medium: 'hot_water',  role: 'outlet', anchor: 'top'    },
    { id: 'recirc_in',  label: 'Recirculation Return', medium: 'recirc',    role: 'inlet',  anchor: 'right'  },
    { id: 'heat_in_1',  label: 'Heat Source 1 In',    medium: 'hot_water',  role: 'inlet',  anchor: 'left'   },
    { id: 'heat_in_2',  label: 'Heat Source 2 In',    medium: 'hot_water',  role: 'inlet',  anchor: 'left'   },
  ],

  properties: [
    { key: 'capacity_l', label: 'Capacity (L)',     type: 'number', unit: 'L',  editable: false },
    { key: 'setpoint_c', label: 'Target Temp (°C)', type: 'number', unit: '°C', editable: true, default: 60 },
  ],

  sensorSlots: [
    { id: 'temp', label: 'Temperature Sensor', metric: 'temperature', unit: '°C', required: true, defaultTtlSeconds: 120 },
  ],

  commands: [
    {
      id:            'set_setpoint',
      label:         'Change Target Temperature',
      dangerous:     true,
      confirm:       true,
      interlockKeys: ['tank_temp_sensor_live'],
    },
  ],

  defaultOperationalProfileId: 'op_tank_default',

  visual: {
    shape:               'tank',
    primaryStatusMetric: 'temperature',
    portAnchors: {
      cold_in:   'bottom',
      hot_out:   'top',
      recirc_in: 'right',
      heat_in_1: 'left',
      heat_in_2: 'left',
    },
    dashboardCard:  { fields: ['temp', 'setpoint_c'] },
    propertyPanel:  { sections: ['live', 'commands', 'history', 'alarms', 'maintenance', 'config', 'dependencies'] },
  },
};
